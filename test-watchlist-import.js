#!/usr/bin/env node

/**
 * Quick test script to verify CSV watchlist import functionality
 * This simulates the watchlist API endpoint behavior
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the CSV file
const csvFilePath = path.join(__dirname, 'data', 'ai-watchlist-intraday.csv');

console.log('🔍 Testing watchlist CSV import functionality...');
console.log(`📁 Reading file: ${csvFilePath}`);

try {
  const csvContent = fs.readFileSync(csvFilePath, 'utf8');
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least header and one data row');
  }
  
  const headers = lines[0].split(',');
  console.log(`📊 Headers found: ${headers.join(', ')}`);
  
  // Parse CSV data (simplified parsing, assumes no commas in quoted fields for this test)
  const symbols = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(',');
    if (fields.length >= 2) {
      const symbol = fields[0].trim();
      const name = fields[1].replace(/"/g, '').trim();
      symbols.push({ symbol, name });
    }
  }
  
  console.log(`\n✅ Successfully parsed ${symbols.length} symbols from CSV:`);
  symbols.slice(0, 10).forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.symbol} - ${item.name}`);
  });
  
  if (symbols.length > 10) {
    console.log(`  ... and ${symbols.length - 10} more symbols`);
  }
  
  // Test the structure that would be returned by API
  const mockWatchlist = {
    id: 1,
    name: "AI Watchlist Intraday",
    description: "AI-generated intraday trading watchlist",
    symbols: symbols.map(item => ({
      symbol: item.symbol,
      name: item.name,
      addedAt: new Date().toISOString()
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  console.log(`\n🎯 Mock watchlist structure:`);
  console.log(`   ID: ${mockWatchlist.id}`);
  console.log(`   Name: ${mockWatchlist.name}`);
  console.log(`   Symbol count: ${mockWatchlist.symbols.length}`);
  console.log(`   First 5 symbols: ${mockWatchlist.symbols.slice(0, 5).map(s => s.symbol).join(', ')}`);
  
  // Simulate API endpoint responses
  console.log(`\n🔗 API endpoints that would be available:`);
  console.log(`   GET /api/watchlists - List all watchlists`);
  console.log(`   GET /api/watchlists/1 - Get this specific watchlist`);
  console.log(`   POST /api/watchlists/1/symbols - Add symbols to watchlist`);
  console.log(`   DELETE /api/watchlists/1/symbols/:symbol - Remove symbol from watchlist`);
  
  // Test symbol filtering (common functionality)
  const techSymbols = symbols.filter(s => 
    ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'].includes(s.symbol)
  );
  
  console.log(`\n💻 Tech stocks in watchlist: ${techSymbols.map(s => s.symbol).join(', ')}`);
  
  console.log(`\n✨ CSV import test completed successfully!`);
  console.log(`📈 Ready for watchlist functionality testing`);

} catch (error) {
  console.error('❌ Error testing CSV import:', error.message);
  process.exit(1);
}
