import fetch from 'node-fetch';

const API_KEY = process.env.UNUSUAL_WHALES_API_KEY || "30e244d5-9ed0-4fa4-941d-5c9c9cebcb63";
const BASE_URL = "https://api.unusualwhales.com/api";

async function testAPI() {
    console.log("🧪 Testing UnusualWhales API...");
    console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 8) + '...' : 'NOT FOUND'}`);
    
    // Test 1: Basic API connectivity
    try {
        console.log("\n📡 Test 1: Basic connectivity test...");
        const response = await fetch(`${BASE_URL}/market/market-tide`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Response Status: ${response.status}`);
        console.log(`Response Headers:`, Object.fromEntries(response.headers));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API Error: ${response.status} - ${errorText}`);
            return;
        }
        
        const data = await response.json();
        console.log(`✅ Market Tide Data:`, data);
        
    } catch (error) {
        console.error("❌ Basic connectivity failed:", error.message);
        return;
    }
    
    // Test 2: Flow alerts with minimal filters
    try {
        console.log("\n📡 Test 2: Flow alerts with minimal filters...");
        const params = new URLSearchParams({
            'min_premium': '100000',  // Lower threshold
            'min_dte': '1'           // Any DTE
        });
        
        const response = await fetch(`${BASE_URL}/option-trades/flow-alerts?${params}`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Flow Alerts Status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Flow Alerts Error: ${response.status} - ${errorText}`);
            return;
        }
        
        const data = await response.json();
        console.log(`✅ Flow Alerts Count: ${data.data ? data.data.length : 0}`);
        if (data.data && data.data.length > 0) {
            console.log("Sample alert:", data.data[0]);
        }
        
    } catch (error) {
        console.error("❌ Flow alerts test failed:", error.message);
    }
    
    // Test 3: Check rate limit headers
    try {
        console.log("\n📡 Test 3: Rate limit check...");
        const response = await fetch(`${BASE_URL}/market/total-options-volume`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log("Rate Limit Headers:");
        console.log(`  x-uw-req-per-minute-remaining: ${response.headers.get('x-uw-req-per-minute-remaining')}`);
        console.log(`  x-uw-daily-req-count: ${response.headers.get('x-uw-daily-req-count')}`);
        console.log(`  x-uw-daily-req-limit: ${response.headers.get('x-uw-daily-req-limit')}`);
        
    } catch (error) {
        console.error("❌ Rate limit check failed:", error.message);
    }
}

testAPI();
