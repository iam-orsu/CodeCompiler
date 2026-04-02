export type WsStatusType = 'start' | 'exit' | 'error' | 'close';

export interface WsStatus {
  type: WsStatusType;
  data?: string | Event;
}

export class RunlyWebSocket {
  private ws: WebSocket | null = null;
  private isConnected = false;

  executeCode(
    language: string, 
    code: string, 
    sessionId: string,
    onOutput: (data: string) => void, 
    onStatus: (status: WsStatus) => void
  ) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this.ws = null;

    const host = window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${host}/ws/execute`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnected = true;
      onStatus({ type: 'start' });
      this.ws?.send(JSON.stringify({ language, code, session_id: sessionId }));
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'stdout' || msg.type === 'stderr') {
          onOutput(msg.data);
        } else if (msg.type === 'exit') {
          onStatus({ type: 'exit', data: msg.data });
        }
      } catch (e) {
        console.error('Failed parsing WS message', e);
      }
    };

    this.ws.onerror = (err) => {
      onStatus({ type: 'error', data: err });
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      onStatus({ type: 'close' });
    };
  }

  sendInput(data: string) {
    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'stdin', data }));
    }
  }

  stop() {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
      this.isConnected = false;
    }
  }
}
