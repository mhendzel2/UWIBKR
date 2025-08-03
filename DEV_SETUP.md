# UWIBKR Local Development Setup

## Prerequisites

1. **WSL2** (Windows Subsystem for Linux)
2. **Docker** and **Docker Compose**
3. **Node.js** (v18 or higher)
4. **npm** or **yarn**

## Quick Setup

### 1. Clone and Setup
```bash
# If you haven't already, navigate to your project directory
cd /path/to/UWIBKR

# Make setup script executable and run it
chmod +x setup-dev.sh
./setup-dev.sh
```

### 2. Configure Environment Variables
Edit the `.env` file and add your API keys:
```bash
nano .env
```

Required variables:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/uwibkr_dev"
UNUSUAL_WHALES_API_KEY="your_actual_api_key_here"
```

### 3. Start Development
```bash
# Start the development server
npm run dev
```

## Manual Setup Steps

If you prefer to set up manually:

### 1. Database Setup with Docker
```bash
# Start PostgreSQL database
docker-compose up -d postgres

# Wait for database to be ready
docker-compose exec postgres pg_isready -U postgres

# Run database migrations
npm run db:push
```

### 2. Alternative: Install PostgreSQL Directly
```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo service postgresql start

# Create database and user
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE DATABASE uwibkr_dev;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE uwibkr_dev TO postgres;
\q
```

## Testing the Earnings Screener

### 1. Start the Server
```bash
npm run dev
```

### 2. Test Endpoints

**Health Check:**
```bash
curl http://localhost:3000/api/system/health
```

**Earnings Screener (Basic):**
```bash
curl "http://localhost:3000/api/earnings-screener"
```

**Earnings Screener (With Parameters):**
```bash
curl "http://localhost:3000/api/earnings-screener?days=3&minVolume=500&minIvPercent=75&minLargeTrades=3"
```

### 3. Automated Testing
```bash
# Make test script executable and run
chmod +x test-earnings-screener.sh
./test-earnings-screener.sh
```

## Available Parameters

The earnings screener endpoint accepts these query parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `days` | 5 | Days ahead to look for earnings |
| `minVolume` | 1000 | Minimum options volume |
| `minLargeTrades` | 5 | Minimum number of large trades |
| `largeTradePremium` | 50000 | Minimum premium for "large" trades |
| `volumeMultiplier` | 3 | Volume multiplier vs 30-day average |
| `minIvPercent` | 90 | Minimum implied volatility percentage |
| `bearishRatio` | 2 | Put/call ratio threshold for bearish signals |
| `bullishRatio` | 0.5 | Put/call ratio threshold for bullish signals |

## Database Management

```bash
# Start database
npm run dev:db

# Stop database
npm run db:stop

# Reset database (deletes all data)
npm run db:reset

# Push schema changes
npm run db:push
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running: `docker-compose ps`
   - Check connection string in `.env`

2. **API Key Issues**
   - Verify `UNUSUAL_WHALES_API_KEY` is set in `.env`
   - Test API key with: `curl -H "Authorization: Bearer YOUR_KEY" https://api.unusualwhales.com/api/reference/earnings_calendar`

3. **Port Already in Use**
   - Change port in `.env`: `PORT=3001`
   - Or kill existing process: `sudo lsof -t -i tcp:3000 | xargs kill -9`

### Logs and Debugging

```bash
# View application logs
npm run dev

# View database logs
docker-compose logs postgres

# View all containers
docker-compose ps
```

## Project Structure

```
UWIBKR/
├── server/
│   ├── routes/
│   │   └── earningsScreener.ts  # Main earnings screener logic
│   ├── index.ts                 # Server entry point
│   └── routes.ts               # Route registration
├── docker-compose.yml          # Database setup
├── setup-dev.sh               # Automated setup script
├── test-earnings-screener.sh   # Test script
└── .env.example               # Environment template
```
