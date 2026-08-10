import type { WSMessage } from '../lib/types';

export class AuditStatusDO {
  private state: DurableObjectState;
  private sockets: Set<WebSocket>;
  private currentStage: string;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sockets = new Set<WebSocket>();
    this.currentStage = 'queued';
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Load persisted stage from Durable Object storage if cold
    const savedStage = await this.state.storage.get<string>('currentStage');
    if (savedStage) {
      this.currentStage = savedStage;
    }

    // Handle WebSocket upgrade connection from client browser
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new (globalThis as any).WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

      server.accept();
      this.sockets.add(server);

      // Send initial welcome & current state snapshot
      const connectedMsg: WSMessage = { type: 'connected' };
      server.send(JSON.stringify(connectedMsg));

      if (this.currentStage) {
        const stateMsg: WSMessage = { type: 'progress', stage: this.currentStage };
        server.send(JSON.stringify(stateMsg));
      }

      // Handle ping frames for keep-alive
      server.addEventListener('message', (event: any) => {
        try {
          const data = JSON.parse(event.data.toString());
          if (data.type === 'ping') {
            server.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch {
          // Ignore non-JSON ping frames
        }
      });

      server.addEventListener('close', () => {
        this.sockets.delete(server);
      });

      server.addEventListener('error', () => {
        this.sockets.delete(server);
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      } as ResponseInit);
    }

    // Internal RPC trigger endpoint to broadcast state changes to connected WebSockets
    if (request.method === 'POST' && url.pathname.endsWith('/broadcast')) {
      try {
        const body: { message: WSMessage } = await request.json();
        
        if (body.message && 'stage' in body.message) {
          this.currentStage = body.message.stage;
          await this.state.storage.put('currentStage', this.currentStage);
        }

        const payloadStr = JSON.stringify(body.message);

        for (const socket of this.sockets) {
          try {
            socket.send(payloadStr);
          } catch {
            this.sockets.delete(socket);
          }
        }

        return new Response(
          JSON.stringify({ success: true, clientsNotified: this.sockets.size, currentStage: this.currentStage }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
      }
    }

    // GET /telemetry route for admin monitoring
    if (request.method === 'GET' && url.pathname.endsWith('/telemetry')) {
      return new Response(
        JSON.stringify({
          activeConnections: this.sockets.size,
          currentStage: this.currentStage,
          timestamp: Date.now(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response('Method not allowed', { status: 405 });
  }
}


