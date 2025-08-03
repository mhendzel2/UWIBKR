#!/bin/bash

echo "🚀 Setting up UWIBKR local development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your UNUSUAL_WHALES_API_KEY"
    echo "   You can get this from: https://unusualwhales.com/"
fi

echo "🐘 Starting PostgreSQL database..."
docker-compose up -d postgres

echo "⏳ Waiting for database to be ready..."
until docker-compose exec postgres pg_isready -U postgres; do
    sleep 1
done

echo "📊 Running database migrations..."
npm run db:push

echo "✅ Database setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env file and add your UNUSUAL_WHALES_API_KEY"
echo "   2. Run: npm run dev"
echo "   3. Test the earnings screener at: http://localhost:3000/api/earnings-screener"
echo ""
echo "🔗 Database connection details:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: uwibkr_dev"
echo "   Username: postgres"
echo "   Password: postgres"
