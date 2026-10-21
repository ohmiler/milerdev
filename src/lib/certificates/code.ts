import { randomInt } from 'node:crypto';

// No 0/O or 1/I, so a code read off a printed certificate is not ambiguous.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSymbols(count: number): string {
  let symbols = '';
  for (let index = 0; index < count; index++) {
    symbols += CODE_ALPHABET.charAt(randomInt(CODE_ALPHABET.length));
  }
  return symbols;
}

/**
 * A new certificate code, CERT-XXXX-XXXX. The code is the only key to a public certificate
 * page, so every symbol comes from the CSPRNG: Math.random's state can be recovered from a few
 * observed outputs, which would let one holder predict other holders' codes.
 */
export function generateCertificateCode(): string {
  return `CERT-${randomSymbols(4)}-${randomSymbols(4)}`;
}
