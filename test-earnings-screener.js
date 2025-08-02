import express from 'express';
import earningsScreenerRoutes from './server/routes/earningsScreener.js';

const app = express();
app.use(express.json());

// Mount just the earnings screener route for testing
app.use('/api', earningsScreenerRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Earnings Screener Test Server running on http://localhost:${PORT}`);
  console.log(`📊 Test the earnings screener at: http://localhost:${PORT}/api/earnings-screener`);
  console.log(`📋 Available query parameters:`);
  console.log(`   - days: number of days ahead to search for earnings (default: 5)`);
  console.log(`   - minVolume: minimum options volume (default: 1000)`);
  console.log(`   - minLargeTrades: minimum number of large trades (default: 5)`);
  console.log(`   - largeTradePremium: minimum premium for large trades (default: 50000)`);
  console.log(`   - volumeMultiplier: volume vs 30-day average multiplier (default: 3)`);
  console.log(`   - minIvPercent: minimum implied volatility percentage (default: 90)`);
  console.log(`   - bearishRatio: put/call ratio threshold for bearish (default: 2)`);
  console.log(`   - bullishRatio: put/call ratio threshold for bullish (default: 0.5)`);
});
