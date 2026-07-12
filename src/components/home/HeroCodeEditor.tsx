'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CodeLine {
  indent: number;
  tokens: { text: string; color: string }[];
}

const syntax = {
  keyword: '#569CD6',
  symbol: '#D4D4D4',
  function: '#DCDCAA',
  identifier: '#9CDCFE',
  property: '#9CDCFE',
  string: '#CE9178',
  value: '#B5CEA8',
  muted: '#6A9955',
};

const codeSnippets: { fileName: string; lang: string; lines: CodeLine[] }[] = [
  {
    fileName: 'index.html',
    lang: 'html',
    lines: [
      { indent: 0, tokens: [{ text: '<!doctype html>', color: syntax.muted }] },
      { indent: 0, tokens: [{ text: '<', color: syntax.symbol }, { text: 'html', color: syntax.property }, { text: ' lang', color: syntax.value }, { text: '="th"', color: syntax.string }, { text: '>', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: '<', color: syntax.symbol }, { text: 'head', color: syntax.property }, { text: '>', color: syntax.symbol }] },
      { indent: 2, tokens: [{ text: '<', color: syntax.symbol }, { text: 'meta', color: syntax.property }, { text: ' charset', color: syntax.value }, { text: '="utf-8"', color: syntax.string }, { text: ' />', color: syntax.symbol }] },
      { indent: 2, tokens: [{ text: '<', color: syntax.symbol }, { text: 'title', color: syntax.property }, { text: '>', color: syntax.symbol }, { text: 'MilerDev Course', color: syntax.string }, { text: '</', color: syntax.symbol }, { text: 'title', color: syntax.property }, { text: '>', color: syntax.symbol }] },
      { indent: 2, tokens: [{ text: '<', color: syntax.symbol }, { text: 'link', color: syntax.property }, { text: ' rel', color: syntax.value }, { text: '="stylesheet"', color: syntax.string }, { text: ' href', color: syntax.value }, { text: '="./styles.css"', color: syntax.string }, { text: ' />', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: '</', color: syntax.symbol }, { text: 'head', color: syntax.property }, { text: '>', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: '<', color: syntax.symbol }, { text: 'body', color: syntax.property }, { text: '>', color: syntax.symbol }] },
      { indent: 2, tokens: [{ text: '<', color: syntax.symbol }, { text: 'main', color: syntax.property }, { text: ' class', color: syntax.value }, { text: '="course-card"', color: syntax.string }, { text: '>', color: syntax.symbol }] },
      { indent: 3, tokens: [{ text: '<', color: syntax.symbol }, { text: 'span', color: syntax.property }, { text: ' class', color: syntax.value }, { text: '="badge"', color: syntax.string }, { text: '>', color: syntax.symbol }, { text: 'Beginner path', color: syntax.string }, { text: '</', color: syntax.symbol }, { text: 'span', color: syntax.property }, { text: '>', color: syntax.symbol }] },
      { indent: 3, tokens: [{ text: '<', color: syntax.symbol }, { text: 'h1', color: syntax.property }, { text: '>', color: syntax.symbol }, { text: 'เรียน Coding จนสร้างโปรเจกต์ได้', color: syntax.string }, { text: '</', color: syntax.symbol }, { text: 'h1', color: syntax.property }, { text: '>', color: syntax.symbol }] },
      { indent: 3, tokens: [{ text: '<', color: syntax.symbol }, { text: 'button', color: syntax.property }, { text: ' id', color: syntax.value }, { text: '="start"', color: syntax.string }, { text: '>', color: syntax.symbol }, { text: 'เริ่มเรียน', color: syntax.string }, { text: '</', color: syntax.symbol }, { text: 'button', color: syntax.property }, { text: '>', color: syntax.symbol }] },
      { indent: 2, tokens: [{ text: '</', color: syntax.symbol }, { text: 'main', color: syntax.property }, { text: '>', color: syntax.symbol }] },
      { indent: 2, tokens: [{ text: '<', color: syntax.symbol }, { text: 'script', color: syntax.property }, { text: ' src', color: syntax.value }, { text: '="./app.js"', color: syntax.string }, { text: '></', color: syntax.symbol }, { text: 'script', color: syntax.property }, { text: '>', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: '</', color: syntax.symbol }, { text: 'body', color: syntax.property }, { text: '>', color: syntax.symbol }] },
      { indent: 0, tokens: [{ text: '</', color: syntax.symbol }, { text: 'html', color: syntax.property }, { text: '>', color: syntax.symbol }] },
    ],
  },
  {
    fileName: 'styles.css',
    lang: 'css',
    lines: [
      { indent: 0, tokens: [{ text: ':root', color: syntax.property }, { text: ' {', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: '--brand:', color: syntax.property }, { text: ' #02abff', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: '--ink:', color: syntax.property }, { text: ' #102033', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 0, tokens: [{ text: '}', color: syntax.symbol }] },
      { indent: 0, tokens: [] },
      { indent: 0, tokens: [{ text: 'body', color: syntax.property }, { text: ' {', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'margin:', color: syntax.property }, { text: ' 0', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'font-family:', color: syntax.property }, { text: ' "IBM Plex Sans Thai", sans-serif', color: syntax.string }, { text: ';', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'background:', color: syntax.property }, { text: ' #f7fbff', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'color:', color: syntax.property }, { text: ' var(--ink)', color: syntax.function }, { text: ';', color: syntax.symbol }] },
      { indent: 0, tokens: [{ text: '}', color: syntax.symbol }] },
      { indent: 0, tokens: [] },
      { indent: 0, tokens: [{ text: '.course-card', color: syntax.property }, { text: ' {', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'max-width:', color: syntax.property }, { text: ' 720px', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'margin:', color: syntax.property }, { text: ' 48px auto', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'padding:', color: syntax.property }, { text: ' 32px', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'border:', color: syntax.property }, { text: ' 1px solid #dbe8f2', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'border-radius:', color: syntax.property }, { text: ' 12px', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'background:', color: syntax.property }, { text: ' white', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 0, tokens: [{ text: '}', color: syntax.symbol }] },
      { indent: 0, tokens: [{ text: 'button', color: syntax.property }, { text: ' { ', color: syntax.symbol }, { text: 'background:', color: syntax.property }, { text: ' var(--brand)', color: syntax.function }, { text: '; ', color: syntax.symbol }, { text: 'color:', color: syntax.property }, { text: ' white', color: syntax.value }, { text: '; ', color: syntax.symbol }, { text: '}', color: syntax.symbol }] },
    ],
  },
  {
    fileName: 'app.js',
    lang: 'js',
    lines: [
      { indent: 0, tokens: [{ text: 'const', color: syntax.keyword }, { text: ' startButton', color: syntax.identifier }, { text: ' = ', color: syntax.symbol }, { text: 'document', color: syntax.identifier }, { text: '.querySelector', color: syntax.function }, { text: "('#start')", color: syntax.string }, { text: ';', color: syntax.symbol }] },
      { indent: 0, tokens: [] },
      { indent: 0, tokens: [{ text: 'const', color: syntax.keyword }, { text: ' progress', color: syntax.identifier }, { text: ' = ', color: syntax.symbol }, { text: '{', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'lesson:', color: syntax.property }, { text: ' 1', color: syntax.value }, { text: ',', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'completed:', color: syntax.property }, { text: ' false', color: syntax.value }, { text: ',', color: syntax.symbol }] },
      { indent: 0, tokens: [{ text: '};', color: syntax.symbol }] },
      { indent: 0, tokens: [] },
      { indent: 0, tokens: [{ text: 'function', color: syntax.keyword }, { text: ' startCourse', color: syntax.function }, { text: '() {', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'progress', color: syntax.identifier }, { text: '.completed', color: syntax.property }, { text: ' = ', color: syntax.symbol }, { text: 'true', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'startButton', color: syntax.identifier }, { text: '.textContent', color: syntax.property }, { text: ' = ', color: syntax.symbol }, { text: "'กำลังเริ่มบทเรียนแรก'", color: syntax.string }, { text: ';', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'document', color: syntax.identifier }, { text: '.body', color: syntax.property }, { text: '.dataset', color: syntax.property }, { text: '.learning', color: syntax.property }, { text: ' = ', color: syntax.symbol }, { text: "'active'", color: syntax.string }, { text: ';', color: syntax.symbol }] },
      { indent: 0, tokens: [{ text: '}', color: syntax.symbol }] },
      { indent: 0, tokens: [] },
      { indent: 0, tokens: [{ text: 'startButton', color: syntax.identifier }, { text: '?.', color: syntax.symbol }, { text: 'addEventListener', color: syntax.function }, { text: "('click', ", color: syntax.string }, { text: 'startCourse', color: syntax.identifier }, { text: ');', color: syntax.symbol }] },
    ],
  },
];

const languageLabels: Record<string, string> = {
  html: 'HTML',
  css: 'CSS',
  js: 'JavaScript',
};

export default function HeroCodeEditor() {
  const [snippetIndex, setSnippetIndex] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const codeBodyRef = useRef<HTMLDivElement>(null);

  const snippet = codeSnippets[snippetIndex];
  const totalLines = snippet.lines.length;

  const getLineText = useCallback((line: CodeLine): string => {
    return line.tokens.map((t) => t.text).join('');
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setPrefersReducedMotion(media.matches);

    syncPreference();
    media.addEventListener('change', syncPreference);

    return () => media.removeEventListener('change', syncPreference);
  }, []);

  const activateSnippet = useCallback((nextIndex: number) => {
    setSnippetIndex(nextIndex);

    if (prefersReducedMotion) {
      setVisibleLines(codeSnippets[nextIndex].lines.length);
      setCharIndex(0);
      setIsTyping(false);
      return;
    }

    setVisibleLines(0);
    setCharIndex(0);
    setIsTyping(true);
  }, [prefersReducedMotion]);

  const renderedVisibleLines = prefersReducedMotion ? totalLines : visibleLines;
  const renderedCharIndex = prefersReducedMotion ? 0 : charIndex;
  const renderedIsTyping = !prefersReducedMotion && isTyping;

  useEffect(() => {
    codeBodyRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [snippetIndex]);

  // Typing animation
  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!isTyping) return;

    if (visibleLines >= totalLines) {
      // All lines typed, pause before switching snippets.
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
      // Empty line, skip quickly.
      const timeout = setTimeout(() => {
        setVisibleLines((prev) => prev + 1);
        setCharIndex(0);
      }, 80);
      return () => clearTimeout(timeout);
    }

    if (charIndex >= lineText.length) {
      // Line complete, move to next.
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
  }, [visibleLines, charIndex, isTyping, totalLines, snippet, getLineText, prefersReducedMotion]);

  const renderLine = (line: CodeLine, lineIdx: number, isCurrentLine: boolean) => {
    const indent = '  '.repeat(line.indent);

    if (line.tokens.length === 0) {
      return <span>{indent}</span>;
    }

    if (!isCurrentLine) {
      // Fully visible line
      return (
        <>
          <span style={{ color: syntax.muted }}>{indent}</span>
          {line.tokens.map((token, i) => (
            <span key={i} style={{ color: token.color }}>
              {token.text}
            </span>
          ))}
        </>
      );
    }

    // Currently typing line, show partial.
    const fullText = indent + line.tokens.map((t) => t.text).join('');
    const visibleText = fullText.substring(0, indent.length + charIndex);

    // Render with syntax highlighting
    let remaining = visibleText.substring(indent.length);
    const rendered: React.ReactNode[] = [
      <span key="indent" style={{ color: syntax.muted }}>
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
      className="hero-code-editor"
      aria-label="ตัวอย่างโค้ดจากเส้นทางเรียนของ MilerDev"
    >
      {/* Title Bar */}
      <div className="hero-code-editor__titlebar">
        <div className="hero-code-editor__traffic" aria-hidden="true">
          <span className="hero-code-editor__dot hero-code-editor__dot--danger" />
          <span className="hero-code-editor__dot hero-code-editor__dot--warning" />
          <span className="hero-code-editor__dot hero-code-editor__dot--success" />
        </div>
        <div className="hero-code-editor__tabs" role="tablist" aria-label="ตัวอย่างไฟล์โค้ด">
          {codeSnippets.map((s, i) => (
            <button
              type="button"
              key={i}
              className="hero-code-editor__tab"
              data-active={i === snippetIndex}
              role="tab"
              aria-selected={i === snippetIndex}
              onClick={() => activateSnippet(i)}
            >
              {s.fileName}
            </button>
          ))}
        </div>
      </div>

      {/* Code Area */}
      <div
        ref={codeBodyRef}
        className="hero-code-editor__body"
        role="tabpanel"
        aria-label={snippet.fileName}
      >
        {snippet.lines.map((line, idx) => {
          const isVisible = idx < renderedVisibleLines || (idx === renderedVisibleLines && renderedIsTyping);
          const isCurrentLine = idx === renderedVisibleLines && renderedIsTyping;
          const lineNum = idx + 1;

          return (
            <div
              key={`${snippetIndex}-${idx}`}
              className="hero-code-editor__line"
              data-visible={isVisible}
              data-current={isCurrentLine}
              style={{
                opacity: isVisible ? 1 : 0.06,
                transform: isVisible ? 'translateX(0)' : 'translateX(8px)',
              }}
            >
              {/* Line number */}
              <div
                className="hero-code-editor__line-number"
                style={{
                  color: isCurrentLine ? '#C6C6C6' : '#858585',
                }}
              >
                {lineNum}
              </div>
              {/* Code content */}
              <div className="hero-code-editor__code">
                {isVisible && renderLine(line, idx, isCurrentLine)}
                {isCurrentLine && (
                  <span className="hero-code-editor__cursor" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Bar */}
      <div className="hero-code-editor__status">
        <div className="hero-code-editor__status-group">
          <span className="hero-code-editor__ready-dot" aria-hidden="true" />
          <span style={{ color: '#a6e3a1' }}>●</span>
          <span>
            Ln {Math.min(renderedVisibleLines + 1, totalLines)}, Col {renderedCharIndex + 1}
          </span>
        </div>
        <div className="hero-code-editor__status-group">
          <span>{languageLabels[snippet.lang] ?? snippet.lang}</span>
          <span>UTF-8</span>
        </div>
      </div>

      <style jsx>{`
        .hero-code-editor {
          background: #1e1e1e;
          border: 1px solid #3e3e42;
          border-radius: 12px;
          color: #d4d4d4;
          font-family: var(--font-code);
          font-size: 13px;
          line-height: 1.65;
          max-width: 560px;
          min-width: 0;
          overflow: hidden;
          position: relative;
          width: 100%;
        }

        .hero-code-editor__titlebar,
        .hero-code-editor__status {
          align-items: center;
          background: #181818;
          border-color: #333333;
          color: #d4d4d4;
          display: flex;
          position: relative;
          z-index: 2;
        }

        .hero-code-editor__titlebar {
          border-bottom-style: solid;
          border-bottom-width: 1px;
          gap: 14px;
          min-height: 52px;
          padding: 0 16px;
        }

        .hero-code-editor__traffic {
          display: flex;
          flex: 0 0 auto;
          gap: 8px;
        }

        .hero-code-editor__dot {
          border-radius: 999px;
          display: block;
          height: 12px;
          width: 12px;
        }

        .hero-code-editor__dot--danger { background: #F14C4C; }
        .hero-code-editor__dot--warning { background: #CCA700; }
        .hero-code-editor__dot--success { background: #23D18B; }

        .hero-code-editor__tabs {
          display: flex;
          flex: 1;
          gap: 4px;
          min-width: 0;
          overflow: hidden;
        }

        .hero-code-editor__tab {
          align-items: center;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 0;
          color: #858585;
          cursor: pointer;
          display: inline-flex;
          flex: 0 1 auto;
          font: inherit;
          font-weight: 700;
          min-height: 32px;
          min-width: 0;
          padding: 0 12px;
          text-align: left;
          text-overflow: ellipsis;
          transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
          white-space: nowrap;
          overflow: hidden;
        }

        .hero-code-editor__tab:hover {
          background: #2d2d2d;
          border-color: #3e3e42;
          color: #ffffff;
        }

        .hero-code-editor__tab:focus-visible {
          box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.45);
          outline: none;
        }

        .hero-code-editor__tab[data-active="true"] {
          background: #1e1e1e;
          border: 1px solid #3e3e42;
          border-bottom: 2px solid #007acc;
          color: #ffffff;
        }

        .hero-code-editor__body {
          background: #1e1e1e;
          height: 320px;
          overflow-x: auto;
          overflow-y: auto;
          padding: 18px 0;
          scrollbar-color: #424242 #1e1e1e;
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          position: relative;
          z-index: 2;
        }

        .hero-code-editor__body::-webkit-scrollbar { width: 8px; height: 8px; }
        .hero-code-editor__body::-webkit-scrollbar-track { background: #1e1e1e; }
        .hero-code-editor__body::-webkit-scrollbar-thumb { background: #424242; border-radius: 999px; }

        .hero-code-editor__line {
          display: flex;
          min-width: max-content;
          padding: 0 20px 0 0;
          transition: opacity 0.24s ease, transform 0.24s ease, background-color 0.24s ease;
        }

        .hero-code-editor__line[data-current="true"] { background: #2a2d2e; }

        .hero-code-editor__line-number {
          flex-shrink: 0;
          padding-right: 16px;
          text-align: right;
          user-select: none;
          width: 50px;
        }

        .hero-code-editor__code {
          color: #d4d4d4;
          flex: 1;
          min-width: max-content;
          overflow: visible;
          white-space: pre;
        }

        .hero-code-editor__cursor {
          animation: cursorBlink 1s step-end infinite;
          background: #aeafad;
          display: inline-block;
          height: 16px;
          margin-left: 1px;
          vertical-align: text-bottom;
          width: 2px;
        }

        .hero-code-editor__status {
          background: #007acc;
          border-top-style: solid;
          border-top-width: 1px;
          border-top-color: #007acc;
          color: #ffffff;
          justify-content: space-between;
          min-height: 32px;
          padding: 0 16px;
        }

        .hero-code-editor__status-group {
          align-items: center;
          display: flex;
          gap: 14px;
          min-width: 0;
        }

        .hero-code-editor__ready-dot {
          background: #23d18b;
          border-radius: 999px;
          box-shadow: 0 0 0 3px rgba(35, 209, 139, 0.18);
          display: inline-block;
          height: 7px;
          width: 7px;
        }

        .hero-code-editor__status-group > span[style] { display: none; }

        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @media (max-width: 640px) {
          .hero-code-editor { max-width: 100%; }
          .hero-code-editor__titlebar { gap: 10px; min-height: 48px; padding: 0 12px; }
          .hero-code-editor__traffic { gap: 6px; }
          .hero-code-editor__dot { height: 10px; width: 10px; }
          .hero-code-editor__tab { min-height: 30px; padding: 0 9px; }
          .hero-code-editor__body { height: 286px; padding: 16px 0; }
          .hero-code-editor__line { padding-right: 14px; }
          .hero-code-editor__line-number { padding-right: 12px; width: 38px; }
          .hero-code-editor__status { gap: 8px; padding: 0 12px; }
          .hero-code-editor__status-group { gap: 8px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-code-editor__tab,
          .hero-code-editor__line { transition: none; }
          .hero-code-editor__cursor { animation: none; }
        }
      `}</style>
    </div>
  );
}
