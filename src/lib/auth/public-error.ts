type AuthFailurePayload = {
  retryAfter?: unknown;
};

export function getAuthPublicError(status: number, payload: AuthFailurePayload): string {
  if (status === 429) {
    const parsedRetryAfter = Number(payload.retryAfter);
    const retryAfter = Number.isFinite(parsedRetryAfter)
      ? Math.min(3600, Math.max(1, Math.ceil(parsedRetryAfter)))
      : 60;
    return `ส่งคำขอถี่เกินไป กรุณารอ ${retryAfter} วินาทีแล้วลองใหม่`;
  }

  if (status === 503) {
    return 'ระบบป้องกันการใช้งานผิดปกติไม่พร้อม กรุณาลองใหม่ภายหลัง';
  }

  return 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}
