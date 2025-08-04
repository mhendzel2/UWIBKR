import type { FlowAlert } from './alertProcessor';

interface UnusualWhalesConfig {
  apiKey: string;
  baseUrl: string;
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

  async getOptionsFlow(
    params: string | {
      ticker?: string;
      min_dte?: number;
      max_dte?: number;
      min_volume?: number;
      min_premium?: number;
      issue_types?: string[];
      limit?: number;
    } = ""
  ): Promise<any[]> {
    try {
      let endpoint: string;
      if (typeof params === "string") {
        endpoint = `/options/flow/${params}`;
      } else {
        const search = new URLSearchParams();
        if (params.ticker) search.append("ticker", params.ticker);
        if (params.min_dte !== undefined) search.append("min_dte", params.min_dte.toString());
        if (params.max_dte !== undefined) search.append("max_dte", params.max_dte.toString());
        if (params.min_volume !== undefined) search.append("min_volume", params.min_volume.toString());
        if (params.min_premium !== undefined) search.append("min_premium", params.min_premium.toString());
        if (params.issue_types) {
          params.issue_types.forEach(t => search.append("issue_types[]", t));
        }
        if (params.limit !== undefined) search.append("limit", params.limit.toString());
        endpoint = `/options/flow?${search.toString()}`;
      }
      const data = await this.makeRequest<{ data: any[] }>(endpoint);
      return data.data || [];
    } catch (error) {
      console.error("Failed to fetch options flow:", error);
      return [];
    }
  }

  async getOptionsChain(ticker: string, expiry: string): Promise<any[]> {
    try {
      const endpoint = `/options/chain/${ticker}?expiry=${expiry}`;
      const data = await this.makeRequest<{ data: any[] }>(endpoint);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch options chain for ${ticker}:`, error);
      return [];
    }
  }

  async getStockQuote(ticker: string): Promise<{ price: number; volume: number } | null> {
    try {
      const data = await this.makeRequest<{ data: { price: number; volume: number } }>(`/stock/quote/${ticker}`);
      return data.data || null;
    } catch (error) {
      console.error(`Failed to fetch stock quote for ${ticker}:`, error);
      return null;
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

  async getNetFlowExpiry(params: {
    date?: string;
    moneyness?: string[];
    tide_type?: string[];
    expiration?: string[];
  } = {}): Promise<any> {
    try {
      const search = new URLSearchParams();
      if (params.date) search.append('date', params.date);
      params.moneyness?.forEach(m => search.append('moneyness', m));
      params.tide_type?.forEach(t => search.append('tide_type', t));
      params.expiration?.forEach(e => search.append('expiration', e));
      const endpoint = `/net-flow/expiry${search.toString() ? `?${search.toString()}` : ''}`;
      return await this.makeRequest<any>(endpoint);
    } catch (error) {
      console.error('Failed to fetch net flow expiry data:', error);
      return null;
    }
  }

  async getSectorTide(sector: string, date?: string): Promise<any> {
    try {
      const query = date ? `?date=${date}` : '';
      return await this.makeRequest<any>(`/market/${sector}/sector-tide${query}`);
    } catch (error) {
      console.error('Failed to fetch sector tide data:', error);
      return null;
    }
  }

  async getGroupGreekFlow(flowGroup: string, date?: string): Promise<any> {
    try {
      const encodedGroup = encodeURIComponent(flowGroup.toLowerCase());
      const query = date ? `?date=${date}` : '';
      return await this.makeRequest<any>(`/group-flow/${encodedGroup}/greek-flow${query}`);
    } catch (error) {
      console.error('Failed to fetch group greek flow data:', error);
      return null;
    }
  }

  async getEtfTide(ticker: string, date?: string): Promise<any> {
    try {
      const query = date ? `?date=${date}` : '';
      return await this.makeRequest<any>(`/market/${ticker}/etf-tide${query}`);
    } catch (error) {
      console.error('Failed to fetch ETF tide data:', error);
      return null;
    }
  }

  async getOiChange(date?: string, limit?: number, order?: string): Promise<any> {
    try {
      const search = new URLSearchParams();
      if (date) search.append('date', date);
      if (limit) search.append('limit', limit.toString());
      if (order) search.append('order', order);
      const endpoint = `/market/oi-change${search.toString() ? `?${search.toString()}` : ''}`;
      return await this.makeRequest<any>(endpoint);
    } catch (error) {
      console.error('Failed to fetch OI change data:', error);
      return null;
    }
  }

  async getTotalOptionsVolume(limit?: number): Promise<any> {
    try {
      const query = limit ? `?limit=${limit}` : '';
      return await this.makeRequest<any>(`/market/total-options-volume${query}`);
    } catch (error) {
      console.error('Failed to fetch total options volume:', error);
      return null;
    }
  }

  async getSpike(date?: string): Promise<any> {
    try {
      const query = date ? `?date=${date}` : '';
      return await this.makeRequest<any>(`/market/spike${query}`);
    } catch (error) {
      console.error('Failed to fetch SPIKE data:', error);
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

  // Additional data feed endpoints

  async getWhaleRoster(): Promise<any[]> {
    try {
      const data = await this.makeRequest<{ data: any[] }>('/whales/roster');
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch whale roster:', error);
      return [];
    }
  }

  async getOpenInterestDelta(ticker?: string): Promise<any[]> {
    try {
      const endpoint = ticker ? `/open-interest/delta/${ticker}` : '/open-interest/delta';
      const data = await this.makeRequest<{ data: any[] }>(endpoint);
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch open interest delta:', error);
      return [];
    }
  }

  async getDarkPoolScans(): Promise<any[]> {
    try {
      const data = await this.makeRequest<{ data: any[] }>('/dark-pool/alpha-scans');
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch dark pool scans:', error);
      return [];
    }
  }

  /**
   * Fetch most recent dark pool trades across the market
   */
  async getDarkpoolRecent(params: {
    limit?: number;
    date?: string;
    min_premium?: number;
    max_premium?: number;
    min_size?: number;
    max_size?: number;
    min_volume?: number;
    max_volume?: number;
  } = {}): Promise<any[]> {
    try {
      const search = new URLSearchParams();
      if (params.limit) search.append('limit', params.limit.toString());
      if (params.date) search.append('date', params.date);
      if (params.min_premium) search.append('min_premium', params.min_premium.toString());
      if (params.max_premium) search.append('max_premium', params.max_premium.toString());
      if (params.min_size) search.append('min_size', params.min_size.toString());
      if (params.max_size) search.append('max_size', params.max_size.toString());
      if (params.min_volume) search.append('min_volume', params.min_volume.toString());
      if (params.max_volume) search.append('max_volume', params.max_volume.toString());

      const endpoint = `/darkpool/recent${search.toString() ? `?${search.toString()}` : ''}`;
      const data = await this.makeRequest<{ data: any[] }>(endpoint);
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch recent darkpool trades:', error);
      return [];
    }
  }

  /**
   * Fetch dark pool trades for a specific ticker
   */
  async getDarkpoolForTicker(ticker: string, params: {
    date?: string;
    newer_than?: string;
    older_than?: string;
    min_premium?: number;
    max_premium?: number;
    min_size?: number;
    max_size?: number;
    min_volume?: number;
    max_volume?: number;
    limit?: number;
  } = {}): Promise<any[]> {
    try {
      const search = new URLSearchParams();
      if (params.date) search.append('date', params.date);
      if (params.newer_than) search.append('newer_than', params.newer_than);
      if (params.older_than) search.append('older_than', params.older_than);
      if (params.min_premium) search.append('min_premium', params.min_premium.toString());
      if (params.max_premium) search.append('max_premium', params.max_premium.toString());
      if (params.min_size) search.append('min_size', params.min_size.toString());
      if (params.max_size) search.append('max_size', params.max_size.toString());
      if (params.min_volume) search.append('min_volume', params.min_volume.toString());
      if (params.max_volume) search.append('max_volume', params.max_volume.toString());
      if (params.limit) search.append('limit', params.limit.toString());

      const endpoint = `/darkpool/${ticker}${search.toString() ? `?${search.toString()}` : ''}`;
      const data = await this.makeRequest<{ data: any[] }>(endpoint);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch darkpool trades for ${ticker}:`, error);
      return [];
    }
  }

  async detectMultiLegStrategies(ticker?: string): Promise<any[]> {
    try {
      const endpoint = ticker ? `/option-trades/multileg/${ticker}` : '/option-trades/multileg';
      const data = await this.makeRequest<{ data: any[] }>(endpoint);
      return data.data || [];
    } catch (error) {
      console.error('Failed to detect multileg strategies:', error);
      return [];
    }
  }

  // Earnings endpoints

  async getEarningsAfterhours(params: { date?: string; limit?: number; page?: number } = {}): Promise<any[]> {
    try {
      const search = new URLSearchParams();
      if (params.date) search.append('date', params.date);
      if (params.limit) search.append('limit', params.limit.toString());
      if (params.page) search.append('page', params.page.toString());
      const endpoint = `/earnings/afterhours${search.toString() ? `?${search.toString()}` : ''}`;
      const data = await this.makeRequest<{ data: any[] }>(endpoint);
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch afterhours earnings:', error);
      return [];
    }
  }

  async getEarningsPremarket(params: { date?: string; limit?: number; page?: number } = {}): Promise<any[]> {
    try {
      const search = new URLSearchParams();
      if (params.date) search.append('date', params.date);
      if (params.limit) search.append('limit', params.limit.toString());
      if (params.page) search.append('page', params.page.toString());
      const endpoint = `/earnings/premarket${search.toString() ? `?${search.toString()}` : ''}`;
      const data = await this.makeRequest<{ data: any[] }>(endpoint);
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch premarket earnings:', error);
      return [];
    }
  }

  async getHistoricalEarnings(ticker: string): Promise<any[]> {
    try {
      const data = await this.makeRequest<{ data: any[] }>(`/earnings/${ticker}`);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch historical earnings for ${ticker}:`, error);
      return [];
    }
  }

  // Insider endpoints

  async getInsiderTransactions(params: {
    ticker_symbol?: string;
    min_value?: string;
    max_value?: string;
    min_price?: string;
    max_price?: string;
    owner_name?: string;
    sectors?: string;
    industries?: string;
    min_marketcap?: string;
    max_marketcap?: string;
    market_cap_size?: string;
    min_earnings_dte?: string;
    max_earnings_dte?: string;
    min_amount?: string;
    max_amount?: string;
    is_director?: boolean;
    is_officer?: boolean;
    is_ten_percent_owner?: boolean;
    transaction_codes?: string[];
    security_ad_codes?: string[];
    limit?: number;
    page?: number;
  } = {}): Promise<any[]> {
    try {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined) return;
        if (Array.isArray(value)) {
          value.forEach(v => search.append(`${key}[]`, String(v)));
        } else {
          search.append(key, String(value));
        }
      });
      const endpoint = `/insider/transactions${search.toString() ? `?${search.toString()}` : ''}`;
      const data = await this.makeRequest<{ data: any[] }>(endpoint);
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch insider transactions:', error);
      return [];
    }
  }

  async getInsiderSectorFlow(sector: string): Promise<any[]> {
    try {
      const data = await this.makeRequest<{ data: any[] }>(`/insider/${sector}/sector-flow`);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch insider sector flow for ${sector}:`, error);
      return [];
    }
  }

  async getInsiderTickerFlow(ticker: string): Promise<any[]> {
    try {
      const data = await this.makeRequest<{ data: any[] }>(`/insider/${ticker}/ticker-flow`);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch insider ticker flow for ${ticker}:`, error);
      return [];
    }
  }

  // Institutional endpoints

  async listInstitutions(params: {
    name?: string;
    min_total_value?: number;
    max_total_value?: number;
    min_share_value?: number;
    max_share_value?: number;
    tags?: string;
    order?: string;
    order_direction?: string;
    limit?: number;
    page?: number;
  } = {}): Promise<any[]> {
    try {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) search.append(key, String(value));
      });
      const endpoint = `/institutions${search.toString() ? `?${search.toString()}` : ''}`;
      const data = await this.makeRequest<{ data: any[] }>(endpoint);
      return data.data || [];
    } catch (error) {
      console.error('Failed to list institutions:', error);
      return [];
    }
  }

  async getInstitutionActivity(name: string, params: { date?: string; limit?: number; page?: number } = {}): Promise<any[]> {
    try {
      const search = new URLSearchParams();
      if (params.date) search.append('date', params.date);
      if (params.limit) search.append('limit', params.limit.toString());
      if (params.page) search.append('page', params.page.toString());
      const endpoint = `/institution/${name}/activity${search.toString() ? `?${search.toString()}` : ''}`;
      const data = await this.makeRequest<{ data: any[] }>(endpoint);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch institutional activity for ${name}:`, error);
      return [];
    }
  }

  async getInstitutionHoldings(name: string, params: {
    date?: string;
    start_date?: string;
    end_date?: string;
    security_types?: string;
    limit?: number;
    page?: number;
    order?: string;
    order_direction?: string;
  } = {}): Promise<any[]> {
    try {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) search.append(key, String(value));
      });
      const endpoint = `/institution/${name}/holdings${search.toString() ? `?${search.toString()}` : ''}`;
      const data = await this.makeRequest<{ data: any[] }>(endpoint);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch institutional holdings for ${name}:`, error);
      return [];
    }
  }

  async getInstitutionSectors(name: string, params: { date?: string; limit?: number } = {}): Promise<any[]> {
    try {
      const search = new URLSearchParams();
      if (params.date) search.append('date', params.date);
      if (params.limit) search.append('limit', params.limit.toString());
      const endpoint = `/institution/${name}/sectors${search.toString() ? `?${search.toString()}` : ''}`;
      const data = await this.makeRequest<{ data: any[] }>(endpoint);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch institutional sector exposure for ${name}:`, error);
      return [];
    }
  }

  async getInstitutionOwnership(ticker: string, params: {
    date?: string;
    start_date?: string;
    end_date?: string;
    tags?: string;
    order?: string;
    order_direction?: string;
    limit?: number;
    page?: number;
  } = {}): Promise<any[]> {
    try {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) search.append(key, String(value));
      });
      const endpoint = `/institution/${ticker}/ownership${search.toString() ? `?${search.toString()}` : ''}`;
      const data = await this.makeRequest<{ data: any[] }>(endpoint);
      return data.data || [];
    } catch (error) {
      console.error(`Failed to fetch institutional ownership for ${ticker}:`, error);
      return [];
    }
  }

  async getLatestInstitutionFilings(params: {
    name?: string;
    date?: string;
    order?: string;
    order_direction?: string;
    limit?: number;
    page?: number;
  } = {}): Promise<any[]> {
    try {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) search.append(key, String(value));
      });
      const endpoint = `/institutions/latest_filings${search.toString() ? `?${search.toString()}` : ''}`;
      const data = await this.makeRequest<{ data: any[] }>(endpoint);
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch latest institutional filings:', error);
      return [];
    }
  }

  // Market metrics

  async getMarketCorrelations(tickers: string[], params: { interval?: string; start_date?: string; end_date?: string } = {}): Promise<any> {
    try {
      const search = new URLSearchParams();
      search.append('tickers', tickers.join(','));
      if (params.interval) search.append('interval', params.interval);
      if (params.start_date) search.append('start_date', params.start_date);
      if (params.end_date) search.append('end_date', params.end_date);
      const endpoint = `/market/correlations?${search.toString()}`;
      return await this.makeRequest<any>(endpoint);
    } catch (error) {
      console.error('Failed to fetch market correlations:', error);
      return null;
    }
  }

  // Watchlist helpers

  async getWatchlistDarkpool(tickers: string[], filters: Parameters<UnusualWhalesService['getDarkpoolForTicker']>[1] = {}) {
    const entries = await Promise.all(
      tickers.map(async t => [t, await this.getDarkpoolForTicker(t, filters)] as const)
    );
    return Object.fromEntries(entries);
  }

  async getWatchlistInsiderFlow(tickers: string[]) {
    const entries = await Promise.all(
      tickers.map(async t => [t, await this.getInsiderTickerFlow(t)] as const)
    );
    return Object.fromEntries(entries);
  }

  async getSectorRotation(): Promise<any[]> {
    try {
      const data = await this.makeRequest<{ data: any[] }>('/sector-rotation');
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch sector rotation data:', error);
      return [];
    }
  }

  async getStockData(ticker: string): Promise<any> {
    try {
      const [state, greeks, oiStrike, oiExpiry, maxPain, netPrem, news] = await Promise.allSettled([
        this.getStockState(ticker),
        this.getGreeks(ticker),
        this.makeRequest<{ data: any[] }>(`/stock/${ticker}/oi-per-strike`),
        this.makeRequest<{ data: any[] }>(`/stock/${ticker}/oi-per-expiry`),
        this.makeRequest<{ data: number }>(`/stock/${ticker}/max-pain`),
        this.makeRequest<{ data: any[] }>(`/stock/${ticker}/net-prem-ticks`),
        this.getNewsSentiment(ticker)
      ]);

      return {
        stockState: state.status === 'fulfilled' ? state.value : null,
        greeks: greeks.status === 'fulfilled' ? greeks.value : null,
        oiPerStrike: oiStrike.status === 'fulfilled' ? oiStrike.value.data || oiStrike.value : null,
        oiPerExpiry: oiExpiry.status === 'fulfilled' ? oiExpiry.value.data || oiExpiry.value : null,
        maxPain: maxPain.status === 'fulfilled' ? maxPain.value.data || maxPain.value : null,
        netPremTicks: netPrem.status === 'fulfilled' ? netPrem.value.data || netPrem.value : null,
        news: news.status === 'fulfilled' ? news.value || [] : []
      };
    } catch (error) {
      console.error(`Failed to fetch stock data for ${ticker}:`, error);
      return null;
    }
  }

  getRequestStats() {
    return {
      requestCount: this.requestCount,
      dailyRequestCount: this.dailyRequestCount,
      lastRequestTime: this.lastRequestTime,
    };
  }

  /**
   * Check API connectivity
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.makeRequest<any>('/market/vix');
      return true;
    } catch {
      return false;
    }
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
