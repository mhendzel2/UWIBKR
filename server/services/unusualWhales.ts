interface UnusualWhalesConfig {
  apiKey: string;
  baseUrl: string;
}

interface FlowAlert {
  ticker: string;
  total_premium: number;
  total_size: number;
  open_interest: number;
  alert_rule: string;
  ask_side_percentage: number;
  underlying_price: number;
  strike: number;
  expiry: string;
  option_type: string;
  dte: number;
}

interface GammaExposure {
  strike: number;
  call_gamma_exposure: number;
  put_gamma_exposure: number;
  net_gamma_exposure: number;
}

interface StockState {
  close: string;
  high: string;
  low: string;
  open: string;
  volume: string;
  price?: number; // Optional for backward compatibility
}

export class UnusualWhalesService {
  private config: UnusualWhalesConfig;
  private requestCount = 0;
  private dailyRequestCount = 0;
  private lastRequestTime = 0;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  
  // Enhanced rate limiting based on API documentation
  private readonly REQUESTS_PER_MINUTE = 120; // API allows 120 requests per minute (90 for lifetime subscribers)
  private readonly CONCURRENT_REQUESTS = 3; // Max concurrent requests
  private readonly MIN_REQUEST_INTERVAL = 500; // 0.5 second between requests (120/min = 2/sec)
  private readonly DAILY_LIMIT = 10000; // Daily request limit
  
  private activeRequests = 0;
  private requestTimes: number[] = [];

  constructor() {
    this.config = {
      apiKey: process.env.UNUSUAL_WHALES_API_KEY || process.env.UW_API_KEY || "",
      baseUrl: "https://api.unusualwhales.com/api",
    };

    if (!this.config.apiKey) {
      console.warn("Unusual Whales API key not found - using demo mode");
      this.config.apiKey = "demo-key"; // Allow for testing without key
    }

    // Reset daily count at midnight
    this.resetDailyCountAtMidnight();
  }

  private resetDailyCountAtMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.dailyRequestCount = 0;
      console.log('🔄 Daily API request count reset');
      this.resetDailyCountAtMidnight(); // Schedule next reset
    }, msUntilMidnight);
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    
    // Check daily limit
    if (this.dailyRequestCount >= this.DAILY_LIMIT) {
      console.warn(`⚠️ Daily API limit reached: ${this.dailyRequestCount}/${this.DAILY_LIMIT}`);
      return false;
    }
    
    // Check concurrent requests
    if (this.activeRequests >= this.CONCURRENT_REQUESTS) {
      return false;
    }
    
    // Check rate limiting (requests per minute)
    this.requestTimes = this.requestTimes.filter(time => now - time < 60000); // Keep last minute
    if (this.requestTimes.length >= this.REQUESTS_PER_MINUTE) {
      return false;
    }
    
    // Check minimum interval
    if (now - this.lastRequestTime < this.MIN_REQUEST_INTERVAL) {
      return false;
    }
    
    return true;
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Wait for minimum interval
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => 
        setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }
    
    // Wait for concurrent requests to clear
    while (this.activeRequests >= this.CONCURRENT_REQUESTS) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Wait for rate limit window
    this.requestTimes = this.requestTimes.filter(time => Date.now() - time < 60000);
    while (this.requestTimes.length >= this.REQUESTS_PER_MINUTE) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = 60000 - (Date.now() - oldestRequest);
      if (waitTime > 0) {
        console.log(`⏳ Rate limit hit, waiting ${Math.ceil(waitTime/1000)}s`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      this.requestTimes = this.requestTimes.filter(time => Date.now() - time < 60000);
    }
  }

  private async processRequestQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Queued request failed:', error);
        }
      }
    }
    
    this.isProcessingQueue = false;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body: any = null,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    // Check if we can make request immediately
    if (!this.canMakeRequest()) {
      // Queue the request if priority is low
      if (priority === 'low') {
        return new Promise((resolve, reject) => {
          this.requestQueue.push(async () => {
            try {
              const result = await this.makeRequest<T>(endpoint, method, body, 'high');
              resolve(result);
            } catch (error) {
              reject(error);
            }
          });
          this.processRequestQueue();
        });
      } else {
        // Wait for rate limit
        await this.waitForRateLimit();
      }
    }

    this.activeRequests++;
    const requestStartTime = Date.now();

    try {
      console.log(`📡 API Request [${this.activeRequests}/${this.CONCURRENT_REQUESTS}]: ${method} ${endpoint}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      };

      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.config.baseUrl}${endpoint}`, fetchOptions);

      clearTimeout(timeoutId);

      this.lastRequestTime = Date.now();
      this.requestCount++;
      this.dailyRequestCount++;
      this.requestTimes.push(this.lastRequestTime);

      // Log rate limit info
      const remainingRequests = response.headers.get('x-uw-req-per-minute-remaining');
      const dailyCount = response.headers.get('x-uw-daily-req-count');
      
      if (remainingRequests) {
        const remaining = parseInt(remainingRequests);
        if (remaining < 10) {
          console.warn(`⚠️ Low API requests remaining: ${remaining}/min`);
        }
      }

      console.log(`📊 API Stats: Daily: ${this.dailyRequestCount}/${this.DAILY_LIMIT}, Current: ${this.activeRequests}, Response: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
          console.warn(`🚫 Rate limited, waiting ${waitTime/1000}s before retry`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return this.makeRequest<T>(endpoint, method, body, priority); // Retry
        }
        
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const requestDuration = Date.now() - requestStartTime;
      console.log(`✅ API Success (${requestDuration}ms): ${JSON.stringify(data).substring(0, 100)}...`);
      
      return data;
    } catch (error) {
      console.error('❌ API Request failed:', error);
      throw error;
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * Fetch flow alerts with sophisticated filters for swing and LEAP opportunities
   */
  async getFlowAlerts(filters: {
    ticker?: string;
    minPremium?: number;
    minDte?: number;
    issueTypes?: string[];
    date?: string;
  } = {}): Promise<FlowAlert[]> {
    try {
      const params = new URLSearchParams();
      
      // Default filters optimized for swing/LEAP focus but more permissive
      const defaultFilters = {
        minPremium: filters.minPremium || 50000, // Reduced to $50K for more opportunities
        minDte: filters.minDte || 7, // Reduced to 7 days for more opportunities
        issueTypes: filters.issueTypes || ['Common Stock', 'ADR'], // Skip ETFs initially
        minVolumeOiRatio: 0.5 // More permissive volume/OI ratio
      };

      // Apply sophisticated filtering parameters
      if (filters.ticker) {
        params.append('ticker', filters.ticker);
      }
      
      if (filters.date) {
        params.append('date', filters.date);
      }
      
      params.append('min_premium', defaultFilters.minPremium.toString());
      params.append('min_dte', defaultFilters.minDte.toString());
      params.append('min_volume_oi_ratio', defaultFilters.minVolumeOiRatio.toString());
      
      // Add issue types if provided
      if (defaultFilters.issueTypes.length > 0) {
        defaultFilters.issueTypes.forEach(type => {
          params.append('issue_types[]', type);
        });
      }

      const endpoint = `/option-trades/flow-alerts?${params.toString()}`;
      console.log(`📡 Requesting flow alerts: ${endpoint}`);
      
      const data = await this.makeRequest<{ data: FlowAlert[] }>(endpoint);
      
      const alertCount = data.data?.length || 0;
      console.log(`✅ Fetched ${alertCount} flow alerts`);
      
      // Log some sample data for debugging
      if (alertCount > 0 && data.data) {
        console.log(`📊 Sample alerts:`);
        data.data.slice(0, 3).forEach((alert, index) => {
          console.log(`  ${index + 1}. ${alert.ticker}: $${(alert.total_premium/1000).toFixed(0)}K premium, ${alert.dte} DTE`);
        });
      }
      
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch flow alerts:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Get Friday's options flow data specifically
   */
  async getFridayOptionsFlow(): Promise<FlowAlert[]> {
    try {
      // Calculate last Friday's date
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday
      let lastFriday = new Date(today);
      
      if (dayOfWeek === 5) {
        // If today is Friday, use today
        lastFriday = today;
      } else if (dayOfWeek === 6) {
        // If today is Saturday, use yesterday
        lastFriday.setDate(today.getDate() - 1);
      } else {
        // Calculate days back to last Friday
        const daysBack = dayOfWeek === 0 ? 2 : dayOfWeek + 2; // Sunday = 2, Mon = 3, Tue = 4, Wed = 5, Thu = 6
        lastFriday.setDate(today.getDate() - daysBack);
      }
      
      const fridayDate = lastFriday.toISOString().split('T')[0]; // YYYY-MM-DD format
      console.log(`Fetching options flow for Friday: ${fridayDate}`);
      
      return await this.getFlowAlerts({
        date: fridayDate,
        minPremium: 100000, // Lower threshold for Friday analysis
        minDte: 1, // Include all expiries
      });
    } catch (error) {
      console.error('Failed to fetch Friday options flow:', error);
      return [];
    }
  }

  async getSpotExposures(ticker: string): Promise<GammaExposure[]> {
    try {
      // Use correct endpoint for gamma exposure by strike
      const data = await this.makeRequest<{ data: GammaExposure[] }>(`/gex/${ticker}`);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch spot exposures for ${ticker}:`, error);
      return [];
    }
  }

  async getStockState(ticker: string): Promise<StockState | null> {
    try {
      // Correct endpoint according to API spec
      const data = await this.makeRequest<{ data: StockState }>(`/screener/stocks/${ticker}`);
      if (data.data) {
        // Convert the close price to number and add it as price for backward compatibility
        data.data.price = parseFloat(data.data.close);
      }
      return data.data || null;
    } catch (error) {
      console.error(`Failed to fetch stock state for ${ticker}:`, error);
      return null;
    }
  }

  async getCurrentPrice(ticker: string): Promise<number | null> {
    try {
      // Try to get current price from screener endpoint (more reliable)
      try {
        const stockData = await this.makeRequest<{ data: { close: number } }>(`/screener/stocks/${ticker}`);
        if (stockData?.data?.close) {
          return parseFloat(stockData.data.close.toString());
        }
      } catch (screenerError) {
        console.log(`Screener endpoint failed for ${ticker}, trying market quote...`);
      }
      
      // Fallback to market quote endpoint
      try {
        const quoteData = await this.makeRequest<{ data: { price: number } }>(`/market/quote/${ticker}`);
        if (quoteData?.data?.price) {
          return quoteData.data.price;
        }
      } catch (quoteError) {
        console.log(`Market quote endpoint failed for ${ticker}`);
      }
      
      // Last fallback to stock state if other methods fail
      const stockState = await this.getStockState(ticker);
      if (stockState?.price) {
        return stockState.price;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to fetch current price for ${ticker}:`, error);
      return null;
    }
  }

  async getGreeks(ticker: string): Promise<any> {
    try {
      const data = await this.makeRequest<any>(`/stock/${ticker}/greeks`);
      return data.data || null;
    } catch (error) {
      console.error(`Failed to fetch Greeks for ${ticker}:`, error);
      return null;
    }
  }

  async getNewsSentiment(ticker: string): Promise<any[]> {
    try {
      const data = await this.makeRequest<{ data: any[] }>(`/news-sentiment/${ticker}`);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch news sentiment for ${ticker}:`, error);
      return [];
    }
  }

  async getAnalystRatings(ticker: string): Promise<any[]> {
    try {
      // Correct endpoint according to API spec
      const data = await this.makeRequest<{ data: any[] }>(`/analyst-ratings/${ticker}`);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch analyst ratings for ${ticker}:`, error);
      return [];
    }
  }

  async getOptionsFlow(ticker: string): Promise<any[]> {
    try {
      // Use the flow alerts endpoint for specific ticker option flow
      const data = await this.makeRequest<{ data: any[] }>(`/option-trades/flow-alerts?ticker=${ticker}`);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch options flow for ${ticker}:`, error);
      return [];
    }
  }

  async getMarketTide(): Promise<any | null> {
    try {
      // Correct endpoint according to API spec
      return await this.makeRequest<any>(`/market/market-tide`);
    } catch (error) {
      console.error('Failed to fetch market tide data:', error);
      return null;
    }
  }

  async getCustomAlerts(): Promise<any[]> {
    try {
      const data = await this.makeRequest<{ data: any[] }>('/alerts');
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch custom alerts:', error);
      return [];
    }
  }

  getRequestStats() {
    return {
      requestCount: this.requestCount,
      dailyRequestCount: this.dailyRequestCount,
      lastRequestTime: this.lastRequestTime,
    };
  }

  async getGammaExposure(symbol: string): Promise<any> {
    try {
      console.log(`Fetching gamma exposure data for ${symbol}...`);
      // Use correct endpoint for gamma exposure
      const response = await this.makeRequest<{ data: any[] }>(`/gex/${symbol}`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch gamma exposure for ${symbol}:`, error);
      throw error;
    }
  }

  // Market-wide sentiment endpoints
  async getMarketSentiment(): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>('/market/market-tide');
      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch market sentiment:', error);
      return null;
    }
  }

  async getTotalOptionsVolume(): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any[] }>('/market/total-options-volume');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch total options volume:', error);
      return [];
    }
  }

  async getSectorETFs(): Promise<any[]> {
    try {
      // Correct endpoint according to API spec
      const response = await this.makeRequest<{ data: any[] }>('/market/sectors');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch sector ETFs:', error);
      return [];
    }
  }

  // Individual stock sentiment endpoints
  async getTickerOptionsVolume(ticker: string, limit: number = 30): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data: any[] }>(`/stock/${ticker}/options-volume?limit=${limit}`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch options volume for ${ticker}:`, error);
      return [];
    }
  }

  async getNetPremiumTicks(ticker: string, date?: string): Promise<any[]> {
    try {
      const endpoint = date 
        ? `/stock/${ticker}/net-prem-ticks?date=${date}`
        : `/stock/${ticker}/net-prem-ticks`;
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch net premium ticks for ${ticker}:`, error);
      return [];
    }
  }

  async getImpliedVolatilityTermStructure(ticker: string): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data: any[] }>(`/stock/${ticker}/volatility/term-structure`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch IV term structure for ${ticker}:`, error);
      return [];
    }
  }

  async getOptionPriceLevels(ticker: string, date?: string): Promise<any[]> {
    try {
      const endpoint = date 
        ? `/stock/${ticker}/option/stock-price-levels?date=${date}`
        : `/stock/${ticker}/option/stock-price-levels`;
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch option price levels for ${ticker}:`, error);
      return [];
    }
  }

  async getVolumeOIPerExpiry(ticker: string, date?: string): Promise<any[]> {
    try {
      const endpoint = date 
        ? `/stock/${ticker}/option/volume-oi-expiry?date=${date}`
        : `/stock/${ticker}/option/volume-oi-expiry`;
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch volume/OI per expiry for ${ticker}:`, error);
      return [];
    }
  }

  async getOffLitPriceLevels(ticker: string, date?: string): Promise<any[]> {
    try {
      const endpoint = date 
        ? `/stock/${ticker}/stock-volume-price-levels?date=${date}`
        : `/stock/${ticker}/stock-volume-price-levels`;
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch off-lit price levels for ${ticker}:`, error);
      return [];
    }
  }

  async getTickerInfo(ticker: string): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>(`/stock/${ticker}/info`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch ticker info for ${ticker}:`, error);
      return null;
    }
  }

  async getOptionChains(ticker: string): Promise<string[]> {
    try {
      const response = await this.makeRequest<{ data: string[] }>(`/stock/${ticker}/option-chains`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch option chains for ${ticker}:`, error);
      return [];
    }
  }

  // Screener endpoints for market-wide sentiment
  async getStockScreener(filters: any = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      
      // Add common sentiment-related filters
      if (filters.minVolume) params.append('min_volume', filters.minVolume.toString());
      if (filters.maxVolume) params.append('max_volume', filters.maxVolume.toString());
      if (filters.minPremium) params.append('min_premium', filters.minPremium.toString());
      if (filters.minImpliedMove) params.append('min_implied_move', filters.minImpliedMove.toString());
      if (filters.minVolatility) params.append('min_volatility', filters.minVolatility.toString());
      if (filters.sectors) {
        filters.sectors.forEach((sector: string) => params.append('sectors', sector));
      }
      
      const endpoint = `/screener/stocks?${params.toString()}`;
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch stock screener data:', error);
      return [];
    }
  }

  async getOptionContractScreener(filters: any = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      
      // Add sentiment-related contract filters
      if (filters.minPremium) params.append('min_premium', filters.minPremium.toString());
      if (filters.minVolume) params.append('min_volume', filters.minVolume.toString());
      if (filters.minVolumeOiRatio) params.append('min_volume_oi_ratio', filters.minVolumeOiRatio.toString());
      if (filters.minDte) params.append('min_dte', filters.minDte.toString());
      if (filters.maxDte) params.append('max_dte', filters.maxDte.toString());
      if (filters.isOtm !== undefined) params.append('is_otm', filters.isOtm.toString());
      
      const endpoint = `/screener/option-contracts?${params.toString()}`;
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch option contract screener data:', error);
      return [];
    }
  }

  // Historical data for trend analysis
  async getHistoricalGreekExposure(ticker: string, timeframe: string = '1M'): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data: any[] }>(`/stock/${ticker}/greek-exposure?timeframe=${timeframe}`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch historical greek exposure for ${ticker}:`, error);
      return [];
    }
  }

  // FUNDAMENTAL ANALYSIS ENDPOINTS
  async getTickerFundamentals(ticker: string): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>(`/stock/${ticker}/fundamentals`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch fundamentals for ${ticker}:`, error);
      return null;
    }
  }

  async getTickerFinancials(ticker: string): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>(`/stock/${ticker}/financials`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch financials for ${ticker}:`, error);
      return null;
    }
  }

  async getEarningsCalendar(ticker?: string, date?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (ticker) params.append('ticker', ticker);
      if (date) params.append('date', date);
      
      const endpoint = params.toString() ? `/earnings/calendar?${params.toString()}` : '/earnings/calendar';
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch earnings calendar:', error);
      return [];
    }
  }

  async getInsiderTrades(ticker: string, limit: number = 50): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data: any[] }>(`/stock/${ticker}/insider-trades?limit=${limit}`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch insider trades for ${ticker}:`, error);
      return [];
    }
  }

  async getInstitutionalHoldings(ticker: string): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data: any[] }>(`/stock/${ticker}/institutional-holdings`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch institutional holdings for ${ticker}:`, error);
      return [];
    }
  }

  async getAnalystEstimates(ticker: string): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>(`/stock/${ticker}/analyst-estimates`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch analyst estimates for ${ticker}:`, error);
      return null;
    }
  }

  async getDividendHistory(ticker: string): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data: any[] }>(`/stock/${ticker}/dividends`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch dividend history for ${ticker}:`, error);
      return [];
    }
  }

  // ECONOMIC INDICATORS
  async getEconomicData(indicator: string, period?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      
      const endpoint = params.toString() 
        ? `/economic/${indicator}?${params.toString()}`
        : `/economic/${indicator}`;
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch economic data for ${indicator}:`, error);
      return [];
    }
  }

  async getTreasuryYields(): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>('/economic/treasury-yields');
      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch treasury yields:', error);
      return null;
    }
  }

  async getVIXData(): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>('/market/vix');
      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch VIX data:', error);
      return null;
    }
  }

  async getCommodityData(commodity: string): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>(`/economic/commodities/${commodity}`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch commodity data for ${commodity}:`, error);
      return null;
    }
  }

  async getCurrencyData(pair: string): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>(`/economic/currencies/${pair}`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch currency data for ${pair}:`, error);
      return null;
    }
  }

  // DARK POOL & BLOCK TRADES
  async getDarkPoolActivity(ticker: string, date?: string): Promise<any[]> {
    try {
      const endpoint = date 
        ? `/stock/${ticker}/dark-pool?date=${date}`
        : `/stock/${ticker}/dark-pool`;
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch dark pool activity for ${ticker}:`, error);
      return [];
    }
  }

  async getBlockTrades(ticker: string, date?: string): Promise<any[]> {
    try {
      const endpoint = date 
        ? `/stock/${ticker}/block-trades?date=${date}`
        : `/stock/${ticker}/block-trades`;
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch block trades for ${ticker}:`, error);
      return [];
    }
  }

  // CORRELATION & STATISTICAL ANALYSIS
  async getCorrelationMatrix(tickers: string[], period: string = '30d'): Promise<any> {
    try {
      const params = new URLSearchParams();
      tickers.forEach(ticker => params.append('tickers', ticker));
      params.append('period', period);
      
      const response = await this.makeRequest<{ data: any }>(`/analysis/correlation?${params.toString()}`);
      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch correlation matrix:', error);
      return null;
    }
  }

  async getBetaAnalysis(ticker: string, benchmark: string = 'SPY'): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>(`/stock/${ticker}/beta?benchmark=${benchmark}`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch beta analysis for ${ticker}:`, error);
      return null;
    }
  }

  // SENTIMENT & SOCIAL INDICATORS
  async getSocialSentiment(ticker: string): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>(`/stock/${ticker}/social-sentiment`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch social sentiment for ${ticker}:`, error);
      return null;
    }
  }

  async getRedditMentions(ticker: string, timeframe: string = '7d'): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data: any[] }>(`/social/reddit/${ticker}?timeframe=${timeframe}`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch Reddit mentions for ${ticker}:`, error);
      return [];
    }
  }

  async getTwitterMentions(ticker: string, timeframe: string = '7d'): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data: any[] }>(`/social/twitter/${ticker}?timeframe=${timeframe}`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch Twitter mentions for ${ticker}:`, error);
      return [];
    }
  }

  // TECHNICAL ANALYSIS INDICATORS
  async getTechnicalIndicators(ticker: string, indicators: string[] = ['RSI', 'MACD', 'SMA', 'EMA']): Promise<any> {
    try {
      const params = new URLSearchParams();
      indicators.forEach(indicator => params.append('indicators', indicator));
      
      const response = await this.makeRequest<{ data: any }>(`/stock/${ticker}/technical?${params.toString()}`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch technical indicators for ${ticker}:`, error);
      return null;
    }
  }

  async getSupportResistanceLevels(ticker: string): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>(`/stock/${ticker}/support-resistance`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch support/resistance levels for ${ticker}:`, error);
      return null;
    }
  }

  // NEW CRITICAL METHODS BASED ON OFFICIAL API SPEC
  
  /**
   * Get screener for option contracts - OFFICIAL API ENDPOINT
   */
  async getOptionContracts(filters: {
    ticker?: string;
    min_dte?: number;
    max_dte?: number;
    min_volume?: number;
    min_open_interest?: number;
    option_type?: 'call' | 'put';
    limit?: number;
  } = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
      
      const response = await this.makeRequest<{ data: any[] }>(`/screener/option-contracts?${params.toString()}`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch option contracts from screener:', error);
      return [];
    }
  }

  /**
   * Get options chain for a ticker - OFFICIAL API ENDPOINT
   */
  async getOptionsChain(ticker: string, expiry?: string): Promise<any> {
    try {
      const endpoint = expiry 
        ? `/options/chain/${ticker}?expiry=${expiry}`
        : `/options/chain/${ticker}`;
      
      const response = await this.makeRequest<{ data: any }>(endpoint);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch options chain for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get unusual options volume - OFFICIAL API ENDPOINT
   */
  async getUnusualOptionsVolume(filters: {
    min_volume_ratio?: number;
    min_premium?: number;
    limit?: number;
  } = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
      
      const response = await this.makeRequest<{ data: any[] }>(`/option-trades/unusual-volume?${params.toString()}`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch unusual options volume:', error);
      return [];
    }
  }

  // =============================================================================
  // CRITICAL MISSING METHODS - HIGH PRIORITY IMPLEMENTATION
  // =============================================================================

  // =============================================================================
  // ENHANCED METHODS - CORRECTED IMPLEMENTATIONS
  // =============================================================================

  /**
   * Get sector ETFs for rotation analysis - ENHANCED IMPLEMENTATION
   */
  async getSectorETFsEnhanced(): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data: any[] }>('/market/sector-etfs');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch enhanced sector ETFs:', error);
      // Fallback to basic sectors endpoint
      try {
        const fallback = await this.makeRequest<{ data: any[] }>('/market/sectors');
        return fallback.data || [];
      } catch (fallbackError) {
        console.error('Failed to fetch fallback sectors:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Get total options volume market overview - ENHANCED IMPLEMENTATION
   */
  async getTotalOptionsVolumeEnhanced(date?: string): Promise<any> {
    try {
      const endpoint = date ? `/market/total-options-volume?date=${date}` : '/market/total-options-volume';
      const response = await this.makeRequest<{ data: any }>(endpoint);
      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch enhanced total options volume:', error);
      return null;
    }
  }

  /**
   * Get FDA calendar for pharmaceutical events - MISSING HIGH-VALUE ENDPOINT
   */
  async getFDACalendar(filters: {
    ticker?: string;
    date_from?: string;
    date_to?: string;
    event_type?: string;
  } = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value);
        }
      });
      
      const endpoint = params.toString() ? `/market/fda-calendar?${params.toString()}` : '/market/fda-calendar';
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch FDA calendar:', error);
      return [];
    }
  }

  /**
   * Get institutional holdings for a stock - ENHANCED IMPLEMENTATION
   */
  async getInstitutionalHoldingsEnhanced(ticker: string): Promise<any[]> {
    try {
      // Try official institution ownership endpoint first
      const response = await this.makeRequest<{ data: any[] }>(`/institution/${ticker}/ownership`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch enhanced institutional holdings for ${ticker}:`, error);
      // Fallback to stock-specific endpoint
      try {
        const fallback = await this.makeRequest<{ data: any[] }>(`/stock/${ticker}/institutional-holdings`);
        return fallback.data || [];
      } catch (fallbackError) {
        console.error(`Failed to fetch fallback institutional holdings for ${ticker}:`, fallbackError);
        return [];
      }
    }
  }

  /**
   * Get latest institutional filings - MISSING HIGH-VALUE ENDPOINT
   */
  async getLatestInstitutionalFilings(limit: number = 50): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data: any[] }>(`/institution/latest_filings?limit=${limit}`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch latest institutional filings:', error);
      return [];
    }
  }

  /**
   * Get NOPE (Net Options Pricing Effect) - MISSING CRITICAL TECHNICAL ENDPOINT
   */
  async getNOPE(ticker: string): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>(`/stock/${ticker}/nope`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch NOPE for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get interpolated IV surface - MISSING ADVANCED ANALYTICS ENDPOINT
   */
  async getInterpolatedIV(ticker: string, days?: number[]): Promise<any> {
    try {
      const params = days ? `?days=${days.join(',')}` : '';
      const response = await this.makeRequest<{ data: any }>(`/stock/${ticker}/interpolated-iv${params}`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch interpolated IV for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get Greek flow analysis - MISSING ADVANCED OPTIONS ENDPOINT
   */
  async getGreekFlow(ticker: string, expiry?: string): Promise<any[]> {
    try {
      const endpoint = expiry ? `/stock/${ticker}/greek-flow/${expiry}` : `/stock/${ticker}/greek-flow`;
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch Greek flow for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get short interest data - MISSING MARKET STRUCTURE ENDPOINT
   */
  async getShortData(ticker: string): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>(`/shorts/${ticker}/data`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch short data for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get failure to deliver data - MISSING REGULATORY ENDPOINT
   */
  async getFailureToDeliver(ticker: string): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data: any[] }>(`/shorts/${ticker}/ftds`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch FTD data for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get dark pool prints - MISSING MARKET MICROSTRUCTURE ENDPOINT
   */
  async getDarkPoolPrints(ticker: string, date?: string): Promise<any[]> {
    try {
      const endpoint = date ? `/dark-pool/${ticker}/prints?date=${date}` : `/dark-pool/${ticker}/prints`;
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch dark pool prints for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get seasonality data - MISSING QUANTITATIVE ENDPOINT
   */
  async getSeasonality(ticker: string, type: 'monthly' | 'yearly' = 'monthly'): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data: any[] }>(`/seasonality/${ticker}/${type}`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch seasonality data for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get market seasonality overview - MISSING MARKET OVERVIEW ENDPOINT
   */
  async getMarketSeasonality(): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>('/seasonality/market');
      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch market seasonality:', error);
      return null;
    }
  }

  /**
   * Get ETF inflow/outflow data - MISSING ETF ANALYSIS ENDPOINT
   */
  async getETFFlows(ticker: string): Promise<any> {
    try {
      const response = await this.makeRequest<{ data: any }>(`/etfs/${ticker}/in_outflow`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to fetch ETF flows for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get net flow by expiry - MISSING ADVANCED FLOW ANALYSIS ENDPOINT
   */
  async getNetFlowByExpiry(filters: {
    ticker?: string;
    expiry?: string;
    tide_type?: string;
  } = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value);
        }
      });
      
      const endpoint = `/net-flow/expiry${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch net flow by expiry:', error);
      return [];
    }
  }

  /**
   * Get news headlines with filtering - MISSING NEWS INTEGRATION ENDPOINT
   */
  async getNewsHeadlines(filters: {
    ticker?: string;
    limit?: number;
    date_from?: string;
    date_to?: string;
  } = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
      
      const endpoint = `/news/headlines${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch news headlines:', error);
      return [];
    }
  }

  // =============================================================================
  // ALERT CONFIGURATION & CONGRESSIONAL TRADING - FINAL CRITICAL METHODS
  // =============================================================================

  /**
   * Get all configured alerts for the user - MISSING ALERT MGMT ENDPOINT
   */
  async getAlertConfigurations(): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data: any[] }>('/alerts/configuration');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch alert configurations:', error);
      return [];
    }
  }

  /**
   * Create a new alert configuration - MISSING ALERT MGMT ENDPOINT
   */
  async createAlertConfiguration(config: any): Promise<any> {
    try {
      const response = await this.makeRequest<any>('/alerts/configuration', 'POST', config);
      return response.data || null;
    } catch (error) {
      console.error('Failed to create alert configuration:', error);
      return null;
    }
  }

  /**
   * Get all triggered alerts - MISSING ALERT MGMT ENDPOINT
   */
  async getTriggeredAlerts(): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ data: any[] }>('/alerts');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch triggered alerts:', error);
      return [];
    }
  }

  /**
   * Get congressional trading data - MISSING COMPLIANCE/INSIGHTS ENDPOINT
   */
  async getCongressionalTrades(filters: {
    legislator?: string;
    ticker?: string;
    limit?: number;
  } = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const endpoint = `/congressional-trading/trades${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await this.makeRequest<{ data: any[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch congressional trades:', error);
      return [];
    }
  }
}
