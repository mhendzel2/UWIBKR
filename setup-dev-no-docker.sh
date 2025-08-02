#!/bin/bash

echo "🚀 Setting up UWIBKR development environment (No Docker)..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "📦 PostgreSQL not found. Installing..."
    chmod +x install-postgresql.sh
    ./install-postgresql.sh
else
    echo "✅ PostgreSQL already installed"
    
    # Start PostgreSQL service if not running
    if ! sudo service postgresql status | grep -q "online"; then
        echo "🔄 Starting PostgreSQL service..."
        sudo service postgresql start
    fi
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your UNUSUAL_WHALES_API_KEY"
    echo "   You can get this from: https://unusualwhales.com/"
fi

# Install Node.js dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

echo "📊 Running database migrations..."
npm run db:push

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env file and add your UNUSUAL_WHALES_API_KEY:"
echo "      nano .env"
echo "   2. Start the development server:"
echo "      npm run dev"
echo "   3. Test the earnings screener:"
echo "      curl \"http://localhost:3000/api/earnings-screener\""
echo ""
echo "🔧 PostgreSQL Management Commands:"
echo "   Start:  sudo service postgresql start"
echo "   Stop:   sudo service postgresql stop"
echo "   Status: sudo service postgresql status"
