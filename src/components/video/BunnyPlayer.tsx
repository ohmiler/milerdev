'use client';

import { useRef, useEffect, useCallback, useMemo, useState } from 'react';

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
      <div 
        className={className}
        style={{
          aspectRatio: '16/9',
          background: '#1e293b',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <svg style={{ width: '48px', height: '48px', margin: '0 auto 12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p>ไม่มีวิดีโอสำหรับบทเรียนนี้</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={className}
      style={{
        position: 'relative',
        paddingTop: '56.25%', // 16:9 aspect ratio
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <iframe
        key={finalUrl}
        ref={iframeRef}
        src={finalUrl}
        loading="lazy"
        onLoad={() => setLoadedUrl(finalUrl)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
      {showDebugOverlay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.72)',
            color: '#e2e8f0',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '520px' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '10px' }}>วิดีโอกำลังโหลดช้าผิดปกติ</div>
            <div style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: '14px' }}>
              หากหน้าจอยังคงเป็นสีดำ อาจเกิดจากเครือข่ายหรือผู้ให้บริการอินเทอร์เน็ตบล็อกการเชื่อมต่อกับระบบวิดีโอ
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', lineHeight: 1.7, wordBreak: 'break-all' }}>
              {finalUrl}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
