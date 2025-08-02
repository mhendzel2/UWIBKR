import { apiRequest } from "./queryClient";
import { TradingSignal, Position, OptionsFlow, SystemHealth, AccountInfo, RiskStatus } from "../types/trading";

export const tradingApi = {
  // Signals
  getSignals: async (): Promise<TradingSignal[]> => {
    const response = await apiRequest('GET', '/api/signals');
    return response.json();
  },

  getSignal: async (id: string): Promise<TradingSignal> => {
    const response = await apiRequest('GET', `/api/signals/${id}`);
    return response.json();
  },

  approveSignal: async (id: string, quantity: number = 1): Promise<any> => {
    const response = await apiRequest('POST', `/api/signals/${id}/approve`, { quantity });
    return response.json();
  },

  executeSignal: async (id: string, quantity: number = 1): Promise<any> => {
    const response = await apiRequest('POST', `/api/signals/${id}/execute`, { quantity });
    return response.json();
  },

  // Positions
  getPositions: async (): Promise<Position[]> => {
    const response = await apiRequest('GET', '/api/positions');
    return response.json();
  },

  getPosition: async (id: string): Promise<Position> => {
    const response = await apiRequest('GET', `/api/positions/${id}`);
    return response.json();
  },

  closePosition: async (id: string): Promise<any> => {
    const response = await apiRequest('POST', `/api/positions/${id}/close`);
    return response.json();
  },

  // Options Flow
  getOptionsFlow: async (limit: number = 50): Promise<OptionsFlow[]> => {
    const response = await apiRequest('GET', `/api/options-flow?limit=${limit}`);
    return response.json();
  },

  // Risk Management
  getRiskStatus: async (): Promise<RiskStatus> => {
    const response = await apiRequest('GET', '/api/risk/status');
    return response.json();
  },

  emergencyStop: async (): Promise<any> => {
    const response = await apiRequest('POST', '/api/risk/emergency-stop');
    return response.json();
  },

  pauseTrading: async (): Promise<any> => {
    const response = await apiRequest('POST', '/api/risk/pause-trading');
    return response.json();
  },

  resumeTrading: async (): Promise<any> => {
    const response = await apiRequest('POST', '/api/risk/resume-trading');
    return response.json();
  },

  // Account
  getAccount: async (): Promise<AccountInfo> => {
    const response = await apiRequest('GET', '/api/account');
    return response.json();
  },

  // System Health
  getSystemHealth: async (): Promise<SystemHealth[]> => {
    const response = await apiRequest('GET', '/api/system/health');
    return response.json();
  },

  // Market Data
  getMarketData: async (symbol: string): Promise<any> => {
    const response = await apiRequest('GET', `/api/market/${symbol}`);
    return response.json();
  },

  // Statistics
  getStats: async (): Promise<any> => {
    const response = await apiRequest('GET', '/api/stats');
    return response.json();
  },
};
