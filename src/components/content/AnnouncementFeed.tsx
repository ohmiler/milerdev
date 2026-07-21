'use client';

import { useEffect, useState } from 'react';
import styles from './public-content.module.css';

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
      <div className={styles.feedState} aria-live="polite" aria-busy="true">
        <span className={styles.loadingMark} aria-hidden="true" />
        <div>
          <p className={styles.stateCode}>SYNCING PUBLIC NOTICE</p>
          <h2>กำลังตรวจสอบประกาศล่าสุด</h2>
          <p>ระบบกำลังโหลดข่าวสารที่เกี่ยวข้องกับบัญชีของคุณ</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.feedState} role="alert">
        <span className={styles.stateSymbol} aria-hidden="true">!</span>
        <div>
          <p className={styles.stateCode}>CONNECTION INTERRUPTED</p>
          <h2>โหลดประกาศไม่สำเร็จ</h2>
          <p>ยังแสดงข่าวสารล่าสุดไม่ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่</p>
          <button type="button" onClick={onRetry}>ลองอีกครั้ง <span aria-hidden="true">↻</span></button>
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className={styles.feedState} aria-live="polite">
        <span className={styles.stateSymbol} aria-hidden="true">—</span>
        <div>
          <p className={styles.stateCode}>NOTICE QUEUE / CLEAR</p>
          <h2>ยังไม่มีประกาศที่ต้องติดตาม</h2>
          <p>เมื่อมีข่าวสารใหม่จากทีม MilerDev ประกาศจะแสดงที่หน้านี้</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.announcementList} aria-live="polite">
      {announcements.map((announcement, index) => {
        const config = typeConfig[announcement.type] || typeConfig.info;
        return (
          <article
            className={styles.announcement}
            data-announcement-type={announcement.type}
            key={announcement.id}
          >
            <div className={styles.announcementRail}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <i aria-hidden="true" />
            </div>
            <div className={styles.announcementBody}>
              <header className={styles.announcementMeta}>
                <span className={styles.typeCode}>{config.code}</span>
                <strong>{config.label}</strong>
                <time dateTime={announcement.createdAt}>{formatDate(announcement.createdAt)}</time>
                {announcement.creatorName && <span>โดย {announcement.creatorName}</span>}
              </header>
              <h2>{announcement.title}</h2>
              <div className={styles.announcementContent}>{announcement.content}</div>
            </div>
          </article>
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
