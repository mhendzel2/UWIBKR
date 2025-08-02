import express from 'express';
import { AgentOrchestrator } from './agents/AgentOrchestrator';

const router = express.Router();
const agentOrchestrator = new AgentOrchestrator();

// Initialize agent system
router.get('/agents/status', async (req, res) => {
  try {
    const metrics = agentOrchestrator.getAgentMetrics();
    res.json({
      status: 'active',
      agents: metrics.weights,
      performance: metrics.performance,
      totalDecisions: metrics.totalDecisions
    });
  } catch (error) {
    console.error('Agent status error:', error);
    res.status(500).json({ error: 'Failed to get agent status' });
  }
});

// Process market data through multi-agent system
router.post('/agents/analyze', async (req, res) => {
  try {
    const { optionsFlow, marketData, news, signals } = req.body;
    
    if (!optionsFlow && !signals) {
      return res.status(400).json({ error: 'Either optionsFlow or signals data required' });
    }

    const decisions = await agentOrchestrator.processMarketData({
      optionsFlow: optionsFlow || [],
      marketData: marketData || {},
      news: news || [],
      signals: signals || []
    });

    res.json({
      decisions,
      processedAt: new Date(),
      agentCount: Object.keys(agentOrchestrator.getAgentMetrics().weights).length
    });

  } catch (error) {
    console.error('Agent analysis error:', error);
    res.status(500).json({ error: 'Multi-agent analysis failed' });
  }
});

// Get consensus decisions for specific symbol
router.get('/agents/consensus/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Get latest data for symbol (you'll need to integrate with existing data sources)
    const symbolData = {
      optionsFlow: [], // Get from your options flow API
      marketData: {},  // Get from your market data API
      news: [],        // Get from your news API
      signals: []      // Get from your signals API
    };

    const decisions = await agentOrchestrator.processMarketData({
      optionsFlow: symbolData.optionsFlow.filter((flow: any) => flow.symbol === symbol),
      marketData: symbolData.marketData,
      news: symbolData.news.filter((item: any) => item.symbol === symbol),
      signals: symbolData.signals.filter((signal: any) => signal.ticker === symbol)
    });

    const symbolDecisions = decisions.filter(d => d.symbol === symbol);
    
    res.json({
      symbol,
      decisions: symbolDecisions,
      hasConsensus: symbolDecisions.length > 0,
      analysisTime: new Date()
    });

  } catch (error) {
    console.error('Consensus analysis error:', error);
    res.status(500).json({ error: 'Consensus analysis failed' });
  }
});

// Update agent performance based on trade outcomes
router.post('/agents/update-performance', async (req, res) => {
  try {
    const { tradeOutcomes } = req.body;
    
    if (!Array.isArray(tradeOutcomes)) {
      return res.status(400).json({ error: 'tradeOutcomes must be an array' });
    }

    await agentOrchestrator.updateAgentWeights(tradeOutcomes);
    
    const updatedMetrics = agentOrchestrator.getAgentMetrics();
    
    res.json({
      message: 'Agent performance updated',
      updatedWeights: updatedMetrics.weights,
      totalOutcomes: tradeOutcomes.length
    });

  } catch (error) {
    console.error('Performance update error:', error);
    res.status(500).json({ error: 'Performance update failed' });
  }
});

// Get individual agent analysis
router.post('/agents/:agentType/analyze', async (req, res) => {
  try {
    const { agentType } = req.params;
    const { symbol, data } = req.body;

    const agents = agentOrchestrator.getAgentMetrics();
    const agentExists = Object.keys(agents.weights).includes(agentType);
    
    if (!agentExists) {
      return res.status(404).json({ error: 'Agent type not found' });
    }

    // This is a simplified version - in practice you'd call the specific agent
    const analysisData = {
      symbol,
      optionsFlow: data.optionsFlow || [],
      marketData: data.marketData || {},
      news: data.news || [],
      signals: data.signals || []
    };

    // Process through single agent type (simplified)
    const decisions = await agentOrchestrator.processMarketData(analysisData);
    const agentDecisions = decisions
      .flatMap(d => d.participatingAgents)
      .filter(d => d.agentId === agentType);

    res.json({
      agentType,
      symbol,
      decisions: agentDecisions,
      analysisTime: new Date()
    });

  } catch (error) {
    console.error('Individual agent analysis error:', error);
    res.status(500).json({ error: 'Agent analysis failed' });
  }
});

// Agent system configuration
router.put('/agents/config', async (req, res) => {
  try {
    const { weights, riskParameters } = req.body;
    
    // Update agent weights if provided
    if (weights) {
      // In a real implementation, you'd update the orchestrator weights
      console.log('Updating agent weights:', weights);
    }
    
    // Update risk parameters if provided
    if (riskParameters) {
      console.log('Updating risk parameters:', riskParameters);
    }

    res.json({
      message: 'Agent configuration updated',
      weights: weights || {},
      riskParameters: riskParameters || {}
    });

  } catch (error) {
    console.error('Config update error:', error);
    res.status(500).json({ error: 'Configuration update failed' });
  }
});

// Real-time agent decisions stream (WebSocket endpoint reference)
router.get('/agents/stream', (req, res) => {
  res.json({
    message: 'Agent decision streaming available via WebSocket',
    endpoint: '/ws',
    events: [
      'agent_decision',
      'consensus_reached',
      'risk_alert',
      'execution_recommendation'
    ]
  });
});

// Agent system health check
router.get('/agents/health', async (req, res) => {
  try {
    const metrics = agentOrchestrator.getAgentMetrics();
    const activeAgents = Object.keys(metrics.weights).length;
    
    res.json({
      status: 'healthy',
      activeAgents,
      totalDecisions: metrics.totalDecisions,
      agentTypes: Object.keys(metrics.weights),
      lastUpdate: new Date()
    });

  } catch (error) {
    console.error('Agent health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Agent system error',
      timestamp: new Date()
    });
  }
});

// Test order execution through multi-agent system
router.post('/test-order', async (req, res) => {
  try {
    const { symbol, action, orderType, totalQuantity, secType, testMode = false } = req.body;
    
    console.log(`\n🎯 TEST ORDER REQUEST:`, {
      symbol, action, orderType, totalQuantity, secType, testMode
    });

    if (testMode) {
      console.log(`🔥 TEST MODE ENABLED - Auto-execution without human approval`);
    }

    // Create simulated market data for agent analysis
    const testData = {
      optionsFlow: [{
        symbol: symbol,
        premium: 50000,
        volume: 100,
        openInterest: 500,
        strike: '150',
        expiry: '2025-03-21',
        putCall: 'C',
        sentiment: 'bullish'
      }],
      marketData: {
        symbol: symbol,
        price: 150.25,
        volume: 1000000,
        change: 2.5,
        changePercent: 1.67
      },
      news: [{
        symbol: symbol,
        headline: `${symbol} shows strong momentum`,
        sentiment: 'positive',
        timestamp: new Date()
      }],
      signals: [{
        ticker: symbol,
        signal: 'BUY',
        confidence: 0.85,
        reason: 'Test order execution'
      }]
    };

    // Process through multi-agent system
    console.log(`🤖 PROCESSING THROUGH MULTI-AGENT SYSTEM...`);
    const decisions = await agentOrchestrator.processMarketData(testData);
    
    const symbolDecisions = decisions.filter(d => d.symbol === symbol);
    
    // In test mode, lower consensus threshold for ML training data collection
    const hasConsensus = testMode 
      ? symbolDecisions.length > 0  // Any agent decision counts in test mode
      : symbolDecisions.length > 0 && symbolDecisions.some(d => d.recommendation === 'BUY');

    // Agent metrics
    const metrics = agentOrchestrator.getAgentMetrics();
    
    console.log(`📊 AGENT ANALYSIS COMPLETE:`, {
      decisions: symbolDecisions.length,
      hasConsensus,
      agentWeights: metrics.weights
    });

    // Determine execution status based on mode and consensus
    let status, reason;
    if (testMode) {
      status = hasConsensus ? 'EXECUTED' : 'ML_REJECTED';
      reason = hasConsensus 
        ? 'Auto-executed in test mode for ML training' 
        : 'Rejected in test mode - insufficient signal strength';
    } else {
      status = hasConsensus ? 'SUBMITTED' : 'REJECTED';
      reason = hasConsensus 
        ? 'Multi-agent consensus achieved - awaiting human approval' 
        : 'Insufficient agent consensus';
    }

    // Simulate order execution
    const orderResult = {
      orderId: `${testMode ? 'ML' : 'TEST'}-${Date.now()}`,
      symbol: symbol,
      action: action,
      quantity: totalQuantity,
      orderType: orderType,
      secType: secType,
      status,
      reason,
      testMode,
      timestamp: new Date(),
      agentDecisions: symbolDecisions,
      participatingAgents: symbolDecisions.flatMap(d => d.participatingAgents),
      riskScore: symbolDecisions.length > 0 ? symbolDecisions[0].riskScore : 'N/A',
      mlTrainingData: testMode ? {
        consensusScore: symbolDecisions.length > 0 ? symbolDecisions[0].consensusScore : 0,
        agentCount: symbolDecisions.flatMap(d => d.participatingAgents).length,
        avgConfidence: symbolDecisions.flatMap(d => d.participatingAgents)
          .reduce((sum, agent) => sum + agent.confidence, 0) / 
          Math.max(1, symbolDecisions.flatMap(d => d.participatingAgents).length),
        executionType: 'auto'
      } : null
    };

    console.log(`✅ ${testMode ? 'ML TRAINING' : 'TEST'} ORDER RESULT:`, {
      orderId: orderResult.orderId,
      status: orderResult.status,
      reason: orderResult.reason,
      testMode: orderResult.testMode
    });

    // In test mode, store ML training data
    if (testMode && orderResult.mlTrainingData) {
      console.log(`📊 ML TRAINING DATA COLLECTED:`, {
        consensusScore: orderResult.mlTrainingData.consensusScore,
        agentCount: orderResult.mlTrainingData.agentCount,
        avgConfidence: orderResult.mlTrainingData.avgConfidence.toFixed(3)
      });
    }

    res.json({
      success: true,
      order: orderResult,
      agentAnalysis: {
        totalDecisions: symbolDecisions.length,
        hasConsensus,
        riskAssessment: orderResult.riskScore,
        participatingAgents: orderResult.participatingAgents.length
      },
      system: {
        agentWeights: metrics.weights,
        totalSystemDecisions: metrics.totalDecisions
      }
    });

  } catch (error) {
    console.error('❌ TEST ORDER ERROR:', error);
    res.status(500).json({ 
      success: false,
      error: 'Test order execution failed',
      details: error.message 
    });
  }
});

export default router;
export { agentOrchestrator };