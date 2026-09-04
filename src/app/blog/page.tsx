import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import EditorialImage from '@/components/blog/EditorialImage';
import Footer from '@/components/layout/Footer';
import MainContent from '@/components/layout/MainContent';
import Navbar from '@/components/layout/Navbar';
import PublicPageHeader from '@/components/layout/PublicPageHeader';
import { FeedbackState } from '@/components/status/FeedbackState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  buildBlogHref,
  getBlogRecoveryAction,
  readBlogDiscoveryState,
  type BlogSearchParamsInput,
} from '@/lib/blog-discovery';
import { db } from '@/lib/db';
import { blogPosts, blogPostTags, tags, users } from '@/lib/db/schema';
import { and, count, desc, eq, like, sql } from 'drizzle-orm';

export const revalidate = 300;

type Props = {
  searchParams?: Promise<BlogSearchParamsInput>;
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

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const state = readBlogDiscoveryState(searchParams ? await searchParams : {});
  const hasFacets = Boolean(state.search || state.tag !== 'all' || state.page > 1);

  return {
    title: state.search
      ? `ผลการค้นหา ${state.search}`
      : 'บทความเขียนโปรแกรมและ Web Development',
    alternates: { canonical: '/blog' },
    robots: hasFacets ? { index: false, follow: true } : { index: true, follow: true },
  };
}

async function getAllTags(): Promise<Tag[]> {
  return db.select({ id: tags.id, name: tags.name, slug: tags.slug }).from(tags).orderBy(tags.name);
}

async function getBlogData(input: {
  page: number;
  limit: number;
  search: string;
  tagSlug: string;
}) {
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
    tagsByPost.get(row.postId)!.push({
      id: row.tagId,
      name: row.tagName,
      slug: row.tagSlug,
    });
  }

  const total = totalResult[0]?.total ?? 0;
  return {
    posts: postRows.map((post) => ({ ...post, tags: tagsByPost.get(post.id) || [] })) as BlogPostItem[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function getPageNumbers(totalPages: number, currentPage: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages: (number | '...')[] = [1];
  if (currentPage > 3) pages.push('...');
  for (
    let page = Math.max(2, currentPage - 1);
    page <= Math.min(totalPages - 1, currentPage + 1);
    page++
  ) {
    pages.push(page);
  }
  if (currentPage < totalPages - 2) pages.push('...');
  pages.push(totalPages);
  return pages;
}

function PostImage({ post, eager = false }: { post: BlogPostItem; eager?: boolean }) {
  return (
    <EditorialImage
      src={normalizeUrl(post.thumbnailUrl)}
      alt={post.title}
      width={1200}
      height={675}
      loading={eager ? 'eager' : 'lazy'}
      className={'size-full object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.03] motion-reduce:transform-none'}
    />
  );
}

export default async function BlogPage({ searchParams }: Props) {
  const state = readBlogDiscoveryState(searchParams ? await searchParams : {});
  const [blogData, allTags] = await Promise.all([
    getBlogData({ page: state.page, limit: 12, search: state.search, tagSlug: state.tag }),
    getAllTags(),
  ]);

  const { posts, pagination } = blogData;
  const featuredPost = state.page === 1 && !state.search && state.tag === 'all' ? posts[0] : null;
  const articlePosts = featuredPost ? posts.slice(1) : posts;
  const topicItems = [{ id: 'all', name: 'ทั้งหมด', slug: 'all' }, ...allTags];
  const hasActiveFilters = Boolean(state.search || state.tag !== 'all');
  const recoveryAction = getBlogRecoveryAction(state, pagination.total);

  return (
    <>
      <Navbar />
      <MainContent className={'bg-[var(--academy-canvas)]'}>
        <PublicPageHeader
          variant={'catalog'}
          title={'อ่านแนวคิด แล้วกลับไปเขียนโค้ด'}
          description={'บทความภาษาไทยสำหรับนักพัฒนาที่ต้องการเข้าใจเครื่องมือ วิธีคิด และการสร้างซอฟต์แวร์จากงานจริง'}
        />

        <section className={'py-14 sm:py-20'} aria-labelledby={'blog-catalog-title'}>
          <div className={'container'}>
            <header className={'mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-7'}>
              <h2 id={'blog-catalog-title'} className={'text-3xl font-semibold tracking-[-.03em] sm:text-4xl'}>
                {hasActiveFilters ? 'ผลลัพธ์ที่กรองแล้ว' : 'บทความทั้งหมด'}
              </h2>
              <Badge variant={'secondary'} aria-live={'polite'}>{pagination.total} รายการ</Badge>
            </header>

            <Card className={'mb-6'}>
              <CardHeader className={'sr-only'}>
                <CardTitle>ค้นหาและกรองบทความ</CardTitle>
              </CardHeader>
              <CardContent>
                <form method={'GET'} action={'/blog'} role={'search'}>
                  <FieldGroup className={'grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end'}>
                    <Field>
                      <FieldLabel htmlFor={'blog-search'}>ค้นหาบทความ</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon><Search aria-hidden={true} /></InputGroupAddon>
                        <InputGroupInput
                          id={'blog-search'}
                          type={'search'}
                          name={'search'}
                          defaultValue={state.search}
                          placeholder={'ค้นหาจากชื่อบทความ'}
                        />
                      </InputGroup>
                    </Field>
                    {state.tag !== 'all' ? <input type={'hidden'} name={'tag'} value={state.tag} /> : null}
                    <Field orientation={'horizontal'} className={'gap-2'}>
                      <Button type={'submit'}>แสดงผลลัพธ์</Button>
                      {hasActiveFilters ? (
                        <Button variant={'outline'} asChild><Link href={'/blog'}>ล้างตัวกรอง</Link></Button>
                      ) : null}
                    </Field>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>

            {allTags.length > 0 ? (
              <nav className={'mb-10 flex flex-wrap gap-2'} aria-label={'หัวข้อบทความ'}>
                {topicItems.map((tag) => {
                  const isActive = state.tag === tag.slug;
                  return (
                    <Button key={tag.id} variant={isActive ? 'default' : 'outline'} size={'sm'} asChild>
                      <Link
                        href={buildBlogHref({ search: state.search, tag: tag.slug, page: 1 })}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {tag.name}
                      </Link>
                    </Button>
                  );
                })}
              </nav>
            ) : null}

            {posts.length === 0 ? (
              <FeedbackState
                state={'empty'}
                className={'border'}
                title={state.page > 1 && pagination.total > 0 ? 'หน้านี้ไม่มีบทความ' : 'ไม่พบบทความตามเงื่อนไขนี้'}
                description={state.page > 1 && pagination.total > 0
                  ? 'กลับไปหน้าแรกของผลลัพธ์เพื่อเลือกบทความที่ยังเผยแพร่อยู่'
                  : 'ลองใช้คำค้นที่สั้นลง เลือกหัวข้อใหม่ หรือล้างตัวกรอง'}
                action={(
                  <Button asChild>
                    <Link href={recoveryAction.href}>{recoveryAction.label}</Link>
                  </Button>
                )}
              />
            ) : (
              <>
                {featuredPost ? (
                  <Link
                    href={`/blog/${featuredPost.slug}`}
                    className={'group mb-8 block rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30'}
                  >
                    <Card className={'gap-0 overflow-hidden py-0 md:grid md:grid-cols-[1.1fr_.9fr]'}>
                      <figure className={'aspect-[16/9] overflow-hidden md:aspect-auto md:min-h-96'}>
                        <PostImage post={featuredPost} eager />
                      </figure>
                      <div className={'flex min-w-0 flex-col justify-center p-6 sm:p-9'}>
                        <div className={'mb-5 flex flex-wrap gap-2'}>
                          {featuredPost.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag.id} variant={'secondary'}>{tag.name}</Badge>
                          ))}
                        </div>
                        <p className={'text-sm text-muted-foreground'}>{formatDate(featuredPost.publishedAt)}</p>
                        <h2 className={'mt-3 text-3xl leading-tight font-semibold tracking-[-.03em] [overflow-wrap:anywhere] group-hover:text-primary'}>
                          {featuredPost.title}
                        </h2>
                        {featuredPost.excerpt ? (
                          <p className={'mt-4 line-clamp-3 leading-7 text-muted-foreground'}>{featuredPost.excerpt}</p>
                        ) : null}
                        <div className={'mt-7 flex items-center justify-between gap-4 border-t pt-5 text-sm'}>
                          <span className={'text-muted-foreground'}>{featuredPost.authorName ? `โดย ${featuredPost.authorName}` : 'MilerDev'}</span>
                          <strong className={'text-primary'}>อ่านบทความ →</strong>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ) : null}

                {articlePosts.length > 0 ? (
                  <ol className={'grid gap-5 lg:grid-cols-2'}>
                    {articlePosts.map((post) => (
                      <li key={post.id} className={'min-w-0'}>
                        <Link
                          href={`/blog/${post.slug}`}
                          className={'group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30'}
                        >
                          <Card className={'h-full gap-0 overflow-hidden py-0 sm:grid sm:grid-cols-[11rem_minmax(0,1fr)]'}>
                            <figure className={'aspect-[16/9] overflow-hidden sm:aspect-auto'}><PostImage post={post} /></figure>
                            <div className={'min-w-0 p-5'}>
                              <div className={'flex flex-wrap gap-2'}>
                                {post.tags.slice(0, 2).map((tag) => (
                                  <Badge key={tag.id} variant={'secondary'}>{tag.name}</Badge>
                                ))}
                              </div>
                              <h2 className={'mt-4 text-xl leading-snug font-semibold [overflow-wrap:anywhere] group-hover:text-primary'}>{post.title}</h2>
                              {post.excerpt ? <p className={'mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground'}>{post.excerpt}</p> : null}
                              <p className={'mt-4 text-xs text-muted-foreground'}>
                                {post.authorName ? `โดย ${post.authorName}` : 'MilerDev'} / {formatDate(post.publishedAt)}
                              </p>
                            </div>
                          </Card>
                        </Link>
                      </li>
                    ))}
                  </ol>
                ) : null}

                {pagination.totalPages > 1 ? (
                  <nav className={'mt-10 flex flex-wrap items-center justify-center gap-2'} aria-label={'หน้ารายการบทความ'}>
                    {state.page > 1 ? (
                      <Button variant={'outline'} asChild>
                        <Link href={buildBlogHref({ ...state, page: state.page - 1 })}>← ก่อนหน้า</Link>
                      </Button>
                    ) : null}
                    {getPageNumbers(pagination.totalPages, state.page).map((pageNumber, index) => (
                      pageNumber === '...'
                        ? <span key={`dots-${index}`} className={'px-2'} aria-hidden={true}>…</span>
                        : (
                            <Button
                              key={pageNumber}
                              variant={state.page === pageNumber ? 'default' : 'outline'}
                              size={'icon-sm'}
                              asChild
                            >
                              <Link
                                href={buildBlogHref({ ...state, page: pageNumber })}
                                aria-current={state.page === pageNumber ? 'page' : undefined}
                              >
                                {pageNumber}
                              </Link>
                            </Button>
                          )
                    ))}
                    {state.page < pagination.totalPages ? (
                      <Button variant={'outline'} asChild>
                        <Link href={buildBlogHref({ ...state, page: state.page + 1 })}>ถัดไป →</Link>
                      </Button>
                    ) : null}
                  </nav>
                ) : null}
              </>
            )}
          </div>
        </section>
      </MainContent>
      <Footer />
    </>
  );
}
