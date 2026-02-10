import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { db } from '@/lib/db';
import { blogPosts, blogPostTags, tags, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sanitizeRichContent } from '@/lib/sanitize';

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
  const { slug } = await params;
  const [post] = await db
    .select({ title: blogPosts.title, excerpt: blogPosts.excerpt, thumbnailUrl: blogPosts.thumbnailUrl })
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);

  if (!post) return { title: 'ไม่พบบทความ' };

  return {
    title: post.title,
    description: post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      ...(post.thumbnailUrl && { images: [post.thumbnailUrl] }),
    },
  };
}

async function getPost(slug: string) {
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);

  if (!post || post.status !== 'published') return null;

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

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '64px' }}>
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
              dangerouslySetInnerHTML={{ __html: sanitizeRichContent(post.content) }}
            />
          )}

          {/* Back link */}
          <div style={{
            marginTop: '48px',
            paddingTop: '24px',
            borderTop: '1px solid #e2e8f0',
          }}>
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
