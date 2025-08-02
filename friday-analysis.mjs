// ES Module analysis of Friday's large options trades
import fs from 'fs';

async function analyzeFridayTrades() {
  try {
    console.log('🔍 Testing TWS Connection...');
    const twsResponse = await fetch('http://localhost:5000/api/test/tws-connection');
    const twsData = await twsResponse.json();
    
    console.log('\n=== TWS CONNECTION TEST ===');
    console.log(`Status: ${twsData.success ? '✅ CONNECTED' : '❌ DISCONNECTED'}`);
    console.log(`Ports Tested: ${twsData.connectedPorts}/${twsData.totalPorts} connected`);
    console.log(`Recommendation: ${twsData.recommendation}`);

    console.log('\n🔍 Fetching Real Friday Options Flow...');
    const flowResponse = await fetch('http://localhost:5000/api/options-flow/friday');
    const flowData = await flowResponse.json();
    
    console.log('\n=== REAL FRIDAY OPTIONS FLOW ANALYSIS ===');
    console.log(`📅 Date: ${flowData.date}`);
    console.log(`📊 Total Large Flows: ${flowData.totalFlows}`);
    
    if (flowData.flows && flowData.flows.length > 0) {
      // Sort by premium value for largest trades analysis
      const sortedFlows = flowData.flows
        .map(flow => ({
          ...flow,
          premiumValue: parseFloat(flow.total_premium || '0')
        }))
        .sort((a, b) => b.premiumValue - a.premiumValue);
      
      console.log('\n🏆 TOP 10 LARGEST FRIDAY TRADES 🏆');
      console.log('=' .repeat(60));
      
      sortedFlows.slice(0, 10).forEach((flow, index) => {
        const premiumK = (flow.premiumValue / 1000).toFixed(0);
        const premiumM = (flow.premiumValue / 1000000).toFixed(2);
        
        console.log(`\n${index + 1}. 🎯 ${flow.ticker || 'N/A'} - ${flow.type?.toUpperCase() || 'N/A'}`);
        console.log(`   💰 Premium: $${premiumK}K ($${premiumM}M)`);
        console.log(`   📈 Volume: ${flow.volume?.toLocaleString() || 'N/A'} contracts`);
        console.log(`   🎯 Strike: $${flow.strike || 'N/A'} | 📅 Expiry: ${flow.expiry || 'N/A'}`);
        console.log(`   🏢 Sector: ${flow.sector || 'N/A'}`);
        console.log(`   📊 Volume/OI Ratio: ${flow.volume_oi_ratio || 'N/A'}`);
        
        if (flow.has_sweep) console.log('   🚨 SWEEP DETECTED');
        if (flow.all_opening_trades) console.log('   🆕 OPENING TRADES');
      });
      
      // Market sentiment analysis
      const calls = sortedFlows.filter(f => f.type === 'call');
      const puts = sortedFlows.filter(f => f.type === 'put');
      const totalPremium = sortedFlows.reduce((sum, f) => sum + f.premiumValue, 0);
      
      console.log('\n📈 MARKET SENTIMENT ANALYSIS');
      console.log('=' .repeat(40));
      console.log(`📞 Calls: ${calls.length} trades | 📉 Puts: ${puts.length} trades`);
      console.log(`💰 Total Premium: $${(totalPremium / 1000000).toFixed(2)}M`);
      console.log(`📊 Call/Put Ratio: ${puts.length > 0 ? (calls.length / puts.length).toFixed(2) : 'N/A'}`);
      console.log(`💵 Avg Premium: $${(totalPremium / sortedFlows.length / 1000).toFixed(0)}K`);
      
      // Sector breakdown
      const sectors = {};
      sortedFlows.forEach(flow => {
        const sector = flow.sector || 'Unknown';
        sectors[sector] = (sectors[sector] || 0) + flow.premiumValue;
      });
      
      console.log('\n🏭 TOP SECTORS BY PREMIUM');
      console.log('=' .repeat(30));
      Object.entries(sectors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([sector, premium]) => {
          console.log(`${sector}: $${(premium / 1000000).toFixed(1)}M`);
        });
      
      // Save detailed report
      const report = {
        timestamp: new Date().toISOString(),
        date: flowData.date,
        totalFlows: flowData.totalFlows,
        totalPremium: totalPremium,
        topTrades: sortedFlows.slice(0, 20),
        sectorBreakdown: sectors,
        sentiment: {
          calls: calls.length,
          puts: puts.length,
          ratio: puts.length > 0 ? calls.length / puts.length : null
        },
        twsConnection: twsData
      };
      
      fs.writeFileSync('friday-trades-report.json', JSON.stringify(report, null, 2));
      console.log('\n💾 Detailed report saved to friday-trades-report.json');
      
    } else {
      console.log('❌ No flow data available');
    }
    
  } catch (error) {
    console.error('🚨 Analysis failed:', error.message);
  }
}

analyzeFridayTrades();