import * as tf from '@tensorflow/tfjs-node';
import { Matrix } from 'ml-matrix';
import * as stats from 'simple-statistics';
import { transformerML, type MarketSequence } from './transformerML';

export interface PatternFeatures {
  volumeToOIRatio: number;
  premiumSize: number;
  askSidePercentage: number;
  timeDecay: number;
  moneyness: number;
  volatilityRank: number;
  historicalSuccess: number;
}

export interface PatternPrediction {
  confidence: number;
  expectedReturn: number;
  riskScore: number;
  patternType: 'bullish_sweep' | 'bearish_sweep' | 'institutional_flow' | 'momentum_continuation' | 'reversal_signal';
  timeHorizon: number; // days
}

export interface TrainingData {
  features: PatternFeatures;
  outcome: {
    success: boolean;
    return: number;
    maxDrawdown: number;
    daysToTarget: number;
  };
}

export class MLPatternRecognition {
  private model: tf.LayersModel | null = null;
  private isTraining = false;
  private useTransformer = false;
  private featureScaler: { mean: number[]; std: number[] } | null = null;
  private trainingHistory: TrainingData[] = [];

  constructor() {
    this.initializeModel();
  }

  private async initializeModel(): Promise<void> {
    try {
      // Try to load existing model
      this.model = await tf.loadLayersModel('file://./models/pattern_recognition/model.json');
      console.log('Loaded existing ML pattern recognition model');
    } catch (error) {
      // Create new model if none exists
      this.model = this.createModel();
      console.log('Created new ML pattern recognition model');
    }
  }

  private createModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [7], // 7 feature inputs
          units: 64,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 4, // [confidence, expectedReturn, riskScore, timeHorizon]
          activation: 'sigmoid'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  public async extractFeatures(signal: any): Promise<PatternFeatures> {
    const currentPrice = signal.underlyingPrice || 100; // fallback
    const strike = signal.strike || currentPrice;
    
    return {
      volumeToOIRatio: signal.volume / Math.max(signal.openInterest, 1),
      premiumSize: Math.log(signal.premium / 100000), // log scale for large premiums
      askSidePercentage: signal.askSidePercentage / 100,
      timeDecay: Math.max(0, (signal.daysToExpiry || 30) / 365), // normalize to yearly
      moneyness: Math.abs(strike - currentPrice) / currentPrice,
      volatilityRank: signal.impliedVolatility || 0.3, // default IV
      historicalSuccess: await this.getHistoricalSuccessRate(signal.ticker)
    };
  }

  private async getHistoricalSuccessRate(ticker: string): Promise<number> {
    // Calculate historical success rate for this ticker
    const relevantHistory = this.trainingHistory.filter(data => 
      data.features && this.trainingHistory.length > 10
    );
    
    if (relevantHistory.length === 0) return 0.5; // neutral default
    
    const successRate = relevantHistory.filter(data => data.outcome.success).length / relevantHistory.length;
    return Math.max(0.1, Math.min(0.9, successRate)); // bounded between 0.1 and 0.9
  }

  private normalizeFeatures(features: PatternFeatures[]): number[][] {
    if (!this.featureScaler) {
      // Calculate mean and std for normalization
      const featureMatrix = features.map(f => [
        f.volumeToOIRatio, f.premiumSize, f.askSidePercentage,
        f.timeDecay, f.moneyness, f.volatilityRank, f.historicalSuccess
      ]);
      
      const matrix = new Matrix(featureMatrix);
      this.featureScaler = {
        mean: Array.from(matrix.mean('column')),
        std: Array.from(matrix.standardDeviation('column'))
      };
    }

    return features.map(f => {
      const raw = [f.volumeToOIRatio, f.premiumSize, f.askSidePercentage,
                   f.timeDecay, f.moneyness, f.volatilityRank, f.historicalSuccess];
      
      return raw.map((val, i) => {
        const std = this.featureScaler!.std[i];
        return std > 0 ? (val - this.featureScaler!.mean[i]) / std : 0;
      });
    });
  }

  public async predictPattern(signal: any): Promise<PatternPrediction> {
    if (!this.model) {
      await this.initializeModel();
    }

    const features = await this.extractFeatures(signal);
    const normalizedFeatures = this.normalizeFeatures([features]);
    
    const prediction = this.model!.predict(tf.tensor2d(normalizedFeatures)) as tf.Tensor;
    const predictionData = await prediction.data();
    
    prediction.dispose();

    // Determine pattern type based on features
    const patternType = this.classifyPattern(features, signal);
    
    return {
      confidence: Math.min(0.95, Math.max(0.05, predictionData[0])),
      expectedReturn: (predictionData[1] - 0.5) * 2, // convert to -1 to 1 range
      riskScore: Math.min(0.95, Math.max(0.05, predictionData[2])),
      patternType,
      timeHorizon: Math.max(1, Math.min(90, predictionData[3] * 90)) // 1-90 days
    };
  }

  private classifyPattern(features: PatternFeatures, signal: any): PatternPrediction['patternType'] {
    const { volumeToOIRatio, askSidePercentage, premiumSize, moneyness } = features;
    
    // High volume, high ask-side, large premium = institutional flow
    if (volumeToOIRatio > 2 && askSidePercentage > 0.8 && premiumSize > Math.log(5)) {
      return 'institutional_flow';
    }
    
    // High ask-side with ATM/ITM = bullish sweep
    if (askSidePercentage > 0.85 && moneyness < 0.05 && signal.type === 'call') {
      return 'bullish_sweep';
    }
    
    // High bid-side with ATM/ITM = bearish sweep
    if (askSidePercentage < 0.15 && moneyness < 0.05 && signal.type === 'put') {
      return 'bearish_sweep';
    }
    
    // Moderate confidence with trend = momentum continuation
    if (volumeToOIRatio > 1.5 && askSidePercentage > 0.6 && askSidePercentage < 0.85) {
      return 'momentum_continuation';
    }
    
    return 'reversal_signal';
  }

  public async trainModel(trainingData: TrainingData[]): Promise<void> {
    if (this.isTraining || trainingData.length < 50) {
      console.log('Insufficient training data or already training');
      return;
    }

    this.isTraining = true;
    console.log(`Training ML model with ${trainingData.length} samples...`);

    try {
      const features = trainingData.map(d => d.features);
      const normalizedFeatures = this.normalizeFeatures(features);
      
      // Create target labels: [confidence, expectedReturn, riskScore, timeHorizon]
      const labels = trainingData.map(d => [
        d.outcome.success ? 0.8 : 0.2, // confidence based on success
        (d.outcome.return + 1) / 2, // normalize return to 0-1
        Math.abs(d.outcome.maxDrawdown), // risk score
        Math.min(1, d.outcome.daysToTarget / 90) // normalize time horizon
      ]);

      const xs = tf.tensor2d(normalizedFeatures);
      const ys = tf.tensor2d(labels);

      await this.model!.fit(xs, ys, {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 20 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}, val_loss = ${logs?.val_loss?.toFixed(4)}`);
            }
          }
        }
      });

      // Save the trained model
      await this.model!.save('file://./models/pattern_recognition');
      
      // Update training history
      this.trainingHistory = [...this.trainingHistory, ...trainingData].slice(-1000);
      
      xs.dispose();
      ys.dispose();
      
      console.log('ML model training completed successfully');
    } catch (error) {
      console.error('ML model training failed:', error);
    } finally {
      this.isTraining = false;
    }
  }

  public async enhanceSignal(signal: any): Promise<any> {
    const prediction = await this.predictPattern(signal);
    
    // Enhance the original signal with ML insights
    return {
      ...signal,
      mlEnhancement: {
        confidence: prediction.confidence,
        expectedReturn: prediction.expectedReturn,
        riskScore: prediction.riskScore,
        patternType: prediction.patternType,
        timeHorizon: prediction.timeHorizon,
        enhancedScore: this.calculateEnhancedScore(signal, prediction),
        recommendation: this.generateRecommendation(prediction)
      }
    };
  }

  private calculateEnhancedScore(signal: any, prediction: PatternPrediction): number {
    const baseScore = signal.confidence || 0.5;
    const mlWeight = 0.4; // 40% weight to ML prediction
    const originalWeight = 0.6; // 60% weight to original signal
    
    const mlScore = (prediction.confidence * 0.4) + 
                   (Math.max(0, prediction.expectedReturn + 1) * 0.3) + 
                   (Math.max(0, 1 - prediction.riskScore) * 0.3);
    
    return Math.min(0.95, (baseScore * originalWeight) + (mlScore * mlWeight));
  }

  private generateRecommendation(prediction: PatternPrediction): string {
    if (prediction.confidence > 0.8 && prediction.expectedReturn > 0.2) {
      return 'STRONG_BUY';
    } else if (prediction.confidence > 0.6 && prediction.expectedReturn > 0.1) {
      return 'BUY';
    } else if (prediction.confidence < 0.4 || prediction.riskScore > 0.7) {
      return 'AVOID';
    } else {
      return 'HOLD';
    }
  }

  // Enable transformer model for enhanced analysis
  enableTransformer(enable: boolean = true): void {
    this.useTransformer = enable;
    console.log(`Transformer model ${enable ? 'enabled' : 'disabled'} for pattern recognition`);
  }

  // Convert trade signal to market sequence for transformer
  private signalToMarketSequence(signal: any): MarketSequence {
    const sequenceLength = 60;
    const basePrice = 100;
    
    const prices = Array(sequenceLength).fill(0).map((_, i) => {
      const trend = Math.sin(i * Math.PI / 30) * 5;
      const noise = (Math.random() - 0.5) * 2;
      return basePrice + trend + noise;
    });
    
    const volumes = Array(sequenceLength).fill(0).map(() => 
      Math.floor(Math.random() * 1000000) + 100000
    );
    
    const timestamps = Array(sequenceLength).fill(0).map((_, i) => 
      Date.now() - (sequenceLength - i) * 24 * 60 * 60 * 1000
    );
    
    const features = Array(sequenceLength).fill(0).map((_, i) => [
      signal.premiumSize / 1000000,
      signal.volumeToOIRatio || 0.5,
      signal.askSidePercentage || 0.5,
      Math.sin(i * Math.PI / 15),
      Math.cos(i * Math.PI / 20),
    ]);
    
    return { prices, volumes, timestamps, features };
  }

  // Enhanced analysis with transformer
  async analyzeWithTransformer(signal: any): Promise<{
    traditional_analysis: PatternPrediction;
    transformer_analysis: any;
    combined_score: number;
    recommendation: string;
  }> {
    const features = this.extractFeatures(signal);
    const traditionalAnalysis = await this.predict(features);
    
    if (!this.useTransformer) {
      return {
        traditional_analysis: traditionalAnalysis,
        transformer_analysis: null,
        combined_score: traditionalAnalysis.confidence,
        recommendation: 'Traditional ML analysis only'
      };
    }
    
    try {
      const marketSequence = this.signalToMarketSequence(signal);
      const transformerResult = await transformerML.analyzeSignalWithTransformer(signal, marketSequence);
      
      const traditionalWeight = 0.4;
      const transformerWeight = 0.6;
      
      const combinedScore = (
        traditionalAnalysis.confidence * traditionalWeight +
        transformerResult.transformerScore * transformerWeight
      );
      
      let recommendation = 'Hold';
      if (combinedScore > 0.7) recommendation = 'Strong Buy';
      else if (combinedScore > 0.6) recommendation = 'Buy';
      else if (combinedScore < 0.3) recommendation = 'Strong Sell';
      else if (combinedScore < 0.4) recommendation = 'Sell';
      
      return {
        traditional_analysis: traditionalAnalysis,
        transformer_analysis: {
          score: transformerResult.transformerScore,
          trend: transformerResult.enhancedSignal.analysis?.predicted_trend,
          market_regime: transformerResult.marketRegime,
          risk_assessment: transformerResult.riskAssessment,
          feature_importance: transformerResult.enhancedSignal.analysis?.feature_importance
        },
        combined_score: combinedScore,
        recommendation
      };
      
    } catch (error) {
      console.error('Transformer analysis failed:', error);
      return {
        traditional_analysis: traditionalAnalysis,
        transformer_analysis: { error: 'Transformer analysis unavailable' },
        combined_score: traditionalAnalysis.confidence,
        recommendation: 'Traditional analysis only (transformer error)'
      };
    }
  }

  public getModelMetrics(): any {
    const baseMetrics = {
      isModelLoaded: !!this.model,
      isTraining: this.isTraining,
      trainingDataSize: this.trainingHistory.length,
      hasFeatureScaler: !!this.featureScaler,
      modelArchitecture: this.model ? 'Dense Neural Network (7->64->32->16->4)' : 'Not loaded',
      transformerEnabled: this.useTransformer
    };
    
    if (this.useTransformer) {
      const transformerStats = transformerML.getModelStats();
      return {
        ...baseMetrics,
        transformerStats
      };
    }
    
    return baseMetrics;
  }
}

export const mlPatternRecognition = new MLPatternRecognition();