'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ChevronsUpDown, Tags, X } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

type LoadState = 'loading' | 'error' | 'empty' | 'ready';

export default function TagSelector({ selectedTagIds, onChange }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [open, setOpen] = useState(false);

  const loadTags = useCallback(async (signal?: AbortSignal) => {
    setLoadState('loading');

    try {
      const response = await fetch('/api/admin/tags', { signal });
      if (!response.ok) throw new Error('Unable to load tags');

      const data: unknown = await response.json();
      const tags = typeof data === 'object' && data !== null && Array.isArray((data as { tags?: unknown }).tags)
        ? (data as { tags: Tag[] }).tags
        : [];

      setAllTags(tags);
      setLoadState(tags.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setAllTags([]);
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadTags(controller.signal);
    return () => controller.abort();
  }, [loadTags]);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const selectedTags = allTags.filter((tag) => selectedTagIds.includes(tag.id));

  return (
    <div className="flex flex-col gap-3">
      {selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="แท็กที่เลือก">
          {selectedTags.map((tag) => (
            <Badge key={tag.id} variant="secondary" asChild>
              <button type="button" aria-label={`นำแท็ก ${tag.name} ออก`} onClick={() => toggleTag(tag.id)}>
                {tag.name}
                <X data-icon="inline-end" aria-hidden />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">ยังไม่ได้เลือกแท็ก</p>
      )}

      {loadState === 'loading' ? (
        <Button type="button" variant="outline" className="w-full" disabled aria-live="polite">
          <Spinner data-icon="inline-start" aria-hidden />
          กำลังโหลดแท็ก
        </Button>
      ) : null}

      {loadState === 'error' ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>โหลดแท็กไม่สำเร็จ</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadTags()}>
              ลองใหม่
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {loadState === 'empty' ? (
        <Empty className="border p-6">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Tags aria-hidden /></EmptyMedia>
            <EmptyTitle>ยังไม่มีแท็กในระบบ</EmptyTitle>
            <EmptyDescription>สร้างแท็กในหน้าจัดการแท็กก่อนนำมาใช้กับคอร์ส</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {loadState === 'ready' ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-label="เลือกแท็ก" className="w-full justify-between">
              <span className="inline-flex items-center gap-2">
                <Tags data-icon="inline-start" aria-hidden />
                {selectedTagIds.length > 0 ? `เลือกแล้ว ${selectedTagIds.length.toLocaleString('th-TH')} แท็ก` : 'เลือกแท็ก'}
              </span>
              <ChevronsUpDown data-icon="inline-end" aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
            <Command label="ค้นหาแท็ก">
              <CommandInput placeholder="ค้นหาแท็ก..." aria-label="ค้นหาแท็ก" />
              <CommandList>
                <CommandEmpty>ไม่พบแท็กที่ค้นหา</CommandEmpty>
                <CommandGroup heading={`${allTags.length.toLocaleString('th-TH')} แท็กในระบบ`}>
                  {allTags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <CommandItem key={tag.id} value={`${tag.name} ${tag.slug}`} data-checked={selected} onSelect={() => toggleTag(tag.id)}>
                        <span className="truncate">{tag.name}</span>
                        <span className="sr-only">{selected ? 'เลือกแล้ว' : 'ยังไม่ได้เลือก'}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
