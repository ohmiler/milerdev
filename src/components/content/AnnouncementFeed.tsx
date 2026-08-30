'use client';

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  creatorName: string | null;
  createdAt: string;
}

type FeedStatus = 'loading' | 'ready' | 'error';

const typeConfig: Record<Announcement['type'], { code: string; label: string }> = {
  info: { code: 'INFO', label: 'ข้อมูล' },
  warning: { code: 'NOTICE', label: 'แจ้งเตือน' },
  success: { code: 'UPDATE', label: 'อัปเดตสำเร็จ' },
  error: { code: 'IMPORTANT', label: 'ประกาศสำคัญ' },
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface AnnouncementFeedViewProps {
  status: FeedStatus;
  announcements: Announcement[];
  onRetry: () => void;
}

export function AnnouncementFeedView({ status, announcements, onRetry }: AnnouncementFeedViewProps) {
  if (status === 'loading') {
    return (
      <Card aria-busy="true">
        <CardHeader className="sr-only">
          <CardTitle role="status" aria-live="polite">กำลังตรวจสอบประกาศล่าสุด</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4" aria-hidden="true">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Alert variant="destructive"><span aria-hidden="true">!</span><AlertTitle>โหลดประกาศไม่สำเร็จ</AlertTitle><AlertDescription>ยังแสดงข่าวสารล่าสุดไม่ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่</AlertDescription><Button className="mt-4" variant="outline" type="button" onClick={onRetry}>ลองอีกครั้ง ↻</Button></Alert>
    );
  }

  if (announcements.length === 0) {
    return (
      <Empty className="border" aria-live="polite">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Megaphone aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>ยังไม่มีประกาศที่ต้องติดตาม</EmptyTitle>
          <EmptyDescription>เมื่อมีข่าวสารใหม่จากทีม MilerDev ประกาศจะแสดงที่หน้านี้</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-5" aria-live="polite">
      {announcements.map((announcement, index) => {
        const config = typeConfig[announcement.type] || typeConfig.info;
        return (
          <Card
            data-announcement-type={announcement.type}
            key={announcement.id}
          >
            <CardHeader><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, '0')}</span><Badge variant={announcement.type === 'error' ? 'destructive' : 'secondary'}>{config.code} · {config.label}</Badge><time className="text-xs text-muted-foreground" dateTime={announcement.createdAt}>{formatDate(announcement.createdAt)}</time>{announcement.creatorName ? <span className="text-xs text-muted-foreground">โดย {announcement.creatorName}</span> : null}</div><CardTitle className="mt-3 text-xl sm:text-2xl">{announcement.title}</CardTitle></CardHeader><CardContent><div className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{announcement.content}</div></CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function AnnouncementFeed() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [status, setStatus] = useState<FeedStatus>('loading');
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnnouncements() {
      setStatus('loading');
      try {
        const response = await fetch('/api/announcements', { signal: controller.signal });
        if (!response.ok) throw new Error('Announcement request failed');
        const data = await response.json();
        setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
        setStatus('ready');
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setAnnouncements([]);
        setStatus('error');
      }
    }

    void loadAnnouncements();
    return () => controller.abort();
  }, [requestKey]);

  return (
    <AnnouncementFeedView
      status={status}
      announcements={announcements}
      onRetry={() => setRequestKey((key) => key + 1)}
    />
  );
}
