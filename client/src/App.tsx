
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import Dashboard from "@/pages/dashboard";
import OptionsFlowPage from "@/pages/options-flow";
import PositionsPage from "@/pages/positions";
import RiskManagementPage from "@/pages/risk-management";
import TradesPage from "@/pages/trades";
import AnalyticsPage from "@/pages/analytics";
import PortfolioPage from "@/pages/portfolio";
import PortfolioOptimizationPage from "@/pages/portfolio-optimization";
import NewsSentimentPage from "@/pages/news-sentiment";
import AdvancedChartingPage from "@/pages/advanced-charting";
import LEAPAnalysisPage from "@/pages/leap-analysis";
import SettingsPage from "@/pages/settings";
import AISignalsPage from "@/pages/ai-signals";
import AIAgentsPage from "@/pages/ai-agents";
import MachineLearningPage from "@/pages/machine-learning";
import FundamentalsPage from "@/pages/fundamentals";
import MacroDashboardPage from "@/pages/macro-dashboard";
import MorningUpdatePage from "@/pages/morning-update";
import ReportsPage from "@/pages/reports";
import WatchlistPage from "@/pages/watchlist";
import TestOrdersPage from "@/pages/test-orders";
import VisualTransformerPage from "@/pages/visual-transformer";
import SentimentHeatmapPage from "@/pages/sentiment-heatmap";
import OptionsScreenerPage from "@/pages/options-screener";
import OptionsHeatMapPage from "@/pages/options-heatmap";
import OptionsRadarPage from "@/pages/options-radar";
import ShortExpiryDashboardPage from "@/pages/short-expiry-dashboard";
import GammaSurfacePage from "@/pages/gamma-surface";
import TimelineSweepsPage from "@/pages/timeline-sweeps";
import FlowNetworkPage from "@/pages/flow-network";
import WhaleScoreHeatMapPage from "@/pages/whale-score-heatmap";
import SentimentFlowOverlayPage from "@/pages/sentiment-flow-overlay";
import NotFound from "@/pages/not-found";
import EarningsDashboardPage from "@/pages/earnings-dashboard";
import UnusualWhalesDashboardPage from "@/pages/unusual-whales-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/flow" component={OptionsFlowPage} />
      <Route path="/positions" component={PositionsPage} />
      <Route path="/portfolios" component={PortfolioPage} />
      <Route path="/risk" component={RiskManagementPage} />
      <Route path="/trades" component={TradesPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/portfolio" component={PortfolioOptimizationPage} />
      <Route path="/leaps" component={LEAPAnalysisPage} />
      <Route path="/news" component={NewsSentimentPage} />
      <Route path="/charts" component={AdvancedChartingPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/ai-signals" component={AISignalsPage} />
      <Route path="/ai-agents" component={AIAgentsPage} />
      <Route path="/machine-learning" component={MachineLearningPage} />
      <Route path="/fundamentals" component={FundamentalsPage} />
      <Route path="/macro" component={MacroDashboardPage} />
      <Route path="/morning-update" component={MorningUpdatePage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/watchlist" component={WatchlistPage} />
      <Route path="/test-orders" component={TestOrdersPage} />
      <Route path="/visual-transformer" component={VisualTransformerPage} />
      <Route path="/sentiment-heatmap" component={SentimentHeatmapPage} />
      <Route path="/options-screener" component={OptionsScreenerPage} />
      <Route path="/options-heatmap" component={OptionsHeatMapPage} />
      <Route path="/options-radar" component={OptionsRadarPage} />
      <Route path="/short-expiry" component={ShortExpiryDashboardPage} />
      <Route path="/gamma-surface" component={GammaSurfacePage} />
      <Route path="/sweeps-timeline" component={TimelineSweepsPage} />
      <Route path="/flow-network" component={FlowNetworkPage} />
      <Route path="/whale-score-heatmap" component={WhaleScoreHeatMapPage} />
      <Route path="/sentiment-flow-overlay" component={SentimentFlowOverlayPage} />
      <Route path="/earnings" component={EarningsDashboardPage} />
      <Route path="/uw-data" component={UnusualWhalesDashboardPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex h-screen bg-dark-900 text-dark-50">
          <Sidebar />
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <TopBar />
            
            <main className="flex-1 overflow-auto">
              <Router />
            </main>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
