import { Express } from 'express';

export function addMLRoutes(app: Express) {
  // Machine Learning enhanced signal endpoints
  app.get("/api/ml/enhanced-signals", async (req, res) => {
    try {
      const { signalEnhancer } = await import('./services/signalEnhancer');
      const limit = parseInt(req.query.limit as string) || 10;
      const topSignals = signalEnhancer.getTopSignals(limit);
      res.json(topSignals);
    } catch (error) {
      console.error("Failed to get enhanced signals:", error);
      res.status(500).json({ message: "Failed to get enhanced signals" });
    }
  });

  app.post("/api/ml/enhance-signal", async (req, res) => {
    try {
      const { signalEnhancer } = await import('./services/signalEnhancer');
      const enhancedSignal = await signalEnhancer.enhanceSignal(req.body);
      res.json(enhancedSignal);
    } catch (error) {
      console.error("Failed to enhance signal:", error);
      res.status(500).json({ message: "Failed to enhance signal" });
    }
  });

  app.post("/api/ml/enhance-batch", async (req, res) => {
    try {
      const { signalEnhancer } = await import('./services/signalEnhancer');
      const { signals } = req.body;
      const enhancedSignals = await signalEnhancer.enhanceSignalBatch(signals);
      res.json(enhancedSignals);
    } catch (error) {
      console.error("Failed to enhance signal batch:", error);
      res.status(500).json({ message: "Failed to enhance signals" });
    }
  });

  app.get("/api/ml/patterns/:patternType", async (req, res) => {
    try {
      const { signalEnhancer } = await import('./services/signalEnhancer');
      const { patternType } = req.params;
      const signals = signalEnhancer.getSignalsByPattern(patternType);
      res.json(signals);
    } catch (error) {
      console.error("Failed to get signals by pattern:", error);
      res.status(500).json({ message: "Failed to get signals by pattern" });
    }
  });

  app.get("/api/ml/metrics", async (req, res) => {
    try {
      const { signalEnhancer } = await import('./services/signalEnhancer');
      const { mlPatternRecognition } = await import('./services/mlPatternRecognition');
      
      const enhancerMetrics = signalEnhancer.getPerformanceMetrics();
      const modelMetrics = mlPatternRecognition.getModelMetrics();
      
      res.json({
        enhancer: enhancerMetrics,
        model: modelMetrics,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Failed to get ML metrics:", error);
      res.status(500).json({ message: "Failed to get ML metrics" });
    }
  });

  app.post("/api/ml/train", async (req, res) => {
    try {
      const { signalEnhancer } = await import('./services/signalEnhancer');
      await signalEnhancer.trainFromHistoricalData();
      res.json({ message: "ML training completed successfully" });
    } catch (error) {
      console.error("Failed to train ML models:", error);
      res.status(500).json({ message: "Failed to train ML models" });
    }
  });

  // Pattern recognition and analysis endpoints
  app.post("/api/ml/analyze-patterns", async (req, res) => {
    try {
      const { mlPatternRecognition } = await import('./services/mlPatternRecognition');
      const { signals } = req.body;
      
      if (!Array.isArray(signals)) {
        return res.status(400).json({ message: "Signals array required" });
      }
      
      const predictions = await Promise.all(
        signals.map(signal => mlPatternRecognition.predictPattern(signal))
      );
      
      res.json(predictions);
    } catch (error) {
      console.error("Failed to analyze patterns:", error);
      res.status(500).json({ message: "Failed to analyze patterns" });
    }
  });

  app.get("/api/ml/pattern-summary", async (req, res) => {
    try {
      const { signalEnhancer } = await import('./services/signalEnhancer');
      const metrics = signalEnhancer.getPerformanceMetrics();
      
      // Calculate pattern success rates
      const patternStats = Object.entries(metrics.patternDistribution || {}).map(([pattern, count]) => ({
        pattern,
        count,
        percentage: ((count as number) / metrics.totalSignals * 100).toFixed(1)
      }));
      
      res.json({
        totalPatterns: patternStats.length,
        patterns: patternStats,
        avgConfidence: metrics.avgConfidence,
        avgExpectedReturn: metrics.avgExpectedReturn,
        avgRiskScore: metrics.avgRiskScore
      });
    } catch (error) {
      console.error("Failed to get pattern summary:", error);
      res.status(500).json({ message: "Failed to get pattern summary" });
    }
  });
}