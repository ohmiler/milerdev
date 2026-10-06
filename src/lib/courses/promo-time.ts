// Promotion windows are entered and shown in Thai time, the shop's time zone, whatever the
// admin's browser or the server is set to. Thailand has no daylight saving, so the offset
// is always +07:00. The public course page formats the end date in Asia/Bangkok too.
const THAI_OFFSET = '+07:00';
const THAI_OFFSET_MS = 7 * 60 * 60 * 1000;
const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** A stored instant as the "YYYY-MM-DDTHH:mm" value of a datetime-local input, in Thai time. */
export function toThaiDateTimeInput(value: Date | string | null | undefined): string {
  if (!value) return '';
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return '';
  return new Date(instant.getTime() + THAI_OFFSET_MS).toISOString().slice(0, 16);
}

/** A datetime-local value read as Thai time, as an ISO instant; '' when empty, null when invalid. */
export function fromThaiDateTimeInput(value: string): string | null {
  if (!value) return '';
  if (!DATETIME_LOCAL.test(value)) return null;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  const instant = new Date(`${withSeconds}${THAI_OFFSET}`);
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}
