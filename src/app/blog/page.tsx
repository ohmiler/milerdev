import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { db } from '@/lib/db';
import { blogPosts, blogPostTags, tags, users } from '@/lib/db/schema';
import { and, count, desc, eq, like, sql } from 'drizzle-orm';
import styles from './blog-index.module.css';

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
    title: search ? `ผลการค้นหา ${search}` : 'บทความ',
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
  if (imageUrl) return <img src={imageUrl} alt={post.title} />;

  return (
    <div className={styles.imageFallback} aria-hidden={true}>
      <span>MD</span>
      {featured ? <small>Journal</small> : null}
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
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.shell}>
            <p className={styles.eyebrow}>MILERDEV JOURNAL / {String(pagination.total).padStart(2, '0')}</p>
            <div className={styles.heroGrid}>
              <h1>อ่านแนวคิด แล้วกลับไปเขียนโค้ด</h1>
              <p>บทความภาษาไทยสำหรับนักพัฒนาที่ต้องการเข้าใจเครื่องมือ วิธีคิด และการสร้างซอฟต์แวร์จากงานจริง</p>
            </div>
          </div>
        </header>

        <section className={styles.catalog} aria-labelledby={'blog-catalog-title'}>
          <div className={styles.shell}>
            <div className={styles.catalogHeading}>
              <div>
                <p className={styles.eyebrow}>ARTICLE INDEX</p>
                <h2 id={'blog-catalog-title'}>{search || tagFilter !== 'all' ? 'ผลลัพธ์ที่กรองแล้ว' : 'บทความทั้งหมด'}</h2>
              </div>
              <p aria-live={'polite'}>{pagination.total} รายการ</p>
            </div>

            <form method={'GET'} action={'/blog'} className={styles.filter} role={'search'}>
              <div className={styles.searchField}>
                <label htmlFor={'blog-search'}>ค้นหาบทความ</label>
                <input
                  id={'blog-search'}
                  type={'search'}
                  name={'search'}
                  defaultValue={search}
                  placeholder={'ค้นหาจากชื่อบทความ'}
                />
              </div>
              {tagFilter !== 'all' ? <input type={'hidden'} name={'tag'} value={tagFilter} /> : null}
              <button type={'submit'}>แสดงผลลัพธ์</button>
              <Link href={'/blog'}>ล้างตัวกรอง</Link>
            </form>

            {allTags.length > 0 ? (
              <nav className={styles.topics} aria-label={'หัวข้อบทความ'}>
                {topicItems.map((tag) => {
                  const isActive = tagFilter === tag.slug;
                  return (
                    <Link
                      key={tag.id}
                      href={buildBlogQuery({ search, tag: tag.slug, page: 1 })}
                      data-active={isActive || undefined}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {tag.name}
                    </Link>
                  );
                })}
              </nav>
            ) : null}

            {posts.length === 0 ? (
              <div className={styles.empty}>
                <p className={styles.eyebrow}>NO MATCHING ARTICLES</p>
                <h3>ไม่พบบทความตามเงื่อนไขนี้</h3>
                <p>ลองใช้คำค้นที่สั้นลง หรือเลือกหัวข้อใหม่</p>
                <Link href={'/blog'}>ดูบทความทั้งหมด</Link>
              </div>
            ) : (
              <>
                {featuredPost ? (
                  <Link href={`/blog/${featuredPost.slug}`} className={styles.feature}>
                    <article>
                      <figure className={styles.featureImage}><PostImage post={featuredPost} featured={true} /></figure>
                      <div className={styles.featureContent}>
                        <div className={styles.tags}>{featuredPost.tags.slice(0, 3).map((tag) => <span key={tag.id}>{tag.name}</span>)}</div>
                        <p className={styles.date}>LATEST / {formatDate(featuredPost.publishedAt)}</p>
                        <h2>{featuredPost.title}</h2>
                        {featuredPost.excerpt ? <p className={styles.excerpt}>{featuredPost.excerpt}</p> : null}
                        <div className={styles.articleFooter}>
                          <span>{featuredPost.authorName ? `โดย ${featuredPost.authorName}` : 'MilerDev'}</span>
                          <strong>อ่านบทความ <span aria-hidden={true}>→</span></strong>
                        </div>
                      </div>
                    </article>
                  </Link>
                ) : null}

                {articlePosts.length > 0 ? (
                  <ol className={styles.articleList}>
                    {articlePosts.map((post, index) => {
                      const itemNumber = (featuredPost ? index + 2 : index + 1) + (currentPage - 1) * pagination.limit;
                      return (
                        <li key={post.id}>
                          <Link href={`/blog/${post.slug}`} className={styles.articleRow}>
                            <span className={styles.articleIndex}>{String(itemNumber).padStart(2, '0')}</span>
                            <figure className={styles.rowImage}><PostImage post={post} /></figure>
                            <div className={styles.rowContent}>
                              <div className={styles.tags}>{post.tags.slice(0, 2).map((tag) => <span key={tag.id}>{tag.name}</span>)}</div>
                              <h2>{post.title}</h2>
                              {post.excerpt ? <p>{post.excerpt}</p> : null}
                              <div className={styles.articleFooter}>
                                <span>{post.authorName ? `โดย ${post.authorName}` : 'MilerDev'} / {formatDate(post.publishedAt)}</span>
                                <strong>อ่านบทความ <span aria-hidden={true}>→</span></strong>
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                ) : null}

                {pagination.totalPages > 1 ? (
                  <nav className={styles.pagination} aria-label={'หน้ารายการบทความ'}>
                    {currentPage > 1 ? <Link href={buildBlogQuery({ search, tag: tagFilter, page: currentPage - 1 })}>← ก่อนหน้า</Link> : <span />}
                    <div>
                      {getPageNumbers(pagination.totalPages, currentPage).map((pageNumber, index) => pageNumber === '...'
                        ? <span key={`dots-${index}`} aria-hidden={true}>…</span>
                        : (
                          <Link
                            key={pageNumber}
                            href={buildBlogQuery({ search, tag: tagFilter, page: pageNumber })}
                            data-active={currentPage === pageNumber || undefined}
                            aria-current={currentPage === pageNumber ? 'page' : undefined}
                            aria-label={`หน้า ${pageNumber}`}
                          >
                            {pageNumber}
                          </Link>
                        ))}
                    </div>
                    {currentPage < pagination.totalPages ? <Link href={buildBlogQuery({ search, tag: tagFilter, page: currentPage + 1 })}>ถัดไป →</Link> : <span />}
                  </nav>
                ) : null}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
