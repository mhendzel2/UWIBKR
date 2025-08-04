import fetch from 'node-fetch';

const API_KEY = process.env.UNUSUAL_WHALES_API_KEY || "30e244d5-9ed0-4fa4-941d-5c9c9cebcb63";
const BASE_URL = "https://api.unusualwhales.com/api";

console.log('🧪 Testing detailed API response structure...');

async function inspectAPIResponse() {
    try {
        console.log('Fetching flow alerts...');
        
        const params = new URLSearchParams({
            'min_premium': '50000',
            'min_dte': '1'
        });
        
        const response = await fetch(`${BASE_URL}/option-trades/flow-alerts?${params}`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        const alerts = data.data || [];
        
        console.log(`\n📊 Found ${alerts.length} alerts`);
        
        if (alerts.length > 0) {
            console.log('\n🔍 First alert structure:');
            console.log(JSON.stringify(alerts[0], null, 2));
            
            console.log('\n📋 Key fields for first 5 alerts:');
            alerts.slice(0, 5).forEach((alert, i) => {
                console.log(`\nAlert ${i + 1}: ${alert.ticker}`);
                console.log(`  - total_premium: ${alert.total_premium}`);
                console.log(`  - total_size: ${alert.total_size}`);
                console.log(`  - open_interest: ${alert.open_interest}`);
                console.log(`  - ask_side_percentage: ${alert.ask_side_percentage}`);
                console.log(`  - dte: ${alert.dte}`);
                console.log(`  - underlying_price: ${alert.underlying_price}`);
                console.log(`  - volume_oi_ratio: ${alert.volume_oi_ratio}`);
                console.log(`  - type: ${alert.type || alert.option_type}`);
                console.log(`  - volume: ${alert.volume}`);
                console.log(`  - ask_side_percentage: ${alert.ask_side_percentage}`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectAPIResponse();
