const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
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

function checkApiKeys() {
  console.log('\n🔑 API Key Status:');
  
  const uwKey = process.env.UNUSUAL_WHALES_API_KEY || process.env.UW_API_KEY;
  const avKey = process.env.ALPHA_VANTAGE_API_KEY;
  const newsKey = process.env.NEWS_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  
  console.log(`   Unusual Whales: ${uwKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Alpha Vantage:  ${avKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   News API:       ${newsKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   OpenAI:         ${openaiKey ? '✅ Configured' : '❌ Missing'}`);
  
  if (uwKey) {
    console.log(`\n🎉 GREAT NEWS! Unusual Whales API key is configured!`);
    console.log(`   Key: ${uwKey.substring(0, 8)}...${uwKey.substring(uwKey.length - 4)}`);
    console.log(`   This means your system should now be able to fetch real GEX and options data.`);
  } else {
    console.log('\n💡 To enable real GEX and options data:');
    console.log('   1. Get an API key from https://unusualwhales.com/');
    console.log('   2. Add to .env file: UNUSUAL_WHALES_API_KEY=your_key_here');
  }
  
  return { uwKey, avKey, newsKey, openaiKey };
}

async function testApiConnection() {
  const keys = checkApiKeys();
  
  if (keys.uwKey) {
    console.log('\n🧪 Testing API Connection...');
    
    try {
      // Test if the server can make API calls
      const response = await fetch('http://localhost:5001/api/gex/levels');
      const data = await response.json();
      
      if (data && data.length > 0) {
        const sample = data[0];
        console.log(`   ✅ GEX API responding`);
        console.log(`   📊 Sample data for ${sample.symbol}:`);
        console.log(`      Current Price: $${sample.currentPrice?.toFixed(2)}`);
        console.log(`      Gamma Flip: $${sample.gammaFlip?.toFixed(2)}`);
        console.log(`      Call Wall: $${sample.callWall?.toFixed(2)}`);
        console.log(`      Put Wall: $${sample.putWall?.toFixed(2)}`);
        
        // Check if prices look realistic
        const price = sample.currentPrice;
        if (sample.symbol === 'SPY' && (price < 400 || price > 600)) {
          console.log(`   ⚠️  Warning: SPY price (${price}) seems unrealistic - may still be using mock data`);
        } else if (sample.symbol === 'AAPL' && (price < 150 || price > 300)) {
          console.log(`   ⚠️  Warning: AAPL price (${price}) seems unrealistic - may still be using mock data`);
        } else {
          console.log(`   ✅ Prices look realistic - likely using real data!`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error testing API: ${error.message}`);
      console.log(`   Make sure your server is running on port 5001`);
    }
  }
}

async function main() {
  console.log('🔍 UWIBKR API Key Checker\n');
  
  // Load .env file first
  loadEnvFile();
  
  // Check API keys
  await testApiConnection();
  
  console.log('\n📝 Next Steps:');
  console.log('   1. If API key is detected, restart your server to pick up the new environment');
  console.log('   2. Check your watchlist dashboard for real GEX and price data');
  console.log('   3. Look for realistic stock prices instead of random numbers');
  console.log('   4. Verify insider trades show real people instead of "Sarah Wilson"');
}

main().catch(console.error);
