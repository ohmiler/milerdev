/** "03 / 12" for the admin lesson editor; "--" when the position is unknown. */
export function formatLessonPosition(position: number | null | undefined, lessonCount: number | null | undefined): string {
  if (!position || !lessonCount) return '--';
  const width = Math.max(2, String(lessonCount).length);
  return `${String(position).padStart(width, '0')} / ${String(lessonCount).padStart(width, '0')}`;
}
