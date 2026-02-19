'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { useEffect, useCallback } from 'react';

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const MenuButton = ({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      padding: '6px 10px',
      background: active ? '#3b82f6' : '#f1f5f9',
      color: active ? 'white' : '#475569',
      border: '1px solid ' + (active ? '#3b82f6' : '#e2e8f0'),
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.8rem',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '32px',
      height: '32px',
    }}
  >
    {children}
  </button>
);

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: [
          'min-height: 200px',
          'padding: 16px',
          'outline: none',
          'font-size: 0.95rem',
          'line-height: 1.7',
          'color: #1e293b',
        ].join(';'),
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      overflow: 'hidden',
      background: 'white',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '8px 12px',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc',
      }}>
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <strong>B</strong>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <em>I</em>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <s>S</s>
        </MenuButton>

        <div style={{ width: '1px', background: '#e2e8f0', margin: '0 4px' }} />

        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          H2
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          H3
        </MenuButton>

        <div style={{ width: '1px', background: '#e2e8f0', margin: '0 4px' }} />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          • List
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Ordered List"
        >
          1. List
        </MenuButton>

        <div style={{ width: '1px', background: '#e2e8f0', margin: '0 4px' }} />

        <MenuButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline Code"
        >
          {'</>'}
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code Block"
        >
          {'{ }'}
        </MenuButton>
        {editor.isActive('codeBlock') && (
          <select
            value={editor.getAttributes('codeBlock').language || ''}
            onChange={(e) => {
              editor.chain().focus().setCodeBlock({ language: e.target.value }).run();
            }}
            style={{
              padding: '4px 8px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '0.8rem',
              color: '#475569',
              background: 'white',
              cursor: 'pointer',
              height: '32px',
            }}
          >
            <option value="">Auto</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="tsx">TSX / JSX</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="python">Python</option>
            <option value="bash">Bash / Shell</option>
            <option value="sql">SQL</option>
            <option value="json">JSON</option>
          </select>
        )}

        <div style={{ width: '1px', background: '#e2e8f0', margin: '0 4px' }} />

        <MenuButton
          onClick={setLink}
          active={editor.isActive('link')}
          title="Link"
        >
          🔗
        </MenuButton>
        {editor.isActive('link') && (
          <MenuButton
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="Remove Link"
          >
            ❌
          </MenuButton>
        )}

        <div style={{ width: '1px', background: '#e2e8f0', margin: '0 4px' }} />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          &ldquo;&rdquo;
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          ―
        </MenuButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* TipTap Editor Styles */}
      <style>{`
        .tiptap {
          outline: none;
        }
        .tiptap p {
          margin: 0.5em 0;
        }
        .tiptap h2 {
          font-size: 1.4rem;
          font-weight: 600;
          margin: 1em 0 0.5em;
        }
        .tiptap h3 {
          font-size: 1.15rem;
          font-weight: 600;
          margin: 0.8em 0 0.4em;
        }
        .tiptap ul {
          padding-left: 1.5em;
          margin: 0.5em 0;
          list-style-type: disc;
        }
        .tiptap ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
          list-style-type: decimal;
        }
        .tiptap li {
          margin: 0.25em 0;
          display: list-item;
        }
        .tiptap code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.9em;
          color: #e11d48;
          font-family: 'Fira Code', monospace;
        }
        .tiptap pre {
          background: #1e293b;
          color: #e2e8f0;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 0.75em 0;
          font-family: 'Fira Code', monospace;
          font-size: 0.9em;
          line-height: 1.6;
        }
        .tiptap pre code {
          background: none;
          color: inherit;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
        }
        .tiptap a {
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
        }
        .tiptap blockquote {
          border-left: 3px solid #3b82f6;
          padding-left: 16px;
          margin: 0.75em 0;
          color: #64748b;
          font-style: italic;
        }
        .tiptap hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 1em 0;
        }
        /* Syntax Highlighting (lowlight / highlight.js classes) */
        .tiptap pre .hljs-keyword,
        .tiptap pre .hljs-selector-tag { color: #c792ea; }
        .tiptap pre .hljs-string,
        .tiptap pre .hljs-template-string,
        .tiptap pre .hljs-template-variable { color: #c3e88d; }
        .tiptap pre .hljs-number,
        .tiptap pre .hljs-literal { color: #f78c6c; }
        .tiptap pre .hljs-comment { color: #546e7a; font-style: italic; }
        .tiptap pre .hljs-title,
        .tiptap pre .hljs-function,
        .tiptap pre .hljs-title.function_ { color: #82aaff; }
        .tiptap pre .hljs-variable,
        .tiptap pre .hljs-params { color: #e2e8f0; }
        .tiptap pre .hljs-attr,
        .tiptap pre .hljs-attribute { color: #f07178; }
        .tiptap pre .hljs-built_in,
        .tiptap pre .hljs-type { color: #ffcb6b; }
        .tiptap pre .hljs-tag { color: #f07178; }
        .tiptap pre .hljs-name { color: #c792ea; }
        .tiptap pre .hljs-operator,
        .tiptap pre .hljs-punctuation { color: #89ddff; }
        .tiptap pre .hljs-property { color: #f07178; }
        .tiptap pre .hljs-meta { color: #ffcb6b; }
        .tiptap pre .hljs-symbol { color: #f78c6c; }
      `}</style>
    </div>
  );
}
