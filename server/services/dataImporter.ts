import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'fast-csv';
import { storage } from '../storage';

export interface HistoricalData {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}

export interface OptionsData {
  symbol: string;
  date: string;
  strike: number;
  expiry: string;
  type: 'call' | 'put';
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface GEXData {
  symbol: string;
  date: string;
  totalGamma: number;
  callGamma: number;
  putGamma: number;
  netGamma: number;
  gammaFlip: number;
  supportLevel: number;
  resistanceLevel: number;
  gexScore: number;
}

export interface WatchlistItem {
  symbol: string;
  sector?: string;
  marketCap?: number;
  avgVolume?: number;
  enabled: boolean;
  gexTracking: boolean;
  lastUpdated: string;
}

export class DataImporter {
  private uploadsDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async importHistoricalDataFromCSV(filePath: string): Promise<{success: boolean, imported: number, errors: string[]}> {
    const results: HistoricalData[] = [];
    const errors: string[] = [];

    return new Promise((resolve) => {
      fs.createReadStream(filePath)
        .pipe(csv.parse({ headers: true }))
        .on('data', (row) => {
          try {
            // Handle Barchart Excel format
            const data: HistoricalData = {
              symbol: row['Symbol'] || row['symbol'] || row['SYMBOL'],
              date: this.parseDate(row['Date'] || row['date'] || row['DATE']),
              open: parseFloat(row['Open'] || row['open'] || row['OPEN']),
              high: parseFloat(row['High'] || row['high'] || row['HIGH']),
              low: parseFloat(row['Low'] || row['low'] || row['LOW']),
              close: parseFloat(row['Close'] || row['close'] || row['CLOSE']),
              volume: parseInt(row['Volume'] || row['volume'] || row['VOLUME']),
              adjustedClose: parseFloat(row['Adj Close'] || row['adj_close'] || row['ADJUSTED_CLOSE'])
            };

            if (this.validateHistoricalData(data)) {
              results.push(data);
            } else {
              errors.push(`Invalid data row: ${JSON.stringify(row)}`);
            }
          } catch (error) {
            errors.push(`Error parsing row: ${error.message}`);
          }
        })
        .on('end', async () => {
          try {
            // Store data in database or file system for ML training
            await this.storeHistoricalData(results);
            resolve({ success: true, imported: results.length, errors });
          } catch (error) {
            errors.push(`Storage error: ${error.message}`);
            resolve({ success: false, imported: 0, errors });
          }
        })
        .on('error', (error) => {
          errors.push(`CSV parsing error: ${error.message}`);
          resolve({ success: false, imported: 0, errors });
        });
    });
  }

  async importOptionsDataFromCSV(filePath: string): Promise<{success: boolean, imported: number, errors: string[]}> {
    const results: OptionsData[] = [];
    const errors: string[] = [];

    return new Promise((resolve) => {
      fs.createReadStream(filePath)
        .pipe(csv.parse({ headers: true }))
        .on('data', (row) => {
          try {
            const data: OptionsData = {
              symbol: row['Symbol'] || row['Underlying'],
              date: this.parseDate(row['Date'] || row['Trade Date']),
              strike: parseFloat(row['Strike'] || row['Strike Price']),
              expiry: this.parseDate(row['Expiry'] || row['Expiration']),
              type: (row['Type'] || row['Call/Put']).toLowerCase() === 'call' ? 'call' : 'put',
              bid: parseFloat(row['Bid'] || row['Bid Price']),
              ask: parseFloat(row['Ask'] || row['Ask Price']),
              volume: parseInt(row['Volume'] || row['Trade Volume']),
              openInterest: parseInt(row['Open Interest'] || row['OI']),
              impliedVolatility: parseFloat(row['IV'] || row['Implied Volatility']),
              delta: parseFloat(row['Delta']),
              gamma: parseFloat(row['Gamma']),
              theta: parseFloat(row['Theta']),
              vega: parseFloat(row['Vega'])
            };

            if (this.validateOptionsData(data)) {
              results.push(data);
            } else {
              errors.push(`Invalid options data row: ${JSON.stringify(row)}`);
            }
          } catch (error) {
            errors.push(`Error parsing options row: ${error.message}`);
          }
        })
        .on('end', async () => {
          try {
            await this.storeOptionsData(results);
            resolve({ success: true, imported: results.length, errors });
          } catch (error) {
            errors.push(`Options storage error: ${error.message}`);
            resolve({ success: false, imported: 0, errors });
          }
        })
        .on('error', (error) => {
          errors.push(`Options CSV parsing error: ${error.message}`);
          resolve({ success: false, imported: 0, errors });
        });
    });
  }

  async importWatchlistFromCSV(filePath: string): Promise<{success: boolean, imported: number, errors: string[]}> {
    const results: WatchlistItem[] = [];
    const errors: string[] = [];

    return new Promise((resolve) => {
      fs.createReadStream(filePath)
        .pipe(csv.parse({ headers: true }))
        .on('data', (row) => {
          try {
            const item: WatchlistItem = {
              symbol: (row['Symbol'] || row['Ticker'] || row['SYMBOL']).toUpperCase(),
              sector: row['Sector'] || row['Industry'],
              marketCap: parseFloat(row['Market Cap'] || row['MarketCap']) || undefined,
              avgVolume: parseInt(row['Avg Volume'] || row['AvgVolume']) || undefined,
              enabled: (row['Enabled'] || 'true').toLowerCase() === 'true',
              gexTracking: (row['GEX Tracking'] || row['GEX'] || 'true').toLowerCase() === 'true',
              lastUpdated: new Date().toISOString()
            };

            if (item.symbol && item.symbol.length > 0) {
              results.push(item);
            } else {
              errors.push(`Invalid symbol in row: ${JSON.stringify(row)}`);
            }
          } catch (error) {
            errors.push(`Error parsing watchlist row: ${error.message}`);
          }
        })
        .on('end', async () => {
          try {
            await this.storeWatchlist(results);
            resolve({ success: true, imported: results.length, errors });
          } catch (error) {
            errors.push(`Watchlist storage error: ${error.message}`);
            resolve({ success: false, imported: 0, errors });
          }
        })
        .on('error', (error) => {
          errors.push(`Watchlist CSV parsing error: ${error.message}`);
          resolve({ success: false, imported: 0, errors });
        });
    });
  }

  async downloadBarchartData(symbols: string[], startDate: string, endDate: string): Promise<string> {
    // Generate instructions for manual Barchart Excel download
    const instructions = `
BARCHART EXCEL DATA DOWNLOAD INSTRUCTIONS:

1. Log into your Barchart account (barchart.com)
2. Navigate to Excel Add-in or Data Export section
3. Configure download parameters:
   - Symbols: ${symbols.join(', ')}
   - Start Date: ${startDate}
   - End Date: ${endDate}
   - Data Type: Historical OHLCV + Options Data
   - Include: Open, High, Low, Close, Volume, Adjusted Close
   - Options: Include Greeks (Delta, Gamma, Theta, Vega)

4. Download Format: CSV
5. Save files to: ${this.uploadsDir}
6. Name format: 
   - Historical: barchart_historical_YYYYMMDD.csv
   - Options: barchart_options_YYYYMMDD.csv

7. After download, use the /api/data/import endpoint to process files

RECOMMENDED WATCHLIST SYMBOLS FOR GEX TRACKING:
- SPY, QQQ, IWM (ETFs)
- AAPL, MSFT, GOOGL, AMZN, TSLA (Mega caps)
- NVDA, AMD, META, NFLX (High vol tech)
- JPM, BAC, XLF (Financials)
- Energy: XLE, CVX, XOM
- Custom symbols from your analysis

Files should include these columns:
Historical Data: Symbol, Date, Open, High, Low, Close, Volume, Adj Close
Options Data: Symbol, Date, Strike, Expiry, Type, Bid, Ask, Volume, Open Interest, IV, Delta, Gamma, Theta, Vega
`;

    const instructionsPath = path.join(this.uploadsDir, 'barchart_download_instructions.txt');
    fs.writeFileSync(instructionsPath, instructions);
    
    return instructionsPath;
  }

  private parseDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Handle various date formats from Barchart
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Try MM/DD/YYYY format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1])).toISOString().split('T')[0];
      }
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  }

  private validateHistoricalData(data: HistoricalData): boolean {
    return !!(data.symbol && data.date && 
             !isNaN(data.open) && !isNaN(data.high) && 
             !isNaN(data.low) && !isNaN(data.close) && 
             !isNaN(data.volume));
  }

  private validateOptionsData(data: OptionsData): boolean {
    return !!(data.symbol && data.date && data.strike && 
             data.expiry && data.type && 
             !isNaN(data.bid) && !isNaN(data.ask));
  }

  private async storeHistoricalData(data: HistoricalData[]): Promise<void> {
    const filePath = path.join(this.uploadsDir, `historical_data_${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Stored ${data.length} historical records to ${filePath}`);
  }

  private async storeOptionsData(data: OptionsData[]): Promise<void> {
    const filePath = path.join(this.uploadsDir, `options_data_${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Stored ${data.length} options records to ${filePath}`);
  }

  private async storeWatchlist(items: WatchlistItem[]): Promise<void> {
    const filePath = path.join(this.uploadsDir, `watchlist_${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    console.log(`Stored ${items.length} watchlist items to ${filePath}`);
  }

  async getStoredData(): Promise<{
    historical: string[],
    options: string[],
    watchlists: string[]
  }> {
    const files = fs.readdirSync(this.uploadsDir);
    
    return {
      historical: files.filter(f => f.includes('historical')),
      options: files.filter(f => f.includes('options')),
      watchlists: files.filter(f => f.includes('watchlist'))
    };
  }

  async loadDataForTraining(type: 'historical' | 'options'): Promise<any[]> {
    const files = fs.readdirSync(this.uploadsDir);
    const dataFiles = files.filter(f => f.includes(type));
    
    let allData = [];
    for (const file of dataFiles) {
      const filePath = path.join(this.uploadsDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      allData = allData.concat(data);
    }
    
    return allData;
  }
}

export const dataImporter = new DataImporter();