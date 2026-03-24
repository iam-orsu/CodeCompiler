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
  const containerRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const fit = useRef<FitAddon | null>(null);
  const wsRef = useRef(wsClient);
  const runRef = useRef(isRunning);

  useEffect(() => { wsRef.current = wsClient; }, [wsClient]);
  useEffect(() => { runRef.current = isRunning; }, [isRunning]);

  useEffect(() => {
    if (onTerminalReady) {
      onTerminalReady({
        write: (d: string) => term.current?.write(d),
        clear: () => term.current?.clear(),
      });
    }
  }, [onTerminalReady]);

  useEffect(() => {
    if (!containerRef.current) return;

    term.current = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.5,
      letterSpacing: 0.2,
      theme: {
        background: '#09090b',
        foreground: '#d4d4d8',
        cursor: '#3b82f6',
        cursorAccent: '#09090b',
        selectionBackground: 'rgba(59,130,246,0.2)',
        selectionForeground: '#fafafa',
        black: '#27272a',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#d4d4d8',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fde68a',
        brightBlue: '#60a5fa',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#fafafa',
      }
    });

    fit.current = new FitAddon();
    term.current.loadAddon(fit.current);
    term.current.open(containerRef.current);
    setTimeout(() => fit.current?.fit(), 10);

    const dataSub = term.current.onData((data: string) => {
      if (runRef.current && wsRef.current) wsRef.current.sendInput(data);
    });

    const onResize = () => fit.current?.fit();
    window.addEventListener('resize', onResize);

    const obs = new ResizeObserver(() => setTimeout(() => fit.current?.fit(), 0));
    if (containerRef.current.parentElement) obs.observe(containerRef.current.parentElement);

    return () => {
      dataSub.dispose();
      window.removeEventListener('resize', onResize);
      obs.disconnect();
      term.current?.dispose();
    };
  }, []);

  return <div className="w-full h-full rounded overflow-hidden" style={{ background: '#09090b' }} ref={containerRef} />;
};

XTerminal.displayName = 'XTerminal';
export default XTerminal;
