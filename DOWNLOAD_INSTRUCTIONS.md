# Quick Start: Barchart Excel Data Download

## 🎯 What You Need
Your 2-week Barchart Excel subscription gives you access to historical data that will power your trading system's machine learning models and market intelligence.

## 📋 Quick Download Checklist

### Step 1: Login to Barchart
- Go to [barchart.com](https://www.barchart.com)
- Login with your subscription credentials
- Navigate to "Excel" or "Data Export" section

### Step 2: Download Priority Data (Start Here)
**Historical Stock Data** - Download these symbols first:
```
SPY, QQQ, IWM, AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META, AMD, NFLX
```

**Date Range**: January 1, 2023 to present
**Required Columns**: Symbol, Date, Open, High, Low, Close, Volume, Adj Close

### Step 3: Save Files
Save as CSV with these exact names:
- `barchart_historical_YYYYMMDD.csv` (e.g., `barchart_historical_20250802.csv`)
- `barchart_options_YYYYMMDD.csv` (for options data)

## 🚀 Import Into Trading System

### Method 1: Web Interface (Easiest)
1. Open your trading system
2. Go to "Watchlist & Intelligence" page
3. Click "Import CSV" button
4. Select your downloaded CSV file
5. System automatically processes and validates

### Method 2: Direct Upload
1. Place CSV files in the `uploads/` folder
2. Use the import endpoints:
```bash
curl -X POST http://localhost:5000/api/data/import/historical \
  -H "Content-Type: application/json" \
  -d '{"filePath": "uploads/barchart_historical_20250802.csv"}'
```

## 📊 Barchart Download Settings

### For Historical Data:
- **Data Type**: Historical Prices
- **Frequency**: Daily
- **Fields**: OHLCV + Adjusted Close
- **Format**: CSV
- **Include**: Market Cap, Sector (if available)

### For Options Data:
- **Data Type**: Options Chains
- **Symbols**: SPY, QQQ, AAPL, MSFT, TSLA (high volume only)
- **Fields**: Strike, Expiry, Type, Bid, Ask, Volume, OI, IV, Greeks
- **Date Range**: Last 30 days

## ✅ Verification
After import, check:
1. Watchlist shows your symbols
2. GEX levels calculate properly
3. Market intelligence data updates
4. No error messages in import logs

## 🔧 Templates Available
Use these as reference for your downloads:
- `data/excel_templates/barchart_historical_template.csv`
- `data/excel_templates/barchart_options_template.csv`
- `data/excel_templates/watchlist_template.csv`

Your system will automatically handle data validation, GEX calculations, and market intelligence processing once the data is imported!