'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnailUrl: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  publishedAt: string | null;
  tags: Tag[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function normalizeUrl(url: string | null): string | null {
  if (!url || url.trim() === '') return null;
  if (url.startsWith('http')) return url;
  return `https://${url}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BlogPage() {
  return (
    <Suspense fallback={
      <>
        <Navbar />
        <main style={{ paddingTop: '0' }}>
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>กำลังโหลด...</div>
        </main>
        <Footer />
      </>
    }>
      <BlogContent />
    </Suspense>
  );
}

function BlogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [tagFilter, setTagFilter] = useState(searchParams.get('tag') || 'all');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        search,
        tag: tagFilter,
      });

      const res = await fetch(`/api/blog?${params}`);
      const data = await res.json();

      setPosts(data.posts || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/tags')
      .then(res => res.json())
      .then(data => setAllTags(data.tags || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, tagFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (tagFilter !== 'all') params.set('tag', tagFilter);
    if (currentPage > 1) params.set('page', currentPage.toString());

    const queryString = params.toString();
    router.replace(queryString ? `?${queryString}` : '/blog', { scroll: false });
  }, [currentPage, tagFilter, search, router]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchPosts();
  };

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '0' }}>
        {/* Header */}
        <section style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #faf5ff 100%)',
          padding: '60px 0',
        }}>
          <div className="container">
            <h1 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '16px',
            }}>
              บทความ
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.125rem' }}>
              เรียนรู้เทคนิคและแนวคิดด้านการเขียนโปรแกรมจากบทความของเรา
            </p>
          </div>
        </section>

        {/* Blog Grid */}
        <section className="section">
          <div className="container">
            {/* Filters */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              marginBottom: '32px',
              padding: '20px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ position: 'relative', minWidth: '200px', flex: 1, maxWidth: '300px' }}>
                <input
                  type="text"
                  placeholder="ค้นหาบทความ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              {allTags.length > 0 && (
                <select
                  value={tagFilter}
                  onChange={(e) => { setTagFilter(e.target.value); setCurrentPage(1); }}
                  style={{
                    padding: '10px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: 'white',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="all">ทุกแท็ก</option>
                  {allTags.map(tag => (
                    <option key={tag.id} value={tag.slug}>{tag.name}</option>
                  ))}
                </select>
              )}

              <button
                onClick={handleSearch}
                style={{
                  padding: '10px 20px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                ค้นหา
              </button>

              <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.875rem' }}>
                {pagination ? `${pagination.total} บทความ` : '...'}
              </div>
            </div>

            {/* Loading */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #e2e8f0',
                  borderTopColor: '#2563eb',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px',
                }} />
                <p>กำลังโหลดบทความ...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: '#1e293b' }}>
                  ไม่พบบทความ
                </h3>
                <p>ลองเปลี่ยนเงื่อนไขการค้นหา หรือกลับมาใหม่ภายหลัง</p>
              </div>
            ) : (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '24px',
                }}>
                  {posts.map(post => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <article style={{
                        background: 'white',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                        className="card"
                      >
                        {/* Thumbnail */}
                        <div style={{
                          aspectRatio: '16/9',
                          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                          position: 'relative',
                          overflow: 'hidden',
                        }}>
                          {normalizeUrl(post.thumbnailUrl) ? (
                            <img
                              src={normalizeUrl(post.thumbnailUrl)!}
                              alt={post.title}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <svg style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.5)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          {/* Tags */}
                          {post.tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                              {post.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag.id}
                                  style={{
                                    padding: '2px 10px',
                                    background: '#f5f3ff',
                                    color: '#7c3aed',
                                    borderRadius: '50px',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                  }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}

                          <h2 style={{
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            color: '#1e293b',
                            marginBottom: '8px',
                            lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {post.title}
                          </h2>

                          {post.excerpt && (
                            <p style={{
                              color: '#64748b',
                              fontSize: '0.875rem',
                              lineHeight: 1.6,
                              marginBottom: '16px',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              flex: 1,
                            }}>
                              {post.excerpt}
                            </p>
                          )}

                          {/* Meta */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.8125rem',
                            color: '#94a3b8',
                            marginTop: 'auto',
                          }}>
                            {post.authorName && <span>โดย {post.authorName}</span>}
                            <span>{formatDate(post.publishedAt)}</span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '48px',
                  }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '10px 20px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: 'white',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        opacity: currentPage === 1 ? 0.5 : 1,
                        fontWeight: 500,
                      }}
                    >
                      ← ก่อนหน้า
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage === pagination.totalPages}
                      style={{
                        padding: '10px 20px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: 'white',
                        cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                        opacity: currentPage === pagination.totalPages ? 0.5 : 1,
                        fontWeight: 500,
                      }}
                    >
                      ถัดไป →
                    </button>
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
