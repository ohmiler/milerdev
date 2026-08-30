'use client';

import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { TriangleAlert, VideoOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

interface BunnyPlayerProps {
  videoId: string;
  libraryId?: string;
  autoplay?: boolean;
  className?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

type VideoType = 'youtube' | 'vimeo' | 'bunny' | 'unknown';

export default function BunnyPlayer({ 
  videoId, 
  libraryId,
  autoplay = false,
  className = '',
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
}: BunnyPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loadedUrl, setLoadedUrl] = useState('');
  const [debugUrl, setDebugUrl] = useState('');

  // Listen for postMessage events from Bunny.net iframe player
  const handleMessage = useCallback((event: MessageEvent) => {
    if (!event.data || typeof event.data !== 'object') return;

    // Bunny.net player sends events like: { event: 'timeupdate', data: { currentTime, duration } }
    const msg = event.data;
    const eventName = msg.event || msg.type;
    const data = msg.data || msg;

    switch (eventName) {
      case 'timeupdate':
        if (onTimeUpdate && typeof data.currentTime === 'number') {
          onTimeUpdate(data.currentTime, data.duration || 0);
        }
        break;
      case 'play':
      case 'playing':
        onPlay?.();
        break;
      case 'pause':
        onPause?.();
        break;
      case 'ended':
      case 'complete':
        onEnded?.();
        break;
    }
  }, [onTimeUpdate, onPlay, onPause, onEnded]);

  const embedUrl = useMemo(() => {
    // Detect video type from URL
    const detectVideoType = (url: string): VideoType => {
      if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
      if (url.includes('vimeo.com')) return 'vimeo';
      if (url.includes('iframe.mediadelivery.net') || url.includes('video.bunnycdn.com')) return 'bunny';
      return 'unknown';
    };

    // Extract YouTube video ID
    const getYouTubeId = (url: string): string | null => {
      const patterns = [
        /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
        /(?:youtu\.be\/)([^?\s]+)/,
        /(?:youtube\.com\/embed\/)([^?\s]+)/,
        /(?:youtube\.com\/v\/)([^?\s]+)/,
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    // Extract Vimeo video ID
    const getVimeoId = (url: string): string | null => {
      const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      return match ? match[1] : null;
    };

    const videoType = detectVideoType(videoId);

    if (videoType === 'youtube') {
      const ytId = getYouTubeId(videoId);
      if (ytId) {
        const params = autoplay ? '?autoplay=1&rel=0' : '?rel=0';
        return `https://www.youtube.com/embed/${ytId}${params}`;
      }
    }

    if (videoType === 'vimeo') {
      const vimeoId = getVimeoId(videoId);
      if (vimeoId) {
        const params = autoplay ? '?autoplay=1' : '';
        return `https://player.vimeo.com/video/${vimeoId}${params}`;
      }
    }

    if (videoType === 'bunny') {
      if (videoId.includes('/play/')) {
        return videoId.replace('/play/', '/embed/');
      }
      if (videoId.includes('/embed/')) {
        return videoId;
      }
      const match = videoId.match(/([a-f0-9-]{36})/i);
      if (match && libraryId) {
        return `https://iframe.mediadelivery.net/embed/${libraryId}/${match[1]}`;
      }
      return videoId;
    }

    if (/^[a-f0-9-]{36}$/i.test(videoId) && libraryId) {
      return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
    }

    if (libraryId && !videoId.includes('http')) {
      return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
    }

    return videoId;
  }, [autoplay, libraryId, videoId]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const finalUrl = embedUrl;
  const iframeLoaded = loadedUrl === finalUrl;
  const showDebugOverlay = debugUrl === finalUrl && !iframeLoaded;

  useEffect(() => {
    if (!finalUrl) return;

    const timer = window.setTimeout(() => {
      if (!iframeLoaded) {
        setDebugUrl(finalUrl);
      }
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [finalUrl, iframeLoaded]);

  if (!videoId) {
    return (
      <Empty className={cn('aspect-video border', className)}>
        <EmptyHeader>
          <EmptyMedia variant="icon"><VideoOff aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>ไม่มีวิดีโอสำหรับบทเรียนนี้</EmptyTitle>
          <EmptyDescription>เลือกบทเรียนอื่นหรือลองกลับมาตรวจสอบอีกครั้งภายหลัง</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className={cn('relative aspect-video overflow-hidden rounded-xl bg-muted', className)}>
      <iframe
        key={finalUrl}
        ref={iframeRef}
        src={finalUrl}
        loading="lazy"
        onLoad={() => setLoadedUrl(finalUrl)}
        className="absolute inset-0 size-full border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
      {showDebugOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-6">
          <Alert className="max-w-xl">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>วิดีโอกำลังโหลดช้าผิดปกติ</AlertTitle>
            <AlertDescription>
              หากหน้าจอยังคงเป็นสีดำ อาจเกิดจากเครือข่ายหรือผู้ให้บริการอินเทอร์เน็ตบล็อกการเชื่อมต่อกับระบบวิดีโอ
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
