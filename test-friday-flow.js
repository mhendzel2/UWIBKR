// Test script to analyze Friday's options flow data
import fs from 'fs';

async function testFridayFlow() {
  try {
    console.log('Testing TWS Connection...');
    const twsResponse = await fetch('http://localhost:5000/api/test/tws-connection');
    const twsData = await twsResponse.json();
    
    console.log('\n=== TWS CONNECTION TEST ===');
    console.log(`Status: ${twsData.success ? 'CONNECTED' : 'DISCONNECTED'}`);
    console.log(`Connected Ports: ${twsData.connectedPorts}/${twsData.totalPorts}`);
    console.log(`Recommendation: ${twsData.recommendation}`);
    
    if (twsData.tests) {
      twsData.tests.forEach(test => {
        console.log(`Port ${test.port}: ${test.isReachable ? 'CONNECTED' : 'FAILED'} (${test.responseTime}ms)`);
        if (test.error) console.log(`  Error: ${test.error}`);
      });
    }

    console.log('\nTesting Friday Options Flow...');
    const flowResponse = await fetch('http://localhost:5000/api/options-flow/friday');
    const flowData = await flowResponse.json();
    
    console.log('\n=== FRIDAY OPTIONS FLOW ANALYSIS ===');
    console.log(`Date: ${flowData.date}`);
    console.log(`Total Flows: ${flowData.totalFlows}`);
    
    if (flowData.summary) {
      console.log(`Total Premium: $${(flowData.summary.totalPremium / 1000000).toFixed(2)}M`);
      console.log(`Average Premium: $${(flowData.summary.avgPremium / 1000).toFixed(0)}K`);
      console.log(`Call/Put Ratio: ${flowData.summary.callPutRatio.toFixed(2)}`);
    }
    
    if (flowData.flows && flowData.flows.length > 0) {
      console.log('\n=== TOP 10 LARGEST FRIDAY TRADES ===');
      const sortedFlows = flowData.flows
        .sort((a, b) => (b.total_premium || 0) - (a.total_premium || 0))
        .slice(0, 10);
      
      sortedFlows.forEach((flow, index) => {
        console.log(`${index + 1}. ${flow.ticker || 'N/A'}`);
        console.log(`   Premium: $${((flow.total_premium || 0) / 1000).toFixed(0)}K`);
        console.log(`   Type: ${flow.option_type || 'N/A'} | Volume: ${flow.volume || 'N/A'}`);
        console.log(`   Strike: $${flow.strike || 'N/A'} | Expiry: ${flow.expiry || 'N/A'}`);
        console.log(`   Sentiment: ${flow.sentiment || 'N/A'}`);
        console.log('');
      });
      
      // Save detailed analysis to file
      const analysis = {
        timestamp: new Date().toISOString(),
        twsConnection: twsData,
        fridayFlow: flowData,
        largestTrades: sortedFlows
      };
      
      fs.writeFileSync('friday-flow-analysis.json', JSON.stringify(analysis, null, 2));
      console.log('Detailed analysis saved to friday-flow-analysis.json');
    } else {
      console.log('No flows data available');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testFridayFlow();