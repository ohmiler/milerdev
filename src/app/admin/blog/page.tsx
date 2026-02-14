'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetch('/api/admin/blog')
      .then(res => res.json())
      .then(data => setPosts(data.posts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = posts.filter(p =>
    statusFilter === 'all' || p.status === statusFilter
  );

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

      {/* Status Filter */}
      <div style={{
        display: 'flex',
        gap: '4px',
        background: '#f1f5f9',
        borderRadius: '8px',
        padding: '4px',
        marginBottom: '16px',
        width: 'fit-content',
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
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                    {post.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '12px' }}>
                    <span>/{post.slug}</span>
                    {post.authorName && <span>โดย {post.authorName}</span>}
                    {post.publishedAt && (
                      <span>{new Date(post.publishedAt).toLocaleDateString('th-TH')}</span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '50px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  background: post.status === 'published' ? '#dcfce7' : '#fef3c7',
                  color: post.status === 'published' ? '#16a34a' : '#d97706',
                  flexShrink: 0,
                }}>
                  {post.status === 'published' ? 'เผยแพร่' : 'แบบร่าง'}
                </span>

                {/* Actions */}
                <Link
                  href={`/admin/blog/${post.id}/edit`}
                  style={{
                    padding: '8px 16px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    flexShrink: 0,
                  }}
                >
                  แก้ไข
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
