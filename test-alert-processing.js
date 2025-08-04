#!/usr/bin/env node
// Test the current alert processing pipeline
import fetch from 'node-fetch';

async function testAlertProcessing() {
  try {
    console.log('🔍 Testing current alert processing...');
    
    // Get flow alerts (raw data)
    const rawResponse = await fetch('http://localhost:5001/api/flow-alerts');
    const rawData = await rawResponse.text();
    
    // Parse and analyze first few alerts
    const alerts = rawData.split('\r\n').filter(line => line.trim());
    console.log(`📊 Raw alerts count: ${alerts.length}`);
    
    if (alerts.length > 0) {
      // Parse first alert to see structure
      const firstAlert = alerts[0];
      console.log('🔍 First alert sample:');
      console.log(firstAlert.substring(0, 200) + '...');
      
      // Try to get processed signals
      try {
        const signalsResponse = await fetch('http://localhost:5001/api/signals');
        const signalsData = await signalsResponse.json();
        console.log('📈 Processed signals:', JSON.stringify(signalsData, null, 2));
      } catch (signalsErr) {
        console.log('⚠️ Signals endpoint error:', signalsErr.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing alerts:', error.message);
  }
}

testAlertProcessing().catch(console.error);
