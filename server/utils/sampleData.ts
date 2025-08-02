import { storage } from '../storage';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export async function generateSampleTradingData() {
  console.log('Generating sample trading data for analytics demonstration...');

  const sampleTrades = [
    {
      id: generateId(),
      signalId: generateId(),
      symbol: 'NVDA',
      strategy: 'swing' as const,
      side: 'buy' as const,
      quantity: 5,
      entryPrice: '12.50',
      exitPrice: '18.75',
      realizedPnl: '3125.00',
      status: 'closed' as const,
      executionTime: new Date('2024-12-15T10:30:00Z'),
      closeTime: new Date('2024-12-18T15:45:00Z'),
      optionType: 'call' as const,
      strikePrice: 485,
      expirationDate: new Date('2025-01-17'),
      aiConfidence: 85.2
    },
    {
      id: generateId(),
      signalId: generateId(),
      symbol: 'SPY',
      strategy: 'swing' as const,
      side: 'buy' as const,
      quantity: 10,
      entryPrice: '8.20',
      exitPrice: '12.10',
      realizedPnl: '3900.00',
      status: 'closed' as const,
      executionTime: new Date('2024-12-10T09:15:00Z'),
      closeTime: new Date('2024-12-12T14:20:00Z'),
      optionType: 'call' as const,
      strikePrice: 470,
      expirationDate: new Date('2025-01-31'),
      aiConfidence: 78.6
    },
    {
      id: generateId(),
      signalId: generateId(),
      symbol: 'AMZN',
      strategy: 'swing' as const,
      side: 'buy' as const,
      quantity: 4,
      entryPrice: '15.80',
      exitPrice: '11.20',
      realizedPnl: '-1840.00',
      status: 'closed' as const,
      executionTime: new Date('2024-12-08T10:45:00Z'),
      closeTime: new Date('2024-12-11T15:30:00Z'),
      optionType: 'call' as const,
      strikePrice: 155,
      expirationDate: new Date('2025-01-17'),
      aiConfidence: 72.1
    },
    {
      id: generateId(),
      signalId: generateId(),
      symbol: 'QQQ',
      strategy: 'leap' as const,
      side: 'buy' as const,
      quantity: 3,
      entryPrice: '25.30',
      exitPrice: '31.80',
      realizedPnl: '1950.00',
      status: 'closed' as const,
      executionTime: new Date('2024-11-20T11:00:00Z'),
      closeTime: new Date('2024-12-20T16:00:00Z'),
      optionType: 'call' as const,
      strikePrice: 390,
      expirationDate: new Date('2025-12-19'),
      aiConfidence: 91.3
    },
    {
      id: generateId(),
      signalId: generateId(),
      symbol: 'MSFT',
      strategy: 'swing' as const,
      side: 'buy' as const,
      quantity: 7,
      entryPrice: '11.30',
      status: 'open' as const,
      executionTime: new Date('2024-12-23T10:15:00Z'),
      optionType: 'call' as const,
      strikePrice: 420,
      expirationDate: new Date('2025-02-21'),
      aiConfidence: 82.7
    }
  ];

  try {
    // Create sample trades
    for (const tradeData of sampleTrades) {
      await storage.createTrade(tradeData);
    }

    console.log(`Created ${sampleTrades.length} sample trades for analytics demonstration`);
    return { success: true, tradesCreated: sampleTrades.length };
  } catch (error) {
    console.error('Failed to generate sample data:', error);
    return { success: false, error: String(error) };
  }
}