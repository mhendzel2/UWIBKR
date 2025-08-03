# Deployment Guide - AI Trading Platform

## 🚀 Production Deployment Options

### Option 1: Replit Deployment (Recommended)
The easiest way to deploy this application is directly on Replit:

1. **Import Project**
   - Upload the `ai-trading-platform-complete.tar.gz` to a new Replit
   - Extract and configure environment variables

2. **Configure Secrets**
   - Go to the Secrets tab in Replit
   - Add all required API keys and database configuration

3. **Database Setup**
   - Use Replit's PostgreSQL add-on or external database
   - Run `npm run db:push` to initialize schema

4. **Deploy**
   - Click the Deploy button in Replit
   - Your app will be available at a `.replit.app` domain

### Option 2: Cloud Platforms

#### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
```

#### Heroku Deployment
```bash
# Create Heroku app
heroku create your-trading-app

# Configure database
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set GEMINI_API_KEY=your_key_here
heroku config:set UNUSUAL_WHALES_API_KEY=your_key_here

# Deploy
git push heroku main
```

#### Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway deploy

# Configure environment variables in Railway dashboard
```

## 🔧 Environment Configuration

### Required Environment Variables

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
PGHOST=your_pg_host
PGPORT=5432
PGUSER=your_pg_user
PGPASSWORD=your_pg_password
PGDATABASE=your_database_name

# AI Services
GEMINI_API_KEY=your_gemini_key_here

# Market Data APIs
UNUSUAL_WHALES_API_KEY=your_unusual_whales_key_here
OPENFDA_API_KEY=your_fda_key_here

# Trading Platform (for live trading)
IBKR_HOST=127.0.0.1
IBKR_PORT=7497
IBKR_CLIENT_ID=1

# Application Settings
NODE_ENV=production
PORT=5000
```

### API Key Setup Instructions

#### 1. Google Gemini API Key
- Visit: https://ai.google.dev
- Create new API key
- Add billing information for usage
- Cost varies by model usage

#### 2. Unusual Whales API Key
- Visit: https://unusualwhales.com/api
- Sign up for API access
- Choose appropriate tier based on usage needs
- Cost: Starting at $49/month for basic tier

#### 3. OpenFDA API Key
- Visit: https://open.fda.gov/apis/authentication/
- Register for API key (free)
- Rate limits: 1000 requests per minute

#### 4. Interactive Brokers Setup
- Download TWS or IB Gateway
- Configure API settings:
  - Enable API connections
  - Set trusted IP addresses
  - Configure port (default 7497 for TWS, 4001 for Gateway)

## 🗄️ Database Setup

### PostgreSQL Configuration

#### Local Development
```bash
# Install PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql

# Create database
createdb trading_platform

# Set connection string
export DATABASE_URL="postgresql://username:password@localhost:5432/trading_platform"
```

#### Cloud Database Options

1. **Neon (Recommended)**
   - Visit: https://neon.tech
   - Create new project
   - Copy connection string to DATABASE_URL

2. **Supabase**
   - Visit: https://supabase.com
   - Create new project
   - Use provided PostgreSQL connection details

3. **PlanetScale**
   - Visit: https://planetscale.com
   - Create MySQL database (adjust schema accordingly)

### Schema Migration
```bash
# After setting DATABASE_URL
npm run db:push

# Verify tables created
npm run db:studio
```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] All API keys stored in environment variables (never in code)
- [ ] Database connection uses SSL in production
- [ ] CORS properly configured for your domain
- [ ] Rate limiting enabled on API endpoints
- [ ] Authentication implemented for sensitive routes
- [ ] Regular security updates for dependencies
- [ ] Monitoring and logging configured

### Recommended Security Headers
```javascript
// Add to your Express app
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

## 📊 Monitoring & Performance

### Application Monitoring
- Set up error tracking (Sentry, LogRocket)
- Monitor API rate limits and usage
- Track database performance
- Monitor memory and CPU usage

### Trading-Specific Monitoring
- Real-time position tracking
- Risk metrics monitoring
- Signal generation performance
- Execution latency tracking

### Recommended Monitoring Tools
- **APM**: New Relic, Datadog, or AppSignal
- **Error Tracking**: Sentry
- **Logs**: LogDNA or Papertrail
- **Uptime**: UptimeRobot or Pingdom

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check connection
npx drizzle-kit studio

# Verify environment variables
echo $DATABASE_URL
```

#### API Rate Limiting
- Monitor API usage dashboards
- Implement exponential backoff
- Cache responses where appropriate

#### Memory Issues
- Monitor Node.js heap usage
- Implement connection pooling
- Optimize database queries

#### WebSocket Connection Issues
- Check firewall settings
- Verify WebSocket support in deployment platform
- Implement reconnection logic

### Performance Optimization

#### Database Optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_options_ticker ON options_flow(ticker);
CREATE INDEX idx_signals_timestamp ON signals(created_at);
```

#### Caching Strategy
- Implement Redis for session storage
- Cache frequently accessed market data
- Use CDN for static assets

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run test
      - name: Deploy to production
        run: # Your deployment script
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Use load balancers for multiple instances
- Implement stateless session management
- Database read replicas for query scaling

### Vertical Scaling
- Monitor resource usage patterns
- Upgrade instance sizes based on demand
- Implement auto-scaling policies

### Microservices Migration
For high-scale deployments, consider breaking into:
- User management service
- Signal generation service
- Risk management service
- Market data service
- Execution service

---

## 🆘 Support & Maintenance

### Regular Maintenance Tasks
- [ ] Monitor API key usage and limits
- [ ] Update dependencies monthly
- [ ] Review and rotate API keys quarterly
- [ ] Backup database regularly
- [ ] Monitor trading performance metrics
- [ ] Update risk management parameters

### Getting Help
- Check application logs first
- Verify all environment variables are set
- Test API endpoints individually
- Review database connection and schema
- Ensure all external services are accessible

Remember: Trading involves financial risk. Always test thoroughly in a paper trading environment before deploying to production with real money.