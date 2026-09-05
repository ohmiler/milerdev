'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TriangleAlert, VideoOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { connectBunnyPlayer, type BunnyPlayerCallbacks } from '@/lib/bunny-player-adapter';
import { cn } from '@/lib/utils';

interface BunnyPlayerProps {
  videoId: string;
  libraryId?: string;
  lessonTitle?: string;
  autoplay?: boolean;
  className?: string;
  resumeAtSeconds?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: () => void;
  onResume?: (seconds: number) => void;
}

type VideoType = 'youtube' | 'vimeo' | 'bunny' | 'unknown';

function detectVideoType(url: string): VideoType {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('iframe.mediadelivery.net') || url.includes('video.bunnycdn.com')) return 'bunny';
  return 'unknown';
}

function getYouTubeId(url: string): string | null {
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
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

function resolveEmbedUrl(videoId: string, libraryId: string | undefined, autoplay: boolean) {
  const videoType = detectVideoType(videoId);
  if (videoType === 'youtube') {
    const youtubeId = getYouTubeId(videoId);
    if (youtubeId) {
      return 'https://www.youtube.com/embed/' + youtubeId + (autoplay ? '?autoplay=1&rel=0' : '?rel=0');
    }
  }
  if (videoType === 'vimeo') {
    const vimeoId = getVimeoId(videoId);
    if (vimeoId) {
      return 'https://player.vimeo.com/video/' + vimeoId + (autoplay ? '?autoplay=1' : '');
    }
  }
  if (videoType === 'bunny') {
    if (videoId.includes('/play/')) return videoId.replace('/play/', '/embed/');
    if (videoId.includes('/embed/')) return videoId;
    const match = videoId.match(/([a-f0-9-]{36})/i);
    if (match && libraryId) {
      return 'https://iframe.mediadelivery.net/embed/' + libraryId + '/' + match[1];
    }
    return videoId;
  }
  if (/^[a-f0-9-]{36}$/i.test(videoId) && libraryId) {
    return 'https://iframe.mediadelivery.net/embed/' + libraryId + '/' + videoId;
  }
  if (libraryId && !videoId.includes('http')) {
    return 'https://iframe.mediadelivery.net/embed/' + libraryId + '/' + videoId;
  }
  return videoId;
}

export default function BunnyPlayer({
  videoId,
  libraryId,
  lessonTitle,
  autoplay = false,
  className = '',
  resumeAtSeconds,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  onError,
  onResume,
}: BunnyPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const callbacksRef = useRef<BunnyPlayerCallbacks>({});
  const [loadedUrl, setLoadedUrl] = useState('');
  const [slowUrl, setSlowUrl] = useState('');
  const [failedUrl, setFailedUrl] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    callbacksRef.current = { onTimeUpdate, onPlay, onPause, onEnded, onError, onResume };
  }, [onEnded, onError, onPause, onPlay, onResume, onTimeUpdate]);

  const finalUrl = useMemo(
    () => resolveEmbedUrl(videoId, libraryId, autoplay),
    [autoplay, libraryId, videoId],
  );
  const videoType = useMemo(() => detectVideoType(finalUrl), [finalUrl]);

  useEffect(() => {
    // The iframe may finish loading before hydration attaches onLoad.
    if (videoType !== 'bunny') return;
    const frame = iframeRef.current;
    if (!frame) return;
    const connection = connectBunnyPlayer({
      frame,
      resumeAtSeconds,
      callbacks: {
        onReady: () => setLoadedUrl(finalUrl),
        onTimeUpdate: (seconds, duration) => callbacksRef.current.onTimeUpdate?.(seconds, duration),
        onPlay: () => callbacksRef.current.onPlay?.(),
        onPause: () => callbacksRef.current.onPause?.(),
        onEnded: () => callbacksRef.current.onEnded?.(),
        onResume: (seconds) => callbacksRef.current.onResume?.(seconds),
        onError: () => {
          setFailedUrl(finalUrl);
          callbacksRef.current.onError?.();
        },
      },
    });
    return () => connection?.disconnect();
  }, [finalUrl, loadedUrl, reloadNonce, resumeAtSeconds, videoType]);

  const iframeLoaded = loadedUrl === finalUrl;
  const playerFailed = failedUrl === finalUrl;
  const playerSlow = slowUrl === finalUrl && !iframeLoaded;

  useEffect(() => {
    if (!finalUrl || iframeLoaded || playerFailed) return;
    const timer = window.setTimeout(() => setSlowUrl(finalUrl), 8_000);
    return () => window.clearTimeout(timer);
  }, [finalUrl, iframeLoaded, playerFailed, reloadNonce]);

  const retry = () => {
    setLoadedUrl('');
    setSlowUrl('');
    setFailedUrl('');
    setReloadNonce((current) => current + 1);
  };

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
        key={finalUrl + ':' + reloadNonce}
        ref={iframeRef}
        src={finalUrl}
        title={lessonTitle ? 'วิดีโอบทเรียน ' + lessonTitle : 'วิดีโอตัวอย่างหลักสูตร'}
        loading="lazy"
        onLoad={() => {
          setLoadedUrl(finalUrl);
          setSlowUrl('');
        }}
        className="absolute inset-0 size-full border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
      {(playerSlow || playerFailed) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 p-6">
          <Alert className="max-w-xl">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>{playerFailed ? 'ยังเล่นวิดีโอนี้ไม่ได้' : 'วิดีโอกำลังโหลดช้าผิดปกติ'}</AlertTitle>
            <AlertDescription>
              <p>ลองโหลดวิดีโอใหม่ หากความคืบหน้ายังบันทึกไม่สำเร็จอาจต้องลองบันทึกอีกครั้ง</p>
              <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={retry}>
                ลองโหลดวิดีโออีกครั้ง
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
