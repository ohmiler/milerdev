'use client';

import { useState, useEffect, useRef } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        type: typeFilter,
        search,
      });
      const res = await fetch(`/api/admin/media?${params}`);
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const confirmDeleteMedia = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm;
    setDeleteConfirm(null);

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/media/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchMedia();
        if (selectedMedia?.id === id) {
          setSelectedMedia(null);
        }
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
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('คัดลอก URL แล้ว', 'success');
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
            จัดการไฟล์สื่อ
          </h1>
          <p style={{ color: '#64748b' }}>อัพโหลดและจัดการรูปภาพสำหรับคอร์ส</p>
        </div>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: '12px 24px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.7 : 1,
            }}
          >
            {uploading ? 'กำลังอัพโหลด...' : '+ อัพโหลดรูปภาพ'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>ไฟล์ทั้งหมด</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{stats.total}</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>รูปภาพ</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>{stats.images}</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '4px' }}>พื้นที่ใช้งาน</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{formatFileSize(stats.totalSize)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '10px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: 'white',
            fontSize: '0.875rem',
          }}
        >
          <option value="all">ทุกประเภท</option>
          <option value="image">รูปภาพ</option>
          <option value="video">วิดีโอ</option>
          <option value="document">เอกสาร</option>
        </select>
        <input
          type="text"
          placeholder="ค้นหาชื่อไฟล์..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchMedia()}
          style={{
            padding: '10px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: 'white',
            fontSize: '0.875rem',
            minWidth: '200px',
          }}
        />
        <button
          onClick={fetchMedia}
          style={{
            padding: '10px 20px',
            background: '#f1f5f9',
            color: '#475569',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          ค้นหา
        </button>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Media Grid */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              กำลังโหลด...
            </div>
          ) : mediaList.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '60px',
              textAlign: 'center',
              color: '#64748b',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📷</div>
              <div>ยังไม่มีไฟล์ กดปุ่มด้านบนเพื่ออัพโหลด</div>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '16px',
              }}>
                {mediaList.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setSelectedMedia(file)}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      border: selectedMedia?.id === file.id ? '2px solid #2563eb' : '2px solid transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      aspectRatio: '1',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {file.type === 'image' ? (
                        <img
                          src={file.url}
                          alt={file.originalName}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '2rem' }}>📄</span>
                      )}
                    </div>
                    <div style={{ padding: '12px' }}>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#1e293b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {file.originalName}
                      </div>
                      <div style={{ fontSize: '0.625rem', color: '#94a3b8', marginTop: '4px' }}>
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '24px',
                }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      background: 'white',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1,
                    }}
                  >
                    ก่อนหน้า
                  </button>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                    หน้า {currentPage} จาก {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={currentPage === pagination.totalPages}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      background: 'white',
                      cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === pagination.totalPages ? 0.5 : 1,
                    }}
                  >
                    ถัดไป
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Preview Panel */}
        {selectedMedia && (
          <div style={{
            width: '320px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            <div style={{
              aspectRatio: '16/9',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {selectedMedia.type === 'image' ? (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.originalName}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <span style={{ fontSize: '3rem' }}>📄</span>
              )}
            </div>
            <div style={{ padding: '20px' }}>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '16px',
                wordBreak: 'break-all',
              }}>
                {selectedMedia.originalName}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>ขนาด</span>
                  <span style={{ color: '#1e293b' }}>{formatFileSize(selectedMedia.size)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>ประเภท</span>
                  <span style={{ color: '#1e293b' }}>{selectedMedia.mimeType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>อัพโหลดเมื่อ</span>
                  <span style={{ color: '#1e293b' }}>{formatDate(selectedMedia.createdAt)}</span>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  URL
                </label>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                }}>
                  <input
                    type="text"
                    value={selectedMedia.url}
                    readOnly
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      background: '#f8fafc',
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(selectedMedia.url)}
                    style={{
                      padding: '8px 12px',
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    คัดลอก
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={selectedMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#f1f5f9',
                    color: '#475569',
                    textAlign: 'center',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                  }}
                >
                  เปิดดู
                </a>
                <button
                  onClick={() => setDeleteConfirm(selectedMedia.id)}
                  disabled={deleting === selectedMedia.id}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: deleting === selectedMedia.id ? 'not-allowed' : 'pointer',
                    opacity: deleting === selectedMedia.id ? 0.7 : 1,
                    fontSize: '0.875rem',
                  }}
                >
                  {deleting === selectedMedia.id ? 'กำลังลบ...' : 'ลบ'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="ลบไฟล์"
        message="คุณแน่ใจหรือไม่ที่จะลบไฟล์นี้?"
        confirmText="ลบไฟล์"
        onConfirm={confirmDeleteMedia}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
