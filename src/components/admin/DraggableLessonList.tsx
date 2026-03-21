'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  videoDuration: number | null;
  orderIndex: number | null;
  isFreePreview: boolean | null;
}

interface DraggableLessonListProps {
  lessons: Lesson[];
  courseId: string;
  onDelete: (lessonId: string) => void;
  onReorder: (lessonIds: string[]) => void;
  onLessonUpdate?: (lessonId: string, data: Partial<Lesson>) => void;
}

type FilterType = 'all' | 'no-video' | 'has-video';

interface SortableItemProps {
  lesson: Lesson;
  index: number;
  onDelete: (lessonId: string) => void;
  editingVideoId: string | null;
  onEditVideo: (lessonId: string | null) => void;
  onSaveVideo: (lessonId: string, videoUrl: string, videoDuration: number) => void;
  savingVideoId: string | null;
}

function SortableItem({ lesson, index, onDelete, editingVideoId, onEditVideo, onSaveVideo, savingVideoId }: SortableItemProps) {
  const formatDurationStr = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || '');
  const [videoDuration, setVideoDuration] = useState(() => formatDurationStr(lesson.videoDuration || 0));
  const [prevVideoUrl, setPrevVideoUrl] = useState(lesson.videoUrl);
  const [prevDuration, setPrevDuration] = useState(lesson.videoDuration);

  if (lesson.videoUrl !== prevVideoUrl || lesson.videoDuration !== prevDuration) {
    setVideoUrl(lesson.videoUrl || '');
    setVideoDuration(formatDurationStr(lesson.videoDuration || 0));
    setPrevVideoUrl(lesson.videoUrl);
    setPrevDuration(lesson.videoDuration);
  }

  const isEditing = editingVideoId === lesson.id;
  const isSaving = savingVideoId === lesson.id;
  const hasContent = Boolean(lesson.content && lesson.content.trim().length > 0);
  const needsAttention = !lesson.videoUrl || !hasContent;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    let durationInSeconds = 0;
    if (videoDuration.includes(':')) {
      const [m, s] = videoDuration.split(':');
      durationInSeconds = (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
    } else {
      durationInSeconds = Math.round(parseFloat(videoDuration) * 60) || 0;
    }
    onSaveVideo(lesson.id, videoUrl, durationInSeconds);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: isEditing ? 'none' : '1px solid #e2e8f0',
          background: isDragging ? '#f1f5f9' : isEditing ? '#f8fafc' : needsAttention ? 'linear-gradient(90deg, rgba(255,247,237,0.65), rgba(255,255,255,0))' : 'white',
        }}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            padding: '6px',
            marginRight: '8px',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg style={{ width: '16px', height: '16px' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
          </svg>
        </div>

        {/* Number Badge */}
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: lesson.videoUrl && hasContent ? '#dcfce7' : '#fef3c7',
          color: lesson.videoUrl && hasContent ? '#16a34a' : '#d97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: '0.75rem',
          marginRight: '12px',
          flexShrink: 0,
        }}>
          {index + 1}
        </div>

        {/* Lesson Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/admin/lessons/${lesson.id}/edit`}
            style={{ fontWeight: 600, color: '#1e293b', textDecoration: 'none', display: 'block', fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#2563eb')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#1e293b')}
          >
            {lesson.title}
          </Link>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
            {lesson.videoDuration && lesson.videoDuration > 0 && (
              <span>⏱️ {Math.floor(lesson.videoDuration / 60)}:{(lesson.videoDuration % 60) < 10 ? '0' : ''}{lesson.videoDuration % 60}</span>
            )}
            {lesson.isFreePreview && (
              <span style={{ color: '#16a34a' }}>🆓 ดูฟรี</span>
            )}
            {hasContent && (
              <span>📝 มีเนื้อหา</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
            {!lesson.videoUrl && (
              <span style={{ padding: '4px 8px', borderRadius: '999px', background: '#fff7ed', color: '#c2410c', fontSize: '0.68rem', fontWeight: 600 }}>
                ยังไม่มีวิดีโอ
              </span>
            )}
            {!hasContent && (
              <span style={{ padding: '4px 8px', borderRadius: '999px', background: '#fef2f2', color: '#dc2626', fontSize: '0.68rem', fontWeight: 600 }}>
                ยังไม่มีเนื้อหา
              </span>
            )}
            {lesson.videoUrl && hasContent && (
              <span style={{ padding: '4px 8px', borderRadius: '999px', background: '#dcfce7', color: '#166534', fontSize: '0.68rem', fontWeight: 600 }}>
                พร้อมใช้งาน
              </span>
            )}
            {needsAttention && (
              <span style={{ padding: '4px 8px', borderRadius: '999px', background: '#fff7ed', color: '#9a3412', fontSize: '0.68rem', fontWeight: 600 }}>
                ควรตรวจ
              </span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onEditVideo(isEditing ? null : lesson.id)}
            title={lesson.videoUrl ? 'แก้ไข URL วิดีโอ' : 'เพิ่ม URL วิดีโอ'}
            style={{
              padding: '7px 10px',
              background: lesson.videoUrl ? '#dcfce7' : '#fef3c7',
              color: lesson.videoUrl ? '#16a34a' : '#d97706',
              border: isEditing ? '2px solid #2563eb' : 'none',
              borderRadius: '6px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {lesson.videoUrl ? 'แก้ไขวิดีโอ' : 'เพิ่มวิดีโอ'}
          </button>
          <Link
            href={`/admin/lessons/${lesson.id}/edit`}
            style={{
              padding: '7px 10px',
              background: '#eff6ff',
              color: '#2563eb',
              borderRadius: '6px',
              fontSize: '0.75rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            แก้ไข
          </Link>
          <button
            onClick={() => onDelete(lesson.id)}
            style={{
              padding: '7px 10px',
              background: '#fef2f2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            ลบ
          </button>
        </div>
      </div>

      {/* Inline Video Edit */}
      {isEditing && (
        <div style={{
          padding: '12px 20px 12px 76px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Bunny Video GUID หรือ Embed URL"
            autoFocus
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '0.85rem',
            }}
          />
          <input
            type="text"
            value={videoDuration}
            onChange={(e) => {
              if (/^[0-9:]*$/.test(e.target.value)) setVideoDuration(e.target.value);
            }}
            placeholder="นาที:วินาที"
            style={{
              width: '90px',
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '0.85rem',
            }}
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {isSaving ? '...' : 'บันทึก'}
          </button>
          <button
            onClick={() => onEditVideo(null)}
            style={{
              padding: '8px 12px',
              background: '#f1f5f9',
              color: '#64748b',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            ยกเลิก
          </button>
        </div>
      )}
    </div>
  );
}

export default function DraggableLessonList({
  lessons: initialLessons,
  courseId,
  onDelete,
  onReorder,
  onLessonUpdate,
}: DraggableLessonListProps) {
  const [lessons, setLessons] = useState(initialLessons);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [savingVideoId, setSavingVideoId] = useState<string | null>(null);

  // Sync local state when parent fetches new lessons after save
  useEffect(() => {
    setLessons(initialLessons);
  }, [initialLessons]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSaveVideo = async (lessonId: string, videoUrl: string, videoDuration: number) => {
    setSavingVideoId(lessonId);
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: videoUrl || null, videoDuration }),
      });
      if (res.ok) {
        // Update local state
        setLessons(prev => prev.map(l =>
          l.id === lessonId ? { ...l, videoUrl: videoUrl || null, videoDuration } : l
        ));
        if (onLessonUpdate) {
          onLessonUpdate(lessonId, { videoUrl: videoUrl || null, videoDuration });
        }
        setEditingVideoId(null);
      } else {
        alert('ไม่สามารถบันทึกได้ กรุณาลองใหม่');
      }
    } catch {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSavingVideoId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = lessons.findIndex((l) => l.id === active.id);
      const newIndex = lessons.findIndex((l) => l.id === over.id);

      const newLessons = arrayMove(lessons, oldIndex, newIndex);
      setLessons(newLessons);

      // Save to server
      setSaving(true);
      try {
        const res = await fetch(`/api/admin/courses/${courseId}/lessons/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonIds: newLessons.map((l) => l.id) }),
        });

        if (!res.ok) {
          setLessons(lessons);
          alert('ไม่สามารถจัดลำดับได้ กรุณาลองใหม่');
        } else {
          onReorder(newLessons.map((l) => l.id));
        }
      } catch {
        setLessons(lessons);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
      } finally {
        setSaving(false);
      }
    }
  };

  // Filter & search
  const isFiltering = search.trim() !== '' || filter !== 'all';
  const filteredLessons = lessons.filter((l) => {
    if (search.trim() && !l.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'no-video' && l.videoUrl) return false;
    if (filter === 'has-video' && !l.videoUrl) return false;
    return true;
  });

  const videoCount = lessons.filter(l => l.videoUrl).length;
  const totalCount = lessons.length;
  const progressPercent = totalCount > 0 ? Math.round((videoCount / totalCount) * 100) : 0;
  const contentCount = lessons.filter(l => l.content && l.content.trim().length > 0).length;
  const previewCount = lessons.filter(l => l.isFreePreview).length;

  if (lessons.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>ยังไม่มีบทเรียน</div>
        <div style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>เริ่มเพิ่มบทเรียนแรกเพื่อสร้างโครงสร้างคอร์ส และค่อยเติมวิดีโอหรือเนื้อหาในลำดับถัดไป</div>
      </div>
    );
  }

  const filterBtnStyle = (active: boolean) => ({
    padding: '4px 12px',
    background: active ? '#2563eb' : '#f1f5f9',
    color: active ? 'white' : '#64748b',
    border: 'none',
    borderRadius: '20px',
    fontSize: '0.75rem',
    cursor: 'pointer' as const,
    whiteSpace: 'nowrap' as const,
  });

  return (
    <div style={{ position: 'relative' }}>
      {saving && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: '#2563eb',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '0.875rem',
          zIndex: 10,
        }}>
          กำลังบันทึก...
        </div>
      )}

      {/* Toolbar: Search + Filter + Progress */}
      <div style={{
        padding: '16px 20px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {/* Search */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาบทเรียน..."
            style={{
              flex: 1,
              minWidth: '240px',
              padding: '9px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.85rem',
              background: 'white',
            }}
          />
          <button onClick={() => setFilter('all')} style={filterBtnStyle(filter === 'all')}>
            ทั้งหมด ({totalCount})
          </button>
          <button onClick={() => setFilter('no-video')} style={filterBtnStyle(filter === 'no-video')}>
            ⚠️ ยังไม่มีวิดีโอ ({totalCount - videoCount})
          </button>
          <button onClick={() => setFilter('has-video')} style={filterBtnStyle(filter === 'has-video')}>
            🎬 มีวิดีโอแล้ว ({videoCount})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ padding: '6px 10px', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, fontSize: '0.75rem' }}>
            เนื้อหาพร้อม {contentCount}/{totalCount}
          </span>
          <span style={{ padding: '6px 10px', borderRadius: '999px', background: '#f5f3ff', color: '#7c3aed', fontWeight: 600, fontSize: '0.75rem' }}>
            Preview ฟรี {previewCount}
          </span>
          {isFiltering && (
            <button
              onClick={() => { setSearch(''); setFilter('all'); }}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#2563eb',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: progressPercent === 100 ? '#16a34a' : '#2563eb',
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
            {progressPercent === 100 ? '✅' : '🎬'} {videoCount}/{totalCount} ({progressPercent}%)
          </span>
        </div>

        {!isFiltering && (
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            ลากเพื่อจัดลำดับ และใช้ quick action เพื่อเติมวิดีโอได้ทันทีจาก list นี้
          </div>
        )}
      </div>

      {/* Lesson List */}
      {isFiltering ? (
        // Simple list when filtering (no DnD)
        <div>
          {filteredLessons.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              ไม่พบบทเรียนที่ตรงกับเงื่อนไข
            </div>
          ) : (
            filteredLessons.map((lesson) => {
              const originalIndex = lessons.findIndex(l => l.id === lesson.id);
              return (
                <SortableItem
                  key={lesson.id}
                  lesson={lesson}
                  index={originalIndex}
                  onDelete={onDelete}
                  editingVideoId={editingVideoId}
                  onEditVideo={setEditingVideoId}
                  onSaveVideo={handleSaveVideo}
                  savingVideoId={savingVideoId}
                />
              );
            })
          )}
        </div>
      ) : (
        // DnD list when not filtering
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            {lessons.map((lesson, index) => (
              <SortableItem
                key={lesson.id}
                lesson={lesson}
                index={index}
                onDelete={onDelete}
                editingVideoId={editingVideoId}
                onEditVideo={setEditingVideoId}
                onSaveVideo={handleSaveVideo}
                savingVideoId={savingVideoId}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
