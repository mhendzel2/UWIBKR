/**
 * Training Mode API Routes
 * Manages training mode configuration and monitoring
 */

import { Router } from 'express';
import { trainingModeManager } from '../services/trainingMode';
import { trainingTradeExecutor } from '../services/trainingTradeExecutor';

const router = Router();

// Get training mode status and configuration
router.get('/status', (req, res) => {
  try {
    const stats = trainingModeManager.getTrainingStats();
    const executorStats = trainingTradeExecutor.getTrainingStats();
    
    res.json({
      isEnabled: trainingModeManager.isEnabled(),
      config: trainingModeManager.getConfig(),
      stats: stats,
      executorStats: executorStats,
      statusReport: trainingModeManager.generateStatusReport()
    });
  } catch (error) {
    console.error('Failed to get training mode status:', error);
    res.status(500).json({ error: 'Failed to get training mode status' });
  }
});

// Toggle training mode on/off
router.post('/toggle', (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }
    
    trainingModeManager.setEnabled(enabled);
    
    res.json({
      success: true,
      enabled: trainingModeManager.isEnabled(),
      message: `Training mode ${enabled ? 'enabled' : 'disabled'}`,
      statusReport: trainingModeManager.generateStatusReport()
    });
  } catch (error) {
    console.error('Failed to toggle training mode:', error);
    res.status(500).json({ error: 'Failed to toggle training mode' });
  }
});

// Update training mode configuration
router.put('/config', (req, res) => {
  try {
    const configUpdates = req.body;
    
    // Validate configuration updates
    if (configUpdates.maxPositionSize && configUpdates.maxPositionSize < 0) {
      return res.status(400).json({ error: 'maxPositionSize must be positive' });
    }
    
    if (configUpdates.riskPerTrade && (configUpdates.riskPerTrade < 0 || configUpdates.riskPerTrade > 10)) {
      return res.status(400).json({ error: 'riskPerTrade must be between 0 and 10' });
    }
    
    if (configUpdates.minConfidenceThreshold && (configUpdates.minConfidenceThreshold < 0 || configUpdates.minConfidenceThreshold > 1)) {
      return res.status(400).json({ error: 'minConfidenceThreshold must be between 0 and 1' });
    }
    
    trainingModeManager.updateConfig(configUpdates);
    
    res.json({
      success: true,
      config: trainingModeManager.getConfig(),
      message: 'Training mode configuration updated'
    });
  } catch (error) {
    console.error('Failed to update training mode config:', error);
    res.status(500).json({ error: 'Failed to update training mode configuration' });
  }
});

// Get detailed training statistics
router.get('/stats', (req, res) => {
  try {
    const trainingStats = trainingModeManager.getTrainingStats();
    const executorStats = trainingTradeExecutor.getTrainingStats();
    
    const detailedStats = {
      overview: {
        isEnabled: trainingModeManager.isEnabled(),
        totalTrades: trainingStats.tradesExecuted,
        dailyTrades: trainingStats.dailyTradeCount,
        totalPnl: trainingStats.totalPnl,
        portfolioValue: executorStats.portfolioValue
      },
      configuration: trainingStats.config,
      performance: {
        successRate: trainingStats.tradesExecuted > 0 ? 
          (Math.random() * 0.4 + 0.5) : 0, // Placeholder calculation
        avgReturnPerTrade: trainingStats.tradesExecuted > 0 ? 
          trainingStats.totalPnl / trainingStats.tradesExecuted : 0,
        riskMetrics: {
          maxDrawdown: Math.random() * 0.1 + 0.02, // Placeholder
          sharpeRatio: Math.random() * 1 + 0.5, // Placeholder
          profitFactor: Math.random() * 0.5 + 1.2 // Placeholder
        }
      },
      limits: {
        dailyTradeLimit: trainingStats.config.maxDailyTrades,
        maxPositionSize: trainingStats.config.maxPositionSize,
        riskPerTrade: trainingStats.config.riskPerTrade
      }
    };
    
    res.json(detailedStats);
  } catch (error) {
    console.error('Failed to get training statistics:', error);
    res.status(500).json({ error: 'Failed to get training statistics' });
  }
});

// Get training mode recommendations
router.get('/recommendations', (req, res) => {
  try {
    const stats = trainingModeManager.getTrainingStats();
    const recommendations = [];
    
    // Generate recommendations based on training performance
    if (stats.tradesExecuted < 10) {
      recommendations.push({
        type: 'info',
        title: 'Insufficient Data',
        message: 'Execute more trades to generate meaningful ML training data',
        action: 'Lower confidence threshold to increase trade frequency'
      });
    }
    
    if (stats.config.riskPerTrade > 2) {
      recommendations.push({
        type: 'warning',
        title: 'High Risk Per Trade',
        message: `Current risk per trade (${stats.config.riskPerTrade}%) is high for training mode`,
        action: 'Consider reducing to 1% or lower for safer training'
      });
    }
    
    if (!stats.config.restrictToWatchlist) {
      recommendations.push({
        type: 'info',
        title: 'Unrestricted Trading',
        message: 'Training mode is not restricted to watchlist symbols',
        action: 'Enable watchlist restriction for more focused training'
      });
    }
    
    if (stats.config.geminiUsage === 'full') {
      recommendations.push({
        type: 'warning',
        title: 'Full Gemini Usage',
        message: 'Training mode should limit Gemini usage to sentiment only',
        action: 'Change geminiUsage to "sentiment_only" for proper training'
      });
    }
    
    res.json({
      recommendations,
      optimizationSuggestions: {
        confidenceThreshold: stats.tradesExecuted < 5 ? 
          Math.max(0.5, stats.config.minConfidenceThreshold - 0.1) : 
          stats.config.minConfidenceThreshold,
        riskPerTrade: Math.min(1, stats.config.riskPerTrade),
        maxDailyTrades: stats.dailyTradeCount === stats.config.maxDailyTrades ? 
          stats.config.maxDailyTrades + 5 : stats.config.maxDailyTrades
      }
    });
  } catch (error) {
    console.error('Failed to get training recommendations:', error);
    res.status(500).json({ error: 'Failed to get training recommendations' });
  }
});

// Reset training statistics
router.post('/reset', (req, res) => {
  try {
    // Reset daily counters and stats
    const currentConfig = trainingModeManager.getConfig();
    trainingModeManager.updateConfig({
      ...currentConfig,
      // Reset is handled internally by the manager
    });
    
    res.json({
      success: true,
      message: 'Training statistics reset',
      statusReport: trainingModeManager.generateStatusReport()
    });
  } catch (error) {
    console.error('Failed to reset training mode:', error);
    res.status(500).json({ error: 'Failed to reset training mode' });
  }
});

// Update portfolio value for training
router.put('/portfolio', (req, res) => {
  try {
    const { portfolioValue } = req.body;
    
    if (!portfolioValue || portfolioValue <= 0) {
      return res.status(400).json({ error: 'portfolioValue must be a positive number' });
    }
    
    trainingTradeExecutor.updatePortfolioValue(portfolioValue);
    
    res.json({
      success: true,
      portfolioValue,
      message: 'Portfolio value updated for training mode'
    });
  } catch (error) {
    console.error('Failed to update portfolio value:', error);
    res.status(500).json({ error: 'Failed to update portfolio value' });
  }
});

export default router;
