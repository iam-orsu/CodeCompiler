'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface XTerminalProps {
  wsClient: any;
  isRunning: boolean;
  onTerminalReady?: (api: XTerminalRef) => void;
}

export interface XTerminalRef {
  write: (data: string) => void;
  clear: () => void;
}

const XTerminal = ({ wsClient, isRunning, onTerminalReady }: XTerminalProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  
  const wsClientRef = useRef(wsClient);
  const isRunningRef = useRef(isRunning);

  useEffect(() => { wsClientRef.current = wsClient; }, [wsClient]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  useEffect(() => {
    if (onTerminalReady) {
      onTerminalReady({
        write: (data: string) => { termInstance.current?.write(data); },
        clear: () => { termInstance.current?.clear(); }
      });
    }
  }, [onTerminalReady]);

  useEffect(() => {
    if (!terminalRef.current) return;

    termInstance.current = new Terminal({
      cursorBlink: true,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      theme: {
        background: '#0E1117',
        foreground: '#e2e8f0',
        cursor: '#3B82F6',
        selectionBackground: 'rgba(59, 130, 246, 0.3)'
      }
    });

    fitAddon.current = new FitAddon();
    termInstance.current.loadAddon(fitAddon.current);
    termInstance.current.open(terminalRef.current);
    
    // Tiny delay ensures panel geometry locks before fit
    setTimeout(() => fitAddon.current?.fit(), 10);

    const onDataDisposable = termInstance.current.onData((data) => {
      if (isRunningRef.current && wsClientRef.current) {
        wsClientRef.current.sendInput(data);
      }
    });

    const handleResize = () => {
      fitAddon.current?.fit();
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      onDataDisposable.dispose();
      window.removeEventListener('resize', handleResize);
      termInstance.current?.dispose();
    };
  }, []);

  return <div className="w-full h-full bg-[#0E1117] rounded-sm overflow-hidden" ref={terminalRef}></div>;
};

XTerminal.displayName = 'XTerminal';

export default XTerminal;
