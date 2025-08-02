import axios from 'axios';
import { UnusualWhalesService } from './unusualWhales';

interface FDAEvent {
  id: string;
  date: string;
  type: 'approval' | 'rejection' | 'warning' | 'recall' | 'inspection';
  company: string;
  drug: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
  relevantTickers: string[];
}

interface FDAAlert {
  id: string;
  ticker: string;
  event: FDAEvent;
  optionsOpportunity: {
    recommendation: 'call' | 'put';
    confidence: number;
    timeframe: string;
    reasoning: string;
  };
  timestamp: string;
}

export class FDAMonitoringService {
  private uwService: UnusualWhalesService;
  private fdaBaseUrl = 'https://api.fda.gov';
  private activeAlerts: Map<string, FDAAlert> = new Map();

  constructor() {
    this.uwService = new UnusualWhalesService();
    this.startMonitoring();
  }

  private startMonitoring() {
    // Monitor FDA events every 5 minutes
    setInterval(() => {
      this.checkFDAEvents();
    }, 5 * 60 * 1000);

    // Initial check
    this.checkFDAEvents();
  }

  private async checkFDAEvents(): Promise<void> {
    try {
      console.log('🔍 Checking FDA events for trading opportunities...');
      
      // Check multiple FDA endpoints
      await Promise.all([
        this.checkDrugApprovals(),
        this.checkDrugRecalls(),
        this.checkWarningLetters(),
        this.checkDeviceRecalls()
      ]);

    } catch (error) {
      console.error('Error checking FDA events:', error);
    }
  }

  private async checkDrugApprovals(): Promise<void> {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const searchUrl = `${this.fdaBaseUrl}/drug/drugsfda.json`;
      const params: any = {
        search: `submissions.submission_status_date:[${this.formatFDADate(thirtyDaysAgo)} TO ${this.formatFDADate(today)}]`,
        limit: 100
      };

      // Add API key if available for higher rate limits
      if (process.env.OPENFDA_API_KEY) {
        params.api_key = process.env.OPENFDA_API_KEY;
      }

      const response = await axios.get(searchUrl, { params });
      const approvals = response.data.results || [];

      for (const approval of approvals) {
        await this.processApproval(approval);
      }
    } catch (error) {
      console.error('Error checking drug approvals:', error);
    }
  }

  private async checkDrugRecalls(): Promise<void> {
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const searchUrl = `${this.fdaBaseUrl}/drug/enforcement.json`;
      const params: any = {
        search: `report_date:[${this.formatFDADate(sevenDaysAgo)} TO ${this.formatFDADate(today)}]`,
        limit: 100
      };

      // Add API key if available for higher rate limits
      if (process.env.OPENFDA_API_KEY) {
        params.api_key = process.env.OPENFDA_API_KEY;
      }

      const response = await axios.get(searchUrl, { params });
      const recalls = response.data.results || [];

      for (const recall of recalls) {
        await this.processRecall(recall);
      }
    } catch (error) {
      console.error('Error checking drug recalls:', error);
    }
  }

  private async checkWarningLetters(): Promise<void> {
    try {
      // Warning letters from Unusual Whales FDA endpoint
      const response = await axios.get('https://api.unusualwhales.com/api/fda/warning-letters', {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Accept': 'application/json'
        },
        params: {
          limit: 50,
          days_back: 7
        }
      });

      const warnings = response.data?.data || [];
      for (const warning of warnings) {
        await this.processWarningLetter(warning);
      }
    } catch (error) {
      console.error('Error checking warning letters:', error);
    }
  }

  private async checkDeviceRecalls(): Promise<void> {
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const searchUrl = `${this.fdaBaseUrl}/device/recall.json`;
      const params: any = {
        search: `report_date:[${this.formatFDADate(sevenDaysAgo)} TO ${this.formatFDADate(today)}]`,
        limit: 100
      };

      // Add API key if available for higher rate limits
      if (process.env.OPENFDA_API_KEY) {
        params.api_key = process.env.OPENFDA_API_KEY;
      }

      const response = await axios.get(searchUrl, { params });
      const recalls = response.data.results || [];

      for (const recall of recalls) {
        await this.processDeviceRecall(recall);
      }
    } catch (error) {
      console.error('Error checking device recalls:', error);
    }
  }

  private async processApproval(approval: any): Promise<void> {
    try {
      const companyName = approval.sponsor_name || approval.applicant;
      const drugName = approval.products?.[0]?.brand_name || approval.products?.[0]?.generic_name;
      
      if (!companyName || !drugName) return;

      const tickers = await this.findRelevantTickers(companyName);
      if (tickers.length === 0) return;

      const event: FDAEvent = {
        id: `approval_${approval.application_number}_${Date.now()}`,
        date: approval.submissions?.[0]?.submission_status_date || new Date().toISOString(),
        type: 'approval',
        company: companyName,
        drug: drugName,
        impact: this.assessImpact(approval),
        description: `FDA approval for ${drugName} by ${companyName}`,
        relevantTickers: tickers
      };

      for (const ticker of tickers) {
        await this.createAlert(ticker, event, 'call');
      }
    } catch (error) {
      console.error('Error processing approval:', error);
    }
  }

  private async processRecall(recall: any): Promise<void> {
    try {
      const companyName = recall.recalling_firm;
      const productName = recall.product_description;
      
      if (!companyName || !productName) return;

      const tickers = await this.findRelevantTickers(companyName);
      if (tickers.length === 0) return;

      const event: FDAEvent = {
        id: `recall_${recall.recall_number}_${Date.now()}`,
        date: recall.report_date,
        type: 'recall',
        company: companyName,
        drug: productName,
        impact: recall.classification === 'Class I' ? 'high' : recall.classification === 'Class II' ? 'medium' : 'low',
        description: `FDA recall: ${productName} by ${companyName}`,
        relevantTickers: tickers
      };

      for (const ticker of tickers) {
        await this.createAlert(ticker, event, 'put');
      }
    } catch (error) {
      console.error('Error processing recall:', error);
    }
  }

  private async processWarningLetter(warning: any): Promise<void> {
    try {
      const companyName = warning.company_name;
      
      if (!companyName) return;

      const tickers = await this.findRelevantTickers(companyName);
      if (tickers.length === 0) return;

      const event: FDAEvent = {
        id: `warning_${warning.id}_${Date.now()}`,
        date: warning.issue_date,
        type: 'warning',
        company: companyName,
        drug: warning.subject || 'Multiple products',
        impact: 'medium',
        description: `FDA warning letter to ${companyName}`,
        relevantTickers: tickers
      };

      for (const ticker of tickers) {
        await this.createAlert(ticker, event, 'put');
      }
    } catch (error) {
      console.error('Error processing warning letter:', error);
    }
  }

  private async processDeviceRecall(recall: any): Promise<void> {
    try {
      const companyName = recall.firm_fei_number || recall.recalling_firm;
      const deviceName = recall.product_description;
      
      if (!companyName || !deviceName) return;

      const tickers = await this.findRelevantTickers(companyName);
      if (tickers.length === 0) return;

      const event: FDAEvent = {
        id: `device_recall_${recall.res_event_number}_${Date.now()}`,
        date: recall.report_date,
        type: 'recall',
        company: companyName,
        drug: deviceName,
        impact: recall.classification === 'Class I' ? 'high' : 'medium',
        description: `FDA device recall: ${deviceName}`,
        relevantTickers: tickers
      };

      for (const ticker of tickers) {
        await this.createAlert(ticker, event, 'put');
      }
    } catch (error) {
      console.error('Error processing device recall:', error);
    }
  }

  private async findRelevantTickers(companyName: string): Promise<string[]> {
    try {
      // Use Unusual Whales to find tickers for company
      const response = await axios.get('https://api.unusualwhales.com/api/company/search', {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Accept': 'application/json'
        },
        params: {
          query: companyName,
          limit: 5
        }
      });

      return response.data?.data?.map((company: any) => company.ticker).filter(Boolean) || [];
    } catch (error) {
      // Fallback to common pharma/biotech tickers
      const pharmaMap: Record<string, string[]> = {
        'pfizer': ['PFE'],
        'johnson': ['JNJ'],
        'merck': ['MRK'],
        'abbvie': ['ABBV'],
        'bristol': ['BMY'],
        'gilead': ['GILD'],
        'amgen': ['AMGN'],
        'biogen': ['BIIB'],
        'regeneron': ['REGN'],
        'vertex': ['VRTX'],
        'moderna': ['MRNA'],
        'biontech': ['BNTX']
      };

      const normalizedName = companyName.toLowerCase();
      for (const [key, tickers] of Object.entries(pharmaMap)) {
        if (normalizedName.includes(key)) {
          return tickers;
        }
      }
      
      return [];
    }
  }

  private async createAlert(ticker: string, event: FDAEvent, recommendation: 'call' | 'put'): Promise<void> {
    try {
      // Check if stock has active options
      const hasOptions = await this.checkOptionsAvailability(ticker);
      if (!hasOptions) return;

      const alertId = `${ticker}_${event.id}`;
      
      // Skip if alert already exists
      if (this.activeAlerts.has(alertId)) return;

      const confidence = this.calculateConfidence(event, recommendation);
      const timeframe = this.getRecommendedTimeframe(event);

      const alert: FDAAlert = {
        id: alertId,
        ticker,
        event,
        optionsOpportunity: {
          recommendation,
          confidence,
          timeframe,
          reasoning: this.generateReasoning(event, recommendation)
        },
        timestamp: new Date().toISOString()
      };

      this.activeAlerts.set(alertId, alert);
      
      console.log(`🚨 FDA Alert: ${ticker} - ${event.type} - ${recommendation.toUpperCase()} recommendation (${confidence}% confidence)`);
      
      // Broadcast alert via WebSocket (if available)
      this.broadcastAlert(alert);
      
    } catch (error) {
      console.error('Error creating FDA alert:', error);
    }
  }

  private async checkOptionsAvailability(ticker: string): Promise<boolean> {
    try {
      const response = await axios.get(`https://api.unusualwhales.com/api/options/chain/${ticker}`, {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Accept': 'application/json'
        },
        params: {
          limit: 1
        }
      });
      return response.data?.data && response.data.data.length > 0;
    } catch (error) {
      return false;
    }
  }

  private calculateConfidence(event: FDAEvent, recommendation: 'call' | 'put'): number {
    let confidence = 50;

    // Event type impact
    if (event.type === 'approval' && recommendation === 'call') confidence += 30;
    if (event.type === 'recall' && recommendation === 'put') confidence += 25;
    if (event.type === 'warning' && recommendation === 'put') confidence += 15;

    // Impact level
    if (event.impact === 'high') confidence += 20;
    if (event.impact === 'medium') confidence += 10;

    return Math.min(95, confidence);
  }

  private getRecommendedTimeframe(event: FDAEvent): string {
    switch (event.type) {
      case 'approval': return '1-3 months';
      case 'recall': return '1-4 weeks';
      case 'warning': return '2-6 weeks';
      default: return '2-8 weeks';
    }
  }

  private generateReasoning(event: FDAEvent, recommendation: 'call' | 'put'): string {
    const action = recommendation === 'call' ? 'positive' : 'negative';
    return `FDA ${event.type} for ${event.drug} likely to have ${action} impact on ${event.company} stock price. ${event.impact.toUpperCase()} impact event suggests ${recommendation.toUpperCase()} options positioning.`;
  }

  private assessImpact(data: any): 'high' | 'medium' | 'low' {
    // Assess impact based on drug type, company size, etc.
    // This is a simplified version
    return 'medium';
  }

  private formatFDADate(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  private broadcastAlert(alert: FDAAlert): void {
    // Implementation would broadcast to WebSocket clients
    // For now, just log
    console.log(`Broadcasting FDA alert for ${alert.ticker}`);
  }

  public getActiveAlerts(): FDAAlert[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getAlertsForTicker(ticker: string): FDAAlert[] {
    return this.getActiveAlerts().filter(alert => alert.ticker === ticker);
  }

  public clearExpiredAlerts(): void {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const entriesToDelete: string[] = [];
    this.activeAlerts.forEach((alert, id) => {
      if (new Date(alert.timestamp) < sevenDaysAgo) {
        entriesToDelete.push(id);
      }
    });
    
    entriesToDelete.forEach(id => this.activeAlerts.delete(id));
  }
}

export const fdaMonitoringService = new FDAMonitoringService();