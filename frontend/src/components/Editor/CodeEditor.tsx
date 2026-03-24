'use client';

import React from 'react';
import Editor from '@monaco-editor/react';
import { LanguageId } from '../../types';

interface CodeEditorProps {
  language: LanguageId;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function CodeEditor({ language, value, onChange, readOnly = false }: CodeEditorProps) {
  
  const handleEditorWillMount = (monaco: any) => {
    monaco.editor.defineTheme('runly-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0E1117',
        'editor.lineHighlightBackground': '#181E29',
        'editorCursor.foreground': '#3B82F6',
        'editorLineNumber.foreground': '#4B5563',
      }
    });
  };

  return (
    <div className="w-full h-full bg-[#0E1117]">
      <Editor
        height="100%"
        width="100%"
        language={language}
        theme="runly-dark"
        beforeMount={handleEditorWillMount}
        value={value}
        onChange={(val) => onChange(val || '')}
        loading={
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium tracking-wide">Loading Editor...</span>
          </div>
        }
        options={{
          minimap: { enabled: false },
          lineNumbers: 'on',
          automaticLayout: true,
          readOnly,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 14,
          padding: { top: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on'
        }}
      />
    </div>
  );
}
