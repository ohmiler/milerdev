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
import { db } from '@/lib/db';
import { blogPosts, blogPostTags, tags, users } from '@/lib/db/schema';
import { getProcessedBlogContent } from '@/lib/sanitize';
import { and, eq, ne, sql } from 'drizzle-orm';
import styles from './blog-article.module.css';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://milerdev.com';

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
    url: `${siteUrl}/blog/${post.slug}`,
    ...(thumbnailUrl && { image: thumbnailUrl }),
    ...(post.publishedAt && { datePublished: new Date(post.publishedAt).toISOString() }),
    ...(post.updatedAt && { dateModified: new Date(post.updatedAt).toISOString() }),
    author: { '@type': 'Person', name: post.author?.name || 'MilerDev' },
    publisher: {
      '@type': 'Organization',
      name: 'MilerDev',
      url: siteUrl,
      logo: { '@type': 'ImageObject', url: `${siteUrl}/milerdev-logo-transparent.png` },
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'หน้าแรก', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'บทความ', item: `${siteUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${siteUrl}/blog/${post.slug}` },
    ],
  };

  return (
    <>
      <script type={'application/ld+json'} dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type={'application/ld+json'} dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <ReadingProgress />
      <Navbar />
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heroShell}>
            <nav className={styles.breadcrumb} aria-label={'เส้นทางนำทาง'}>
              <Link href={'/'}>หน้าแรก</Link><span aria-hidden={true}>/</span>
              <Link href={'/blog'}>บทความ</Link><span aria-hidden={true}>/</span>
              <span>{post.title.slice(0, 40)}{post.title.length > 40 ? '…' : ''}</span>
            </nav>

            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                {post.tags.length > 0 ? (
                  <nav className={styles.tags} aria-label={'หัวข้อของบทความ'}>
                    {post.tags.map((tag) => <Link key={tag.id} href={`/blog?tag=${tag.slug}`}>{tag.name}</Link>)}
                  </nav>
                ) : null}
                <p className={styles.eyebrow}>MILERDEV JOURNAL / ARTICLE</p>
                <h1>{post.title}</h1>
                {post.excerpt ? <p className={styles.lede}>{post.excerpt}</p> : null}
              </div>

              <aside className={styles.articleEvidence} aria-label={'ข้อมูลบทความ'}>
                <div className={styles.authorRow}>
                  <span className={styles.avatar} aria-hidden={!avatarUrl}>
                    {avatarUrl ? <img src={avatarUrl} alt={post.author?.name || 'MilerDev'} /> : 'MD'}
                  </span>
                  <div><span>ผู้เขียน</span><strong>{post.author?.name || 'MilerDev'}</strong></div>
                </div>
                <dl>
                  <div><dt>เผยแพร่</dt><dd>{formatDate(post.publishedAt) || '—'}</dd></div>
                  <div><dt>เวลาอ่าน</dt><dd>{readingTime} นาที</dd></div>
                  <div><dt>ยอดอ่าน</dt><dd>{(post.viewCount ?? 0).toLocaleString()} ครั้ง</dd></div>
                </dl>
              </aside>
            </div>
          </div>
        </header>

        {thumbnailUrl ? (
          <figure className={styles.heroImage}>
            <img src={thumbnailUrl} alt={post.title} />
          </figure>
        ) : null}

        <section className={styles.readingArea} aria-label={'เนื้อหาบทความ'}>
          <div className={styles.readingGrid}>
            <article className={styles.article}>
              {post.content ? (
                <div
                  className={`rich-content ${styles.prose}`}
                  dangerouslySetInnerHTML={{ __html: processedContent }}
                />
              ) : null}
              <CodeCopyButton />

              {relatedPosts.length > 0 ? (
                <section className={styles.related} aria-labelledby={'related-articles-title'}>
                  <div className={styles.sectionHeading}>
                    <p className={styles.eyebrow}>CONTINUE READING</p>
                    <h2 id={'related-articles-title'}>บทความที่เกี่ยวข้อง</h2>
                  </div>
                  <ol>
                    {relatedPosts.map((relatedPost, index) => {
                      const relatedImage = normalizeUrl(relatedPost.thumbnailUrl);
                      return (
                        <li key={relatedPost.id}>
                          <Link href={`/blog/${relatedPost.slug}`}>
                            <figure className={styles.relatedImage}>
                              {relatedImage ? <img src={relatedImage} alt={relatedPost.title} /> : <span aria-hidden={true}>MD</span>}
                            </figure>
                            <div>
                              <span className={styles.relatedIndex}>{String(index + 1).padStart(2, '0')}</span>
                              <h3>{relatedPost.title}</h3>
                              <p>{formatDate(relatedPost.publishedAt)}</p>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ) : null}

              <footer className={styles.articleFooter}>
                <ShareButtons url={`https://milerdev.com/blog/${post.slug}`} title={post.title} />
                <Link href={'/blog'}>← กลับไปบทความทั้งหมด</Link>
              </footer>
            </article>

            <aside className={styles.tocRail} aria-label={'สารบัญบทความ'}>
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
