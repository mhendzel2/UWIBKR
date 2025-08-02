#!/bin/bash

echo "🔍 Checking environment variables..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Creating .env from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your UNUSUAL_WHALES_API_KEY"
    exit 1
fi

echo "✅ .env file found"

# Test environment loading
echo "🧪 Testing environment variable loading..."
node -e "
import 'dotenv/config';
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
console.log('UNUSUAL_WHALES_API_KEY:', process.env.UNUSUAL_WHALES_API_KEY ? '✅ Set' : '❌ Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
console.log('PORT:', process.env.PORT || 'Not set');
"

echo ""
echo "💡 If DATABASE_URL is not set, check your .env file format:"
echo "   - No spaces around = sign"
echo "   - No quotes unless needed"
echo "   - Unix line endings (LF, not CRLF)"
