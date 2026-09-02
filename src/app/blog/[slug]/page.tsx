import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CodeCopyButton from '@/components/blog/CodeCopyButton';
import ReadingProgress from '@/components/blog/ReadingProgress';
import ScrollToTop from '@/components/blog/ScrollToTop';
import ShareButtons from '@/components/blog/ShareButtons';
import TableOfContents from '@/components/blog/TableOfContents';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import NavigationBreadcrumbs from '@/components/layout/NavigationBreadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/db';
import { blogPosts, blogPostTags, tags, users } from '@/lib/db/schema';
import { getProcessedBlogContent } from '@/lib/sanitize';
import { absoluteUrl, serializeJsonLd, SITE_URL } from '@/lib/seo';
import { and, eq, ne, sql } from 'drizzle-orm';

function getReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function normalizeUrl(url: string | null): string | null {
  if (!url || url.trim() === '') return null;
  if (url.startsWith('http')) return url;
  return `https://${url}`;
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export const revalidate = 3600;

const getPublishedPostMetadata = unstable_cache(
  async (slug: string) => {
    const [post] = await db
      .select({
        title: blogPosts.title,
        excerpt: blogPosts.excerpt,
        thumbnailUrl: blogPosts.thumbnailUrl,
        publishedAt: blogPosts.publishedAt,
        authorId: blogPosts.authorId,
      })
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, 'published')))
      .limit(1);

    return post ?? null;
  },
  ['blog-post-metadata'],
  { revalidate },
);

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const post = await getPublishedPostMetadata(slug);

  if (!post) return { title: 'ไม่พบบทความ' };

  const description = post.excerpt || 'บทความจาก MilerDev';
  const thumbnailUrl = normalizeUrl(post.thumbnailUrl);

  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: `/blog/${slug}`,
      siteName: 'MilerDev',
      ...(post.publishedAt && { publishedTime: new Date(post.publishedAt).toISOString() }),
      authors: ['MilerDev'],
      ...(thumbnailUrl && {
        images: [{ url: thumbnailUrl, width: 1200, height: 630, alt: post.title }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      ...(thumbnailUrl && { images: [thumbnailUrl] }),
    },
  };
}

async function getRelatedPosts(postId: string, postTags: { id: string }[], limit = 3) {
  if (postTags.length === 0) {
    return db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        thumbnailUrl: blogPosts.thumbnailUrl,
        publishedAt: blogPosts.publishedAt,
      })
      .from(blogPosts)
      .where(and(eq(blogPosts.status, 'published'), ne(blogPosts.id, postId)))
      .orderBy(sql`${blogPosts.publishedAt} DESC`)
      .limit(limit);
  }

  const tagIds = postTags.map((tag) => tag.id);
  return db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      excerpt: blogPosts.excerpt,
      thumbnailUrl: blogPosts.thumbnailUrl,
      publishedAt: blogPosts.publishedAt,
    })
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.status, 'published'),
        ne(blogPosts.id, postId),
        sql`${blogPosts.id} IN (
          SELECT post_id FROM blog_post_tags WHERE tag_id IN (${sql.join(tagIds.map((id) => sql`${id}`), sql`, `)})
        )`,
      ),
    )
    .orderBy(sql`${blogPosts.publishedAt} DESC`)
    .limit(limit);
}

const getPost = unstable_cache(
  async (slug: string) => {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, 'published')))
      .limit(1);

    if (!post) return null;

    const [authorResult, postTags] = await Promise.all([
      post.authorId
        ? db
            .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
            .from(users)
            .where(eq(users.id, post.authorId))
            .limit(1)
        : Promise.resolve([]),
      db
        .select({ id: tags.id, name: tags.name, slug: tags.slug })
        .from(blogPostTags)
        .innerJoin(tags, eq(blogPostTags.tagId, tags.id))
        .where(eq(blogPostTags.postId, post.id)),
    ]);

    return {
      ...post,
      author: authorResult[0] || null,
      tags: postTags,
    };
  },
  ['blog-post'],
  { revalidate },
);

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(decodeURIComponent(slug));

  if (!post) notFound();

  const relatedPosts = await getRelatedPosts(post.id, post.tags);
  const readingTime = getReadingTime(post.content ?? '');
  const processedContent = getProcessedBlogContent(post.content ?? '');
  const thumbnailUrl = normalizeUrl(post.thumbnailUrl);
  const avatarUrl = normalizeUrl(post.author?.avatarUrl ?? null);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || 'บทความจาก MilerDev',
    url: absoluteUrl(`/blog/${post.slug}`),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': absoluteUrl(`/blog/${post.slug}`),
    },
    inLanguage: 'th-TH',
    ...(thumbnailUrl && { image: thumbnailUrl }),
    ...(post.publishedAt && { datePublished: new Date(post.publishedAt).toISOString() }),
    ...(post.updatedAt && { dateModified: new Date(post.updatedAt).toISOString() }),
    author: post.author?.name
      ? { '@type': 'Person', name: post.author.name }
      : { '@id': `${SITE_URL}/#organization` },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'หน้าแรก', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'บทความ', item: absoluteUrl('/blog') },
      { '@type': 'ListItem', position: 3, name: post.title, item: absoluteUrl(`/blog/${post.slug}`) },
    ],
  };

  return (
    <>
      <script type={'application/ld+json'} dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }} />
      <script type={'application/ld+json'} dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
      <ReadingProgress />
      <Navbar />
      <main id="main-content" tabIndex={-1} className="bg-[var(--academy-canvas)]">
        <header className="border-b bg-[radial-gradient(circle_at_84%_8%,var(--color-accent-soft),transparent_32%),var(--academy-canvas)] py-12 sm:py-16 lg:py-20">
          <div className="container">
            <NavigationBreadcrumbs
              className="mb-8 text-xs"
              items={[
                { href: '/', label: 'หน้าแรก' },
                { href: '/blog', label: 'บทความ' },
                { label: `${post.title.slice(0, 40)}${post.title.length > 40 ? '…' : ''}` },
              ]}
            />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.75fr)] lg:items-end lg:gap-16">
              <div>
                {post.tags.length > 0 ? (
                  <nav className="mb-5 flex flex-wrap gap-2" aria-label="หัวข้อของบทความ">
                    {post.tags.map((tag) => <Badge key={tag.id} variant="secondary" asChild><Link href={`/blog?tag=${tag.slug}`}>{tag.name}</Link></Badge>)}
                  </nav>
                ) : null}
                <h1 className="mt-4 max-w-4xl text-4xl leading-[1.16] font-semibold tracking-[-.04em] text-balance sm:text-5xl lg:text-6xl">{post.title}</h1>
                {post.excerpt ? <p className="mt-6 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">{post.excerpt}</p> : null}
              </div>

              <Card className="bg-card/85 backdrop-blur" aria-label="ข้อมูลบทความ">
                <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground" aria-hidden={!avatarUrl}>
                    {avatarUrl ? <img className="size-full object-cover" src={avatarUrl} alt={post.author?.name || 'MilerDev'} /> : 'MD'}
                  </span>
                  <div><span className="block text-xs text-muted-foreground">ผู้เขียน</span><strong className="text-sm">{post.author?.name || 'MilerDev'}</strong></div>
                </div>
                <Separator className="my-5" />
                <dl className="flex flex-col gap-3 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">เผยแพร่</dt><dd>{formatDate(post.publishedAt) || '—'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">เวลาอ่าน</dt><dd>{readingTime} นาที</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">ยอดอ่าน</dt><dd>{(post.viewCount ?? 0).toLocaleString()} ครั้ง</dd></div>
                </dl>
                </CardContent>
              </Card>
            </div>
          </div>
        </header>

        {thumbnailUrl ? (
          <figure className="container mt-8 sm:mt-10">
            <img className="aspect-[16/7] w-full rounded-3xl object-cover shadow-[var(--academy-shadow-card)]" src={thumbnailUrl} alt={post.title} />
          </figure>
        ) : null}

        <section className="py-12 sm:py-16 lg:py-20" aria-label="เนื้อหาบทความ">
          <div className="container grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-16">
            <article className="min-w-0">
              {post.content ? (
                <div
                  className="rich-content mx-auto max-w-3xl"
                  dangerouslySetInnerHTML={{ __html: processedContent }}
                />
              ) : null}
              <CodeCopyButton />

              {relatedPosts.length > 0 ? (
                <section className="mt-14 border-t pt-10" aria-labelledby="related-articles-title">
                  <div className="mb-6">
                    <h2 id="related-articles-title" className="text-2xl font-semibold sm:text-3xl">บทความที่เกี่ยวข้อง</h2>
                  </div>
                  <ol className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {relatedPosts.map((relatedPost, index) => {
                      const relatedImage = normalizeUrl(relatedPost.thumbnailUrl);
                      return (
                        <li key={relatedPost.id}>
                          <Link href={`/blog/${relatedPost.slug}`} className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
                            <Card className="h-full gap-0 overflow-hidden py-0"><figure className="aspect-[16/9] overflow-hidden bg-[var(--academy-navy)]">
                              {relatedImage ? <img className="size-full object-cover transition-transform group-hover:scale-[1.03]" src={relatedImage} alt={relatedPost.title} /> : <span className="flex size-full items-center justify-center text-2xl font-semibold text-primary" aria-hidden="true">MD</span>}
                            </figure>
                            <CardContent className="pt-5"><span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, '0')}</span><h3 className="mt-2 line-clamp-2 font-semibold group-hover:text-primary">{relatedPost.title}</h3><p className="mt-3 text-xs text-muted-foreground">{formatDate(relatedPost.publishedAt)}</p></CardContent></Card>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ) : null}

              <footer className="mt-10 flex flex-col gap-5 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
                <ShareButtons url={`https://milerdev.com/blog/${post.slug}`} title={post.title} />
                <Button variant="outline" asChild><Link href="/blog">← กลับไปบทความทั้งหมด</Link></Button>
              </footer>
            </article>

            <aside className="sticky top-24 hidden rounded-2xl border bg-card p-5 lg:block" aria-label="สารบัญบทความ">
              <TableOfContents contentHtml={processedContent} />
            </aside>
          </div>
        </section>
      </main>
      <ScrollToTop />
      <Footer />
    </>
  );
}
