import { describe, expect, it } from 'vitest';
import { parseUserImportCsv } from '@/lib/user-import-csv';
describe('credential CSV parsing', () => {
  it('preserves password spaces, commas, quotes and CRLF records', () => {
    expect(parseUserImportCsv('email,password\r\na@example.test,"  a long,""quoted"" phrase  "\r\n'))
      .toEqual([['email', 'password'], ['a@example.test', '  a long,"quoted" phrase  ']]);
  });
  it.each(['email,password\na,"unclosed', 'email,password\na,ab"cd', 'email,password\na,"closed"suffix'])('rejects malformed quoting instead of mutating passwords', (input) => {
    expect(() => parseUserImportCsv(input)).toThrow('Malformed CSV');
  });
});
