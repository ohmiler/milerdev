import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8');

// Admin keeps its own operations UI (ADR 0007).
const SKIPPED_DIRECTORIES = ['src/app/admin', 'src/components/admin'];

// Files that need literal colours, and why. Everything else uses the semantic tokens in globals.css.
const ALLOWED_FILES: Record<string, string> = {
  'src/components/home/HomeCodeEditor.tsx': 'a VS Code mock with its syntax palette, and the mock web page its sample code builds',
  'src/components/stack/StackScene.tsx': 'Three.js materials and lights take literal colours, not CSS variables',
  'src/components/auth/AuthIcons.tsx': "Google's logo must keep Google's brand colours",
  'src/components/certificate/CertificateCard.tsx': "certificates render the course's stored certificate colour",
};

function tsxFiles(directory: string): string[] {
  return readdirSync(resolve(root, directory)).flatMap((name) => {
    const path = join(directory, name).replaceAll('\\', '/');
    if (SKIPPED_DIRECTORIES.includes(path)) return [];
    if (statSync(resolve(root, path)).isDirectory()) return tsxFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

// A hex colour in a Tailwind arbitrary value (`bg-[#0f233a]`) or a string literal (`color: '#fff'`),
// but not an in-page link such as href="#add".
function rawColors(source: string): string[] {
  return [
    ...source.matchAll(/\[#[0-9a-fA-F]{3,8}\]/g),
    ...source.matchAll(/(?<!href=\{?)(['"`])#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\1/g),
  ].map((match) => match[0]);
}

describe('no raw colours on non-admin pages', () => {
  const files = [...tsxFiles('src/app'), ...tsxFiles('src/components')];

  it('uses semantic colour tokens instead of hex values', () => {
    const offenders = files
      .filter((path) => !(path in ALLOWED_FILES))
      .map((path) => ({ path, colors: rawColors(readSource(path)) }))
      .filter(({ colors }) => colors.length > 0)
      .map(({ path, colors }) => `${path}: ${[...new Set(colors)].join(', ')}`);

    expect(offenders).toEqual([]);
  });

  it('drops an exception once its file no longer needs literal colours', () => {
    for (const path of Object.keys(ALLOWED_FILES)) {
      expect(files, path).toContain(path);
      expect(rawColors(readSource(path)).length, `${path} has no raw colours left; remove it from ALLOWED_FILES`).toBeGreaterThan(0);
    }
  });

  it('flags the colours it is meant to catch and ignores in-page links', () => {
    const sample = `<a href="#add" className="bg-[#0f233a] text-navy" style={{ color: '#fff' }} data-id="#feed-1" />`;
    expect(rawColors(sample)).toEqual(['[#0f233a]', "'#fff'"]);
  });
});
