import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importCSVToWatchlist() {
  try {
    // Read the CSV file
    const csvPath = path.join(__dirname, 'data', 'ai-watchlist-intraday.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    // Parse CSV content
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    
    console.log('CSV Headers:', headers);
    console.log(`Found ${lines.length - 1} symbols in CSV`);
    
    // Extract symbols (first column after header)
    const symbols = [];
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',');
      const symbol = columns[0];
      if (symbol && symbol.trim()) {
        symbols.push(symbol.trim());
      }
    }
    
    console.log('Extracted symbols:', symbols);
    console.log(`Total symbols to import: ${symbols.length}`);
    
    // Prepare the request to add all symbols to the new watchlist
    const watchlistId = 'watchlist_1754292526294_t6nlgw0id'; // AI Intraday Watchlist
    const requestBody = {
      symbols: symbols
    };
    
    console.log('Making API request to add symbols to watchlist...');
    
    // Use fetch to make the API call
    const response = await fetch(`http://localhost:5001/api/watchlist/watchlists/${watchlistId}/symbols`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Successfully imported all symbols to watchlist!');
      console.log(`Watchlist now contains ${result.symbols.length} symbols`);
      console.log('Symbols in watchlist:', result.symbols.map(s => s.symbol));
    } else {
      const error = await response.text();
      console.error('❌ Failed to import symbols:', error);
    }
    
  } catch (error) {
    console.error('❌ Error during CSV import:', error);
  }
}

// Run the import
importCSVToWatchlist();
