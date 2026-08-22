'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Tags, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export default function TagSelector({ selectedTagIds, onChange }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/tags')
      .then((response) => response.json())
      .then((data) => setAllTags(data.tags || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const selectedTags = allTags.filter((tag) => selectedTagIds.includes(tag.id));

  if (loading) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground">
        <Spinner aria-hidden />
        กำลังโหลดแท็ก
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="แท็กที่เลือก">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-lg border border-primary/15 bg-secondary py-1 pr-1 pl-2.5 text-xs font-medium text-secondary-foreground"
            >
              {tag.name}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => toggleTag(tag.id)}
              >
                <X aria-hidden />
                <span className="sr-only">นำแท็ก {tag.name} ออก</span>
              </Button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">ยังไม่ได้เลือกแท็ก</p>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between">
            <span className="inline-flex items-center gap-2">
              <Tags aria-hidden />
              เลือกแท็ก
            </span>
            <ChevronDown aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-72">
          <DropdownMenuLabel>
            {allTags.length > 0 ? allTags.length.toLocaleString('th-TH') + ' แท็กในระบบ' : 'ยังไม่มีแท็กในระบบ'}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {allTags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.id}
              checked={selectedTagIds.includes(tag.id)}
              onCheckedChange={() => toggleTag(tag.id)}
              onSelect={(event) => event.preventDefault()}
            >
              <span className="truncate">{tag.name}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
