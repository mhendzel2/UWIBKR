#!/usr/bin/env node

// Test script to verify real price integration
import { ibkrService } from './server/services/ibkr.js';
import { marketIntelligence } from './server/services/marketIntelligence.js';

console.log('🔍 Testing Real Price Integration...\n');

async function testRealPrices() {
  const symbols = ['AAPL', 'TSLA', 'SPY'];
  
  console.log('📊 Testing IBKR Market Data Service:');
  console.log('═══════════════════════════════════');
  
  for (const symbol of symbols) {
    try {
      console.log(`\n📈 Testing ${symbol}:`);
      const marketData = await ibkrService.getMarketData(symbol);
      
      if (marketData) {
        console.log(`   Price: $${marketData.last?.toFixed(2) || 'N/A'}`);
        console.log(`   Volume: ${marketData.volume?.toLocaleString() || 'N/A'}`);
        console.log(`   Source: ${marketData.source || 'Mock'}`);
        console.log(`   Timestamp: ${marketData.timestamp || 'N/A'}`);
      } else {
        console.log(`   ❌ No data returned for ${symbol}`);
      }
    } catch (error) {
      console.error(`   ❌ Error testing ${symbol}:`, error.message);
    }
  }
  
  console.log('\n\n🔮 Testing Market Intelligence Data:');
  console.log('════════════════════════════════════');
  
  try {
    console.log('\n📊 Testing Dark Pool Activity for AAPL:');
    const darkPool = await marketIntelligence.trackDarkPoolActivity('AAPL');
    
    if (darkPool && darkPool.significantTrades.length > 0) {
      console.log(`   Dark Pool Ratio: ${(darkPool.darkPoolRatio * 100).toFixed(1)}%`);
      console.log(`   Significant Trades:`);
      darkPool.significantTrades.slice(0, 2).forEach((trade, i) => {
        console.log(`     ${i + 1}. Size: ${trade.size.toLocaleString()}, Price: $${trade.price.toFixed(2)}`);
      });
    }
    
    console.log('\n📈 Testing Insider Trades for AAPL:');
    const insiderTrades = await marketIntelligence.trackInsiderTrades('AAPL');
    
    if (insiderTrades.length > 0) {
      insiderTrades.forEach((trade, i) => {
        console.log(`   ${i + 1}. ${trade.insider} (${trade.title}): ${trade.transactionType.toUpperCase()}`);
        console.log(`       Shares: ${trade.shares.toLocaleString()}, Price: $${trade.price.toFixed(2)}`);
        console.log(`       Value: $${trade.value.toLocaleString()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing intelligence data:', error.message);
  }
}

// API Key Check
console.log('🔑 API Key Configuration:');
console.log('═════════════════════════');
const uwKey = process.env.UNUSUAL_WHALES_API_KEY;
const avKey = process.env.ALPHA_VANTAGE_API_KEY;

console.log(`   Unusual Whales: ${uwKey ? '✅ Configured' : '❌ Missing'}`);
console.log(`   Alpha Vantage:  ${avKey ? '✅ Configured' : '❌ Missing'}`);

if (uwKey) {
  console.log(`   UW Key: ${uwKey.substring(0, 8)}...${uwKey.slice(-4)}`);
}

console.log('\n');

// Run the test
testRealPrices().catch(console.error);
