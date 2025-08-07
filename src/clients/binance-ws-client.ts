import WebSocket from 'ws';
import { HttpsProxyAgent } from 'https-proxy-agent';

export interface WSHandlers {
  onOpen?: () => void;
  onMessage?: (data: string) => void;
}

export interface BinanceWSClientOptions {
  proxyUrl?: string;
}

export class BinanceWSClient {
  private url: string;
  private ws: WebSocket | null = null;
  private handlers: WSHandlers;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private lastPong = Date.now();
  private reconnectDelay = 5000;
  private heartbeatIntervalMs = 30000;
  private options?: BinanceWSClientOptions;

  constructor(url: string, handlers: WSHandlers, options?: BinanceWSClientOptions) {
    this.url = url;
    this.handlers = handlers;
    this.options = options;
  }

  public connect() {
    console.log(`[WS] Connecting to ${this.url} ${this.options?.proxyUrl ? 'via proxy' : ''}`);
    const agent = this.options?.proxyUrl ? new HttpsProxyAgent(this.options.proxyUrl) : undefined;

    this.ws = new WebSocket(this.url, { agent });

    this.ws.on('open', () => {
      console.log('[WS] Connected');
      this.lastPong = Date.now();
      this.startHeartbeat();
      this.handlers.onOpen?.();
    });

    this.ws.on('message', (data: WebSocket.RawData) => {
      this.handlers.onMessage?.(data.toString());
    });

    this.ws.on('pong', () => {
      this.lastPong = Date.now();
    });

    this.ws.on('close', (code) => {
      console.warn(`[WS] Closed: ${code}`);
      this.reconnect();
    });

    this.ws.on('error', (err) => {
      console.error('[WS] Error:', err.message);
      this.ws?.terminate();
    });
  }

  private startHeartbeat() {
    this.pingInterval && clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const now = Date.now();
      if (now - this.lastPong > this.heartbeatIntervalMs * 2) {
        console.warn('[WS] Heartbeat lost, reconnecting...');
        this.ws.terminate();
        return;
      }

      try {
        this.ws.ping();
      } catch (err) {
        console.error('[WS] Ping failed:', err);
      }
    }, this.heartbeatIntervalMs);
  }

  private reconnect() {
    this.reconnectTimeout && clearTimeout(this.reconnectTimeout);
    this.pingInterval && clearInterval(this.pingInterval);

    console.log(`[WS] Reconnecting in ${this.reconnectDelay / 1000}s...`);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  public close() {
    this.reconnectTimeout && clearTimeout(this.reconnectTimeout);
    this.pingInterval && clearInterval(this.pingInterval);
    this.ws?.close();
    console.log('[WS] Closed manually');
  }
}
