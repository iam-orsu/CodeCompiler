import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { createPtySession, writeToSession, resizeSession, killSession } from './ptyManager';
import { redisConnection } from '../queue/queue';
import { checkRateLimit } from '../middleware/rateLimiter';
import { config } from '../config';
import { LANGUAGES, LanguageId } from '../languages';
import http from 'http';

export function setupWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server, path: '/ws/execute' });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const sessionId = uuidv4();
    let isInitialized = false;
    let globalCounterIncremented = false;

    ws.on('message', async (message: string) => {
      try {
        const payload = JSON.parse(message.toString());

        if (payload.type === 'init') {
          if (isInitialized) return;
          
          // Strict double-init trap
          isInitialized = true;

          // Rate Limiter Enforcement logic mapping sliding window checks across external domains
          const ip = req.socket.remoteAddress || 'unknown';
          const rateResult = await checkRateLimit(`${ip}:anonymous`, config.RATE_LIMIT_ANON_PER_HOUR, 3600000);
          
          if (!rateResult.allowed) {
            ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded. Please try again later.' }));
            ws.close();
            return;
          }

          const currentSessionsStr = await redisConnection.get('global_pty_sessions');
          const currentSessions = currentSessionsStr ? parseInt(currentSessionsStr, 10) : 0;
          if (currentSessions >= config.MAX_PTY_SESSIONS) {
            ws.send(JSON.stringify({ type: 'error', message: 'Server reached maximum concurrent active capacities.' }));
            ws.close();
            return;
          }

          const { language, files, cols, rows } = payload;

          const langExists = LANGUAGES.some(l => l.id === language);
          if (!langExists) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid language specified.' }));
            ws.close();
            return;
          }

          if (!files || !Array.isArray(files) || files.length === 0) {
            ws.send(JSON.stringify({ type: 'error', message: 'Files array payload must be propagated.' }));
            ws.close();
            return;
          }

          await redisConnection.incr('global_pty_sessions');
          globalCounterIncremented = true;

          try {
            createPtySession({
              sessionId,
              language: language as LanguageId,
              files,
              ws,
              cols: cols || 80,
              rows: rows || 24
            });
          } catch (err) {
            ws.send(JSON.stringify({ type: 'error', message: 'Failed to establish terminal engine connection.' }));
            ws.close();
          }

        } else if (payload.type === 'input') {
          if (!isInitialized) return;
          writeToSession(sessionId, payload.data);
        } else if (payload.type === 'resize') {
          if (!isInitialized) return;
          resizeSession(sessionId, payload.cols, payload.rows);
        } else if (payload.type === 'kill') {
          if (!isInitialized) return;
          killSession(sessionId);
        }
      } catch (err) {
        console.error('WebSocket execution schema parsing error:', err);
      }
    });

    ws.on('close', async () => {
      killSession(sessionId);
      if (globalCounterIncremented) {
        await redisConnection.decr('global_pty_sessions');
        globalCounterIncremented = false; // State clean trap
      }
    });
  });
}
