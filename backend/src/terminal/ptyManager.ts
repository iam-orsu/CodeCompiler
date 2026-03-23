import * as pty from 'node-pty';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { WebSocket } from 'ws';
import { config } from '../config';
import { LanguageId, getLanguageConfig } from '../languages';

export interface PtySession {
  sessionId: string;
  language: LanguageId;
  ptyProcess: pty.IPty;
  hostCodeDir: string;
  ws: WebSocket;
  killed: boolean;
  startedAt: Date;
}

export const sessions = new Map<string, PtySession>();

export function createPtySession({
  sessionId,
  language,
  files,
  ws,
  cols = 80,
  rows = 24
}: {
  sessionId: string;
  language: LanguageId;
  files: { name: string; content: string }[];
  ws: WebSocket;
  cols?: number;
  rows?: number;
}): void {
  const langConfig = getLanguageConfig(language);
  if (!langConfig) throw new Error(`Language ${language} not supported`);

  const hostCodeDir = path.join(os.tmpdir(), `runly-${sessionId}`);
  fs.mkdirSync(hostCodeDir, { recursive: true });

  for (const file of files) {
    fs.writeFileSync(path.join(hostCodeDir, file.name), file.content);
  }

  const args = [
    'run',
    '--rm',
    '-it',
    '--network=none',
    '--read-only',
    `--memory=${langConfig.memoryLimit}b`,
    `--cpus=${langConfig.cpuLimit}`,
    `--pids-limit=${langConfig.pidsLimit}`,
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges',
    '--tmpfs', '/tmp:size=50m,exec',
    '--tmpfs', '/home:size=10m'
  ];

  if (language === 'go') {
    args.push('--tmpfs', '/.cache:size=200m');
  }
  if (language === 'csharp') {
    args.push('--tmpfs', '/tmp/nuget-cache:size=100m');
  }

  if (langConfig.extraTmpfs) {
    for (const [mnt, opt] of Object.entries(langConfig.extraTmpfs)) {
      if (language === 'go' && mnt === '/.cache') continue;
      if (language === 'csharp' && mnt === '/tmp/nuget-cache') continue;
      args.push('--tmpfs', `${mnt}:${opt}`);
    }
  }

  args.push('-e', 'TERM=xterm-256color');
  args.push('-e', `COLUMNS=${cols}`);
  args.push('-e', `LINES=${rows}`);
  args.push('-v', `${hostCodeDir}:/code:ro`);
  args.push('runly-sandbox');
  args.push(language);

  // node-pty spawns native docker run strictly mapped without dockerode interfaces
  const ptyProcess = pty.spawn('docker', args, {
    name: 'xterm-256color',
    cols,
    rows
  });

  const session: PtySession = {
    sessionId,
    language,
    ptyProcess,
    hostCodeDir,
    ws,
    killed: false,
    startedAt: new Date()
  };

  sessions.set(sessionId, session);

  ptyProcess.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'output', data }));
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'exit', exitCode }));
    }
    killSession(sessionId);
  });

  setTimeout(() => {
    const s = sessions.get(sessionId);
    if (s && !s.killed) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'timeout' }));
        }
        killSession(sessionId);
    }
  }, langConfig.timeoutMs);
}

export function writeToSession(sessionId: string, data: string) {
  const session = sessions.get(sessionId);
  if (session && !session.killed) {
    session.ptyProcess.write(data);
  }
}

export function resizeSession(sessionId: string, cols: number, rows: number) {
  const session = sessions.get(sessionId);
  if (session && !session.killed) {
    session.ptyProcess.resize(cols, rows);
  }
}

export function killSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session || session.killed) return;

  session.killed = true;
  try {
    session.ptyProcess.kill();
  } catch (e) {
    // Expected boundary condition
  }

  try {
    if (fs.existsSync(session.hostCodeDir)) {
      fs.rmSync(session.hostCodeDir, { recursive: true, force: true });
    }
  } catch (e) {
    console.error(`Failed to cleanup dir ${session.hostCodeDir}`, e);
  }

  sessions.delete(sessionId);
}
