'use client';

import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { LanguageId } from '../../types';

interface CodeEditorProps {
  language: LanguageId;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  onCursorChange?: (pos: { line: number; col: number }) => void;
}

export default function CodeEditor({ language, value, onChange, readOnly = false, onCursorChange }: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorWillMount = (monaco: any) => {
    monaco.editor.defineTheme('runly', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '52525b', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c084fc' },
        { token: 'string', foreground: '4ade80' },
        { token: 'number', foreground: 'fbbf24' },
        { token: 'type', foreground: '60a5fa' },
        { token: 'function', foreground: '60a5fa' },
        { token: 'variable', foreground: 'e2e8f0' },
      ],
      colors: {
        'editor.background': '#09090b',
        'editor.foreground': '#e4e4e7',
        'editor.lineHighlightBackground': '#18181b',
        'editor.lineHighlightBorder': '#00000000',
        'editorCursor.foreground': '#3b82f6',
        'editorLineNumber.foreground': '#3f3f46',
        'editorLineNumber.activeForeground': '#71717a',
        'editor.selectionBackground': '#3b82f622',
        'editor.inactiveSelectionBackground': '#3b82f611',
        'editorIndentGuide.background': '#27272a',
        'editorIndentGuide.activeBackground': '#3f3f46',
        'editorBracketMatch.background': '#3b82f615',
        'editorBracketMatch.border': '#3b82f644',
        'editorWidget.background': '#18181b',
        'editorWidget.border': '#27272a',
        'editorSuggestWidget.background': '#18181b',
        'editorSuggestWidget.border': '#27272a',
        'editorSuggestWidget.selectedBackground': '#27272a',
        'scrollbar.shadow': '#00000000',
        'scrollbarSlider.background': '#27272a88',
        'scrollbarSlider.hoverBackground': '#3f3f46',
        'scrollbarSlider.activeBackground': '#52525b',
        'editorGutter.background': '#09090b',
        'editorOverviewRuler.border': '#00000000',
      }
    });
  };

  const handleMount = (editor: any) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e: any) => {
      if (onCursorChange) {
        onCursorChange({ line: e.position.lineNumber, col: e.position.column });
      }
    });
  };

  return (
    <div className="w-full h-full" style={{ background: '#09090b' }}>
      <Editor
        height="100%"
        width="100%"
        language={language}
        theme="runly"
        beforeMount={handleEditorWillMount}
        onMount={handleMount}
        value={value}
        onChange={(val: string | undefined) => onChange(val || '')}
        loading={
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="spinner" />
            <span className="text-[11px]" style={{ color: 'var(--text-ghost)' }}>Loading editor</span>
          </div>
        }
        options={{
          minimap: { enabled: false },
          lineNumbers: 'on',
          automaticLayout: true,
          readOnly,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 13,
          fontWeight: '400',
          lineHeight: 20,
          letterSpacing: 0.2,
          padding: { top: 12, bottom: 12 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          cursorWidth: 2,
          renderLineHighlight: 'line',
          renderLineHighlightOnlyWhenFocus: false,
          bracketPairColorization: { enabled: true },
          guides: { indentation: true, bracketPairs: true },
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8, verticalSliderSize: 8 },
          stickyScroll: { enabled: false },
        }}
      />
    </div>
  );
}
