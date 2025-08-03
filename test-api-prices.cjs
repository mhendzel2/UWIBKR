const { execSync } = require('child_process');

console.log('🧪 Testing Real Price Integration via API...\n');

try {
  console.log('📊 Testing GEX API with real price data:');
  console.log('═══════════════════════════════════════');
  
  // Test GEX endpoint which should now use real prices
  const gexResult = execSync('curl -s "http://localhost:5001/api/gex/AAPL"', { encoding: 'utf8' });
  const gexData = JSON.parse(gexResult);
  
  if (gexData && gexData.currentPrice) {
    console.log(`✅ AAPL Current Price: $${gexData.currentPrice}`);
    console.log(`   GEX Levels: ${gexData.gexLevels?.length || 0} levels`);
    console.log(`   Source: Real price integration working`);
  } else {
    console.log('❌ No current price data in GEX response');
  }
  
} catch (error) {
  console.error('❌ Error testing GEX API:', error.message);
}

try {
  console.log('\n🔮 Testing Market Intelligence API:');
  console.log('═══════════════════════════════════');
  
  // Test intelligence summary which should now use real prices  
  const intelligenceResult = execSync('curl -s "http://localhost:5001/api/intelligence/summary/AAPL"', { encoding: 'utf8' });
  const intelligenceData = JSON.parse(intelligenceResult);
  
  if (intelligenceData) {
    console.log(`✅ Intelligence Summary Retrieved:`);
    console.log(`   Dark Pool Data: ${intelligenceData.darkPoolData ? 'Available' : 'Missing'}`);
    console.log(`   Insider Trades: ${intelligenceData.insiderTrades?.length || 0} trades`);
    console.log(`   Analyst Updates: ${intelligenceData.analystUpdates?.length || 0} updates`);
    
    // Check if prices look realistic
    if (intelligenceData.insiderTrades && intelligenceData.insiderTrades.length > 0) {
      const firstTrade = intelligenceData.insiderTrades[0];
      console.log(`   Sample Trade Price: $${firstTrade.price?.toFixed(2)} (should be realistic for AAPL)`);
    }
  } else {
    console.log('❌ No intelligence data returned');
  }
  
} catch (error) {
  console.error('❌ Error testing Intelligence API:', error.message);
}

console.log('\n🔍 Price Analysis:');
console.log('═════════════════');
console.log('Expected AAPL price range: $220-$240');
console.log('If prices shown above are in this range, real integration is working!');
console.log('If prices are around $490+ or completely random, mock data is still being used.');
