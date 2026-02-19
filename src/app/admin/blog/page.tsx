'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnailUrl: string | null;
  status: string;
  authorName: string | null;
  publishedAt: string | null;
  createdAt: string | null;
}

function normalizeUrl(url: string | null): string | null {
  if (!url || url.trim() === '') return null;
  if (url.startsWith('http')) return url;
  return `https://${url}`;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadPosts = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/blog?limit=100')
      .then(res => res.json())
      .then(data => setPosts(data.posts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleToggleStatus = async (post: BlogPost) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    setTogglingId(post.id);
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
      }
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = posts.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const publishedCount = posts.filter(p => p.status === 'published').length;
  const draftCount = posts.filter(p => p.status === 'draft').length;

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>
          จัดการบทความ ({posts.length})
        </h1>
        <Link
          href="/admin/blog/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: '#2563eb',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          + เขียนบทความใหม่
        </Link>
      </div>

      {/* Toolbar: Filter + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
      <div style={{
        display: 'flex',
        gap: '4px',
        background: '#f1f5f9',
        borderRadius: '8px',
        padding: '4px',
        flexShrink: 0,
      }}>
        {[
          { value: 'all', label: 'ทั้งหมด', count: posts.length },
          { value: 'published', label: 'เผยแพร่', count: publishedCount },
          { value: 'draft', label: 'แบบร่าง', count: draftCount },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
              background: statusFilter === tab.value ? 'white' : 'transparent',
              color: statusFilter === tab.value ? '#1e293b' : '#64748b',
              boxShadow: statusFilter === tab.value ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อบทความหรือ slug..."
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '8px 14px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '0.875rem',
            background: 'white',
            color: '#1e293b',
          }}
        />
      </div>

      {/* Posts List */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            กำลังโหลด...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            {posts.length === 0 ? (
              <div>
                <p style={{ marginBottom: '12px' }}>ยังไม่มีบทความ</p>
                <Link
                  href="/admin/blog/new"
                  style={{
                    padding: '10px 20px',
                    background: '#2563eb',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                  }}
                >
                  เขียนบทความแรก
                </Link>
              </div>
            ) : (
              <p>ไม่พบบทความที่ตรงกับตัวกรอง</p>
            )}
          </div>
        ) : (
          <div>
            {filtered.map(post => (
              <div
                key={post.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 20px',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: '100px',
                  height: '60px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  {normalizeUrl(post.thumbnailUrl) && (
                    <img
                      src={normalizeUrl(post.thumbnailUrl)!}
                      alt={post.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>/blog/{post.slug}</span>
                    {post.authorName && <span>โดย {post.authorName}</span>}
                    <span>
                      {post.status === 'published' && post.publishedAt
                        ? `เผยแพร่ ${new Date(post.publishedAt).toLocaleDateString('th-TH')}`
                        : post.createdAt
                        ? `สร้าง ${new Date(post.createdAt).toLocaleDateString('th-TH')}`
                        : ''}
                    </span>
                  </div>
                </div>

                {/* Quick toggle status */}
                <button
                  onClick={() => handleToggleStatus(post)}
                  disabled={togglingId === post.id}
                  title={post.status === 'published' ? 'คลิกเพื่อเปลี่ยนเป็นแบบร่าง' : 'คลิกเพื่อเผยแพร่'}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '50px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    border: '1px solid',
                    cursor: togglingId === post.id ? 'wait' : 'pointer',
                    background: post.status === 'published' ? '#dcfce7' : '#fef3c7',
                    borderColor: post.status === 'published' ? '#86efac' : '#fcd34d',
                    color: post.status === 'published' ? '#16a34a' : '#d97706',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                    opacity: togglingId === post.id ? 0.6 : 1,
                  }}
                >
                  {togglingId === post.id ? '...' : post.status === 'published' ? '✓ เผยแพร่' : 'แบบร่าง'}
                </button>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {post.status === 'published' && (
                    <Link
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      title="ดูบนเว็บ"
                      style={{
                        padding: '7px 10px',
                        background: '#f0fdf4',
                        color: '#16a34a',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '0.8125rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      ดู
                    </Link>
                  )}
                  <Link
                    href={`/admin/blog/${post.id}/edit`}
                    style={{
                      padding: '7px 14px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '0.8125rem',
                    }}
                  >
                    แก้ไข
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
