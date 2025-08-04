import WebSocket from 'ws';
import { UnusualWhalesService } from './unusualWhales';

// Define the structure of a websocket message from the client
interface WebSocketMessage {
  event: 'subscribe' | 'unsubscribe';
  channels: string[];
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private uwService: UnusualWhalesService;
  private clientCallback: ((data: any) => void) | null = null;
  private reconnectInterval = 5000; // 5 seconds
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.uwService = new UnusualWhalesService();
    this.connect();
  }

  private connect() {
    // We'll get the token from the unusual whales service, which should handle authentication
    const socketUrl = `wss://ws.unusualwhales.com`;
    this.ws = new WebSocket(socketUrl, {
        headers: {
            Authorization: `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`
        }
    });

    this.ws.on('open', () => {
      console.log('🚀 WebSocket connection established with Unusual Whales.');
      this.startPing();
      // Example subscription
      this.subscribe(['options_trades', 'flow_alerts']);
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      const message = JSON.parse(data.toString());
      if (this.clientCallback) {
        this.clientCallback(message);
      }
    });

    this.ws.on('close', () => {
      console.log('🔌 WebSocket connection closed. Attempting to reconnect...');
      this.stopPing();
      setTimeout(() => this.connect(), this.reconnectInterval);
    });

    this.ws.on('error', (error: Error) => {
      console.error('❌ WebSocket error:', error.message);
      this.ws?.close();
    });
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public subscribe(channels: string[]) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        event: 'subscribe',
        channels: channels,
      };
      this.ws.send(JSON.stringify(message));
      console.log(`📢 Subscribed to channels: ${channels.join(', ')}`);
    }
  }

  public unsubscribe(channels: string[]) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        event: 'unsubscribe',
        channels: channels,
      };
      this.ws.send(JSON.stringify(message));
      console.log(`🔕 Unsubscribed from channels: ${channels.join(', ')}`);
    }
  }

  public onMessage(callback: (data: any) => void) {
    this.clientCallback = callback;
  }
}

export const webSocketService = new WebSocketService();
