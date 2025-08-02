#!/bin/bash

echo "🧪 Testing UWIBKR Earnings Screener..."

# Check if PostgreSQL is running
if ! sudo service postgresql status | grep -q "online"; then
    echo "🔄 Starting PostgreSQL..."
    sudo service postgresql start
    sleep 2
fi

# Check if server is running
if ! curl -s http://localhost:3000/api/system/health &> /dev/null; then
    echo "❌ Server is not running. Start it with: npm run dev"
    echo "💡 In another terminal, run: npm run dev"
    exit 1
fi

echo "📊 Testing earnings screener endpoint..."

# Test with default parameters
echo "🔍 Testing with default parameters..."
response=$(curl -s "http://localhost:3000/api/earnings-screener")
if command -v jq &> /dev/null; then
    echo "$response" | jq '.'
else
    echo "$response"
fi

echo ""
echo "🔍 Testing with custom parameters..."
response=$(curl -s "http://localhost:3000/api/earnings-screener?days=3&minVolume=500&minIvPercent=75")
if command -v jq &> /dev/null; then
    echo "$response" | jq '.'
else
    echo "$response"
fi

echo ""
echo "✅ Test complete!"
echo ""
echo "💡 Tips:"
echo "   - Install jq for better JSON formatting: sudo apt install jq"
echo "   - View logs in the terminal running 'npm run dev'"
