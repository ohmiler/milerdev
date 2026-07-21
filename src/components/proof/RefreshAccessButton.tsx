'use client';

export default function RefreshAccessButton({ className }: { className: string }) {
  return (
    <button className={className} type="button" onClick={() => window.location.reload()}>
      ตรวจสอบสถานะอีกครั้ง
    </button>
  );
}
