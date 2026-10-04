import QRCode from 'qrcode';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildPromptPayPayload, createPromptPayQr } from '@/lib/commerce/promptpay-qr';

// Expected payloads were produced by the reference implementation, promptpay-qr 0.5.0 (dtinth/promptpay-qr).
describe('PromptPay QR payload', () => {
  it.each([
    ['mobile number', '081-234-5678', 1490, '00020101021229370016A000000677010111011300668123456785802TH530376454071490.006304C4F9'],
    ['national or tax ID', '1234567890123', 990.25, '00020101021229370016A000000677010111021312345678901235802TH53037645406990.2563049BEC'],
    ['e-wallet ID', '123456789012345', 590, '00020101021229390016A00000067701011103151234567890123455802TH53037645406590.0063040509'],
  ])('embeds the amount for a %s', (_kind, id, amount, expected) => {
    expect(buildPromptPayPayload(id, amount)).toBe(expected);
  });

  it.each(['', '12345', '81234567890', '+66812345678', 'abc1234567', '12345678901234'])('rejects %j as a PromptPay ID', (id) => {
    expect(buildPromptPayPayload(id, 990)).toBeNull();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects amount %s', (amount) => {
    expect(buildPromptPayPayload('0812345678', amount)).toBeNull();
  });
});

describe('PromptPay QR image', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('returns null when PROMPTPAY_ID is not configured', async () => {
    vi.stubEnv('PROMPTPAY_ID', '');
    await expect(createPromptPayQr(990)).resolves.toBeNull();
  });

  it('throws instead of encoding a misconfigured PROMPTPAY_ID', async () => {
    vi.stubEnv('PROMPTPAY_ID', '12345');
    await expect(createPromptPayQr(990)).rejects.toThrow('PROMPTPAY_ID');
  });

  it('encodes the payload for the configured ID and amount as a PNG', async () => {
    vi.stubEnv('PROMPTPAY_ID', ' 0812345678 ');
    const image = await createPromptPayQr(1490);
    const expected = await QRCode.toDataURL(
      '00020101021229370016A000000677010111011300668123456785802TH530376454071490.006304C4F9',
      { errorCorrectionLevel: 'M', margin: 2, width: 480 },
    );
    expect(image).toBe(expected);
    expect(image?.startsWith('data:image/png;base64,')).toBe(true);
  });
});
