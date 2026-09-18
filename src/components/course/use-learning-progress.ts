'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { showToast } from '@/components/ui/Toast';

type LearningProgressInput = {
  courseId: string;
  lessonId: string;
  canTrackProgress: boolean;
  isEnrolled: boolean;
  completedLessonIds: readonly string[];
  totalLessons: number;
  currentProgress: { completed: boolean; watchTimeSeconds: number };
};

type ProgressSnapshot = {
  completedIds: Set<string>;
  completionSaveState: 'idle' | 'pending' | 'saved' | 'failed';
  watchSyncFailed: boolean;
  resumedAtSeconds: number | null;
};

// Every request and timer closes over one lesson session, including after disposal.
// A late response may finish its write but cannot publish into a different session.
function createProgressSession(input: LearningProgressInput) {
  let snapshot: ProgressSnapshot = {
    completedIds: new Set(input.completedLessonIds),
    completionSaveState: input.currentProgress.completed ? 'saved' : 'idle',
    watchSyncFailed: false,
    resumedAtSeconds: null,
  };
  const listeners = new Set<() => void>();
  let active = false;
  let playing = false;
  let watchTime = input.currentProgress.watchTimeSeconds;
  let lastSync = watchTime;
  let watchPending = false;
  let completionRequested = input.currentProgress.completed;

  function publish(update: Partial<ProgressSnapshot>) {
    snapshot = { ...snapshot, ...update };
    listeners.forEach((listener) => listener());
  }

  async function save(watchTimeSeconds: number, completed?: true) {
    const response = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: input.lessonId,
        watchTimeSeconds: completed ? watchTimeSeconds || undefined : watchTimeSeconds,
        ...(completed ? { completed } : {}),
      }),
    });
    if (!response.ok) throw new Error('Unable to save lesson progress');
  }

  async function syncWatchTime(): Promise<boolean> {
    if (!input.canTrackProgress || watchPending) return false;
    const position = Math.floor(watchTime);
    if (position <= lastSync) return true;
    watchPending = true;
    let saved = false;
    try {
      await save(position);
      lastSync = Math.max(lastSync, position);
      publish({ watchSyncFailed: false });
      saved = true;
      return true;
    } catch {
      // A concurrent completion may already have acknowledged this position.
      if (position > lastSync) publish({ watchSyncFailed: true });
      return false;
    } finally {
      watchPending = false;
      // Flush a newer position captured before disposal after an older write finishes.
      // A failure remains retryable; do not create an unbounded background retry loop.
      if (!active && saved && Math.floor(watchTime) > lastSync) void syncWatchTime();
    }
  }

  async function completeCurrentLesson() {
    if (!active || !input.isEnrolled || !input.canTrackProgress || completionRequested) return;
    completionRequested = true;
    publish({ completionSaveState: 'pending' });
    const position = Math.floor(watchTime);
    try {
      await save(position, true);
      lastSync = Math.max(lastSync, position);
      const completedIds = new Set(snapshot.completedIds).add(input.lessonId);
      publish({ completedIds, completionSaveState: 'saved', watchSyncFailed: false });
      if (active) {
        showToast(
          completedIds.size === input.totalLessons ? 'เรียนครบทุกบทแล้ว พร้อมกลับมาทบทวนได้ทุกเมื่อ' : 'บันทึกว่าเรียนจบบทนี้แล้ว',
          'success',
        );
      }
    } catch {
      completionRequested = false;
      publish({ completionSaveState: 'failed' });
      if (active) showToast('บันทึกความคืบหน้าไม่สำเร็จ กรุณาลองอีกครั้ง', 'error');
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    activate() {
      active = true;
      const timer = input.canTrackProgress ? window.setInterval(() => {
        if (playing) void syncWatchTime();
      }, 30_000) : undefined;
      return () => {
        active = false;
        playing = false;
        window.clearInterval(timer);
        void syncWatchTime();
      };
    },
    completeCurrentLesson,
    syncWatchTime: () => active ? syncWatchTime() : Promise.resolve(false),
    player: {
      onTimeUpdate(seconds: number) {
        if (active && Number.isFinite(seconds) && seconds >= 0) watchTime = seconds;
      },
      onPlay() { if (active) playing = true; },
      onPause() {
        if (!active) return;
        playing = false;
        void syncWatchTime();
      },
      onEnded() {
        if (!active) return;
        playing = false;
        if (snapshot.completionSaveState === 'saved') void syncWatchTime();
        else void completeCurrentLesson();
      },
      onResume(seconds: number) {
        if (active) publish({ resumedAtSeconds: seconds });
      },
    },
  };
}

export function useLearningProgress(input: LearningProgressInput) {
  // Compare values, not projection object identity: ordinary renders must not reset writes.
  const key = JSON.stringify([
    input.courseId, input.lessonId, input.canTrackProgress, input.isEnrolled,
    input.currentProgress.completed, input.currentProgress.watchTimeSeconds,
    input.completedLessonIds, input.totalLessons,
  ]);
  const [owned, setOwned] = useState(() => ({ key, session: createProgressSession(input) }));
  if (owned.key !== key) setOwned({ key, session: createProgressSession(input) });
  const { session } = owned;
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEffect(() => session.activate(), [session]);

  return {
    ...snapshot,
    completeCurrentLesson: session.completeCurrentLesson,
    syncWatchTime: session.syncWatchTime,
    player: session.player,
  };
}
