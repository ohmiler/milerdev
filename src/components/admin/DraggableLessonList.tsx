'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

type FilterType = 'all' | 'needs-work' | 'no-video' | 'ready';

interface SortableItemProps {
  lesson: Lesson;
  index: number;
  onDelete: (lessonId: string) => void;
  editingVideoId: string | null;
  onEditVideo: (lessonId: string | null) => void;
  onSaveVideo: (lessonId: string, videoUrl: string, videoDuration: number) => void;
  savingVideoId: string | null;
  disabledDrag?: boolean;
}

function formatDuration(totalSeconds: number | null) {
  const safeSeconds = totalSeconds || 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function parseDuration(value: string) {
  if (value.includes(':')) {
    const [minutes, seconds] = value.split(':');
    return (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
  }

  return Math.round(parseFloat(value) * 60) || 0;
}

function getLessonHealth(lesson: Lesson) {
  const hasContent = Boolean(lesson.content && lesson.content.trim().length > 0);
  const hasVideo = Boolean(lesson.videoUrl);

  if (hasVideo && hasContent) {
    return { label: 'พร้อมใช้งาน', className: 'ready' };
  }

  if (!hasVideo && !hasContent) {
    return { label: 'ขาดวิดีโอและเนื้อหา', className: 'danger' };
  }

  if (!hasVideo) {
    return { label: 'ขาดวิดีโอ', className: 'warning' };
  }

  return { label: 'ขาดเนื้อหา', className: 'warning' };
}

function SortableItem({
  lesson,
  index,
  onDelete,
  editingVideoId,
  onEditVideo,
  onSaveVideo,
  savingVideoId,
  disabledDrag,
}: SortableItemProps) {
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || '');
  const [videoDuration, setVideoDuration] = useState(formatDuration(lesson.videoDuration));
  const isEditing = editingVideoId === lesson.id;
  const isSaving = savingVideoId === lesson.id;
  const health = getLessonHealth(lesson);
  const hasContent = Boolean(lesson.content && lesson.content.trim().length > 0);
  const hasVideo = Boolean(lesson.videoUrl);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id, disabled: disabledDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.56 : 1,
  };

  const handleSave = () => {
    onSaveVideo(lesson.id, videoUrl, parseDuration(videoDuration));
  };

  return (
    <article ref={setNodeRef} style={style} className={isEditing ? 'admin-lesson-row editing' : 'admin-lesson-row'}>
      <div className="admin-lesson-row-main">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="admin-lesson-drag"
          aria-label="ลากเพื่อจัดลำดับบทเรียน"
          disabled={disabledDrag}
          {...attributes}
          {...listeners}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zM8 12a2 2 0 11-4 0 2 2 0 014 0zM8 18a2 2 0 11-4 0 2 2 0 014 0zM16 6a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 11-4 0 2 2 0 014 0zM16 18a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </Button>

        <div className={health.className === 'ready' ? 'admin-lesson-index ready' : 'admin-lesson-index'}>
          {String(index + 1).padStart(2, '0')}
        </div>

        <div className="admin-lesson-title-block">
          <div>
            <Link href={`/admin/lessons/${lesson.id}/edit`}>{lesson.title}</Link>
            <span className={`admin-lesson-health ${health.className}`}>{health.label}</span>
          </div>
          <div className="admin-lesson-meta">
            <span>{formatDuration(lesson.videoDuration)}</span>
            <span>{hasVideo ? 'มีวิดีโอ' : 'ยังไม่มีวิดีโอ'}</span>
            <span>{hasContent ? 'มีเนื้อหา' : 'ยังไม่มีเนื้อหา'}</span>
            {lesson.isFreePreview ? <span className="preview">Preview ฟรี</span> : null}
          </div>
        </div>

        <div className="admin-lesson-actions">
          <Button type="button" variant="outline" size="sm" onClick={() => onEditVideo(isEditing ? null : lesson.id)}>
            {lesson.videoUrl ? 'แก้วิดีโอ' : 'เพิ่มวิดีโอ'}
          </Button>
          <Link href={`/admin/lessons/${lesson.id}/edit`}>แก้ไข</Link>
          <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(lesson.id)}>ลบ</Button>
        </div>
      </div>

      {isEditing ? (
        <div className="admin-lesson-video-editor">
          <label>
            <span>Video source</span>
            <Input
              type="text"
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              placeholder="Bunny Video GUID หรือ Embed URL"
              autoFocus
            />
          </label>
          <label>
            <span>Duration</span>
            <Input
              type="text"
              value={videoDuration}
              onChange={(event) => {
                if (/^[0-9:]*$/.test(event.target.value)) setVideoDuration(event.target.value);
              }}
              placeholder="10:30"
            />
          </label>
          <div className="admin-lesson-video-actions">
            <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกวิดีโอ'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onEditVideo(null)}>ยกเลิก</Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function DraggableLessonList({
  lessons,
  courseId,
  onDelete,
  onReorder,
  onLessonUpdate,
}: DraggableLessonListProps) {
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [savingVideoId, setSavingVideoId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const totalCount = lessons.length;
  const videoCount = lessons.filter((lesson) => lesson.videoUrl).length;
  const contentCount = lessons.filter((lesson) => lesson.content && lesson.content.trim().length > 0).length;
  const readyCount = lessons.filter((lesson) => {
    const health = getLessonHealth(lesson);
    return health.className === 'ready';
  }).length;
  const needsWorkCount = totalCount - readyCount;
  const progressPercent = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;
  const isFiltering = search.trim() !== '' || filter !== 'all';

  const filteredLessons = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return lessons.filter((lesson) => {
      const health = getLessonHealth(lesson);
      if (normalizedSearch && !lesson.title.toLowerCase().includes(normalizedSearch)) return false;
      if (filter === 'needs-work' && health.className === 'ready') return false;
      if (filter === 'no-video' && lesson.videoUrl) return false;
      if (filter === 'ready' && health.className !== 'ready') return false;
      return true;
    });
  }, [filter, lessons, search]);

  const handleSaveVideo = async (lessonId: string, videoUrl: string, videoDuration: number) => {
    setSavingVideoId(lessonId);

    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: videoUrl || null, videoDuration }),
      });

      if (res.ok) {
        onLessonUpdate?.(lessonId, { videoUrl: videoUrl || null, videoDuration });
        setEditingVideoId(null);
      } else {
        alert('ไม่สามารถบันทึกวิดีโอได้ กรุณาลองใหม่');
      }
    } catch {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSavingVideoId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lessons.findIndex((lesson) => lesson.id === active.id);
    const newIndex = lessons.findIndex((lesson) => lesson.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previousLessonIds = lessons.map((lesson) => lesson.id);
    const newLessons = arrayMove(lessons, oldIndex, newIndex);
    const newLessonIds = newLessons.map((lesson) => lesson.id);

    onReorder(newLessonIds);
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/courses/${courseId}/lessons/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonIds: newLessonIds }),
      });

      if (!res.ok) {
        onReorder(previousLessonIds);
        alert('ไม่สามารถจัดลำดับได้ กรุณาลองใหม่');
      }
    } catch {
      onReorder(previousLessonIds);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { value: 'all', label: 'ทั้งหมด', count: totalCount },
    { value: 'needs-work', label: 'ต้องตรวจ', count: needsWorkCount },
    { value: 'no-video', label: 'ไม่มีวิดีโอ', count: totalCount - videoCount },
    { value: 'ready', label: 'พร้อม', count: readyCount },
  ] as const;

  if (lessons.length === 0) {
    return (
      <div className="admin-lesson-empty">
        <h3>ยังไม่มีบทเรียน</h3>
        <p>เพิ่มบทเรียนแรกเพื่อเริ่มวางโครงสร้างคอร์ส แล้วค่อยเติมวิดีโอและเนื้อหาในลำดับถัดไป</p>
        <style jsx>{`
          .admin-lesson-empty {
            display: grid;
            gap: 8px;
            place-items: center;
            padding: 58px 18px;
            color: var(--muted-foreground);
            text-align: center;
          }

          .admin-lesson-empty h3 {
            margin: 0;
            color: var(--foreground);
          }

          .admin-lesson-empty p {
            max-width: 520px;
            margin: 0;
            line-height: 1.7;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-lesson-list-shell">
      {saving ? <div className="admin-lesson-saving">กำลังบันทึกลำดับ...</div> : null}

      <div className="admin-lesson-toolbar">
        <label className="admin-lesson-search">
          <span>ค้นหาบทเรียน</span>
          <Input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ชื่อบทเรียน"
          />
        </label>

        <div className="admin-lesson-tabs" role="tablist" aria-label="กรองบทเรียน">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              aria-pressed={filter === tab.value}
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
              <span>{tab.count}</span>
            </button>
          ))}
        </div>

        {isFiltering ? (
          <button
            type="button"
            className="admin-lesson-clear"
            onClick={() => {
              setSearch('');
              setFilter('all');
            }}
          >
            ล้างตัวกรอง
          </button>
        ) : null}
      </div>

      <div className="admin-lesson-progress">
        <div>
          <span>พร้อมใช้งาน {readyCount}/{totalCount}</span>
          <strong>{progressPercent}%</strong>
        </div>
        <div className="admin-lesson-progress-track">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="admin-lesson-summary">
          <span>วิดีโอ {videoCount}/{totalCount}</span>
          <span>เนื้อหา {contentCount}/{totalCount}</span>
        </div>
      </div>

      {filteredLessons.length === 0 ? (
        <div className="admin-lesson-filter-empty">ไม่พบบทเรียนที่ตรงกับตัวกรอง</div>
      ) : isFiltering ? (
        <div className="admin-lesson-list">
          {filteredLessons.map((lesson) => {
            const originalIndex = lessons.findIndex((item) => item.id === lesson.id);
            return (
              <SortableItem
                key={`${lesson.id}:${lesson.videoUrl ?? ''}:${lesson.videoDuration ?? ''}`}
                lesson={lesson}
                index={originalIndex}
                onDelete={onDelete}
                editingVideoId={editingVideoId}
                onEditVideo={setEditingVideoId}
                onSaveVideo={handleSaveVideo}
                savingVideoId={savingVideoId}
                disabledDrag
              />
            );
          })}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={lessons.map((lesson) => lesson.id)} strategy={verticalListSortingStrategy}>
            <div className="admin-lesson-list">
              {lessons.map((lesson, index) => (
                <SortableItem
                  key={`${lesson.id}:${lesson.videoUrl ?? ''}:${lesson.videoDuration ?? ''}`}
                  lesson={lesson}
                  index={index}
                  onDelete={onDelete}
                  editingVideoId={editingVideoId}
                  onEditVideo={setEditingVideoId}
                  onSaveVideo={handleSaveVideo}
                  savingVideoId={savingVideoId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <style jsx global>{`
        .admin-lesson-list-shell {
          --brand: var(--primary);
          --brand-dark: var(--primary);
          --brand-soft: var(--secondary);
          --ink: var(--foreground);
          --muted: var(--muted-foreground);
          --line: var(--border);
          position: relative;
        }

        .admin-lesson-saving {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 2;
          min-height: 36px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          border-radius: 8px;
          background: var(--brand);
          color: var(--card);
          font-size: 0.8rem;
          font-weight: 800;
          box-shadow: none;
        }

        .admin-lesson-toolbar {
          display: grid;
          grid-template-columns: minmax(260px, 1fr) auto auto;
          gap: 12px;
          align-items: end;
          padding: 18px 20px;
          border-bottom: 1px solid var(--line);
          background: var(--muted);
        }

        .admin-lesson-search {
          display: grid;
          gap: 7px;
        }

        .admin-lesson-search span {
          color: var(--muted);
          font-size: 0.76rem;
          font-weight: 800;
        }

        .admin-lesson-search input {
          min-height: 44px;
          padding: 0 14px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--card);
          color: var(--ink);
          font-size: 0.9rem;
        }

        .admin-lesson-search input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: var(--focus-ring);
        }

        .admin-lesson-tabs {
          display: inline-flex;
          gap: 4px;
          padding: 4px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--card);
          flex-wrap: wrap;
        }

        .admin-lesson-tabs button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 36px;
          padding: 0 12px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          font-weight: 800;
        }

        .admin-lesson-tabs button[aria-pressed="true"] {
          background: var(--brand);
          color: var(--card);
        }

        .admin-lesson-tabs span {
          opacity: 0.75;
          font-size: 0.72rem;
        }

        .admin-lesson-clear {
          min-height: 40px;
          padding: 0 14px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--card);
          color: var(--brand-dark);
          cursor: pointer;
          font-weight: 800;
        }

        .admin-lesson-progress {
          display: grid;
          gap: 10px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--line);
          background: var(--card);
        }

        .admin-lesson-progress > div:first-child,
        .admin-lesson-summary {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: var(--muted);
          font-size: 0.8rem;
          font-weight: 800;
        }

        .admin-lesson-progress strong {
          color: var(--ink);
        }

        .admin-lesson-progress-track {
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: var(--border);
        }

        .admin-lesson-progress-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: var(--brand);
          transition: width 180ms ease;
        }

        .admin-lesson-list {
          display: grid;
        }

        .admin-lesson-filter-empty {
          padding: 42px 18px;
          color: var(--muted);
          text-align: center;
        }

        .admin-lesson-row {
          display: grid;
          background: var(--card);
          border-bottom: 1px solid var(--border);
        }

        .admin-lesson-row.editing {
          background: var(--muted);
        }

        .admin-lesson-row-main {
          display: grid;
          grid-template-columns: 38px 48px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 14px 20px;
        }

        .admin-lesson-drag {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--muted);
          color: var(--muted-foreground);
          cursor: grab;
        }

        .admin-lesson-drag:disabled {
          cursor: not-allowed;
          opacity: 0.42;
        }

        .admin-lesson-drag svg {
          width: 16px;
          height: 16px;
        }

        .admin-lesson-index {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 999px;
          background: var(--color-warning-soft);
          color: var(--color-warning-strong);
          font-weight: 900;
          font-size: 0.78rem;
        }

        .admin-lesson-index.ready {
          background: var(--color-success-soft);
          color: var(--color-success-strong);
        }

        .admin-lesson-title-block {
          min-width: 0;
        }

        .admin-lesson-title-block > div:first-child {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }

        .admin-lesson-title-block a {
          color: var(--ink);
          text-decoration: none;
          font-size: 0.94rem;
          font-weight: 800;
          line-height: 1.35;
        }

        .admin-lesson-title-block a:hover {
          color: var(--brand-dark);
        }

        .admin-lesson-health {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 0 9px;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 800;
        }

        .admin-lesson-health.ready {
          background: var(--color-success-soft);
          color: var(--color-success-strong);
        }

        .admin-lesson-health.warning {
          background: var(--color-warning-soft);
          color: var(--color-warning-strong);
        }

        .admin-lesson-health.danger {
          background: var(--color-error-soft);
          color: var(--color-error-strong);
        }

        .admin-lesson-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          color: var(--muted);
          font-size: 0.74rem;
        }

        .admin-lesson-meta span {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 0 8px;
          border-radius: 999px;
          background: var(--muted);
        }

        .admin-lesson-meta span.preview {
          background: var(--brand-soft);
          color: var(--primary);
          font-weight: 800;
        }

        .admin-lesson-actions {
          display: flex;
          gap: 6px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .admin-lesson-actions a,
        .admin-lesson-actions button,
        .admin-lesson-video-actions button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0 10px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--card);
          color: var(--ink);
          cursor: pointer;
          font-size: 0.74rem;
          font-weight: 800;
          text-decoration: none;
        }

        .admin-lesson-actions button:first-child,
        .admin-lesson-video-actions button:first-child {
          border-color: var(--brand);
          background: var(--brand);
          color: var(--card);
        }

        .admin-lesson-actions button.danger {
          border-color: var(--color-error);
          background: var(--color-error-soft);
          color: var(--color-error-strong);
        }

        .admin-lesson-video-editor {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 120px auto;
          gap: 12px;
          align-items: end;
          padding: 14px 20px 16px 118px;
          border-top: 1px solid var(--border);
          background: var(--muted);
        }

        .admin-lesson-video-editor label {
          display: grid;
          gap: 7px;
          color: var(--muted);
          font-size: 0.76rem;
          font-weight: 800;
        }

        .admin-lesson-video-editor input {
          width: 100%;
          min-height: 40px;
          padding: 0 12px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--card);
          color: var(--ink);
        }

        .admin-lesson-video-editor input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: var(--focus-ring);
        }

        .admin-lesson-video-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .admin-lesson-video-actions button:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        @media (max-width: 980px) {
          .admin-lesson-toolbar {
            grid-template-columns: 1fr;
            align-items: stretch;
          }

          .admin-lesson-row-main {
            grid-template-columns: 36px 44px minmax(0, 1fr);
          }

          .admin-lesson-actions {
            grid-column: 3;
            justify-content: flex-start;
          }

          .admin-lesson-video-editor {
            grid-template-columns: 1fr;
            padding-left: 20px;
          }
        }

        @media (max-width: 620px) {
          .admin-lesson-row-main {
            grid-template-columns: 36px minmax(0, 1fr);
            padding: 14px;
          }

          .admin-lesson-index {
            display: none;
          }

          .admin-lesson-actions {
            grid-column: 1 / -1;
          }

          .admin-lesson-summary,
          .admin-lesson-progress > div:first-child {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
