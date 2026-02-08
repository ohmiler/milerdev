'use client';

import { useState } from 'react';
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
  onEdit: (lesson: Lesson) => void;
  onDelete: (lessonId: string) => void;
  onReorder: (lessonIds: string[]) => void;
}

interface SortableItemProps {
  lesson: Lesson;
  index: number;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lessonId: string) => void;
}

function SortableItem({ lesson, index, onEdit, onDelete }: SortableItemProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #e2e8f0',
        background: isDragging ? '#f1f5f9' : 'white',
      }}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          padding: '8px',
          marginRight: '12px',
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
        </svg>
      </div>

      {/* Number Badge */}
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: '#eff6ff',
        color: '#2563eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: '0.875rem',
        marginRight: '16px',
        flexShrink: 0,
      }}>
        {index + 1}
      </div>

      {/* Lesson Info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, color: '#1e293b', marginBottom: '4px' }}>
          {lesson.title}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '12px' }}>
          {lesson.videoDuration && lesson.videoDuration > 0 && (
            <span>⏱️ {Math.floor(lesson.videoDuration / 60)} นาที</span>
          )}
          {lesson.isFreePreview && (
            <span style={{ color: '#16a34a' }}>🆓 ดูฟรี</span>
          )}
          {lesson.videoUrl && (
            <span style={{ color: '#2563eb' }}>🎬 มีวิดีโอ</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onEdit(lesson)}
          style={{
            padding: '8px 12px',
            background: '#eff6ff',
            color: '#2563eb',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          แก้ไข
        </button>
        <button
          onClick={() => onDelete(lesson.id)}
          style={{
            padding: '8px 12px',
            background: '#fef2f2',
            color: '#dc2626',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          ลบ
        </button>
      </div>
    </div>
  );
}

export default function DraggableLessonList({
  lessons: initialLessons,
  courseId,
  onEdit,
  onDelete,
  onReorder,
}: DraggableLessonListProps) {
  const [lessons, setLessons] = useState(initialLessons);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
          // Revert on error
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

  if (lessons.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <p>ยังไม่มีบทเรียน</p>
      </div>
    );
  }

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

      <div style={{
        padding: '12px 20px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        fontSize: '0.875rem',
        color: '#64748b',
      }}>
        💡 ลากเพื่อจัดลำดับบทเรียน
      </div>

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
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
