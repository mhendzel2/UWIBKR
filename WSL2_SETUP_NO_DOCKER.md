# UWIBKR WSL2 Setup Guide (No Docker)

## Quick Setup

Since Docker Desktop integration isn't working, we'll use native PostgreSQL:

### 1. Run the Setup Script
```bash
# Make setup script executable and run it
chmod +x setup-dev-no-docker.sh
./setup-dev-no-docker.sh
```

### 2. Configure Environment Variables
```bash
# Edit the .env file
nano .env
```

Make sure it contains:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/uwibkr_dev"
UNUSUAL_WHALES_API_KEY="your_actual_api_key_here"
NODE_ENV="development"
PORT="3000"
```

### 3. Start Development
```bash
# Start the development server
npm run dev
```

## Manual Installation Steps

If the script fails, follow these manual steps:

### 1. Install PostgreSQL
```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo service postgresql start
```

### 2. Configure Database
```bash
# Connect as postgres user and setup database
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
ALTER USER postgres PASSWORD 'postgres';
CREATE DATABASE uwibkr_dev;
GRANT ALL PRIVILEGES ON DATABASE uwibkr_dev TO postgres;
\q
```

### 3. Install Node Dependencies
```bash
npm install
```

### 4. Run Database Migrations
```bash
npm run db:push
```

## Testing

### 1. Start Services
```bash
# Start PostgreSQL (if not running)
sudo service postgresql start

# Start development server (in another terminal)
npm run dev
```

### 2. Test the API
```bash
# Make test script executable
chmod +x test-earnings-screener.sh

# Run tests
./test-earnings-screener.sh
```

### 3. Manual API Tests
```bash
# Health check
curl http://localhost:3000/api/system/health

# Basic earnings screener test
curl "http://localhost:3000/api/earnings-screener"

# With parameters
curl "http://localhost:3000/api/earnings-screener?days=3&minVolume=500"
```

## Troubleshooting

### PostgreSQL Issues

**Check if PostgreSQL is running:**
```bash
sudo service postgresql status
```

**Start PostgreSQL:**
```bash
sudo service postgresql start
```

**Check PostgreSQL logs:**
```bash
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

**Connect to database manually:**
```bash
psql -h localhost -U postgres -d uwibkr_dev
```

### Common Issues

1. **"Connection refused" error**
   - PostgreSQL not running: `sudo service postgresql start`
   - Wrong connection string in `.env`

2. **"Authentication failed" error**
   - Check password in `.env` matches what you set
   - Reset password: `sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"`

3. **"Database does not exist" error**
   - Create database: `sudo -u postgres createdb uwibkr_dev`

4. **Port 3000 already in use**
   - Change port in `.env`: `PORT=3001`
   - Kill existing process: `sudo lsof -t -i tcp:3000 | xargs kill -9`

### Environment Variables Check
```bash
# Check if .env is loaded
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL);"
```

## Database Management Commands

```bash
# Start PostgreSQL
npm run dev:db

# Stop PostgreSQL
npm run db:stop

# Check status
npm run db:status

# Reset database (careful - deletes all data!)
npm run db:reset

# Connect to database
psql postgresql://postgres:postgres@localhost:5432/uwibkr_dev
```

## Setting Up Docker (Optional)

If you want to fix Docker Desktop integration later:

1. **Open Docker Desktop on Windows**
2. **Settings → Resources → WSL Integration**
3. **Enable integration with your Ubuntu distro**
4. **Restart Docker Desktop and WSL2**
5. **Test**: `docker --version` and `docker-compose --version`

Once Docker works, you can use:
```bash
npm run dev:setup-docker
```
