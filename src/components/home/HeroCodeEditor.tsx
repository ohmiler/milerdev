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
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const codeBodyRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const snippet = codeSnippets[snippetIndex];
  const totalLines = snippet.lines.length;
  const isPlaybackPaused = prefersReducedMotion || isFocusWithin || hasUserInteracted;
  const playbackState = prefersReducedMotion
    ? 'reduced'
    : hasUserInteracted
      ? 'manual'
      : isPlaybackPaused
        ? 'paused'
        : 'auto';

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

  const activateSnippet = useCallback((nextIndex: number, userInitiated = false) => {
    setSnippetIndex(nextIndex);

    if (userInitiated) {
      setHasUserInteracted(true);
    }

    if (prefersReducedMotion || userInitiated) {
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
  const renderedIsTyping = !prefersReducedMotion && isTyping;
  const positionLineIndex = Math.min(renderedVisibleLines, totalLines - 1);
  const positionLine = snippet.lines[positionLineIndex];
  const positionIndentLength = '  '.repeat(positionLine.indent).length;
  const positionTextLength = getLineText(positionLine).length;
  const cursorLine = positionLineIndex + 1;
  const cursorColumn =
    renderedIsTyping && renderedVisibleLines < totalLines
      ? positionIndentLength + Math.min(charIndex, positionTextLength) + 1
      : positionIndentLength + positionTextLength + 1;

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % codeSnippets.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + codeSnippets.length) % codeSnippets.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = codeSnippets.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    activateSnippet(nextIndex, true);
    tabRefs.current[nextIndex]?.focus();
  };

  useEffect(() => {
    codeBodyRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [snippetIndex]);

  // Typing animation
  useEffect(() => {
    if (isPlaybackPaused) return;
    if (!isTyping) return;

    if (visibleLines >= totalLines) {
      // All lines typed, pause before switching snippets.
      const timeout = setTimeout(() => {
        setSnippetIndex((prev) => (prev + 1) % codeSnippets.length);
        setVisibleLines(0);
        setCharIndex(0);
        setIsTyping(true);
      }, 1400);
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
  }, [visibleLines, charIndex, isTyping, totalLines, snippet, getLineText, isPlaybackPaused]);

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
      data-playback={playbackState}
      aria-label="ตัวอย่างพื้นที่เขียนโค้ดของ MilerDev"
      onFocusCapture={() => setIsFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocusWithin(false);
          setHasUserInteracted(false);

          if (hasUserInteracted && !prefersReducedMotion) {
            setVisibleLines(0);
            setCharIndex(0);
            setIsTyping(true);
          }
        }
      }}
    >
      <div className="hero-code-editor__windowbar">
        <div className="hero-code-editor__brand">
          <span className="hero-code-editor__brand-mark" aria-hidden="true">MD</span>
          <span>MilerDev Studio</span>
        </div>
        <div className="hero-code-editor__path" aria-hidden="true">
          beginner-path / {snippet.fileName}
        </div>
        <div className="hero-code-editor__window-end">
          <span className="hero-code-editor__demo">DEMO</span>
          <span className="hero-code-editor__window-actions" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>

      <div className="hero-code-editor__workspace-shell">
        <section className="hero-code-editor__editor-area" aria-label="พื้นที่แก้ไขโค้ด">
          <div className="hero-code-editor__tabs" role="tablist" aria-label="ตัวอย่างไฟล์โค้ด">
            {codeSnippets.map((s, i) => (
              <button
                type="button"
                key={i}
                ref={(element) => { tabRefs.current[i] = element; }}
                className="hero-code-editor__tab"
                id={`hero-code-tab-${s.lang}`}
                data-active={i === snippetIndex}
                role="tab"
                aria-selected={i === snippetIndex}
                aria-controls="hero-code-panel"
                tabIndex={i === snippetIndex ? 0 : -1}
                onClick={() => activateSnippet(i, true)}
                onKeyDown={(event) => handleTabKeyDown(event, i)}
              >
                <span data-language={s.lang} aria-hidden="true">{s.lang.slice(0, 2).toUpperCase()}</span>
                {s.fileName}
                <i aria-hidden="true">×</i>
              </button>
            ))}
          </div>

          <div
            id="hero-code-panel"
            ref={codeBodyRef}
            className="hero-code-editor__body"
            role="tabpanel"
            aria-labelledby={`hero-code-tab-${snippet.lang}`}
          >
            <div className="hero-code-editor__breadcrumb" aria-hidden="true">
              beginner-path <span>›</span> {snippet.fileName} <span>›</span> {languageLabels[snippet.lang]}
            </div>
            <div className="hero-code-editor__code-lines">
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
                    <div
                      className="hero-code-editor__line-number"
                      style={{ color: isCurrentLine ? '#F5F8FA' : '#657483' }}
                    >
                      {lineNum}
                    </div>
                    <div className="hero-code-editor__code">
                      {isVisible && renderLine(line, idx, isCurrentLine)}
                      {isCurrentLine && <span className="hero-code-editor__cursor" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Status Bar */}
      <div className="hero-code-editor__status">
        <div className="hero-code-editor__status-group">
          <span className="hero-code-editor__ready-dot" aria-hidden="true" />
          <span>
            Ln {cursorLine}, Col {cursorColumn}
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
          color: var(--editor-text);
          display: grid;
          font-family: var(--font-code);
          font-size: 12.5px;
          grid-template-rows: auto minmax(0, 1fr) auto;
          height: 100%;
          line-height: 1.6;
          max-width: none;
          min-width: 0;
          overflow: hidden;
          position: relative;
          width: 100%;
        }

        .hero-code-editor__windowbar,
        .hero-code-editor__status {
          align-items: center;
          background: var(--editor-surface);
          border-color: var(--editor-border);
          color: var(--editor-text);
          display: flex;
          position: relative;
          z-index: 2;
        }

        .hero-code-editor__windowbar {
          border-bottom-style: solid;
          border-bottom-width: 1px;
          display: grid;
          grid-template-columns: minmax(150px, 1fr) minmax(0, 1.35fr) minmax(150px, 1fr);
          min-height: 42px;
        }

        .hero-code-editor__brand,
        .hero-code-editor__window-end {
          align-items: center;
          display: flex;
          gap: 10px;
          min-width: 0;
          padding: 0 12px;
        }

        .hero-code-editor__brand {
          color: var(--editor-text-secondary);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .hero-code-editor__brand-mark {
          align-items: center;
          background: var(--editor-accent-pressed);
          color: var(--editor-text);
          display: inline-flex;
          font-size: 8px;
          height: 22px;
          justify-content: center;
          width: 22px;
        }

        .hero-code-editor__path {
          color: var(--editor-text-muted);
          font-size: 9px;
          overflow: hidden;
          padding-inline: 10px;
          text-align: center;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hero-code-editor__window-end {
          justify-content: flex-end;
        }

        .hero-code-editor__demo {
          border: 1px solid var(--editor-accent);
          color: var(--editor-accent-hover);
          font-size: 9px;
          line-height: 1;
          padding: 4px 6px;
        }

        .hero-code-editor__window-actions {
          align-items: center;
          display: flex;
          gap: 10px;
        }

        .hero-code-editor__window-actions i {
          border-top: 1px solid var(--editor-text-muted);
          display: block;
          height: 8px;
          width: 8px;
        }

        .hero-code-editor__window-actions i:nth-child(2) {
          border: 1px solid var(--editor-text-muted);
        }

        .hero-code-editor__window-actions i:last-child {
          border: 0;
          position: relative;
        }

        .hero-code-editor__window-actions i:last-child::before,
        .hero-code-editor__window-actions i:last-child::after {
          position: absolute;
          top: 3px;
          left: 0;
          width: 9px;
          border-top: 1px solid var(--editor-text-muted);
          content: '';
          transform: rotate(45deg);
        }

        .hero-code-editor__window-actions i:last-child::after {
          transform: rotate(-45deg);
        }

        .hero-code-editor__tabs {
          background: var(--editor-surface);
          border-bottom: 1px solid var(--editor-border);
          display: flex;
          gap: 0;
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .hero-code-editor__tabs::-webkit-scrollbar { display: none; }

        .hero-code-editor__tab {
          align-items: center;
          background: transparent;
          border: 0;
          border-right: 1px solid var(--editor-border);
          border-radius: 0;
          color: var(--editor-text-muted);
          cursor: pointer;
          display: inline-flex;
          gap: 8px;
          flex: 0 1 auto;
          font: inherit;
          font-weight: 700;
          min-height: 42px;
          min-width: 0;
          padding: 0 12px;
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

        .hero-code-editor__tab > span {
          color: var(--editor-accent-hover);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }

        .hero-code-editor__tab > i {
          color: var(--editor-text-muted);
          font-size: 13px;
          font-style: normal;
          margin-left: 4px;
        }

        .hero-code-editor__workspace-shell {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          min-height: 0;
        }

        .hero-code-editor__editor-area {
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          min-width: 0;
          min-height: 0;
        }

        .hero-code-editor__body {
          background: var(--editor-background);
          min-height: 0;
          overflow: auto;
          padding: 0 0 24px;
          scrollbar-width: none;
          position: relative;
          z-index: 2;
        }

        .hero-code-editor__body::-webkit-scrollbar { display: none; }

        .hero-code-editor__breadcrumb {
          border-bottom: 1px solid color-mix(in srgb, var(--editor-border) 70%, transparent);
          color: var(--editor-text-muted);
          font-size: 9px;
          min-height: 34px;
          overflow: hidden;
          padding: 9px 14px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hero-code-editor__breadcrumb span {
          color: var(--editor-text-secondary);
          padding-inline: 4px;
        }

        .hero-code-editor__code-lines {
          padding-top: 14px;
        }

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
          background: var(--editor-accent-pressed);
          border-top-style: solid;
          border-top-width: 1px;
          border-top-color: var(--editor-accent-hover);
          color: var(--editor-text);
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

        @media (max-width: 820px) {
          .hero-code-editor { min-height: 560px; }
        }

        @media (max-width: 640px) {
          .hero-code-editor {
            font-size: 11.5px;
            max-width: 100%;
            min-height: 470px;
          }

          .hero-code-editor__windowbar {
            grid-template-columns: minmax(0, 1fr) auto;
            min-height: 38px;
          }

          .hero-code-editor__path { display: none; }
          .hero-code-editor__brand { padding-left: 9px; }
          .hero-code-editor__brand-mark { height: 20px; width: 20px; }
          .hero-code-editor__window-end { padding-right: 9px; }
          .hero-code-editor__window-actions { display: none; }
          .hero-code-editor__tab { min-height: 42px; padding: 0 9px; }
          .hero-code-editor__breadcrumb { padding-inline: 10px; }
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
