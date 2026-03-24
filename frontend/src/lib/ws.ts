export class RunlyWebSocket {
  private ws: WebSocket | null = null;
  private isConnected = false;

  executeCode(
    language: string, 
    code: string, 
    onOutput: (data: string) => void, 
    onStatus: (status: any) => void
  ) {
    if (this.ws) {
      this.ws.close();
    }

    const host = window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    let wsUrl = `${protocol}//${host}/ws/execute`;
    if (host.includes('localhost:3000') || host.includes('127.0.0.1:3000')) {
      wsUrl = 'ws://localhost:8000/ws/execute'; 
    }

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnected = true;
      onStatus({ type: 'start' });
      this.ws?.send(JSON.stringify({ language, code }));
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
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ type: 'stdin', data }));
    }
  }

  stop() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}
