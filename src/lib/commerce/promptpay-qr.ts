import 'server-only';

import QRCode from 'qrcode';

// Thai QR Payment (EMVCo merchant-presented) payload for a PromptPay transfer of a fixed amount.
const PROMPTPAY_AID = 'A000000677010111';

function field(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

// CRC-16/CCITT-FALSE (polynomial 0x1021, initial 0xFFFF), as the EMVCo QR specification requires.
function crc16(input: string) {
  let crc = 0xffff;
  for (let index = 0; index < input.length; index += 1) {
    crc ^= input.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// A mobile number (10 digits), national ID or tax ID (13 digits), or e-wallet ID (15 digits).
function merchantAccount(promptPayId: string) {
  const digits = promptPayId.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length === 10 && digits.startsWith('0')) return field('01', `0066${digits.slice(1)}`);
  if (digits.length === 13) return field('02', digits);
  if (digits.length === 15) return field('03', digits);
  return null;
}

export function buildPromptPayPayload(promptPayId: string, amount: number) {
  const account = merchantAccount(promptPayId);
  if (!account || !Number.isFinite(amount) || amount <= 0) return null;
  const body = [
    field('00', '01'),
    field('01', '12'),
    field('29', field('00', PROMPTPAY_AID) + account),
    field('58', 'TH'),
    field('53', '764'),
    field('54', amount.toFixed(2)),
  ].join('') + '6304';
  return body + crc16(body);
}

/** A PNG data URL for the configured PROMPTPAY_ID, or null when it is unset. Throws when it is invalid. */
export async function createPromptPayQr(amount: number) {
  const promptPayId = process.env.PROMPTPAY_ID?.trim();
  if (!promptPayId) return null;
  const payload = buildPromptPayPayload(promptPayId, amount);
  if (!payload) throw new Error('PROMPTPAY_ID must be a mobile number, national or tax ID, or e-wallet ID');
  // PNG rather than SVG, so a phone can save it to the gallery and open it from a bank app.
  return QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 2, width: 480 });
}
