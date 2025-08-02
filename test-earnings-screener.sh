#!/bin/bash

echo "🧪 Testing UWIBKR Earnings Screener..."

# Check if server is running
if ! curl -s http://localhost:3000/api/health &> /dev/null; then
    echo "❌ Server is not running. Start it with: npm run dev"
    exit 1
fi

echo "📊 Testing earnings screener endpoint..."

# Test with default parameters
echo "Testing with default parameters..."
curl -s "http://localhost:3000/api/earnings-screener" | jq '.'

echo ""
echo "Testing with custom parameters..."
curl -s "http://localhost:3000/api/earnings-screener?days=3&minVolume=500&minIvPercent=75" | jq '.'

echo ""
echo "✅ Test complete!"
