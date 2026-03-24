'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useLanguages } from '../hooks/useLanguages';
import { LanguageId, LanguageConfig } from '../types';
import EditorToolbar from '../components/Editor/EditorToolbar';
import CodeEditor from '../components/Editor/CodeEditor';
import LivePreview from '../components/Preview/LivePreview';
import { RunlyWebSocket } from '../lib/ws';
import styles from './page.module.css';
import { XTerminalRef } from '../components/Terminal/XTerminal';
import FileExplorer, { FileNode } from '../components/Explorer/FileExplorer';

const XTerminal = dynamic(() => import('../components/Terminal/XTerminal'), { 
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-[#090a0f] text-gray-400">Loading Terminal...</div>
});

export default function Home() {
  const { languages, loading } = useLanguages();
  
  const [currentLangId, setCurrentLangId] = useState<LanguageId>('python');
  const [code, setCode] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>([]);
  
  const [files, setFiles] = useState<FileNode[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  
  const wsClientRef = useRef<RunlyWebSocket | null>(null);
  const terminalRef = useRef<XTerminalRef>(null);

  const currentLangConfig = languages.find(l => l.id === currentLangId) as LanguageConfig;

  useEffect(() => {
    if (languages.length > 0) {
      const target = languages.find(l => l.id === currentLangId);
      if (target) {
        setCode(target.defaultCode);
        const ext = target.monacoLanguage === 'python' ? 'py' : target.id === 'javascript' || target.id === 'react' ? 'js' : target.id === 'c' ? 'c' : target.id === 'cpp' ? 'cpp' : target.id === 'java' ? 'java' : target.monacoLanguage || 'txt';
        const fileId = `file-${Date.now()}`;
        setFiles([{ id: fileId, name: `main.${ext}`, type: 'file', content: target.defaultCode }]);
        setActiveFileId(fileId);
      }
    }
  }, [currentLangId, languages]);

  useEffect(() => {
    return () => {
      wsClientRef.current?.stop();
    };
  }, []);

  const findFileContent = (nodes: FileNode[], id: string): string | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node.content;
      if (node.children) {
         const found = findFileContent(node.children, id);
         if (found !== undefined) return found;
      }
    }
    return undefined;
  };

  const handleFileSelect = (id: string, path: string) => {
    setActiveFileId(id);
    const content = findFileContent(files, id);
    if (content !== undefined) {
      setCode(content);
    } else {
      setCode("");
    }
  };

  const updateFileContent = (nodes: FileNode[], id: string, newContent: string): FileNode[] => {
    return nodes.map(node => {
      if (node.id === id) return { ...node, content: newContent };
      if (node.children) return { ...node, children: updateFileContent(node.children, id, newContent) };
      return node;
    });
  };

  const handleEditorChange = (newval: string) => {
    setCode(newval);
    if (activeFileId) {
      setFiles(prev => updateFileContent(prev, activeFileId, newval));
    }
  };

  const handleLanguageChange = (id: LanguageId) => {
    setCurrentLangId(id);
    if (wsClientRef.current) {
      wsClientRef.current.stop();
      setIsRunning(false);
    }
  };

  const handleRun = useCallback(() => {
    if (!currentLangConfig) return;

    if (currentLangConfig.isWebMode) {
      // Reassign string to trigger a re-render/refresh effect if necessary, 
      // but normally srcdoc is reactive. To force it we can quickly reset.
      return;
    }

    if (wsClientRef.current) {
      wsClientRef.current.stop();
    }

    terminalRef.current?.clear();
    setIsRunning(true);
    
    // Pass fake wsClient logic if on web mode (shouldn't be reached)
    const ws = new RunlyWebSocket();
    wsClientRef.current = ws;

    ws.executeCode(
      currentLangConfig.id,
      code,
      (data: string) => {
        terminalRef.current?.write(data.replace(/\n/g, '\r\n')); 
      },
      (status: any) => {
        if (status.type === 'start') {
          terminalRef.current?.write(`\x1b[32m[SYSTEM]\x1b[0m Starting ${currentLangConfig.name} execution...\r\n\r\n`);
        } else if (status.type === 'exit') {
          terminalRef.current?.write(`\r\n\x1b[32m[SYSTEM]\x1b[0m Process exited.\r\n`);
          setIsRunning(false);
        } else if (status.type === 'error') {
          terminalRef.current?.write(`\r\n\x1b[31m[ERROR]\x1b[0m Connection error.\r\n`);
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
    terminalRef.current?.write(`\r\n\x1b[33m[SYSTEM]\x1b[0m Execution stopped by user.\r\n`);
  }, []);

  if (loading || !currentLangConfig) return <div className="h-screen w-screen bg-[#0E1117]" />;

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden bg-[#0E1117] text-gray-300 font-sans">
      {/* Global Brand Header */}
      <header className="h-[40px] flex items-center justify-between px-4 bg-[#0E1117] border-b border-[#2E3138] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-white tracking-wide">
            <span className="text-blue-500 text-lg">{'</>'}</span> Runly.dev
          </div>
          <span className="text-[11px] text-gray-500 hidden sm:inline-block">Run code in 16 languages instantly</span>
        </div>
        <div className="flex items-center text-xs text-gray-400 hover:text-white cursor-pointer transition-colors">
          GitHub
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="runly-panels">
          
          <Panel defaultSize={15} minSize={10} className="bg-[#161B22] border-r border-[#2E3138] flex flex-col hidden md:flex">
            <FileExplorer 
              files={files} 
              setFiles={setFiles} 
              activeFileId={activeFileId} 
              onFileSelect={handleFileSelect} 
            />
          </Panel>

          <PanelResizeHandle className="w-1 bg-transparent hover:bg-blue-500/50 active:bg-blue-500 transition-colors cursor-col-resize" />

          <Panel defaultSize={50} minSize={30} className="flex flex-col bg-[#0E1117]">
            {/* Editor Pane Header containing Toolbars */}
            <div className="flex items-center justify-between bg-[#161B22] border-b border-[#2E3138]">
              <EditorToolbar 
                language={currentLangId}
                onLanguageChange={handleLanguageChange}
                onRun={handleRun}
                onStop={handleStop}
                isRunning={isRunning}
                isWebMode={currentLangConfig.isWebMode}
                isSpecial={currentLangConfig.isSpecial}
                selectedLibraries={selectedLibraries}
                onLibraryChange={setSelectedLibraries}
              />
            </div>
            <div className="flex-1 overflow-hidden relative">
              <CodeEditor 
                language={currentLangConfig.monacoLanguage as LanguageId}
                value={code}
                onChange={handleEditorChange}
                readOnly={isRunning}
              />
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-transparent hover:bg-blue-500/50 active:bg-blue-500 transition-colors cursor-col-resize z-10" />

          <Panel defaultSize={35} minSize={20} className="flex flex-col bg-[#0E1117] border-l border-[#2E3138]">
            <div className="flex items-center justify-between bg-[#161B22] border-b border-[#2E3138] px-4 py-2.5 h-[41px]">
              <div className="text-sm font-medium text-gray-300 flex items-center gap-2">
                 <span className="text-blue-400 font-mono text-xs">{'>_'}</span> Console
              </div>
              {!currentLangConfig.isWebMode && (
                <button 
                  onClick={() => terminalRef.current?.clear()} 
                  className="text-xs text-gray-400 hover:text-gray-200 transition-colors px-2 py-1 rounded"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex-1 overflow-hidden p-3 bg-[#0E1117] h-full flex flex-col">
              {currentLangConfig.isWebMode ? (
                <LivePreview 
                  code={code} 
                  libraries={selectedLibraries} 
                  language={currentLangConfig.id} 
                />
              ) : (
                <XTerminal 
                  onTerminalReady={(api) => { terminalRef.current = api; }}
                  wsClient={wsClientRef.current} 
                  isRunning={isRunning} 
                />
              )}
            </div>
          </Panel>

        </PanelGroup>
      </div>
    </main>
  );
}
