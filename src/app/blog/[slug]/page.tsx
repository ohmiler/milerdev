import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { db } from '@/lib/db';
import { blogPosts, blogPostTags, tags, users } from '@/lib/db/schema';
import { eq, like, or, ne, and, sql } from 'drizzle-orm';
import { sanitizeRichContent, enhanceBlogContent } from '@/lib/sanitize';
import ShareButtons from '@/components/blog/ShareButtons';
import ReadingProgress from '@/components/blog/ReadingProgress';

function normalizeUrl(url: string | null): string | null {
  if (!url || url.trim() === '') return null;
  if (url.startsWith('http')) return url;
  return `https://${url}`;
}

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const [post] = await db
    .select({
      title: blogPosts.title,
      excerpt: blogPosts.excerpt,
      thumbnailUrl: blogPosts.thumbnailUrl,
      publishedAt: blogPosts.publishedAt,
      authorId: blogPosts.authorId,
    })
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);

  if (!post) return { title: 'ไม่พบบทความ' };

  const description = post.excerpt || 'บทความจาก MilerDev';
  const thumbnailUrl = post.thumbnailUrl?.startsWith('http') ? post.thumbnailUrl : post.thumbnailUrl ? `https://${post.thumbnailUrl}` : null;

  return {
    title: post.title,
    description,
    alternates: {
      canonical: `https://milerdev.com/blog/${slug}`,
    },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: `/blog/${slug}`,
      siteName: 'MilerDev',
      ...(post.publishedAt && { publishedTime: new Date(post.publishedAt).toISOString() }),
      authors: ['MilerDev'],
      ...(thumbnailUrl && {
        images: [{
          url: thumbnailUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        }],
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
      .select({ id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug, excerpt: blogPosts.excerpt, thumbnailUrl: blogPosts.thumbnailUrl, publishedAt: blogPosts.publishedAt })
      .from(blogPosts)
      .where(and(eq(blogPosts.status, 'published'), ne(blogPosts.id, postId)))
      .orderBy(sql`RAND()`)
      .limit(limit);
  }
  const tagIds = postTags.map(t => t.id);
  const related = await db
    .select({ id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug, excerpt: blogPosts.excerpt, thumbnailUrl: blogPosts.thumbnailUrl, publishedAt: blogPosts.publishedAt })
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.status, 'published'),
        ne(blogPosts.id, postId),
        sql`${blogPosts.id} IN (
          SELECT post_id FROM blog_post_tags WHERE tag_id IN (${sql.join(tagIds.map(id => sql`${id}`), sql`, `)})
        )`
      )
    )
    .orderBy(sql`RAND()`)
    .limit(limit);
  return related;
}

async function getPost(rawSlug: string) {
  const slug = decodeURIComponent(rawSlug);

  let [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);

  // Fallback: try matching by slug prefix (in case URL was truncated)
  if (!post) {
    const [match] = await db
      .select()
      .from(blogPosts)
      .where(or(like(blogPosts.slug, `${slug}%`), like(blogPosts.slug, `%${slug}`)))
      .limit(1);
    if (match) post = match;
  }

  if (!post) return null;
  if (post.status !== 'published') return null;

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
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post.id, post.tags);

  return (
    <>
      <ReadingProgress />
      <Navbar />
      <main style={{ paddingTop: '0' }}>
        {/* Header */}
        <section style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)',
          padding: '60px 0',
          color: 'white',
        }}>
          <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Breadcrumb */}
            <div style={{ marginBottom: '24px', fontSize: '0.875rem', opacity: 0.8 }}>
              <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>หน้าแรก</Link>
              {' / '}
              <Link href="/blog" style={{ color: 'white', textDecoration: 'none' }}>บทความ</Link>
              {' / '}
              <span>{post.title}</span>
            </div>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {post.tags.map(tag => (
                  <Link
                    key={tag.id}
                    href={`/blog?tag=${tag.slug}`}
                    className="course-tag-badge"
                    style={{
                      padding: '4px 14px',
                      background: 'rgba(255,255,255,0.15)',
                      color: 'white',
                      borderRadius: '50px',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      textDecoration: 'none',
                    }}
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}

            <h1 style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 700,
              marginBottom: '16px',
              lineHeight: 1.3,
            }}>
              {post.title}
            </h1>

            {/* Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.9 }}>
              {post.author?.name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    overflow: 'hidden',
                  }}>
                    {normalizeUrl(post.author.avatarUrl) && (
                      <img
                        src={normalizeUrl(post.author.avatarUrl)!}
                        alt={post.author.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  <span>{post.author.name}</span>
                </div>
              )}
              {post.publishedAt && (
                <span>
                  {new Date(post.publishedAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Thumbnail */}
        {normalizeUrl(post.thumbnailUrl) && (
          <div style={{ maxWidth: '800px', margin: '-40px auto 0', padding: '0 16px' }}>
            <img
              src={normalizeUrl(post.thumbnailUrl)!}
              alt={post.title}
              style={{
                width: '100%',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                objectFit: 'cover',
                maxHeight: '400px',
              }}
            />
          </div>
        )}

        {/* Content */}
        <article style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '48px 16px 80px',
        }}>
          {post.content && (
            <div
              className="rich-content"
              style={{
                fontSize: '1.0625rem',
                lineHeight: 1.8,
                color: '#334155',
              }}
              dangerouslySetInnerHTML={{ __html: sanitizeRichContent(enhanceBlogContent(post.content)) }}
            />
          )}

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '20px' }}>
                บทความที่เกี่ยวข้อง
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                {relatedPosts.map(rp => (
                  <Link key={rp.id} href={`/blog/${rp.slug}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#f8fafc', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', transition: 'box-shadow 0.2s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                    >
                      <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', overflow: 'hidden' }}>
                        {normalizeUrl(rp.thumbnailUrl) && (
                          <img src={normalizeUrl(rp.thumbnailUrl)!} alt={rp.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                      <div style={{ padding: '12px' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>
                          {rp.title}
                        </p>
                        {rp.publishedAt && (
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px', margin: '6px 0 0' }}>
                            {new Date(rp.publishedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Share + Back link */}
          <div style={{
            marginTop: '48px',
            paddingTop: '24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            <ShareButtons
              url={`https://milerdev.com/blog/${post.slug}`}
              title={post.title}
            />
            <Link
              href="/blog"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              ← กลับไปบทความทั้งหมด
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
