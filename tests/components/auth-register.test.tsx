import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(path, 'utf8');

describe('Register UI contracts', () => {
  it('keeps the route server-owned and preserves its identity request boundary', () => {
    const page = readSource('src/app/register/page.tsx');
    const source = readSource('src/components/auth/RegisterForm.tsx');

    expect(page).not.toContain('use client');
    expect(page).toContain('<RegisterForm');
    expect(source).toContain("fetch('/api/auth/register'");
    expect(source).toContain("method: 'POST'");
    expect(source).toContain("'Content-Type': 'application/json'");
    expect(source).toContain('JSON.stringify({ name, email, password })');
    expect(source).toContain("signIn('credentials'");
  });

  it('keeps the account identity fields aligned with the API request', () => {
    const source = readSource('src/components/auth/RegisterForm.tsx');

    expect(source).toMatch(/name=(?:["']name["']|\{["']name["']\})/);
    expect(source).toContain('maxLength={100}');
    expect(source).toMatch(/name=(?:["']email["']|\{["']email["']\})/);
    expect(source).toMatch(/name=(?:["']password["']|\{["']password["']\})/);
    expect(source).toMatch(/name=(?:["']confirmPassword["']|\{["']confirmPassword["']\})/);
  });
});
