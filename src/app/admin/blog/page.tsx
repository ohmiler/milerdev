'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileText, Plus, Search } from 'lucide-react';

import {
  AdminEmptyState,
  AdminLoadingState,
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
} from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

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
  return 'https://' + url;
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
      .then((response) => response.json())
      .then((data) => setPosts(data.posts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleToggleStatus = async (post: BlogPost) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    setTogglingId(post.id);
    try {
      const res = await fetch('/api/admin/blog/' + post.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setPosts((current) =>
          current.map((candidate) => (candidate.id === post.id ? { ...candidate, status: newStatus } : candidate)),
        );
      }
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = posts.filter((post) => {
    const matchStatus = statusFilter === 'all' || post.status === statusFilter;
    const query = search.toLowerCase();
    const matchSearch = !search || post.title.toLowerCase().includes(query) || post.slug.includes(query);
    return matchStatus && matchSearch;
  });

  const publishedCount = posts.filter((post) => post.status === 'published').length;
  const draftCount = posts.filter((post) => post.status === 'draft').length;
  const filters = [
    { value: 'all', label: 'ทั้งหมด', count: posts.length },
    { value: 'published', label: 'เผยแพร่', count: publishedCount },
    { value: 'draft', label: 'แบบร่าง', count: draftCount },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Editorial"
        title="จัดการบทความ"
        description="ค้นหา ตรวจสถานะ และเปิดหน้าแก้ไขบทความจาก editorial workspace เดียว"
        actions={
          <Button asChild>
            <Link href="/admin/blog/new">
              <Plus aria-hidden />
              เขียนบทความใหม่
            </Link>
          </Button>
        }
      />

      <AdminSection
        title="รายการบทความ"
        description="สวิตช์สถานะใช้เผยแพร่หรือถอดบทความกลับเป็นแบบร่างได้ทันที"
        actions={<AdminStatusBadge tone="info">{posts.length.toLocaleString('th-TH')} บทความ</AdminStatusBadge>}
      >
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
            {filters.map((filter) => (
              <Button
                key={filter.value}
                type="button"
                variant={statusFilter === filter.value ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(statusFilter === filter.value && 'bg-card shadow-xs')}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
                <span className="text-xs text-muted-foreground">{filter.count.toLocaleString('th-TH')}</span>
              </Button>
            ))}
          </div>
          <InputGroup className="min-w-0 flex-1">
            <InputGroupAddon><Search aria-hidden /></InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาชื่อบทความหรือ slug"
              aria-label="ค้นหาบทความ"
            />
          </InputGroup>
        </div>

        {loading ? (
          <AdminLoadingState title="กำลังโหลดบทความ" />
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            title={posts.length === 0 ? 'ยังไม่มีบทความ' : 'ไม่พบบทความ'}
            description={
              posts.length === 0
                ? 'เริ่มเขียนบทความแรกเพื่อสร้างเนื้อหาสำหรับเว็บไซต์'
                : 'ลองเปลี่ยนสถานะหรือคำค้นหา'
            }
            icon={<FileText />}
            action={
              posts.length === 0 ? (
                <Button variant="outline" asChild>
                  <Link href="/admin/blog/new">
                    <Plus aria-hidden />
                    เขียนบทความแรก
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((post) => {
              const thumbnailUrl = normalizeUrl(post.thumbnailUrl);
              const published = post.status === 'published';

              return (
                <article
                  key={post.id}
                  className="grid gap-4 py-4 first:pt-0 last:pb-0 md:grid-cols-[112px_minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="relative aspect-[5/3] overflow-hidden rounded-lg bg-muted">
                    {thumbnailUrl ? (
                      <Image
                        src={thumbnailUrl}
                        alt={post.title}
                        fill
                        unoptimized
                        sizes="112px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="grid size-full place-items-center">
                        <FileText className="size-7 text-muted-foreground" aria-hidden />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate font-medium text-foreground">{post.title}</h2>
                    {post.excerpt ? <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{post.excerpt}</p> : null}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="max-w-52 truncate">/blog/{post.slug}</span>
                      {post.authorName ? <span>โดย {post.authorName}</span> : null}
                      <span>
                        {published && post.publishedAt
                          ? 'เผยแพร่ ' + new Date(post.publishedAt).toLocaleDateString('th-TH')
                          : post.createdAt
                            ? 'สร้าง ' + new Date(post.createdAt).toLocaleDateString('th-TH')
                            : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <Switch
                        checked={published}
                        disabled={togglingId === post.id}
                        onCheckedChange={() => handleToggleStatus(post)}
                        aria-label={(published ? 'ถอดจากเผยแพร่ ' : 'เผยแพร่ ') + post.title}
                      />
                      <AdminStatusBadge tone={published ? 'success' : 'warning'}>
                        {togglingId === post.id ? 'กำลังเปลี่ยน...' : published ? 'เผยแพร่' : 'แบบร่าง'}
                      </AdminStatusBadge>
                    </div>
                    {published ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={'/blog/' + post.slug} target="_blank">
                          <ExternalLink aria-hidden />
                          ดู
                        </Link>
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={'/admin/blog/' + post.id + '/edit'}>แก้ไข</Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </AdminSection>
    </div>
  );
}
