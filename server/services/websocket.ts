import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from '../storage';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface ClientConnection {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  lastPing: number;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private pingInterval!: NodeJS.Timeout;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      perMessageDeflate: false,
    });

    this.setupWebSocketServer();
    this.startPingInterval();
    
    console.log('WebSocket server initialized on /ws');
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      
      const client: ClientConnection = {
        id: clientId,
        ws,
        subscriptions: new Set(),
        lastPing: Date.now(),
      };

      this.clients.set(clientId, client);
      console.log(`WebSocket client connected: ${clientId}`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection',
        data: { 
          clientId, 
          status: 'connected',
          serverTime: new Date().toISOString(),
        },
        timestamp: Date.now(),
      });

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error(`Failed to parse message from ${clientId}:`, error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      // Handle pong responses
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
        }
      });
    });
  }

  private handleClientMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        if (message.channel) {
          client.subscriptions.add(message.channel);
          console.log(`Client ${clientId} subscribed to ${message.channel}`);
          
          // Send initial data for the subscription
          this.sendInitialData(clientId, message.channel);
        }
        break;

      case 'unsubscribe':
        if (message.channel) {
          client.subscriptions.delete(message.channel);
          console.log(`Client ${clientId} unsubscribed from ${message.channel}`);
        }
        break;

      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong',
          data: { timestamp: Date.now() },
          timestamp: Date.now(),
        });
        break;

      default:
        console.warn(`Unknown message type from ${clientId}:`, message.type);
    }
  }

  private async sendInitialData(clientId: string, channel: string): Promise<void> {
    try {
      let data: any = null;

      switch (channel) {
        case 'signals':
          data = await storage.getTradingSignals();
          break;
        case 'positions':
          data = await storage.getAllPositions();
          break;
        case 'account':
          data = await this.getAccountData();
          break;
        case 'market':
          data = await this.getMarketData();
          break;
        case 'system':
          data = await this.getSystemHealth();
          break;
      }

      if (data) {
        this.sendToClient(clientId, {
          type: 'initial_data',
          data: { channel, data },
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error(`Failed to send initial data for ${channel}:`, error);
    }
  }

  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send message to client ${clientId}:`, error);
      }
    }
  }

  private broadcast(message: WebSocketMessage, channel?: string): void {
    this.clients.forEach((client, clientId) => {
      if (!channel || client.subscriptions.has(channel)) {
        this.sendToClient(clientId, message);
      }
    });
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          // Check if client is still responsive
          if (now - client.lastPing > 60000) { // 60 seconds timeout
            console.warn(`Client ${clientId} appears unresponsive, closing connection`);
            client.ws.terminate();
            this.clients.delete(clientId);
          } else {
            // Send ping
            try {
              client.ws.ping();
            } catch (error) {
              console.error(`Failed to ping client ${clientId}:`, error);
            }
          }
        } else {
          this.clients.delete(clientId);
        }
      });
    }, 30000); // Ping every 30 seconds
  }

  // Public methods for broadcasting updates
  broadcastSignalUpdate(signal: any): void {
    this.broadcast({
      type: 'signal_update',
      data: signal,
      timestamp: Date.now(),
    }, 'signals');
  }

  broadcastPositionUpdate(position: any): void {
    this.broadcast({
      type: 'position_update',
      data: position,
      timestamp: Date.now(),
    }, 'positions');
  }

  broadcastAccountUpdate(account: any): void {
    this.broadcast({
      type: 'account_update',
      data: account,
      timestamp: Date.now(),
    }, 'account');
  }

  broadcastMarketUpdate(market: any): void {
    this.broadcast({
      type: 'market_update',
      data: market,
      timestamp: Date.now(),
    }, 'market');
  }

  broadcastSystemUpdate(system: any): void {
    this.broadcast({
      type: 'system_update',
      data: system,
      timestamp: Date.now(),
    }, 'system');
  }

  broadcastRiskAlert(alert: any): void {
    this.broadcast({
      type: 'risk_alert',
      data: alert,
      timestamp: Date.now(),
    });
  }

  broadcastPortfolioUpdate(portfolioId: string): void {
    this.broadcast({
      type: 'portfolio_update',
      data: { portfolioId },
      timestamp: Date.now(),
    }, 'portfolios');
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getAccountData(): Promise<any> {
    // Mock account data
    return {
      equity: 125847.32,
      dayPnl: 2345.67,
      buyingPower: 151694.64,
      availableFunds: 75847.32,
    };
  }

  private async getMarketData(): Promise<any> {
    // Mock market data
    return {
      status: 'OPEN',
      vix: 18.5,
      spyPrice: 467.23,
      lastUpdate: new Date().toISOString(),
    };
  }

  private async getSystemHealth(): Promise<any> {
    return {
      services: [
        { name: 'IBKR TWS', status: 'connected', latency: 12 },
        { name: 'Unusual Whales', status: 'active', latency: 45 },
        { name: 'Gemini AI', status: 'processing', latency: 2300 },
      ],
      uptime: '14h 32m',
      cpuUsage: 23,
      memoryUsage: '1.2GB',
    };
  }

  getStats() {
    return {
      connectedClients: this.clients.size,
      totalSubscriptions: Array.from(this.clients.values())
        .reduce((sum, client) => sum + client.subscriptions.size, 0),
    };
  }

  close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.clients.forEach((client) => {
      client.ws.close();
    });
    
    this.wss.close();
    console.log('WebSocket server closed');
  }
}
