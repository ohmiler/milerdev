'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Copy, ExternalLink, File, FileImage, FileText, Film, HardDrive, Search, Trash2, Upload } from 'lucide-react';

import { AdminConfirmActionDialog } from '@/components/admin/ui/AdminConfirmActionDialog';
import {
  AdminEmptyState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPageHeader,
  AdminPendingLabel,
  AdminSection,
  AdminStatusBadge,
} from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { NativeSelect } from '@/components/ui/native-select';
import { showToast } from '@/components/ui/Toast';

interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  type: string;
  createdAt: string;
}

interface Stats {
  total: number;
  images: number;
  videos: number;
  documents: number;
  totalSize: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function MediaTypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'image') return <FileImage aria-hidden className={className} />;
  if (type === 'video') return <Film aria-hidden className={className} />;
  if (type === 'document') return <FileText aria-hidden className={className} />;
  return <File aria-hidden className={className} />;
}

export default function AdminMediaPage() {
  const [mediaList, setMediaList] = useState<MediaFile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        type: typeFilter,
        search,
      });
      const res = await fetch('/api/admin/media?' + params);
      const data = await res.json();
      setMediaList(data.media || []);
      setStats(data.stats || null);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, typeFilter]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/media', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          showToast(data.error || 'เกิดข้อผิดพลาดในการอัพโหลด', 'error');
        }
      }
      await fetchMedia();
      showToast('อัพโหลดสำเร็จ', 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast('เกิดข้อผิดพลาดในการอัพโหลด', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmDeleteMedia = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm;
    setDeleting(id);

    try {
      const res = await fetch('/api/admin/media/' + id, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirm(null);
        await fetchMedia();
        if (selectedMedia?.id === id) setSelectedMedia(null);
        showToast('ลบไฟล์สำเร็จ', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'เกิดข้อผิดพลาดในการลบ', 'error');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showToast('เกิดข้อผิดพลาดในการลบ', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const unit = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(unit));
    return parseFloat((bytes / Math.pow(unit, index)).toFixed(2)) + ' ' + sizes[index];
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('คัดลอก URL แล้ว', 'success');
  };

  const deleteTarget = mediaList.find((file) => file.id === deleteConfirm) ?? selectedMedia;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Media Library"
        title="จัดการไฟล์สื่อ"
        description="อัปโหลด ค้นหา และตรวจรายละเอียดไฟล์ที่ใช้กับคอร์สจากจุดเดียว"
        meta="รองรับการอัปโหลดรูปภาพหลายไฟล์พร้อมกัน"
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={handleUpload}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? (
                <AdminPendingLabel>กำลังอัปโหลด...</AdminPendingLabel>
              ) : (
                <>
                  <Upload aria-hidden />
                  อัปโหลดรูปภาพ
                </>
              )}
            </Button>
          </>
        }
      />

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label="ไฟล์ทั้งหมด"
            value={stats.total.toLocaleString('th-TH')}
            detail={'ใช้พื้นที่ ' + formatFileSize(stats.totalSize)}
            icon={<HardDrive />}
          />
          <AdminMetricCard label="รูปภาพ" value={stats.images.toLocaleString('th-TH')} icon={<FileImage />} tone="info" />
          <AdminMetricCard label="วิดีโอ" value={stats.videos.toLocaleString('th-TH')} icon={<Film />} tone="warning" />
          <AdminMetricCard label="เอกสาร" value={stats.documents.toLocaleString('th-TH')} icon={<FileText />} />
        </div>
      ) : null}

      <AdminSection
        title="คลังไฟล์"
        description="เลือกไฟล์เพื่อดู URL ขนาด และข้อมูลสำหรับใช้งานต่อ"
        actions={
          pagination ? (
            <AdminStatusBadge tone="info">{pagination.total.toLocaleString('th-TH')} ไฟล์</AdminStatusBadge>
          ) : undefined
        }
      >
        <div className="mb-5 grid gap-3 md:grid-cols-[180px_minmax(220px,1fr)_auto]">
          <NativeSelect
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setCurrentPage(1);
            }}
            aria-label="กรองประเภทไฟล์"
          >
            <option value="all">ทุกประเภท</option>
            <option value="image">รูปภาพ</option>
            <option value="video">วิดีโอ</option>
            <option value="document">เอกสาร</option>
          </NativeSelect>
          <InputGroup>
            <InputGroupAddon><Search aria-hidden /></InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setCurrentPage(1);
                  fetchMedia();
                }
              }}
              placeholder="ค้นหาชื่อไฟล์"
              aria-label="ค้นหาชื่อไฟล์"
            />
          </InputGroup>
          <Button
            variant="outline"
            onClick={() => {
              setCurrentPage(1);
              fetchMedia();
            }}
          >
            ค้นหา
          </Button>
        </div>

        {loading && mediaList.length === 0 ? (
          <AdminLoadingState title="กำลังโหลดไฟล์สื่อ" />
        ) : mediaList.length === 0 ? (
          <AdminEmptyState
            title="ยังไม่มีไฟล์ที่ตรงกับเงื่อนไข"
            description="อัปโหลดรูปภาพใหม่ หรือลองเปลี่ยนประเภทและคำค้นหา"
            icon={<FileImage />}
            action={
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload aria-hidden />
                อัปโหลดรูปภาพ
              </Button>
            }
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {mediaList.map((file) => (
                  <Button
                    key={file.id}
                    type="button"
                    variant={selectedMedia?.id === file.id ? 'secondary' : 'outline'}
                    onClick={() => setSelectedMedia(file)}
                    aria-pressed={selectedMedia?.id === file.id}
                    className="group block h-auto w-full overflow-hidden whitespace-normal p-0 text-left"
                  >
                    <span className="relative grid aspect-square place-items-center overflow-hidden bg-muted">
                      {file.type === 'image' ? (
                        <Image
                          src={file.url}
                          alt={file.originalName}
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 180px"
                          className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <MediaTypeIcon type={file.type} className="size-9 text-muted-foreground" />
                      )}
                    </span>
                    <span className="block p-3">
                      <span className="block truncate text-xs font-medium text-foreground">{file.originalName}</span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">{formatFileSize(file.size)}</span>
                    </span>
                  </Button>
                ))}
              </div>

              {pagination && pagination.totalPages > 1 ? (
                <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    หน้า {currentPage.toLocaleString('th-TH')} จาก {pagination.totalPages.toLocaleString('th-TH')}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1 || loading}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                      ก่อนหน้า
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === pagination.totalPages || loading}
                      onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))}
                    >
                      ถัดไป
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            {selectedMedia ? (
              <Card className="h-fit rounded-xl shadow-none xl:sticky xl:top-6">
                <div className="relative grid aspect-video place-items-center overflow-hidden bg-muted">
                  {selectedMedia.type === 'image' ? (
                    <Image
                      src={selectedMedia.url}
                      alt={selectedMedia.originalName}
                      fill
                      unoptimized
                      sizes="320px"
                      className="object-contain"
                    />
                  ) : (
                    <MediaTypeIcon type={selectedMedia.type} className="size-12 text-muted-foreground" />
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="break-all text-sm">{selectedMedia.originalName}</CardTitle>
                  <CardDescription>{selectedMedia.mimeType}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
                    <dt className="text-muted-foreground">ขนาด</dt>
                    <dd className="text-right text-foreground">{formatFileSize(selectedMedia.size)}</dd>
                    <dt className="text-muted-foreground">อัปโหลดเมื่อ</dt>
                    <dd className="text-right text-foreground">{formatDate(selectedMedia.createdAt)}</dd>
                    <dt className="text-muted-foreground">ชื่อไฟล์</dt>
                    <dd className="truncate text-right text-foreground" title={selectedMedia.filename}>
                      {selectedMedia.filename}
                    </dd>
                  </dl>

                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">URL</p>
                    <Input value={selectedMedia.url} readOnly className="text-xs" aria-label="URL ของไฟล์" />
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(selectedMedia.url)}>
                        <Copy aria-hidden />
                        คัดลอก
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedMedia.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink aria-hidden />
                          เปิดดู
                        </a>
                      </Button>
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={deleting === selectedMedia.id}
                    onClick={() => setDeleteConfirm(selectedMedia.id)}
                  >
                    <Trash2 aria-hidden />
                    ลบไฟล์
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-fit rounded-xl border-dashed bg-muted/20 shadow-none">
                <CardContent className="grid min-h-56 place-items-center text-center">
                  <div>
                    <FileImage className="mx-auto size-8 text-muted-foreground" aria-hidden />
                    <p className="mt-3 text-sm font-medium text-foreground">เลือกไฟล์เพื่อดูรายละเอียด</p>
                    <p className="mt-1 text-xs text-muted-foreground">URL และข้อมูลไฟล์จะแสดงที่นี่</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </AdminSection>

      <AdminConfirmActionDialog
        open={Boolean(deleteConfirm)}
        title="ลบไฟล์"
        description="ไฟล์จะถูกลบออกจากคลัง หากมีหน้าอื่นอ้างถึง URL นี้ ลิงก์หรือรูปภาพอาจไม่แสดง"
        target={deleteTarget ? deleteTarget.originalName + ' · ' + formatFileSize(deleteTarget.size) : undefined}
        confirmLabel="ลบไฟล์"
        pendingLabel="กำลังลบ"
        pending={Boolean(deleting)}
        onConfirm={confirmDeleteMedia}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
      />
    </div>
  );
}
