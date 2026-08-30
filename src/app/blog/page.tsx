import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { db } from '@/lib/db';
import { blogPosts, blogPostTags, tags, users } from '@/lib/db/schema';
import { and, count, desc, eq, like, sql } from 'drizzle-orm';

export const revalidate = 300;

type SearchParamsInput = {
  search?: string | string[];
  tag?: string | string[];
  page?: string | string[];
};

type Props = {
  searchParams?: Promise<SearchParamsInput>;
};

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface BlogPostItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnailUrl: string | null;
  authorName: string | null;
  publishedAt: Date | null;
  tags: Tag[];
}

function getSingleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
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

function buildBlogQuery(params: { search?: string; tag?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.tag && params.tag !== 'all') query.set('tag', params.tag);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  const output = query.toString();
  return output ? `/blog?${output}` : '/blog';
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolved = searchParams ? await searchParams : {};
  const search = getSingleParam(resolved.search).trim();
  const tag = getSingleParam(resolved.tag) || 'all';
  const page = Math.max(1, parseInt(getSingleParam(resolved.page) || '1', 10) || 1);
  const hasFacets = !!search || tag !== 'all' || page > 1;

  return {
    title: search ? `ผลการค้นหา ${search}` : 'บทความเขียนโปรแกรมและ Web Development',
    alternates: { canonical: '/blog' },
    robots: hasFacets ? { index: false, follow: true } : { index: true, follow: true },
  };
}

async function getAllTags(): Promise<Tag[]> {
  return db.select({ id: tags.id, name: tags.name, slug: tags.slug }).from(tags).orderBy(tags.name);
}

async function getBlogData(input: { page: number; limit: number; search: string; tagSlug: string }) {
  const { page, limit, search, tagSlug } = input;
  const offset = (page - 1) * limit;
  const conditions = [eq(blogPosts.status, 'published')];

  if (search) conditions.push(like(blogPosts.title, `%${search}%`));
  if (tagSlug !== 'all') {
    conditions.push(
      sql`${blogPosts.id} IN (
        SELECT bpt.post_id FROM blog_post_tags bpt
        INNER JOIN tags t ON bpt.tag_id = t.id
        WHERE t.slug = ${tagSlug}
      )`,
    );
  }

  const whereCondition = and(...conditions);
  const [postRows, totalResult] = await Promise.all([
    db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        thumbnailUrl: blogPosts.thumbnailUrl,
        authorName: users.name,
        publishedAt: blogPosts.publishedAt,
      })
      .from(blogPosts)
      .leftJoin(users, eq(blogPosts.authorId, users.id))
      .where(whereCondition)
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(blogPosts).where(whereCondition),
  ]);

  const postIds = postRows.map((post) => post.id);
  const allPostTags = postIds.length > 0
    ? await db
        .select({
          postId: blogPostTags.postId,
          tagId: tags.id,
          tagName: tags.name,
          tagSlug: tags.slug,
        })
        .from(blogPostTags)
        .innerJoin(tags, eq(blogPostTags.tagId, tags.id))
        .where(sql`${blogPostTags.postId} IN (${sql.join(postIds.map((id) => sql`${id}`), sql`, `)})`)
    : [];

  const tagsByPost = new Map<string, Tag[]>();
  for (const row of allPostTags) {
    if (!tagsByPost.has(row.postId)) tagsByPost.set(row.postId, []);
    tagsByPost.get(row.postId)!.push({ id: row.tagId, name: row.tagName, slug: row.tagSlug });
  }

  return {
    posts: postRows.map((post) => ({ ...post, tags: tagsByPost.get(post.id) || [] })) as BlogPostItem[],
    pagination: {
      page,
      limit,
      total: totalResult[0]?.total ?? 0,
      totalPages: Math.ceil((totalResult[0]?.total ?? 0) / limit),
    },
  };
}

function getPageNumbers(totalPages: number, currentPage: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages: (number | '...')[] = [1];
  if (currentPage > 3) pages.push('...');
  for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page++) pages.push(page);
  if (currentPage < totalPages - 2) pages.push('...');
  pages.push(totalPages);
  return pages;
}

function PostImage({ post, featured = false }: { post: BlogPostItem; featured?: boolean }) {
  const imageUrl = normalizeUrl(post.thumbnailUrl);
  if (imageUrl) return <img src={imageUrl} alt={post.title} className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none" />;

  return (
    <div className={`flex size-full flex-col justify-between bg-[radial-gradient(circle_at_75%_20%,rgba(0,171,255,.35),transparent_35%),var(--academy-navy)] p-5 text-white ${featured ? 'min-h-64' : 'min-h-40'}`} aria-hidden={true}>
      <span className="text-2xl font-semibold">MD</span>
    </div>
  );
}

export default async function BlogPage({ searchParams }: Props) {
  const resolved = searchParams ? await searchParams : {};
  const search = getSingleParam(resolved.search).trim();
  const tagFilter = getSingleParam(resolved.tag) || 'all';
  const currentPage = Math.max(1, parseInt(getSingleParam(resolved.page) || '1', 10) || 1);

  const [blogData, allTags] = await Promise.all([
    getBlogData({ page: currentPage, limit: 12, search, tagSlug: tagFilter }),
    getAllTags(),
  ]);

  const { posts, pagination } = blogData;
  const featuredPost = currentPage === 1 && !search && tagFilter === 'all' ? posts[0] : null;
  const articlePosts = featuredPost ? posts.slice(1) : posts;
  const topicItems = [{ id: 'all', name: 'ทั้งหมด', slug: 'all' }, ...allTags];

  return (
    <>
      <Navbar />
      <main className="bg-[var(--academy-canvas)]">
        <header className="border-b bg-[radial-gradient(circle_at_82%_12%,var(--color-accent-soft),transparent_32%),var(--academy-canvas)] py-16 sm:py-20 lg:py-24">
          <div className="container"><div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-end lg:gap-16"><h1 className="text-4xl leading-[1.15] font-semibold tracking-[-.04em] text-balance sm:text-5xl lg:text-6xl">อ่านแนวคิด แล้วกลับไปเขียนโค้ด</h1><p className="max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">บทความภาษาไทยสำหรับนักพัฒนาที่ต้องการเข้าใจเครื่องมือ วิธีคิด และการสร้างซอฟต์แวร์จากงานจริง</p></div></div>
        </header>

        <section className="py-14 sm:py-20" aria-labelledby="blog-catalog-title">
          <div className="container">
            <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-7"><h2 id="blog-catalog-title" className="text-3xl font-semibold tracking-[-.03em] sm:text-4xl">{search || tagFilter !== 'all' ? 'ผลลัพธ์ที่กรองแล้ว' : 'บทความทั้งหมด'}</h2><Badge variant="secondary" aria-live="polite">{pagination.total} รายการ</Badge></header>

            <Card className="mb-6">
              <CardHeader className="sr-only"><CardTitle>ค้นหาและกรองบทความ</CardTitle></CardHeader>
              <CardContent>
                <form method="GET" action="/blog" role="search">
                  <FieldGroup className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <Field>
                      <FieldLabel htmlFor="blog-search">ค้นหาบทความ</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
                        <InputGroupInput id="blog-search" type="search" name="search" defaultValue={search} placeholder="ค้นหาจากชื่อบทความ" />
                      </InputGroup>
                    </Field>
                    {tagFilter !== 'all' ? <input type="hidden" name="tag" value={tagFilter} /> : null}
                    <Field orientation="horizontal" className="gap-2">
                      <Button type="submit">แสดงผลลัพธ์</Button>
                      <Button variant="outline" asChild><Link href="/blog">ล้างตัวกรอง</Link></Button>
                    </Field>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>

            {allTags.length > 0 ? <nav className="mb-10 flex flex-wrap gap-2" aria-label="หัวข้อบทความ">{topicItems.map((tag) => { const isActive = tagFilter === tag.slug; return <Button key={tag.id} variant={isActive ? 'default' : 'outline'} size="sm" asChild><Link href={buildBlogQuery({ search, tag: tag.slug, page: 1 })} aria-current={isActive ? 'page' : undefined}>{tag.name}</Link></Button>; })}</nav> : null}

            {posts.length === 0 ? <Card className="items-center py-14 text-center"><CardContent><h3 className="text-2xl font-semibold">ไม่พบบทความตามเงื่อนไขนี้</h3><p className="mt-2 text-muted-foreground">ลองใช้คำค้นที่สั้นลง หรือเลือกหัวข้อใหม่</p><Button className="mt-6" asChild><Link href="/blog">ดูบทความทั้งหมด</Link></Button></CardContent></Card> : (
              <>
                {featuredPost ? <Link href={`/blog/${featuredPost.slug}`} className="group mb-8 block rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"><Card className="gap-0 overflow-hidden py-0 md:grid md:grid-cols-[1.1fr_.9fr]"><figure className="aspect-[16/9] overflow-hidden md:aspect-auto md:min-h-96"><PostImage post={featuredPost} featured /></figure><div className="flex flex-col justify-center p-6 sm:p-9"><div className="mb-5 flex flex-wrap gap-2">{featuredPost.tags.slice(0, 3).map((tag) => <Badge key={tag.id} variant="secondary">{tag.name}</Badge>)}</div><p className="text-sm text-muted-foreground">{formatDate(featuredPost.publishedAt)}</p><h2 className="mt-3 text-3xl leading-tight font-semibold tracking-[-.03em] group-hover:text-primary">{featuredPost.title}</h2>{featuredPost.excerpt ? <p className="mt-4 line-clamp-3 leading-7 text-muted-foreground">{featuredPost.excerpt}</p> : null}<div className="mt-7 flex items-center justify-between gap-4 border-t pt-5 text-sm"><span className="text-muted-foreground">{featuredPost.authorName ? `โดย ${featuredPost.authorName}` : 'MilerDev'}</span><strong className="text-primary">อ่านบทความ →</strong></div></div></Card></Link> : null}

                {articlePosts.length > 0 ? <ol className="grid gap-5 lg:grid-cols-2">{articlePosts.map((post) => <li key={post.id}><Link href={`/blog/${post.slug}`} className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"><Card className="h-full gap-0 overflow-hidden py-0 sm:grid sm:grid-cols-[11rem_1fr]"><figure className="aspect-[16/9] overflow-hidden sm:aspect-auto"><PostImage post={post} /></figure><div className="p-5"><div className="flex flex-wrap gap-2">{post.tags.slice(0, 2).map((tag) => <Badge key={tag.id} variant="secondary">{tag.name}</Badge>)}</div><h2 className="mt-4 text-xl leading-snug font-semibold group-hover:text-primary">{post.title}</h2>{post.excerpt ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{post.excerpt}</p> : null}<p className="mt-4 text-xs text-muted-foreground">{post.authorName ? `โดย ${post.authorName}` : 'MilerDev'} / {formatDate(post.publishedAt)}</p></div></Card></Link></li>)}</ol> : null}

                {pagination.totalPages > 1 ? <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="หน้ารายการบทความ">{currentPage > 1 ? <Button variant="outline" asChild><Link href={buildBlogQuery({ search, tag: tagFilter, page: currentPage - 1 })}>← ก่อนหน้า</Link></Button> : null}{getPageNumbers(pagination.totalPages, currentPage).map((pageNumber, index) => pageNumber === '...' ? <span key={`dots-${index}`} className="px-2" aria-hidden="true">…</span> : <Button key={pageNumber} variant={currentPage === pageNumber ? 'default' : 'outline'} size="icon-sm" asChild><Link href={buildBlogQuery({ search, tag: tagFilter, page: pageNumber })} aria-current={currentPage === pageNumber ? 'page' : undefined}>{pageNumber}</Link></Button>)}{currentPage < pagination.totalPages ? <Button variant="outline" asChild><Link href={buildBlogQuery({ search, tag: tagFilter, page: currentPage + 1 })}>ถัดไป →</Link></Button> : null}</nav> : null}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
