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
  price: number;
  volume: number;
}

export class UnusualWhalesService {
  private config: UnusualWhalesConfig;
  private requestCount = 0;
  private dailyRequestCount = 0;
  private lastRequestTime = 0;

  constructor() {
    this.config = {
      apiKey: process.env.UNUSUAL_WHALES_API_KEY || process.env.UW_API_KEY || "",
      baseUrl: "https://api.unusualwhales.com/api",
    };

    if (!this.config.apiKey) {
      console.warn("Unusual Whales API key not found - using demo mode");
      this.config.apiKey = "demo-key"; // Allow for testing without key
    }
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const now = Date.now();
    
    // Rate limiting: respect API limits
    if (now - this.lastRequestTime < 1000) {
      await new Promise(resolve => setTimeout(resolve, 1000 - (now - this.lastRequestTime)));
    }

    try {
      console.log(`Making Unusual Whales API request to: ${this.config.baseUrl}${endpoint}`);
      
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      this.lastRequestTime = Date.now();
      this.requestCount++;
      this.dailyRequestCount++;

      console.log(`API Response Status: ${response.status} ${response.statusText}`);

      // Check rate limit headers
      const remainingRequests = response.headers.get('x-uw-req-per-minute-remaining');
      const dailyCount = response.headers.get('x-uw-daily-req-count');

      if (remainingRequests && parseInt(remainingRequests) < 5) {
        console.warn(`Unusual Whales API: Low request limit remaining: ${remainingRequests}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error Response: ${errorText}`);
        throw new Error(`Unusual Whales API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`API Response received: ${JSON.stringify(data).substring(0, 200)}...`);
      return data;
    } catch (error) {
      console.error('Unusual Whales API request failed:', error);
      throw error;
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
      
      // Default filters optimized for swing/LEAP focus
      const defaultFilters = {
        minPremium: filters.minPremium || 500000, // $500K minimum for institutional significance
        minDte: filters.minDte || 45, // 45+ days for swing trades, 365+ for LEAPs
        issueTypes: filters.issueTypes || ['Common Stock', 'ADR'], // Skip ETFs initially
        ruleNames: ['RepeatedHits', 'RepeatedHitsAscendingFill', 'RepeatedHitsDescendingFill'],
        minVolumeOiRatio: 1.0 // Focus on potential opening trades
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
      
      defaultFilters.issueTypes.forEach(type => {
        params.append('issue_types[]', type);
      });
      
      defaultFilters.ruleNames.forEach(rule => {
        params.append('rule_name[]', rule);
      });

      const endpoint = `/option-trades/flow-alerts?${params.toString()}`;
      console.log(`Requesting flow alerts from: ${endpoint}`);
      
      const data = await this.makeRequest<{ data: FlowAlert[] }>(endpoint);
      
      console.log(`Fetched ${data.data?.length || 0} sophisticated flow alerts`);
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch sophisticated flow alerts:', error);
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
      const data = await this.makeRequest<{ data: GammaExposure[] }>(`/stock/${ticker}/spot-exposures/strike`);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch spot exposures for ${ticker}:`, error);
      return [];
    }
  }

  async getStockState(ticker: string): Promise<StockState | null> {
    try {
      const data = await this.makeRequest<{ data: StockState }>(`/stock/${ticker}/stock-state`);
      return data.data || null;
    } catch (error) {
      console.error(`Failed to fetch stock state for ${ticker}:`, error);
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
      const data = await this.makeRequest<{ data: any[] }>(`/analysts/ratings/${ticker}`);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch analyst ratings for ${ticker}:`, error);
      return [];
    }
  }

  async getOptionsFlow(ticker: string): Promise<any[]> {
    try {
      const data = await this.makeRequest<{ data: any[] }>(`/options/flow/${ticker}`);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch options flow for ${ticker}:`, error);
      return [];
    }
  }

  async getMarketTide(): Promise<any | null> {
    try {
      return await this.makeRequest<any>(`/market-tide/`);
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
      const response = await this.makeRequest<{ data: any[] }>(`/gamma-exposure?symbol=${symbol.toUpperCase()}`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch gamma exposure for ${symbol}:`, error);
      throw error;
    }
  }
}
