import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { TradingSignal, Position, OptionsFlow, SystemHealth, AccountInfo, WebSocketMessage } from '../types/trading';

interface RealTimeData {
  signals: TradingSignal[];
  positions: Position[];
  optionsFlow: OptionsFlow[];
  systemHealth: SystemHealth[];
  account: AccountInfo | null;
  isConnected: boolean;
}

export function useRealTimeData() {
  const [data, setData] = useState<RealTimeData>({
    signals: [],
    positions: [],
    optionsFlow: [],
    systemHealth: [],
    account: null,
    isConnected: false,
  });

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'connection':
        setData(prev => ({ ...prev, isConnected: true }));
        break;

      case 'initial_data':
        const { channel, data: channelData } = message.data;
        setData(prev => ({
          ...prev,
          [channel]: channelData,
        }));
        break;

      case 'signal_update':
        setData(prev => {
          const updatedSignals = prev.signals.map(signal =>
            signal.id === message.data.id ? message.data : signal
          );
          
          // Add new signal if it doesn't exist
          if (!prev.signals.find(s => s.id === message.data.id)) {
            updatedSignals.unshift(message.data);
          }
          
          return { ...prev, signals: updatedSignals };
        });
        break;

      case 'position_update':
        setData(prev => {
          const updatedPositions = prev.positions.map(position =>
            position.id === message.data.id ? message.data : position
          );
          
          // Add new position if it doesn't exist
          if (!prev.positions.find(p => p.id === message.data.id)) {
            updatedPositions.unshift(message.data);
          }
          
          return { ...prev, positions: updatedPositions };
        });
        break;

      case 'account_update':
        setData(prev => ({ ...prev, account: message.data }));
        break;

      case 'system_update':
        setData(prev => ({ ...prev, systemHealth: message.data }));
        break;

      case 'market_update':
        // Handle market data updates
        console.log('Market update:', message.data);
        break;

      case 'risk_alert':
        // Handle risk alerts (could trigger notifications)
        console.warn('Risk alert:', message.data);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  const handleConnect = useCallback(() => {
    setData(prev => ({ ...prev, isConnected: true }));
  }, []);

  const handleDisconnect = useCallback(() => {
    setData(prev => ({ ...prev, isConnected: false }));
  }, []);

  const { connectionStatus, subscribe, unsubscribe, sendMessage } = useWebSocket(
    '/ws',
    {
      onMessage: handleMessage,
      onConnect: handleConnect,
      onDisconnect: handleDisconnect,
    }
  );

  // Subscribe to all channels on connection
  useEffect(() => {
    if (connectionStatus === 'connected') {
      subscribe('signals');
      subscribe('positions');
      subscribe('account');
      subscribe('system');
      subscribe('market');
    }
  }, [connectionStatus, subscribe]);

  const updateSignal = useCallback((signalId: string, updates: Partial<TradingSignal>) => {
    setData(prev => ({
      ...prev,
      signals: prev.signals.map(signal =>
        signal.id === signalId ? { ...signal, ...updates } : signal
      ),
    }));
  }, []);

  const updatePosition = useCallback((positionId: string, updates: Partial<Position>) => {
    setData(prev => ({
      ...prev,
      positions: prev.positions.map(position =>
        position.id === positionId ? { ...position, ...updates } : position
      ),
    }));
  }, []);

  return {
    ...data,
    connectionStatus,
    updateSignal,
    updatePosition,
    subscribe,
    unsubscribe,
    sendMessage,
  };
}
