'use client';

import { useState, useEffect, useCallback } from 'react';

interface CodeLine {
  indent: number;
  tokens: { text: string; color: string }[];
}

const codeSnippets: { fileName: string; lang: string; lines: CodeLine[] }[] = [
  {
    fileName: 'App.tsx',
    lang: 'tsx',
    lines: [
      { indent: 0, tokens: [{ text: 'import', color: '#c678dd' }, { text: ' React ', color: '#e5c07b' }, { text: 'from', color: '#c678dd' }, { text: " 'react'", color: '#98c379' }] },
      { indent: 0, tokens: [{ text: 'import', color: '#c678dd' }, { text: ' { motion }', color: '#e5c07b' }, { text: ' from', color: '#c678dd' }, { text: " 'framer-motion'", color: '#98c379' }] },
      { indent: 0, tokens: [] },
      { indent: 0, tokens: [{ text: 'export default', color: '#c678dd' }, { text: ' function ', color: '#61afef' }, { text: 'App', color: '#e5c07b' }, { text: '() {', color: '#abb2bf' }] },
      { indent: 1, tokens: [{ text: 'const', color: '#c678dd' }, { text: ' [count, setCount]', color: '#e06c75' }, { text: ' = ', color: '#abb2bf' }, { text: 'useState', color: '#61afef' }, { text: '(', color: '#abb2bf' }, { text: '0', color: '#d19a66' }, { text: ')', color: '#abb2bf' }] },
      { indent: 0, tokens: [] },
      { indent: 1, tokens: [{ text: 'return', color: '#c678dd' }, { text: ' (', color: '#abb2bf' }] },
      { indent: 2, tokens: [{ text: '<', color: '#abb2bf' }, { text: 'motion.div', color: '#e06c75' }, { text: ' animate', color: '#d19a66' }, { text: '={{ ', color: '#abb2bf' }, { text: 'scale:', color: '#e06c75' }, { text: ' 1.1', color: '#d19a66' }, { text: ' }}', color: '#abb2bf' }, { text: '>', color: '#abb2bf' }] },
      { indent: 3, tokens: [{ text: '<', color: '#abb2bf' }, { text: 'h1', color: '#e06c75' }, { text: '>', color: '#abb2bf' }, { text: 'Hello MilerDev! 🚀', color: '#abb2bf' }, { text: '</', color: '#abb2bf' }, { text: 'h1', color: '#e06c75' }, { text: '>', color: '#abb2bf' }] },
      { indent: 3, tokens: [{ text: '<', color: '#abb2bf' }, { text: 'button', color: '#e06c75' }, { text: ' onClick', color: '#d19a66' }, { text: '={', color: '#abb2bf' }, { text: '() =>', color: '#c678dd' }, { text: ' setCount', color: '#61afef' }, { text: '(c => c + ', color: '#abb2bf' }, { text: '1', color: '#d19a66' }, { text: ')}', color: '#abb2bf' }, { text: '>', color: '#abb2bf' }] },
      { indent: 4, tokens: [{ text: 'Clicked: ', color: '#abb2bf' }, { text: '{count}', color: '#e06c75' }, { text: ' times', color: '#abb2bf' }] },
      { indent: 3, tokens: [{ text: '</', color: '#abb2bf' }, { text: 'button', color: '#e06c75' }, { text: '>', color: '#abb2bf' }] },
      { indent: 2, tokens: [{ text: '</', color: '#abb2bf' }, { text: 'motion.div', color: '#e06c75' }, { text: '>', color: '#abb2bf' }] },
      { indent: 1, tokens: [{ text: ')', color: '#abb2bf' }] },
      { indent: 0, tokens: [{ text: '}', color: '#abb2bf' }] },
    ],
  },
  {
    fileName: 'api/route.ts',
    lang: 'ts',
    lines: [
      { indent: 0, tokens: [{ text: 'import', color: '#c678dd' }, { text: ' { NextResponse }', color: '#e5c07b' }, { text: ' from', color: '#c678dd' }, { text: " 'next/server'", color: '#98c379' }] },
      { indent: 0, tokens: [{ text: 'import', color: '#c678dd' }, { text: ' { db }', color: '#e5c07b' }, { text: ' from', color: '#c678dd' }, { text: " '@/lib/db'", color: '#98c379' }] },
      { indent: 0, tokens: [] },
      { indent: 0, tokens: [{ text: 'export async function', color: '#c678dd' }, { text: ' GET', color: '#61afef' }, { text: '() {', color: '#abb2bf' }] },
      { indent: 1, tokens: [{ text: 'const', color: '#c678dd' }, { text: ' courses', color: '#e06c75' }, { text: ' = ', color: '#abb2bf' }, { text: 'await', color: '#c678dd' }, { text: ' db', color: '#e5c07b' }, { text: '.query', color: '#abb2bf' }] },
      { indent: 2, tokens: [{ text: '.courses', color: '#abb2bf' }, { text: '.findMany', color: '#61afef' }, { text: '({', color: '#abb2bf' }] },
      { indent: 3, tokens: [{ text: 'where:', color: '#e06c75' }, { text: " { status: ", color: '#abb2bf' }, { text: "'published'", color: '#98c379' }, { text: ' }', color: '#abb2bf' }, { text: ',', color: '#abb2bf' }] },
      { indent: 3, tokens: [{ text: 'orderBy:', color: '#e06c75' }, { text: " { createdAt: ", color: '#abb2bf' }, { text: "'desc'", color: '#98c379' }, { text: ' }', color: '#abb2bf' }] },
      { indent: 2, tokens: [{ text: '})', color: '#abb2bf' }] },
      { indent: 0, tokens: [] },
      { indent: 1, tokens: [{ text: 'return', color: '#c678dd' }, { text: ' NextResponse', color: '#e5c07b' }, { text: '.json', color: '#61afef' }, { text: '({', color: '#abb2bf' }] },
      { indent: 2, tokens: [{ text: 'success:', color: '#e06c75' }, { text: ' true', color: '#d19a66' }, { text: ',', color: '#abb2bf' }] },
      { indent: 2, tokens: [{ text: 'data:', color: '#e06c75' }, { text: ' courses', color: '#e5c07b' }] },
      { indent: 1, tokens: [{ text: '})', color: '#abb2bf' }] },
      { indent: 0, tokens: [{ text: '}', color: '#abb2bf' }] },
    ],
  },
  {
    fileName: 'schema.ts',
    lang: 'ts',
    lines: [
      { indent: 0, tokens: [{ text: 'import', color: '#c678dd' }, { text: ' { mysqlTable, varchar }', color: '#e5c07b' }, { text: ' from', color: '#c678dd' }, { text: " 'drizzle-orm'", color: '#98c379' }] },
      { indent: 0, tokens: [] },
      { indent: 0, tokens: [{ text: 'export const', color: '#c678dd' }, { text: ' users', color: '#e06c75' }, { text: ' = ', color: '#abb2bf' }, { text: 'mysqlTable', color: '#61afef' }, { text: "(", color: '#abb2bf' }, { text: "'users'", color: '#98c379' }, { text: ', {', color: '#abb2bf' }] },
      { indent: 1, tokens: [{ text: 'id:', color: '#e06c75' }, { text: ' varchar', color: '#61afef' }, { text: "(", color: '#abb2bf' }, { text: "'id'", color: '#98c379' }, { text: ', { length: ', color: '#abb2bf' }, { text: '36', color: '#d19a66' }, { text: ' })', color: '#abb2bf' }] },
      { indent: 2, tokens: [{ text: '.primaryKey', color: '#61afef' }, { text: '()', color: '#abb2bf' }, { text: ',', color: '#abb2bf' }] },
      { indent: 1, tokens: [{ text: 'name:', color: '#e06c75' }, { text: ' varchar', color: '#61afef' }, { text: "(", color: '#abb2bf' }, { text: "'name'", color: '#98c379' }, { text: ', { length: ', color: '#abb2bf' }, { text: '100', color: '#d19a66' }, { text: ' })', color: '#abb2bf' }] },
      { indent: 2, tokens: [{ text: '.notNull', color: '#61afef' }, { text: '()', color: '#abb2bf' }, { text: ',', color: '#abb2bf' }] },
      { indent: 1, tokens: [{ text: 'email:', color: '#e06c75' }, { text: ' varchar', color: '#61afef' }, { text: "(", color: '#abb2bf' }, { text: "'email'", color: '#98c379' }, { text: ', { length: ', color: '#abb2bf' }, { text: '255', color: '#d19a66' }, { text: ' })', color: '#abb2bf' }] },
      { indent: 2, tokens: [{ text: '.notNull', color: '#61afef' }, { text: '().', color: '#abb2bf' }, { text: 'unique', color: '#61afef' }, { text: '()', color: '#abb2bf' }, { text: ',', color: '#abb2bf' }] },
      { indent: 1, tokens: [{ text: 'role:', color: '#e06c75' }, { text: ' varchar', color: '#61afef' }, { text: "(", color: '#abb2bf' }, { text: "'role'", color: '#98c379' }, { text: ', { length: ', color: '#abb2bf' }, { text: '20', color: '#d19a66' }, { text: ' })', color: '#abb2bf' }] },
      { indent: 2, tokens: [{ text: ".default", color: '#61afef' }, { text: "(", color: '#abb2bf' }, { text: "'student'", color: '#98c379' }, { text: ")", color: '#abb2bf' }] },
      { indent: 0, tokens: [{ text: '})', color: '#abb2bf' }] },
    ],
  },
];

export default function HeroCodeEditor() {
  const [snippetIndex, setSnippetIndex] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const snippet = codeSnippets[snippetIndex];
  const totalLines = snippet.lines.length;

  const getLineText = useCallback((line: CodeLine): string => {
    return line.tokens.map((t) => t.text).join('');
  }, []);

  // Typing animation
  useEffect(() => {
    if (!isTyping) return;

    if (visibleLines >= totalLines) {
      // All lines typed — pause then switch snippet
      const timeout = setTimeout(() => {
        setSnippetIndex((prev) => (prev + 1) % codeSnippets.length);
        setVisibleLines(0);
        setCharIndex(0);
        setIsTyping(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }

    const currentLine = snippet.lines[visibleLines];
    const lineText = getLineText(currentLine);

    if (lineText.length === 0) {
      // Empty line — skip quickly
      const timeout = setTimeout(() => {
        setVisibleLines((prev) => prev + 1);
        setCharIndex(0);
      }, 80);
      return () => clearTimeout(timeout);
    }

    if (charIndex >= lineText.length) {
      // Line complete — move to next
      const timeout = setTimeout(() => {
        setVisibleLines((prev) => prev + 1);
        setCharIndex(0);
      }, 60);
      return () => clearTimeout(timeout);
    }

    // Type next character
    const speed = 20 + Math.random() * 30;
    const timeout = setTimeout(() => {
      setCharIndex((prev) => prev + 1);
    }, speed);
    return () => clearTimeout(timeout);
  }, [visibleLines, charIndex, isTyping, totalLines, snippet, getLineText]);

  const renderLine = (line: CodeLine, lineIdx: number, isCurrentLine: boolean) => {
    const indent = '  '.repeat(line.indent);

    if (line.tokens.length === 0) {
      return <span>{indent}</span>;
    }

    if (!isCurrentLine) {
      // Fully visible line
      return (
        <>
          <span style={{ color: '#636d83' }}>{indent}</span>
          {line.tokens.map((token, i) => (
            <span key={i} style={{ color: token.color }}>
              {token.text}
            </span>
          ))}
        </>
      );
    }

    // Currently typing line — show partial
    const fullText = indent + line.tokens.map((t) => t.text).join('');
    const visibleText = fullText.substring(0, indent.length + charIndex);

    // Render with syntax highlighting
    let remaining = visibleText.substring(indent.length);
    const rendered: React.ReactNode[] = [
      <span key="indent" style={{ color: '#636d83' }}>
        {indent}
      </span>,
    ];

    for (let i = 0; i < line.tokens.length && remaining.length > 0; i++) {
      const token = line.tokens[i];
      const chunk = remaining.substring(0, token.text.length);
      remaining = remaining.substring(token.text.length);
      rendered.push(
        <span key={i} style={{ color: token.color }}>
          {chunk}
        </span>
      );
    }

    return <>{rendered}</>;
  };

  return (
    <div
      style={{
        background: '#1e1e2e',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
        fontSize: '13px',
        lineHeight: 1.7,
        width: '100%',
        maxWidth: '560px',
        transform: 'perspective(1200px) rotateY(-2deg) rotateX(1deg)',
        transition: 'transform 0.4s ease',
      }}
    >
      {/* Title Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: '#181825',
          borderBottom: '1px solid #313244',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#f38ba8',
            }}
          />
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#f9e2af',
            }}
          />
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#a6e3a1',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0', flex: 1 }}>
          {codeSnippets.map((s, i) => (
            <div
              key={i}
              style={{
                padding: '4px 14px',
                fontSize: '11.5px',
                color: i === snippetIndex ? '#cdd6f4' : '#6c7086',
                background: i === snippetIndex ? '#1e1e2e' : 'transparent',
                borderRadius: i === snippetIndex ? '6px 6px 0 0' : '0',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: i === snippetIndex ? 500 : 400,
              }}
              onClick={() => {
                setSnippetIndex(i);
                setVisibleLines(0);
                setCharIndex(0);
                setIsTyping(true);
              }}
            >
              {s.fileName}
            </div>
          ))}
        </div>
      </div>

      {/* Code Area */}
      <div
        style={{
          padding: '20px 0',
          minHeight: '320px',
          overflow: 'hidden',
        }}
      >
        {snippet.lines.map((line, idx) => {
          const isVisible = idx < visibleLines || (idx === visibleLines && isTyping);
          const isCurrentLine = idx === visibleLines && isTyping;
          const lineNum = idx + 1;

          return (
            <div
              key={`${snippetIndex}-${idx}`}
              style={{
                display: 'flex',
                padding: '0 20px 0 0',
                opacity: isVisible ? 1 : 0.06,
                transform: isVisible ? 'translateX(0)' : 'translateX(8px)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
                background: isCurrentLine ? 'rgba(137, 180, 250, 0.06)' : 'transparent',
              }}
            >
              {/* Line number */}
              <div
                style={{
                  width: '50px',
                  textAlign: 'right',
                  color: isCurrentLine ? '#89b4fa' : '#45475a',
                  paddingRight: '16px',
                  userSelect: 'none',
                  flexShrink: 0,
                  fontSize: '12px',
                }}
              >
                {lineNum}
              </div>
              {/* Code content */}
              <div style={{ flex: 1, whiteSpace: 'pre', color: '#cdd6f4' }}>
                {isVisible && renderLine(line, idx, isCurrentLine)}
                {isCurrentLine && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '2px',
                      height: '16px',
                      background: '#89b4fa',
                      marginLeft: '1px',
                      verticalAlign: 'text-bottom',
                      animation: 'cursorBlink 1s step-end infinite',
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 16px',
          background: '#181825',
          borderTop: '1px solid #313244',
          fontSize: '11px',
          color: '#6c7086',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ color: '#a6e3a1' }}>●</span>
          <span>
            Ln {visibleLines + 1}, Col {charIndex + 1}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>TypeScript React</span>
          <span>UTF-8</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes cursorBlink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
