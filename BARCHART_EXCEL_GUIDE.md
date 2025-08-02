# Barchart Excel Data Import Guide

## Overview
This guide will help you download historical data from your 2-week Barchart Excel subscription and import it into the trading system for machine learning training and analysis.

## Step 1: Download Data from Barchart

### Login to Barchart
1. Go to [barchart.com](https://www.barchart.com)
2. Login with your account credentials
3. Navigate to the Excel Add-in or Data Export section

### Historical Stock Data Download
1. **Symbols**: Use the watchlist symbols provided in `data/excel_templates/watchlist_template.csv`
2. **Date Range**: 
   - Start Date: 2023-01-01 (or as far back as available)
   - End Date: Current date
3. **Data Fields**: Select these columns in order:
   - Symbol
   - Date  
   - Open
   - High
   - Low
   - Close
   - Volume
   - Adjusted Close
   - Market Cap (if available)
   - Sector
   - 52 Week High
   - 52 Week Low

### Options Data Download
1. **Symbols**: Focus on high-volume symbols (SPY, QQQ, AAPL, MSFT, TSLA, NVDA)
2. **Date Range**: Last 30-60 days for current analysis
3. **Options Fields**: Select these columns:
   - Symbol (underlying)
   - Date
   - Strike Price
   - Expiration Date
   - Option Type (Call/Put)
   - Bid Price
   - Ask Price
   - Volume
   - Open Interest
   - Implied Volatility
   - Delta
   - Gamma
   - Theta
   - Vega
   - Underlying Price
   - Days to Expiry

## Step 2: Format Your Excel Files

### File Naming Convention
- Historical Data: `barchart_historical_YYYYMMDD.csv`
- Options Data: `barchart_options_YYYYMMDD.csv`
- Watchlist: `watchlist_YYYYMMDD.csv`

### Column Headers
Make sure your CSV files have headers that match the templates exactly. The system supports flexible column naming:

**Historical Data Headers (any of these variations work):**
- Symbol/symbol/SYMBOL
- Date/date/DATE
- Open/open/OPEN
- High/high/HIGH
- Low/low/LOW
- Close/close/CLOSE
- Volume/volume/VOLUME
- Adj Close/adj_close/ADJUSTED_CLOSE

**Options Data Headers:**
- Symbol/Underlying
- Date/Trade Date
- Strike/Strike Price
- Expiry/Expiration
- Type/Call/Put
- Bid/Bid Price
- Ask/Ask Price
- Volume/Trade Volume
- Open Interest/OI
- IV/Implied Volatility

## Step 3: Upload and Import Data

### Method 1: Direct File Upload
1. Save your CSV files to the `uploads/` folder in the project
2. Use the API endpoints to import:

```bash
# Import historical data
curl -X POST http://localhost:5000/api/data/import/historical \
  -H "Content-Type: application/json" \
  -d '{"filePath": "uploads/barchart_historical_20240102.csv"}'

# Import options data
curl -X POST http://localhost:5000/api/data/import/options \
  -H "Content-Type: application/json" \
  -d '{"filePath": "uploads/barchart_options_20240102.csv"}'

# Import watchlist
curl -X POST http://localhost:5000/api/data/import/watchlist \
  -H "Content-Type: application/json" \
  -d '{"filePath": "uploads/watchlist_20240102.csv"}'
```

### Method 2: Using the Web Interface
1. Navigate to the Watchlist & Intelligence page
2. Click "Import CSV" button
3. Select your CSV file
4. The system will automatically detect the data type and import

## Step 4: Verify Import

### Check Import Status
```bash
# Get import summary
curl http://localhost:5000/api/data/stored

# Verify watchlist
curl http://localhost:5000/api/watchlist

# Check GEX levels
curl http://localhost:5000/api/gex/levels
```

### View in Dashboard
1. Go to Watchlist & Intelligence page
2. Check that your symbols appear
3. Verify GEX tracking is enabled
4. View market intelligence data

## Data Structure Examples

### Historical Data Template
```csv
Symbol,Date,Open,High,Low,Close,Volume,Adj Close,Market Cap,Sector
AAPL,2024-01-02,185.64,186.95,185.00,185.64,52164400,185.64,2900000000000,Technology
MSFT,2024-01-02,374.58,375.61,372.85,374.58,17573200,374.58,2800000000000,Technology
```

### Options Data Template
```csv
Symbol,Date,Strike,Expiry,Type,Bid,Ask,Volume,Open Interest,IV,Delta,Gamma,Theta,Vega
AAPL,2024-01-02,185,2024-01-19,call,2.45,2.55,1250,5420,0.28,0.52,0.045,-0.12,0.18
AAPL,2024-01-02,185,2024-01-19,put,2.20,2.30,980,4680,0.29,-0.48,0.045,-0.12,0.18
```

### Watchlist Template
```csv
Symbol,Sector,Market Cap,Avg Volume,Enabled,GEX Tracking,Notes
AAPL,Technology,2900000000000,50000000,true,true,Mega cap tech
SPY,ETF,,60000000,true,true,S&P 500 ETF
```

## Best Practices

### Data Quality
- Ensure dates are in YYYY-MM-DD format
- Remove any rows with missing critical data (Symbol, Date, Close)
- Verify numeric fields don't contain text or special characters
- Check for duplicate entries

### Machine Learning Optimization
- Include at least 1-2 years of historical data for meaningful patterns
- Focus on liquid symbols with consistent options activity
- Include sector/industry classification for better model training
- Maintain consistent data frequency (daily recommended)

### Performance Tips
- Import data in batches if you have large datasets
- Start with core symbols (SPY, QQQ, major tech stocks)
- Update watchlist weekly with new symbols of interest
- Use the force update feature to refresh GEX calculations

## Automated Schedule
The system automatically updates watchlist data daily at 10:30 AM NY time, including:
- GEX levels and gamma exposure calculations
- Dark pool activity monitoring
- Insider trading alerts
- Analyst upgrades/downgrades
- Important news sentiment analysis

## Troubleshooting

### Common Issues
1. **Date Format Errors**: Ensure dates are in YYYY-MM-DD format
2. **Missing Headers**: CSV must have header row with correct column names
3. **Invalid Symbols**: Remove any symbols with special characters
4. **Empty Data**: Check for rows with missing critical fields

### Error Messages
- "File path is required": Provide full path to CSV file
- "Invalid data row": Check for formatting issues in specific rows
- "Symbol not found": Verify symbol format and availability

### Support
- Check the update history: `GET /api/gex/update-history`
- View current alerts: `GET /api/intelligence/alerts`
- Force manual update: `POST /api/gex/force-update`

## Next Steps
After successful import:
1. Review your watchlist in the web interface
2. Check GEX levels and key support/resistance
3. Monitor market intelligence alerts
4. Use the data for machine learning model training
5. Set up custom alerts for your trading strategy

The system now provides institutional-grade market intelligence with your Barchart historical data powering sophisticated analysis and pattern recognition.