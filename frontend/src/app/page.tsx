'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useLanguages } from '../hooks/useLanguages';
import { LanguageId, LanguageConfig } from '../types';
import LanguageIcon from '../components/Editor/LanguageIcon';
import EditorToolbar from '../components/Editor/EditorToolbar';
import CodeEditor from '../components/Editor/CodeEditor';
import LivePreview from '../components/Preview/LivePreview';
import { RunlyWebSocket, WsStatus } from '../lib/ws';
import { XTerminalRef } from '../components/Terminal/XTerminal';
import FileExplorer, { FileNode } from '../components/Explorer/FileExplorer';
import HelpChat from '../components/Chat/HelpChat';
import { Github } from 'lucide-react';

const XTerminal = dynamic(() => import('../components/Terminal/XTerminal'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="spinner" />
    </div>
  ),
});



export default function Home() {
  const { languages, loading } = useLanguages();
  const [currentLangId, setCurrentLangId] = useState<LanguageId>('python');
  const [code, setCode] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>([]);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);
  const wsClientRef = useRef<RunlyWebSocket | null>(null);
  const terminalRef = useRef<XTerminalRef>(null);

  const currentLangConfig = languages.find((l: LanguageConfig) => l.id === currentLangId) as LanguageConfig;

  useEffect(() => {
    if (languages.length > 0) {
      const target = languages.find((l: LanguageConfig) => l.id === currentLangId);
      if (target) {
        setCode(target.defaultCode);
        const extMap: Record<string, string> = {
          python: 'py', javascript: 'js', typescript: 'ts', c: 'c', cpp: 'cpp',
          java: 'java', go: 'go', rust: 'rs', php: 'php', r: 'R',
          csharp: 'cs', html: 'html', react: 'jsx', vue: 'html',
          angular: 'html', sqlite: 'sql', mongodb: 'js',
        };
        const ext = extMap[target.id] || 'txt';
        const mainFileId = `file-${Date.now()}`;
        const mainFile: FileNode = { id: mainFileId, name: `main.${ext}`, type: 'file', content: target.defaultCode };

        // Load additional default files for multi-file web projects
        const allFiles: FileNode[] = [mainFile];
        if (target.defaultFiles) {
          target.defaultFiles.forEach((df, i) => {
            allFiles.push({
              id: `file-${Date.now()}-${i + 1}`,
              name: df.name,
              type: 'file',
              content: df.content,
            });
          });
        }

        setFiles(allFiles);
        setActiveFileId(mainFileId);
      }
    }
  }, [currentLangId, languages]);

  useEffect(() => { return () => { wsClientRef.current?.stop(); }; }, []);

  const findFileContent = (nodes: FileNode[], id: string): string | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node.content;
      if (node.children) { const f = findFileContent(node.children, id); if (f !== undefined) return f; }
    }
    return undefined;
  };

  const handleFileSelect = (id: string, _path: string) => {
    setActiveFileId(id);
    const content = findFileContent(files, id);
    setCode(content !== undefined ? content : '');
  };

  const updateFileContent = (nodes: FileNode[], id: string, c: string): FileNode[] => {
    return nodes.map(n => {
      if (n.id === id) return { ...n, content: c };
      if (n.children) return { ...n, children: updateFileContent(n.children, id, c) };
      return n;
    });
  };

  const handleEditorChange = (val: string) => {
    setCode(val);
    if (activeFileId) setFiles(prev => updateFileContent(prev, activeFileId, val));
  };

  const handleLanguageChange = (id: LanguageId) => {
    setCurrentLangId(id);
    if (wsClientRef.current) { wsClientRef.current.stop(); setIsRunning(false); }
  };

  const handleRun = useCallback(() => {
    if (!currentLangConfig || currentLangConfig.isWebMode) return;
    if (wsClientRef.current) wsClientRef.current.stop();
    terminalRef.current?.clear();
    setIsRunning(true);
    const ws = new RunlyWebSocket();
    wsClientRef.current = ws;
    ws.executeCode(
      currentLangConfig.id, code,
      (data: string) => { terminalRef.current?.write(data.replace(/\n/g, '\r\n')); },
      (status: WsStatus) => {
        if (status.type === 'start') {
          terminalRef.current?.write(`\x1b[38;5;244m$ Running ${currentLangConfig.name}...\x1b[0m\r\n\r\n`);
        } else if (status.type === 'exit') {
          terminalRef.current?.write(`\r\n\x1b[38;5;244m$ Process exited.\x1b[0m\r\n`);
          setIsRunning(false);
        } else if (status.type === 'error') {
          terminalRef.current?.write(`\r\n\x1b[38;5;196mConnection error.\x1b[0m\r\n`);
          setIsRunning(false);
        } else if (status.type === 'close') {
          setIsRunning(false);
        }
      }
    );
  }, [currentLangConfig, code]);

  const handleStop = useCallback(() => {
    wsClientRef.current?.stop();
    setIsRunning(false);
    terminalRef.current?.write(`\r\n\x1b[38;5;214m$ Stopped.\x1b[0m\r\n`);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isRunning) handleStop(); else handleRun();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleRun, handleStop, isRunning]);

  const activeFileName = files.find(f => f.id === activeFileId)?.name || '';

  // Detect Monaco language from file extension for correct syntax highlighting
  const getEditorLanguage = (): string => {
    if (!activeFileName) return currentLangConfig.monacoLanguage;
    const ext = activeFileName.split('.').pop()?.toLowerCase();
    const extLangMap: Record<string, string> = {
      css: 'css', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      html: 'html', json: 'json', md: 'markdown', py: 'python', vue: 'html',
      sql: 'sql', xml: 'xml', yaml: 'yaml', yml: 'yaml',
    };
    return extLangMap[ext || ''] || currentLangConfig.monacoLanguage;
  };

  if (loading || !currentLangConfig) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="spinner" />
          <span className="text-xs" style={{ color: 'var(--text-ghost)' }}>Loading</span>
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* === HEADER === */}
      <header className="h-[48px] flex items-center justify-between px-4 shrink-0 select-none"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-primary)' }}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="6" fill="url(#logo-grad)" />
              <path d="M7 8l5 4-5 4M13 16h4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <defs><linearGradient id="logo-grad" x1="0" y1="0" x2="24" y2="24"><stop stopColor="#3b82f6" /><stop offset="1" stopColor="#2563eb" /></linearGradient></defs>
            </svg>
            <span className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Runly<span style={{ color: 'var(--blue-500)' }}>.dev</span>
            </span>
          </div>
          <div className="hidden md:block h-4 w-px" style={{ background: 'var(--border-primary)' }} />
          <span className="hidden md:block text-[11px]" style={{ color: 'var(--text-ghost)' }}>
            Online Code Editor
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <a href="https://github.com/iam-orsu/CodeCompiler" target="_blank" rel="noopener noreferrer"
            className="btn btn-ghost" style={{ fontSize: '12px' }}>
            <Github size={14} />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      {/* === WORKSPACE === */}
      <div className="flex-1 flex overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="runly-v3">

          {/* File Explorer */}
          <Panel defaultSize={14} minSize={10} className="hidden md:flex flex-col"
            style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-primary)' }}>
            <FileExplorer files={files} setFiles={setFiles} activeFileId={activeFileId} onFileSelect={handleFileSelect} />
          </Panel>
          <PanelResizeHandle className="resize-handle hidden md:block" />

          {/* Editor Panel */}
          <Panel defaultSize={52} minSize={30} className="flex flex-col" style={{ background: 'var(--bg-base)' }}>
            {/* Toolbar */}
            <EditorToolbar
              language={currentLangId} onLanguageChange={handleLanguageChange}
              onRun={handleRun} onStop={handleStop} isRunning={isRunning}
              isWebMode={currentLangConfig.isWebMode} isSpecial={currentLangConfig.isSpecial}
              selectedLibraries={selectedLibraries} onLibraryChange={setSelectedLibraries}
              isChatOpen={isChatOpen} onChatToggle={() => setIsChatOpen(prev => !prev)}
            />
            {/* Tab bar */}
            {activeFileName && (
              <div className="flex items-center h-[34px] px-1 shrink-0"
                style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-primary)' }}>
                <div className="flex items-center gap-1.5 px-3 h-full text-[12px] relative"
                  style={{ color: 'var(--text-primary)', background: 'var(--bg-base)', borderTop: '2px solid var(--blue-500)', borderRadius: '0' }}>
                  <LanguageIcon langId={currentLangId} size={14} />
                  <span className="font-medium">{activeFileName}</span>
                </div>
              </div>
            )}
            {/* Editor */}
            <div className="flex-1 overflow-hidden">
              {isChatOpen ? (
                <PanelGroup direction="horizontal" autoSaveId="runly-editor-chat">
                  <Panel defaultSize={50} minSize={30} className="flex flex-col">
                    <CodeEditor
                      language={getEditorLanguage() as LanguageId}
                      value={code} onChange={handleEditorChange} readOnly={isRunning}
                      onCursorChange={setCursorPos}
                      highlightedLines={highlightedLines}
                    />
                  </Panel>
                  <PanelResizeHandle className="resize-handle" />
                  <Panel defaultSize={50} minSize={30} className="flex flex-col border-l border-[var(--border-primary)]" style={{ background: 'var(--bg-surface)' }}>
                    <HelpChat
                      isOpen={isChatOpen}
                      onClose={() => setIsChatOpen(false)}
                      language={currentLangConfig.name}
                      code={code}
                      onHighlight={setHighlightedLines}
                    />
                  </Panel>
                </PanelGroup>
              ) : (
                <CodeEditor
                  language={getEditorLanguage() as LanguageId}
                  value={code} onChange={handleEditorChange} readOnly={isRunning}
                  onCursorChange={setCursorPos}
                  highlightedLines={highlightedLines}
                />
              )}
            </div>
          </Panel>

          <PanelResizeHandle className="resize-handle" />

          {/* Console/Preview Panel */}
          <Panel defaultSize={34} minSize={20} className="flex flex-col"
            style={{ background: 'var(--bg-base)', borderLeft: '1px solid var(--border-primary)' }}>
            {/* Console Header */}
            <div className="flex items-center justify-between h-[44px] px-4 shrink-0"
              style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-primary)' }}>
              <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-ghost)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>{'>'}_</span>
                <span>{currentLangConfig.isWebMode ? 'Preview' : 'Console'}</span>
                {isRunning && (
                  <span className="status-badge" style={{ background: 'var(--blue-glow)', color: 'var(--blue-400)', border: '1px solid rgba(59,130,246,0.15)' }}>
                    <span className="dot dot-blue dot-pulse" />
                    running
                  </span>
                )}
              </div>
              {!currentLangConfig.isWebMode && (
                <button onClick={() => terminalRef.current?.clear()} className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: '11px' }}>
                  Clear
                </button>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              {currentLangConfig.isWebMode ? (
                <LivePreview files={files} code={code} libraries={selectedLibraries} language={currentLangConfig.id} />
              ) : (
                <div className="h-full p-2" style={{ background: 'var(--bg-base)' }}>
                  <XTerminal
                    onTerminalReady={(api: XTerminalRef) => { terminalRef.current = api; }}
                    wsClient={wsClientRef.current} isRunning={isRunning}
                  />
                </div>
              )}
            </div>
          </Panel>

        </PanelGroup>
      </div>

      {/* === STATUS BAR === */}
      <footer className="h-[24px] flex items-center justify-between px-3 shrink-0 select-none"
        style={{ background: 'var(--bg-raised)', borderTop: '1px solid var(--border-primary)' }}>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-ghost)' }}>
          <span className="flex items-center gap-1.5">
            <span className="dot dot-green" style={{ width: 5, height: 5 }} />
            Ready
          </span>
          <span style={{ color: 'var(--border-secondary)' }}>|</span>
          <span>{currentLangConfig.name}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-ghost)', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span style={{ color: 'var(--border-secondary)' }}>|</span>
          <span>UTF-8</span>
        </div>
      </footer>
    </main>
  );
}
