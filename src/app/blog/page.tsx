import Link from 'next/link';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';
import { db } from '@/lib/db';
import { blogPosts, blogPostTags, tags, users } from '@/lib/db/schema';
import { and, count, desc, eq, like, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

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
    title: search ? `ผลการค้นหา "${search}"` : 'บทความ',
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
      )`
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

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '0' }}>
        <PageHeader
          badge="บทความ"
          title="ความรู้ด้าน Dev จากมืออาชีพ"
          description="เรียนรู้เทคนิคและแนวคิดด้านการเขียนโปรแกรมจากบทความของเรา"
          align="center"
        />

        <section className="section">
          <div className="container">
            <form method="GET" action="/blog" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '14px 20px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
                <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                <input type="text" name="search" defaultValue={search} placeholder="ค้นหาบทความ..." style={{ width: '100%', padding: '10px 16px 10px 38px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
              </div>
              {tagFilter !== 'all' && <input type="hidden" name="tag" value={tagFilter} />}
              <button type="submit" style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>ค้นหา</button>
              <Link href="/blog" style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', color: '#475569', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>ล้างตัวกรอง</Link>
              <div style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: '0.8125rem' }}>{pagination.total} บทความ</div>
            </form>

            {allTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
                {[{ id: 'all', name: 'ทั้งหมด', slug: 'all' }, ...allTags].map((tag) => {
                  const isActive = tagFilter === tag.slug;
                  return (
                    <Link key={tag.id} href={buildBlogQuery({ search, tag: tag.slug, page: 1 })} style={{ padding: '6px 16px', borderRadius: '50px', border: isActive ? '2px solid #2563eb' : '2px solid #e2e8f0', background: isActive ? '#2563eb' : 'white', color: isActive ? 'white' : '#475569', fontSize: '0.8125rem', fontWeight: 500, transition: 'all 0.15s', textDecoration: 'none' }}>
                      {tag.name}
                    </Link>
                  );
                })}
              </div>
            )}

            {posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: '#1e293b' }}>ไม่พบบทความ</h3>
                <p>ลองเปลี่ยนเงื่อนไขการค้นหา หรือกลับมาดูใหม่ภายหลัง</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                  {posts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                      <article style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '100%', display: 'flex', flexDirection: 'column' }} className="card">
                        <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', position: 'relative', overflow: 'hidden' }}>
                          {normalizeUrl(post.thumbnailUrl) ? (
                            <img src={normalizeUrl(post.thumbnailUrl)!} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.5)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          {post.tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                              {post.tags.slice(0, 3).map((tag) => <span key={tag.id} style={{ padding: '2px 10px', background: '#f5f3ff', color: '#7c3aed', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 500 }}>{tag.name}</span>)}
                            </div>
                          )}
                          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.title}</h2>
                          {post.excerpt && <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>{post.excerpt}</p>}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#94a3b8', marginTop: 'auto' }}>
                            {post.authorName && <span>โดย {post.authorName}</span>}
                            <span>{formatDate(post.publishedAt)}</span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>

                {pagination.totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '48px', flexWrap: 'wrap' }}>
                    {currentPage > 1 && <Link href={buildBlogQuery({ search, tag: tagFilter, page: currentPage - 1 })} style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', color: '#374151', textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem' }}>←</Link>}
                    {getPageNumbers(pagination.totalPages, currentPage).map((page, index) =>
                      page === '...' ? <span key={`dots-${index}`} style={{ padding: '8px 4px', color: '#94a3b8', fontSize: '0.875rem' }}>…</span> : <Link key={page} href={buildBlogQuery({ search, tag: tagFilter, page })} style={{ minWidth: '38px', padding: '8px', border: currentPage === page ? '2px solid #2563eb' : '1px solid #e2e8f0', borderRadius: '8px', background: currentPage === page ? '#2563eb' : 'white', color: currentPage === page ? 'white' : '#374151', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: currentPage === page ? 600 : 400, fontSize: '0.875rem' }}>{page}</Link>
                    )}
                    {currentPage < pagination.totalPages && <Link href={buildBlogQuery({ search, tag: tagFilter, page: currentPage + 1 })} style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', color: '#374151', textDecoration: 'none', fontWeight: 500, fontSize: '0.875rem' }}>→</Link>}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
