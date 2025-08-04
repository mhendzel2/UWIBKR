#!/usr/bin/env node
// Direct test of the signal processor workflow
import fetch from 'node-fetch';

async function testCurrentProcessing() {
  try {
    console.log('🔍 Testing alert processing status...');
    
    // Get raw alerts
    const response = await fetch('http://localhost:5001/api/flow-alerts');
    const alerts = await response.json();
    
    console.log(`📊 Raw alerts retrieved: ${alerts.length}`);
    
    if (alerts.length > 0) {
      // Analyze first few alerts
      const sample = alerts.slice(0, 3);
      
      for (let i = 0; i < sample.length; i++) {
        const alert = sample[i];
        console.log(`\n🔍 Alert ${i+1}: ${alert.ticker}`);
        console.log(`   Premium: $${(alert.total_premium/1000).toFixed(0)}K`);
        console.log(`   Ask Side Premium: $${((alert.total_ask_side_prem || 0)/1000).toFixed(0)}K`);
        console.log(`   Expiry: ${alert.expiry}`);
        console.log(`   Strike: ${alert.strike}`);
        console.log(`   Type: ${alert.type}`);
        console.log(`   Volume/OI: ${alert.volume_oi_ratio}`);
        
        // Calculate what our transformation would do
        const askSidePercentage = alert.total_premium > 0 ? 
          (alert.total_ask_side_prem || 0) / alert.total_premium : 0;
        
        // Calculate DTE  
        const expiryDate = new Date(alert.expiry);
        const now = new Date();
        const dte = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`   🧮 Calculated Ask %: ${(askSidePercentage*100).toFixed(1)}%`);
        console.log(`   🧮 Calculated DTE: ${dte} days`);
        
        // Check against our filters
        const passesFilters = {
          premium: alert.total_premium >= 50000,  // $50K minimum
          dte: dte >= 7,                         // 7+ days
          askSide: askSidePercentage >= 0.6      // 60%+ ask side
        };
        
        console.log(`   ✅ Filter Results:`, passesFilters);
        const wouldPass = Object.values(passesFilters).every(Boolean);
        console.log(`   🎯 Would pass all filters: ${wouldPass ? '✅ YES' : '❌ NO'}`);
      }
    }
    
    // Check stored signals
    try {
      const signalsResponse = await fetch('http://localhost:5001/api/signals');
      if (signalsResponse.ok) {
        const signals = await signalsResponse.json();
        console.log(`\n📈 Stored signals: ${signals.length || 0}`);
      } else {
        console.log('\n⚠️ Signals endpoint returned error');
      }
    } catch (e) {
      console.log('\n⚠️ Could not fetch stored signals');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCurrentProcessing().catch(console.error);
