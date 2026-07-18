'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CodeLine {
  indent: number;
  tokens: { text: string; color: string }[];
}

const syntax = {
  keyword: '#33BCFF',
  symbol: '#F5F8FA',
  function: '#F59E0B',
  identifier: '#00ABFF',
  property: '#33BCFF',
  string: '#22C55E',
  value: '#F5F8FA',
  muted: '#657483',
};

const codeSnippets: { fileName: string; lang: string; lines: CodeLine[] }[] = [
  {
    fileName: 'index.html',
    lang: 'html',
    lines: [
      { indent: 0, tokens: [{ text: '<!doctype html>', color: syntax.muted }] },
      { indent: 0, tokens: [{ text: '<', color: syntax.symbol }, { text: 'html', color: syntax.property }, { text: ' lang', color: syntax.value }, { text: '="th"', color: syntax.string }, { text: '>', color: syntax.symbol }] },
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
      { indent: 1, tokens: [{ text: '--brand:', color: syntax.property }, { text: ' #00abff', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: '--ink:', color: syntax.property }, { text: ' #111820', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 0, tokens: [{ text: '}', color: syntax.symbol }] },
      { indent: 0, tokens: [{ text: '.course-card', color: syntax.property }, { text: ' {', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'max-width:', color: syntax.property }, { text: ' 720px', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'margin:', color: syntax.property }, { text: ' 48px auto', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'padding:', color: syntax.property }, { text: ' 32px', color: syntax.value }, { text: ';', color: syntax.symbol }] },
      { indent: 1, tokens: [{ text: 'border:', color: syntax.property }, { text: ' 1px solid #d8e1e8', color: syntax.value }, { text: ';', color: syntax.symbol }] },
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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

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

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % codeSnippets.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + codeSnippets.length) % codeSnippets.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = codeSnippets.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    activateSnippet(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

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
        <div className="hero-code-editor__workspace" aria-hidden="true">
          <span>MilerDev Project</span>
        </div>
        <div className="hero-code-editor__tabs" role="tablist" aria-label="ตัวอย่างไฟล์โค้ด">
          {codeSnippets.map((s, i) => (
            <button
              type="button"
              key={i}
              ref={(element) => { tabRefs.current[i] = element; }}
              className="hero-code-editor__tab"
              data-active={i === snippetIndex}
              role="tab"
              aria-selected={i === snippetIndex}
              tabIndex={i === snippetIndex ? 0 : -1}
              onClick={() => activateSnippet(i)}
              onKeyDown={(event) => handleTabKeyDown(event, i)}
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
                  color: isCurrentLine ? '#F5F8FA' : '#657483',
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
          --editor-accent: #00abff;
          --editor-accent-hover: #33bcff;
          --editor-accent-pressed: #0089cc;
          --editor-accent-soft: #003d5c;
          --editor-background: #080b0f;
          --editor-surface: #10151c;
          --editor-surface-hover: #17202a;
          --editor-border: #26313d;
          --editor-text: #f5f8fa;
          --editor-text-secondary: #9aa8b5;
          --editor-text-muted: #657483;
          --editor-success: #22c55e;
          color-scheme: dark;
          background: var(--editor-background);
          border: 1px solid var(--editor-border);
          border-radius: 3px;
          color: var(--editor-text);
          font-family: var(--font-code);
          font-size: 12.5px;
          line-height: 1.6;
          max-width: none;
          min-width: 0;
          overflow: hidden;
          position: relative;
          width: 100%;
        }

        .hero-code-editor__titlebar,
        .hero-code-editor__status {
          align-items: center;
          background: var(--editor-surface);
          border-color: var(--editor-border);
          color: var(--editor-text);
          display: flex;
          position: relative;
          z-index: 2;
        }

        .hero-code-editor__titlebar {
          align-items: stretch;
          border-bottom-style: solid;
          border-bottom-width: 1px;
          flex-direction: row;
          gap: 0;
          min-height: 48px;
          padding: 0;
        }

        .hero-code-editor__workspace {
          align-items: center;
          border-right: 1px solid var(--editor-border);
          color: var(--editor-text-secondary);
          display: flex;
          font-size: 10px;
          font-weight: 700;
          justify-content: space-between;
          letter-spacing: 0.08em;
          flex: 0 0 152px;
          min-height: 48px;
          padding: 0 16px;
        }

        .hero-code-editor__tabs {
          display: flex;
          flex: 1;
          gap: 0;
          min-width: 0;
          overflow: hidden;
        }

        .hero-code-editor__tab {
          align-items: center;
          background: transparent;
          border: 0;
          border-right: 1px solid var(--editor-border);
          border-radius: 0;
          color: var(--editor-text-muted);
          cursor: pointer;
          display: inline-flex;
          flex: 0 1 auto;
          font: inherit;
          font-weight: 700;
          min-height: 48px;
          min-width: 0;
          padding: 0 16px;
          text-align: left;
          text-overflow: ellipsis;
          transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
          white-space: nowrap;
          overflow: hidden;
        }

        .hero-code-editor__tab:hover {
          background: var(--editor-surface-hover);
          border-color: var(--editor-border);
          color: var(--editor-text);
        }

        .hero-code-editor__tab:focus-visible {
          box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--editor-accent) 52%, transparent);
          outline: none;
        }

        .hero-code-editor__tab[data-active="true"] {
          background: var(--editor-background);
          border-right: 1px solid var(--editor-border);
          border-bottom: 2px solid var(--editor-accent);
          color: var(--editor-text);
        }

        .hero-code-editor__body {
          background: var(--editor-background);
          height: 306px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 12px 0;
          scrollbar-width: none;
          position: relative;
          z-index: 2;
        }

        .hero-code-editor__body::-webkit-scrollbar { display: none; }

        .hero-code-editor__line {
          display: flex;
          min-width: max-content;
          padding: 0 20px 0 0;
          transition: opacity 0.24s ease, transform 0.24s ease, background-color 0.24s ease;
        }

        .hero-code-editor__line[data-current="true"] { background: var(--editor-surface-hover); }

        .hero-code-editor__line-number {
          flex-shrink: 0;
          padding-right: 16px;
          text-align: right;
          user-select: none;
          width: 50px;
        }

        .hero-code-editor__code {
          color: var(--editor-text);
          flex: 1;
          min-width: max-content;
          overflow: visible;
          white-space: pre;
        }

        .hero-code-editor__cursor {
          animation: cursorBlink 1s step-end infinite;
          background: var(--editor-accent-hover);
          display: inline-block;
          height: 16px;
          margin-left: 1px;
          vertical-align: text-bottom;
          width: 2px;
        }

        .hero-code-editor__status {
          background: var(--editor-surface);
          border-top-style: solid;
          border-top-width: 1px;
          border-top-color: var(--editor-border);
          color: var(--editor-text-secondary);
          justify-content: space-between;
          min-height: 36px;
          padding: 0 14px;
        }

        .hero-code-editor__status-group {
          align-items: center;
          display: flex;
          gap: 14px;
          min-width: 0;
        }

        .hero-code-editor__status-group:first-child {
          align-self: stretch;
          margin-left: -14px;
          padding: 0 14px;
          background: var(--editor-accent-pressed);
          color: var(--editor-text);
        }

        .hero-code-editor__ready-dot {
          background: var(--editor-success);
          border-radius: 999px;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--editor-success) 22%, transparent);
          display: inline-block;
          height: 7px;
          width: 7px;
        }

        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @media (max-width: 640px) {
          .hero-code-editor { max-width: 100%; font-size: 11.5px; }
          .hero-code-editor__titlebar { flex-direction: column; min-height: 72px; }
          .hero-code-editor__workspace { min-height: 28px; flex-basis: auto; border-right: 0; border-bottom: 1px solid var(--editor-border); font-size: 9px; padding: 0 10px; }
          .hero-code-editor__tab { min-height: 44px; padding: 0 9px; }
          .hero-code-editor__body { height: 282px; padding: 10px 0; }
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
