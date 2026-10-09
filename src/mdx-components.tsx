// Required by @next/mdx in the App Router. Maps the HTML that handbook chapters' markdown produces to
// the site's type and colour tokens, and makes the chapter blocks available to every MDX file.

import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { Callout, ChapterLink, CheckList, Goals, Summary } from '@/components/handbook/ChapterBlocks';
import { PromptBox } from '@/components/handbook/PromptBox';
import { Quiz } from '@/components/handbook/Quiz';
import { headingId } from '@/lib/handbook/headings';

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

function MdxLink({ href = '', children, ...props }: ComponentPropsWithoutRef<'a'>) {
  const className = 'text-link underline underline-offset-4';
  if (href.startsWith('/')) return <Link href={href} className={className}>{children}</Link>;
  if (href.startsWith('#')) return <a href={href} className={className} {...props}>{children}</a>;
  return <a href={href} className={className} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
}

const components: MDXComponents = {
  h2: ({ children }) => (
    <h2 id={headingId(textOf(children))} className="mt-14 mb-4 scroll-mt-28 text-2xl font-bold leading-snug text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => <h3 className="mt-10 mb-3 text-h3 font-semibold text-foreground">{children}</h3>,
  p: ({ children }) => <p className="my-5">{children}</p>,
  ul: ({ children }) => <ul className="my-5 list-disc pl-6 [&>li]:my-2 marker:text-link">{children}</ul>,
  ol: ({ children }) => <ol className="my-5 list-decimal pl-6 [&>li]:my-2 marker:font-semibold">{children}</ol>,
  a: MdxLink,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  // No ligatures: a beginner should see the >= they have to type, not a single ≥ glyph.
  code: ({ children }) => <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9375em] [font-variant-ligatures:none]">{children}</code>,
  // Scroll boxes take keyboard focus so a phone-width reader can scroll them without a pointer.
  pre: ({ children }) => (
    <pre role="region" tabIndex={0} aria-label="ตัวอย่างโค้ด" className="my-6 overflow-x-auto focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 rounded-xl bg-foreground px-5 py-4 font-mono [font-variant-ligatures:none] text-[0.9375rem] leading-7 text-background [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div role="region" aria-label="ตาราง เลื่อนซ้ายขวาได้" tabIndex={0} className="my-6 overflow-x-auto rounded-xl border focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
      <table className="w-full min-w-[32rem] border-collapse text-base leading-7">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b bg-muted px-4 py-3 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b px-4 py-3 align-top [tr:last-child_&]:border-b-0">{children}</td>,
  blockquote: ({ children }) => <blockquote className="my-6 rounded-xl border bg-muted px-5 py-1 text-muted-foreground">{children}</blockquote>,
  hr: () => <hr className="my-10 border-border" />,
  Summary,
  Goals,
  PromptBox,
  CheckList,
  Callout,
  ChapterLink,
  Quiz,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
