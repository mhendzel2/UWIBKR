#!/usr/bin/env node
// Test current live API processing
import fetch from 'node-fetch';

async function testLiveAPI() {
  try {
    console.log('🔍 Testing live server API endpoints...');
    
    // Test if the server is running
    const response = await fetch('http://localhost:5001/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ Server is running on port 5001');
      
      // Test options flow endpoint
      try {
        const flowResponse = await fetch('http://localhost:5001/api/flow-alerts', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (flowResponse.ok) {
          const flowData = await flowResponse.text();
          console.log('📊 Flow alerts endpoint response:', flowData.substring(0, 200) + '...');
        } else {
          console.log('❌ Flow alerts endpoint not responding:', flowResponse.status);
        }
      } catch (flowErr) {
        console.log('⚠️ Flow alerts endpoint error:', flowErr.message);
      }
      
    } else {
      console.log('❌ Server not responding:', response.status);
    }
    
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    console.log('ℹ️ Server might not be running on port 5001');
  }
}

testLiveAPI().catch(console.error);
