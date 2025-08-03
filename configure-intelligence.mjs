#!/usr/bin/env node
/**
 * Intelligence Data Source Configuration
 * 
 * This script helps users configure whether to use real API data or simulated data
 * for the market intelligence features.
 */

import { promises as fs } from 'fs';
import * as path from 'path';

// Load environment variables from .env file
async function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = await fs.readFile(envPath, 'utf8');
    
    // Parse .env file and set environment variables
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
        process.env[key.trim()] = value.trim();
      }
    });
    
    console.log('✅ Loaded environment variables from .env file');
  } catch (error) {
    console.log('⚠️  .env file not found or couldn\'t be read');
  }
}

async function getCurrentConfig() {
  const configPath = path.join(process.cwd(), 'data', 'intelligence', 'config.json');
  
  try {
    const configData = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    // Return default config if file doesn't exist
    return {
      useRealData: false,
      apiKeys: {},
      dataSources: {
        gexData: 'simulated',
        priceData: 'simulated',
        newsData: 'simulated',
        analystData: 'simulated',
        insiderData: 'simulated'
      }
    };
  }
}

async function saveConfig(config) {
  const configPath = path.join(process.cwd(), 'data', 'intelligence', 'config.json');
  const configDir = path.dirname(configPath);
  
  // Ensure directory exists
  await fs.mkdir(configDir, { recursive: true });
  
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  console.log(`✅ Configuration saved to ${configPath}`);
}

async function checkApiKeys() {
  console.log('\n🔑 API Key Status:');
  
  const uwKey = process.env.UNUSUAL_WHALES_API_KEY || process.env.UW_API_KEY;
  const avKey = process.env.ALPHA_VANTAGE_API_KEY;
  const newsKey = process.env.NEWS_API_KEY;
  
  console.log(`   Unusual Whales: ${uwKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Alpha Vantage:  ${avKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   News API:       ${newsKey ? '✅ Configured' : '❌ Missing'}`);
  
  if (!uwKey) {
    console.log('\n💡 To enable real GEX and options data:');
    console.log('   1. Get an API key from https://unusualwhales.com/');
    console.log('   2. Set environment variable: UW_API_KEY=your_key_here');
  }
  
  if (!avKey) {
    console.log('\n💡 To enable real price and fundamentals data:');
    console.log('   1. Get a free API key from https://www.alphavantage.co/');
    console.log('   2. Set environment variable: ALPHA_VANTAGE_API_KEY=your_key_here');
  }
}

async function enableRealData() {
  const config = await getCurrentConfig();
  
  config.useRealData = true;
  config.dataSources = {
    gexData: 'real',
    priceData: 'real',
    newsData: 'real',
    analystData: 'real',
    insiderData: 'real'
  };
  
  await saveConfig(config);
  console.log('✅ Real data sources enabled');
  console.log('📊 The system will now attempt to use live API data');
  console.log('⚠️  If API keys are missing, it will fallback to simulated data');
}

async function enableSimulatedData() {
  const config = await getCurrentConfig();
  
  config.useRealData = false;
  config.dataSources = {
    gexData: 'simulated',
    priceData: 'simulated',
    newsData: 'simulated',
    analystData: 'simulated',
    insiderData: 'simulated'
  };
  
  await saveConfig(config);
  console.log('✅ Simulated data sources enabled');
  console.log('🎭 The system will use mock data for testing and demo purposes');
}

async function showStatus() {
  const config = await getCurrentConfig();
  
  console.log('\n📊 Current Intelligence Configuration:');
  console.log(`   Real Data Mode: ${config.useRealData ? '✅ Enabled' : '❌ Disabled'}`);
  console.log('\n📈 Data Sources:');
  console.log(`   GEX Data:      ${config.dataSources.gexData}`);
  console.log(`   Price Data:    ${config.dataSources.priceData}`);
  console.log(`   News Data:     ${config.dataSources.newsData}`);
  console.log(`   Analyst Data:  ${config.dataSources.analystData}`);
  console.log(`   Insider Data:  ${config.dataSources.insiderData}`);
  
  await checkApiKeys();
}

async function main() {
  // Load .env file first
  await loadEnvFile();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🧠 Intelligence Data Configuration Tool\n');
  
  switch (command) {
    case 'enable-real':
      await enableRealData();
      break;
    case 'enable-simulated':
      await enableSimulatedData();
      break;
    case 'status':
      await showStatus();
      break;
    case 'check-keys':
      await checkApiKeys();
      break;
    default:
      console.log('Usage:');
      console.log('  node configure-intelligence.mjs status           - Show current configuration');
      console.log('  node configure-intelligence.mjs enable-real      - Enable real API data');
      console.log('  node configure-intelligence.mjs enable-simulated - Enable simulated data');
      console.log('  node configure-intelligence.mjs check-keys       - Check API key status');
      console.log('\nCurrent status:');
      await showStatus();
      break;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
