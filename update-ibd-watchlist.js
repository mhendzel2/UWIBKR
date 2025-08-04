import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Your requested IBD symbols
const ibdSymbols = [
  'AEM', 'ALNY', 'AM', 'AMSC', 'ATI', 'AU', 'BE', 'BOOT', 'CAKE', 'CBOE', 
  'CCJ', 'CDNS', 'CLS', 'CR', 'CVLT', 'CVNA', 'CYBR', 'EBAY', 'EGO', 'ETR', 
  'FTAI', 'GLW', 'GNRC', 'GRMN', 'GTES', 'HOOD', 'HWM', 'ICE', 'INDV', 'ING', 
  'INOD', 'IREN', 'ITT', 'JCI', 'KGC', 'KLAC', 'LPLA', 'LRCX', 'META', 'MOD', 
  'MPWR', 'MSFT', 'MTZ', 'NET', 'NVT'
];

const watchlistsFile = path.join(__dirname, 'data', 'watchlists', 'watchlists.json');

try {
  // Read current watchlists
  const data = JSON.parse(fs.readFileSync(watchlistsFile, 'utf8'));
  
  // Find IBD watchlist
  const ibdWatchlistIndex = data.watchlists.findIndex(w => w.description === 'IBD');
  
  if (ibdWatchlistIndex === -1) {
    console.error('IBD watchlist not found!');
    process.exit(1);
  }
  
  const ibdWatchlist = data.watchlists[ibdWatchlistIndex];
  console.log(`Found IBD watchlist: ${ibdWatchlist.name} (${ibdWatchlist.id})`);
  
  // Create symbol objects for the new IBD symbols
  const newSymbols = ibdSymbols.map(symbol => ({
    symbol,
    sector: "Technology", // Default sector
    enabled: true,
    gexTracking: true,
    lastUpdated: new Date().toISOString()
  }));
  
  // Update the IBD watchlist
  ibdWatchlist.symbols = newSymbols;
  ibdWatchlist.updatedAt = new Date().toISOString();
  
  // Make IBD watchlist the active one
  data.currentWatchlistId = ibdWatchlist.id;
  
  // Save updated data
  fs.writeFileSync(watchlistsFile, JSON.stringify(data, null, 2));
  
  console.log(`✅ Updated IBD watchlist with ${ibdSymbols.length} symbols:`);
  console.log(ibdSymbols.join(', '));
  console.log(`✅ Set IBD watchlist as active: ${ibdWatchlist.id}`);
  
} catch (error) {
  console.error('Error updating IBD watchlist:', error);
  process.exit(1);
}
