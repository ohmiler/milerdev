'use client';

import {
  ArrowDown,
  ArrowUp,
  FileText,
  Film,
  GripVertical,
  Pencil,
  Save,
  Search,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
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

import {
  AdminEmptyState,
  AdminPendingLabel,
  AdminStatusBadge,
} from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { showToast } from '@/components/ui/Toast';
import {
  moveLessonToSection,
  moveSection,
  readCourseStructure,
  type CourseStructure,
} from '@/lib/courses/course-structure';
import { cn } from '@/lib/utils';

export interface Lesson {
  id: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  videoDuration: number | null;
  orderIndex: number | null;
  isFreePreview: boolean | null;
  sectionId?: string | null;
}

export interface LessonSection {
  id: string;
  title: string;
}

export type CourseOutline = { lessons: Lesson[]; sections: LessonSection[] };

interface DraggableLessonListProps {
  lessons: Lesson[];
  sections?: LessonSection[];
  courseId: string;
  onDelete: (lessonId: string) => void;
  onStructureChange: (outline: CourseOutline) => void;
  onRenameSection?: (section: LessonSection) => void;
  onDeleteSection?: (section: LessonSection) => void;
  onLessonUpdate?: (lessonId: string, data: Partial<Lesson>) => void;
}

export type LessonFilter = 'all' | 'needs-work' | 'no-video' | 'ready';

interface SortableItemProps {
  lesson: Lesson;
  index: number;
  sections: LessonSection[];
  onMoveToSection: (lessonId: string, sectionId: string | null) => void;
  onDelete: (lessonId: string) => void;
  editingVideoId: string | null;
  onEditVideo: (lessonId: string | null) => void;
  onSaveVideo: (lessonId: string, videoUrl: string, videoDuration: number) => void;
  savingVideoId: string | null;
  disabledDrag?: boolean;
  disabledMove?: boolean;
}

export function formatLessonDuration(totalSeconds: number | null) {
  const safeSeconds = totalSeconds || 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export function parseLessonDuration(value: string) {
  if (value.includes(':')) {
    const [minutes, seconds] = value.split(':');
    return (Number.parseInt(minutes, 10) || 0) * 60 + (Number.parseInt(seconds, 10) || 0);
  }

  return Math.round(Number.parseFloat(value) * 60) || 0;
}

export function getLessonHealth(lesson: Lesson) {
  const hasContent = Boolean(lesson.content?.trim());
  const hasVideo = Boolean(lesson.videoUrl);

  if (hasVideo && hasContent) {
    return { label: 'พร้อมใช้งาน', tone: 'success' as const };
  }
  if (!hasVideo && !hasContent) {
    return { label: 'ขาดวิดีโอและเนื้อหา', tone: 'danger' as const };
  }
  return {
    label: hasVideo ? 'ขาดเนื้อหา' : 'ขาดวิดีโอ',
    tone: 'warning' as const,
  };
}

export function filterLessons(lessons: Lesson[], search: string, filter: LessonFilter) {
  const normalizedSearch = search.trim().toLocaleLowerCase('th');
  return lessons.filter((lesson) => {
    const health = getLessonHealth(lesson);
    if (normalizedSearch && !lesson.title.toLocaleLowerCase('th').includes(normalizedSearch)) {
      return false;
    }
    if (filter === 'needs-work' && health.tone === 'success') return false;
    if (filter === 'no-video' && lesson.videoUrl) return false;
    if (filter === 'ready' && health.tone !== 'success') return false;
    return true;
  });
}

export function reorderLessonIds(lessons: Lesson[], activeId: string, overId: string) {
  const oldIndex = lessons.findIndex((lesson) => lesson.id === activeId);
  const newIndex = lessons.findIndex((lesson) => lesson.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return lessons.map((lesson) => lesson.id);
  }
  return arrayMove(lessons, oldIndex, newIndex).map((lesson) => lesson.id);
}

export function readOutlineStructure({ lessons, sections }: CourseOutline): CourseStructure {
  return readCourseStructure({
    sections,
    lessons: lessons.map((lesson) => ({ id: lesson.id, sectionId: lesson.sectionId ?? null })),
  });
}

/** Reorders the outline to match a structure, the same way the server will. */
export function applyCourseStructure(outline: CourseOutline, structure: CourseStructure): CourseOutline {
  const lessonsById = new Map(outline.lessons.map((lesson) => [lesson.id, lesson]));
  const sectionsById = new Map(outline.sections.map((section) => [section.id, section]));
  const blocks = [
    { sectionId: null, lessonIds: structure.unsectionedLessonIds },
    ...structure.sections.map((section) => ({ sectionId: section.id, lessonIds: section.lessonIds })),
  ];
  return {
    sections: structure.sections.flatMap((section) => sectionsById.get(section.id) ?? []),
    lessons: blocks.flatMap((block) => block.lessonIds.flatMap((id) => {
      const lesson = lessonsById.get(id);
      return lesson ? [{ ...lesson, sectionId: block.sectionId }] : [];
    })),
  };
}

function SortableItem({
  lesson,
  index,
  sections,
  onMoveToSection,
  onDelete,
  editingVideoId,
  onEditVideo,
  onSaveVideo,
  savingVideoId,
  disabledDrag,
  disabledMove,
}: SortableItemProps) {
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || '');
  const [videoDuration, setVideoDuration] = useState(formatLessonDuration(lesson.videoDuration));
  const isEditing = editingVideoId === lesson.id;
  const isSaving = savingVideoId === lesson.id;
  const health = getLessonHealth(lesson);
  const hasContent = Boolean(lesson.content?.trim());
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      size="sm"
      className={cn(
        'overflow-visible rounded-xl shadow-none transition-opacity',
        isEditing && 'ring-primary/30',
      )}
    >
      {/* On narrow screens the actions wrap below the title instead of squeezing it. */}
      <CardHeader className="max-sm:grid-cols-1!">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="ลากเพื่อจัดลำดับบทเรียน"
            disabled={disabledDrag}
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden />
          </Button>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/lessons/${lesson.id}/edit`}
                className="truncate hover:text-link hover:underline"
              >
                {lesson.title}
              </Link>
              <AdminStatusBadge tone={health.tone}>{health.label}</AdminStatusBadge>
            </CardTitle>
            <CardDescription className="mt-2 flex flex-wrap items-center gap-2">
              <span>{formatLessonDuration(lesson.videoDuration)}</span>
              <AdminStatusBadge tone={hasVideo ? 'info' : 'neutral'}>
                <Film aria-hidden />
                {hasVideo ? 'มีวิดีโอ' : 'ยังไม่มีวิดีโอ'}
              </AdminStatusBadge>
              <AdminStatusBadge tone={hasContent ? 'success' : 'neutral'}>
                <FileText aria-hidden />
                {hasContent ? 'มีเนื้อหา' : 'ยังไม่มีเนื้อหา'}
              </AdminStatusBadge>
              {lesson.isFreePreview ? (
                <AdminStatusBadge tone="warning">Preview ฟรี</AdminStatusBadge>
              ) : null}
            </CardDescription>
            {sections.length > 0 ? (
              <NativeSelect
                size="sm"
                className="mt-3 max-w-full"
                aria-label={`หมวดของบทเรียน ${lesson.title}`}
                value={lesson.sectionId ?? ''}
                disabled={disabledMove}
                onChange={(event) => onMoveToSection(lesson.id, event.target.value || null)}
              >
                <NativeSelectOption value="">ไม่อยู่ในหมวด</NativeSelectOption>
                {sections.map((section) => (
                  <NativeSelectOption key={section.id} value={section.id}>{section.title}</NativeSelectOption>
                ))}
              </NativeSelect>
            ) : null}
          </div>
        </div>
        <CardAction className="flex flex-wrap justify-end gap-2 max-sm:col-start-1 max-sm:row-span-1 max-sm:row-start-auto max-sm:justify-self-start max-sm:justify-start">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEditVideo(isEditing ? null : lesson.id)}
          >
            <Video data-icon="inline-start" aria-hidden />
            {lesson.videoUrl ? 'แก้วิดีโอ' : 'เพิ่มวิดีโอ'}
          </Button>
          <Button asChild type="button" variant="outline" size="sm">
            <Link href={`/admin/lessons/${lesson.id}/edit`}>
              <Pencil data-icon="inline-start" aria-hidden />
              แก้ไข
            </Link>
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onDelete(lesson.id)}
          >
            <Trash2 data-icon="inline-start" aria-hidden />
            ลบ
          </Button>
        </CardAction>
      </CardHeader>

      {isEditing ? (
        <CardContent className="border-t border-border pt-(--card-spacing)">
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
              <Field>
                <FieldLabel htmlFor={`lesson-video-${lesson.id}`}>Video source</FieldLabel>
                <Input
                  id={`lesson-video-${lesson.id}`}
                  type="text"
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="Bunny Video GUID หรือ Embed URL"
                  autoFocus
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`lesson-duration-${lesson.id}`}>Duration</FieldLabel>
                <Input
                  id={`lesson-duration-${lesson.id}`}
                  type="text"
                  value={videoDuration}
                  onChange={(event) => {
                    if (/^[0-9:]*$/.test(event.target.value)) {
                      setVideoDuration(event.target.value);
                    }
                  }}
                  placeholder="10:30"
                />
              </Field>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => onSaveVideo(
                  lesson.id,
                  videoUrl,
                  parseLessonDuration(videoDuration),
                )}
                disabled={isSaving}
              >
                {isSaving ? (
                  <AdminPendingLabel>กำลังบันทึก</AdminPendingLabel>
                ) : (
                  <>
                    <Save data-icon="inline-start" aria-hidden />
                    บันทึกวิดีโอ
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditVideo(null)}
                disabled={isSaving}
              >
                <X data-icon="inline-start" aria-hidden />
                ยกเลิก
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      ) : null}
    </Card>
  );
}

export default function DraggableLessonList({
  lessons,
  sections = [],
  courseId,
  onDelete,
  onStructureChange,
  onRenameSection,
  onDeleteSection,
  onLessonUpdate,
}: DraggableLessonListProps) {
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LessonFilter>('all');
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [savingVideoId, setSavingVideoId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const totalCount = lessons.length;
  const videoCount = lessons.filter((lesson) => lesson.videoUrl).length;
  const contentCount = lessons.filter((lesson) => lesson.content?.trim()).length;
  const readyCount = lessons.filter((lesson) => getLessonHealth(lesson).tone === 'success').length;
  const needsWorkCount = totalCount - readyCount;
  const progressPercent = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;
  const isFiltering = search.trim() !== '' || filter !== 'all';
  const filteredLessons = useMemo(
    () => filterLessons(lessons, search, filter),
    [filter, lessons, search],
  );

  const handleSaveVideo = async (
    lessonId: string,
    videoUrl: string,
    videoDuration: number,
  ) => {
    setSavingVideoId(lessonId);
    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: videoUrl || null, videoDuration }),
      });
      if (!response.ok) {
        showToast('ไม่สามารถบันทึกวิดีโอได้ กรุณาลองใหม่', 'error');
        return;
      }
      onLessonUpdate?.(lessonId, { videoUrl: videoUrl || null, videoDuration });
      setEditingVideoId(null);
      showToast('บันทึกข้อมูลวิดีโอแล้ว', 'success');
    } catch {
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    } finally {
      setSavingVideoId(null);
    }
  };

  const outline = { lessons, sections };
  const structure = readOutlineStructure(outline);
  const blocks = [
    { section: null, lessonIds: structure.unsectionedLessonIds },
    ...structure.sections.map((block) => ({
      section: sections.find((section) => section.id === block.id) ?? null,
      lessonIds: block.lessonIds,
    })),
  ].filter((block, index) => index > 0 || block.lessonIds.length > 0 || sections.length === 0);
  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]));

  // Optimistic: show the new order at once and restore the previous one if the save fails.
  const saveStructure = async (next: CourseStructure) => {
    const previous = outline;
    onStructureChange(applyCourseStructure(previous, next));
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/lessons/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!response.ok) {
        onStructureChange(previous);
        const data = await response.json().catch(() => ({}));
        showToast(data.error || 'ไม่สามารถจัดลำดับได้ กรุณาลองใหม่', 'error');
      }
    } catch {
      onStructureChange(previous);
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || saving) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    // Lessons move between sections through the section picker, not by dragging.
    const reorderWithin = (ids: string[]) => {
      if (!ids.includes(activeId) || !ids.includes(overId)) return null;
      return arrayMove(ids, ids.indexOf(activeId), ids.indexOf(overId));
    };
    const unsectioned = reorderWithin(structure.unsectionedLessonIds);
    if (unsectioned) {
      void saveStructure({ ...structure, unsectionedLessonIds: unsectioned });
      return;
    }
    const sectionIndex = structure.sections.findIndex((block) => reorderWithin(block.lessonIds));
    if (sectionIndex < 0) return;
    void saveStructure({
      ...structure,
      sections: structure.sections.map((block, index) => (
        index === sectionIndex ? { ...block, lessonIds: reorderWithin(block.lessonIds)! } : block
      )),
    });
  };

  const handleMoveToSection = (lessonId: string, sectionId: string | null) => {
    if ((lessonsById.get(lessonId)?.sectionId ?? null) === sectionId) return;
    void saveStructure(moveLessonToSection(structure, lessonId, sectionId));
  };

  const tabs = [
    { value: 'all', label: 'ทั้งหมด', count: totalCount },
    { value: 'needs-work', label: 'ต้องตรวจ', count: needsWorkCount },
    { value: 'no-video', label: 'ไม่มีวิดีโอ', count: totalCount - videoCount },
    { value: 'ready', label: 'พร้อม', count: readyCount },
  ] as const;

  if (lessons.length === 0 && sections.length === 0) {
    return (
      <AdminEmptyState
        title="ยังไม่มีบทเรียน"
        description="เพิ่มบทเรียนแรกเพื่อเริ่มวางโครงสร้างคอร์ส แล้วค่อยเติมวิดีโอและเนื้อหา"
        icon={<FileText aria-hidden />}
      />
    );
  }

  const renderLesson = (lesson: Lesson, index: number, disabledDrag = false) => (
    <SortableItem
      key={`${lesson.id}:${lesson.videoUrl ?? ''}:${lesson.videoDuration ?? ''}`}
      lesson={lesson}
      index={index}
      sections={sections}
      onMoveToSection={handleMoveToSection}
      disabledMove={saving}
      onDelete={onDelete}
      editingVideoId={editingVideoId}
      onEditVideo={setEditingVideoId}
      onSaveVideo={handleSaveVideo}
      savingVideoId={savingVideoId}
      disabledDrag={disabledDrag}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 rounded-xl bg-muted/50 p-4 lg:grid-cols-[minmax(240px,1fr)_auto_auto] lg:items-end">
        <Field>
          <FieldLabel htmlFor="lesson-search">ค้นหาบทเรียน</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <Search aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              id="lesson-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ชื่อบทเรียน"
            />
          </InputGroup>
        </Field>

        <div className="flex flex-wrap gap-2" role="group" aria-label="กรองบทเรียน">
          {tabs.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              size="sm"
              variant={filter === tab.value ? 'default' : 'outline'}
              aria-pressed={filter === tab.value}
              onClick={() => setFilter(tab.value)}
            >
              {tab.label} <span className="tabular-nums">{tab.count}</span>
            </Button>
          ))}
        </div>

        {isFiltering ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setFilter('all');
            }}
          >
            <X data-icon="inline-start" aria-hidden />
            ล้างตัวกรอง
          </Button>
        ) : <span />}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">
            พร้อมใช้งาน {readyCount.toLocaleString('th-TH')}/{totalCount.toLocaleString('th-TH')}
          </span>
          <strong className="tabular-nums">{progressPercent}%</strong>
        </div>
        <Progress value={progressPercent} aria-label={`บทเรียนพร้อมใช้งาน ${progressPercent}%`} />
        <div className="flex flex-wrap gap-2">
          <AdminStatusBadge tone="info">
            วิดีโอ {videoCount.toLocaleString('th-TH')}/{totalCount.toLocaleString('th-TH')}
          </AdminStatusBadge>
          <AdminStatusBadge tone="success">
            เนื้อหา {contentCount.toLocaleString('th-TH')}/{totalCount.toLocaleString('th-TH')}
          </AdminStatusBadge>
          {saving ? (
            <AdminStatusBadge tone="info">
              <AdminPendingLabel>กำลังบันทึกลำดับ</AdminPendingLabel>
            </AdminStatusBadge>
          ) : null}
        </div>
      </div>

      {filteredLessons.length === 0 ? (
        <AdminEmptyState
          title="ไม่พบบทเรียน"
          description="ลองเปลี่ยนคำค้นหาหรือตัวกรองเพื่อดูบทเรียนอื่น"
          icon={<Search aria-hidden />}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
            >
              ล้างตัวกรอง
            </Button>
          }
        />
      ) : isFiltering ? (
        <div className="flex flex-col gap-3">
          {filteredLessons.map((lesson) =>
            renderLesson(lesson, lessons.findIndex((item) => item.id === lesson.id), true),
          )}
        </div>
      ) : (
        <DndContext
          id={`lesson-sort-${courseId}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col gap-6">
            {blocks.map((block, blockIndex) => {
              const sectionPosition = block.section
                ? structure.sections.findIndex((item) => item.id === block.section?.id)
                : -1;
              const blockLessons = block.lessonIds.flatMap((id) => lessonsById.get(id) ?? []);
              return (
                <div key={block.section?.id ?? 'unsectioned'} className="flex flex-col gap-3">
                  {block.section ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                      <h3 className="min-w-0 font-heading text-base font-semibold">
                        <span className="wrap-anywhere">{block.section.title}</span>{' '}
                        <span className="text-sm font-normal text-muted-foreground tabular-nums">
                          {blockLessons.length.toLocaleString('th-TH')} บท
                        </span>
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`ย้ายหมวด ${block.section.title} ขึ้น`}
                          disabled={saving || sectionPosition <= 0}
                          onClick={() => void saveStructure(moveSection(structure, block.section!.id, -1))}
                        >
                          <ArrowUp aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`ย้ายหมวด ${block.section.title} ลง`}
                          disabled={saving || sectionPosition >= structure.sections.length - 1}
                          onClick={() => void saveStructure(moveSection(structure, block.section!.id, 1))}
                        >
                          <ArrowDown aria-hidden />
                        </Button>
                        {onRenameSection ? (
                          <Button type="button" variant="ghost" size="sm" onClick={() => onRenameSection(block.section!)}>
                            <Pencil data-icon="inline-start" aria-hidden />
                            แก้ชื่อ
                          </Button>
                        ) : null}
                        {onDeleteSection ? (
                          <Button type="button" variant="ghost" size="sm" onClick={() => onDeleteSection(block.section!)}>
                            <Trash2 data-icon="inline-start" aria-hidden />
                            ลบหมวด
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : sections.length > 0 ? (
                    <h3 className="border-b border-border pb-2 font-heading text-base font-semibold text-muted-foreground">
                      ยังไม่อยู่ในหมวด
                    </h3>
                  ) : null}
                  {blockLessons.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      ยังไม่มีบทเรียนในหมวดนี้ เลือกหมวดจากเมนูของบทเรียนเพื่อย้ายเข้ามา
                    </p>
                  ) : (
                    <SortableContext
                      id={`lesson-block-${blockIndex}`}
                      items={block.lessonIds}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-3">
                        {blockLessons.map((lesson) => renderLesson(
                          lesson,
                          lessons.findIndex((item) => item.id === lesson.id),
                          saving,
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </div>
              );
            })}
          </div>
        </DndContext>
      )}
    </div>
  );
}
