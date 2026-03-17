import { FeedEvent } from '../types';
import { getWebSocketUrl } from './api';

type EventHandler = (event: FeedEvent) => void;

class WSManager {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private handlers: Set<EventHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxDelay = 30000;
  private shouldReconnect = false;
  private isConnecting = false;

  connect(token: string) {
    this.token = token;
    this.shouldReconnect = true;
    this.reconnectDelay = 1000;
    this._connect();
  }

  disconnect() {
    this.shouldReconnect = false;
    this._clearReconnectTimer();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      this.ws.close();
      this.ws = null;
    }
    this.token = null;
    this.isConnecting = false;
  }

  subscribe(handler: EventHandler) {
    this.handlers.add(handler);
  }

  unsubscribe(handler: EventHandler) {
    this.handlers.delete(handler);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private _connect() {
    if (!this.token || this.isConnecting) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    this.isConnecting = true;
    const url = getWebSocketUrl(this.token);

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      console.warn('[WSManager] Failed to create WebSocket:', err);
      this.isConnecting = false;
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[WSManager] Connected');
      this.isConnecting = false;
      this.reconnectDelay = 1000; // reset on success
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data as string) as FeedEvent;
        this.handlers.forEach((h) => h(parsed));
      } catch (err) {
        console.warn('[WSManager] Failed to parse message:', event.data, err);
      }
    };

    this.ws.onerror = (err) => {
      console.warn('[WSManager] WebSocket error:', err);
    };

    this.ws.onclose = (event) => {
      console.log('[WSManager] Closed', event.code, event.reason);
      this.isConnecting = false;
      this.ws = null;
      if (this.shouldReconnect) {
        this._scheduleReconnect();
      }
    };
  }

  private _scheduleReconnect() {
    this._clearReconnectTimer();
    console.log(`[WSManager] Reconnecting in ${this.reconnectDelay}ms`);
    this.reconnectTimer = setTimeout(() => {
      this._connect();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
  }

  private _clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const wsManager = new WSManager();
