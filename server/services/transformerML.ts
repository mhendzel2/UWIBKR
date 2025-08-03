import * as tf from '@tensorflow/tfjs-node';
import type { TradingSignal as BaseTradingSignal } from '@shared/schema';

interface TradeSignal extends BaseTradingSignal {
  type: 'CALL' | 'PUT';
  analysis?: Record<string, unknown>;
}

export interface TransformerConfig {
  sequenceLength: number;
  modelDimension: number;
  numHeads: number;
  numLayers: number;
  feedForwardDim: number;
  vocabularySize: number;
  maxPositionEncoding: number;
}

export interface MarketSequence {
  prices: number[];
  volumes: number[];
  timestamps: number[];
  features: number[][];
  labels?: number[];
}

export interface TransformerPrediction {
  nextPrice: number;
  confidence: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  attention_weights?: number[][][];
  feature_importance?: { [key: string]: number };
}

export class TransformerMLEngine {
  private model: tf.LayersModel | null = null;
  private config: TransformerConfig;
  private scaler: { mean: number[]; std: number[] } | null = null;
  private isTraining = false;

  constructor(config?: Partial<TransformerConfig>) {
    this.config = {
      sequenceLength: 60, // 60 time steps (e.g., 60 minutes or days)
      modelDimension: 128,
      numHeads: 8,
      numLayers: 6,
      feedForwardDim: 512,
      vocabularySize: 10000, // For tokenizing price/volume ranges
      maxPositionEncoding: 1000,
      ...config
    };
  }

  // Positional encoding for time series data
  private createPositionalEncoding(sequenceLength: number, modelDim: number): tf.Tensor2D {
    const positions = tf.range(0, sequenceLength).expandDims(1);
    const dimensions = tf.range(0, modelDim, 2);
    
    const angles = positions.div(
      tf.pow(10000, dimensions.div(modelDim))
    );
    
    const sines = tf.sin(angles);
    const cosines = tf.cos(angles);
    
    // Interleave sines and cosines
    const posEncoding = tf.zeros([sequenceLength, modelDim]);
    
    return posEncoding.add(
      tf.concat([sines, cosines], 1).slice([0, 0], [sequenceLength, modelDim])
    );
  }

  // Multi-head attention mechanism
  private multiHeadAttention(
    queries: tf.Tensor3D,
    keys: tf.Tensor3D,
    values: tf.Tensor3D,
    numHeads: number,
    modelDim: number
  ): { output: tf.Tensor3D; attentionWeights: tf.Tensor4D } {
    const headDim = modelDim / numHeads;
    const batchSize = queries.shape[0];
    const seqLength = queries.shape[1];
    
    // Linear projections
    const qProjected = tf.layers.dense({ units: modelDim, useBias: false }).apply(queries) as tf.Tensor3D;
    const kProjected = tf.layers.dense({ units: modelDim, useBias: false }).apply(keys) as tf.Tensor3D;
    const vProjected = tf.layers.dense({ units: modelDim, useBias: false }).apply(values) as tf.Tensor3D;
    
    // Reshape for multi-head attention
    const qReshaped = qProjected.reshape([batchSize, seqLength, numHeads, headDim]).transpose([0, 2, 1, 3]);
    const kReshaped = kProjected.reshape([batchSize, seqLength, numHeads, headDim]).transpose([0, 2, 1, 3]);
    const vReshaped = vProjected.reshape([batchSize, seqLength, numHeads, headDim]).transpose([0, 2, 1, 3]);
    
    // Scaled dot-product attention
    const scores = tf.matMul(qReshaped, kReshaped.transpose([0, 1, 3, 2])).div(Math.sqrt(headDim));
    const attentionWeights = tf.softmax(scores, -1) as tf.Tensor4D;
    const attended = tf.matMul(attentionWeights, vReshaped);
    
    // Concatenate heads
    const concatenated = attended.transpose([0, 2, 1, 3]).reshape([batchSize, seqLength, modelDim]);
    
    // Final linear projection
    const output = tf.layers.dense({ units: modelDim }).apply(concatenated) as tf.Tensor3D;
    
    return { output, attentionWeights };
  }

  // Build transformer encoder layer
  private createTransformerEncoderLayer(modelDim: number, numHeads: number, feedForwardDim: number): tf.LayersModel {
    const input = tf.input({ shape: [this.config.sequenceLength, modelDim] });
    
    // Multi-head self-attention
    const attention = (tf.layers as any).multiHeadAttention({
      numHeads,
      keyDim: modelDim / numHeads,
      dropout: 0.1
    }).apply(input, input) as tf.SymbolicTensor;
    
    // Add & Norm
    const addNorm1 = tf.layers.add().apply([input, attention]);
    const norm1 = tf.layers.layerNormalization().apply(addNorm1) as tf.SymbolicTensor;
    
    // Feed-forward network
    const feedForward = tf.sequential({
      layers: [
        tf.layers.dense({ units: feedForwardDim, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.1 }),
        tf.layers.dense({ units: modelDim })
      ]
    });
    
    const ffOutput = feedForward.apply(norm1) as tf.SymbolicTensor;
    
    // Add & Norm
    const addNorm2 = tf.layers.add().apply([norm1, ffOutput]);
    const output = tf.layers.layerNormalization().apply(addNorm2) as tf.SymbolicTensor;
    
    return tf.model({ inputs: input, outputs: output });
  }

  // Build complete transformer model
  async buildTransformerModel(): Promise<void> {
    console.log('Building transformer model for financial time series...');
    
    const input = tf.input({ shape: [this.config.sequenceLength, this.config.modelDimension] });
    
    // Positional encoding
      const posEncoding = this.createPositionalEncoding(
        this.config.sequenceLength,
        this.config.modelDimension
      );

      const posEncodingTensor = posEncoding as unknown as tf.SymbolicTensor;
      let x = tf.layers.add().apply([input, posEncodingTensor]) as tf.SymbolicTensor;
    
    // Stack transformer encoder layers
    for (let i = 0; i < this.config.numLayers; i++) {
      const encoderLayer = this.createTransformerEncoderLayer(
        this.config.modelDimension,
        this.config.numHeads,
        this.config.feedForwardDim
      );
      x = encoderLayer.apply(x) as tf.SymbolicTensor;
    }
    
    // Global average pooling
    x = tf.layers.globalAveragePooling1d().apply(x) as tf.SymbolicTensor;
    
    // Classification/regression head
    x = tf.layers.dense({ units: 256, activation: 'relu' }).apply(x) as tf.SymbolicTensor;
    x = tf.layers.dropout({ rate: 0.2 }).apply(x) as tf.SymbolicTensor;
    x = tf.layers.dense({ units: 64, activation: 'relu' }).apply(x) as tf.SymbolicTensor;
    
    // Output layers for multiple tasks
    const priceOutput = tf.layers.dense({ 
      units: 1, 
      activation: 'linear',
      name: 'price_prediction'
    }).apply(x) as tf.SymbolicTensor;
    
    const trendOutput = tf.layers.dense({ 
      units: 3, 
      activation: 'softmax',
      name: 'trend_classification'
    }).apply(x) as tf.SymbolicTensor;
    
    const volatilityOutput = tf.layers.dense({ 
      units: 1, 
      activation: 'sigmoid',
      name: 'volatility_prediction'
    }).apply(x) as tf.SymbolicTensor;
    
    this.model = tf.model({
      inputs: input,
      outputs: [priceOutput, trendOutput, volatilityOutput]
    });
    
    // Compile with multiple loss functions
    this.model.compile({
      optimizer: tf.train.adamax(0.001),
      loss: {
        price_prediction: 'meanSquaredError',
        trend_classification: 'categoricalCrossentropy',
        volatility_prediction: 'binaryCrossentropy'
      },
      metrics: ['accuracy', 'mse']
    });
    
    console.log('Transformer model built successfully');
    console.log(`Model parameters: ${this.model.countParams()}`);
  }

  // Preprocess market data for transformer input
  private preprocessMarketData(sequences: MarketSequence[]): {
    inputs: tf.Tensor3D;
    priceTargets: tf.Tensor2D;
    trendTargets: tf.Tensor2D;
    volatilityTargets: tf.Tensor2D;
  } {
    const batchSize = sequences.length;
    const seqLength = this.config.sequenceLength;
    const featureDim = this.config.modelDimension;
    
    // Create input tensor
    const inputData = new Float32Array(batchSize * seqLength * featureDim);
    const priceTargetData = new Float32Array(batchSize);
    const trendTargetData = new Float32Array(batchSize * 3);
    const volatilityTargetData = new Float32Array(batchSize);
    
    sequences.forEach((seq, batchIdx) => {
      // Normalize prices and volumes
      const normalizedPrices = this.normalizeSequence(seq.prices);
      const normalizedVolumes = this.normalizeSequence(seq.volumes);
      
      // Create features combining price, volume, and technical indicators
      for (let timeIdx = 0; timeIdx < seqLength; timeIdx++) {
        const baseIdx = batchIdx * seqLength * featureDim + timeIdx * featureDim;
        
        // Price features (first 32 dimensions)
        inputData[baseIdx] = normalizedPrices[timeIdx] || 0;
        inputData[baseIdx + 1] = normalizedVolumes[timeIdx] || 0;
        
        // Technical indicators (SMA, RSI, etc.)
        if (seq.features && seq.features[timeIdx]) {
          for (let featIdx = 0; featIdx < Math.min(30, seq.features[timeIdx].length); featIdx++) {
            inputData[baseIdx + 2 + featIdx] = seq.features[timeIdx][featIdx];
          }
        }
        
        // Fill remaining dimensions with derived features
        for (let i = 32; i < featureDim; i++) {
          inputData[baseIdx + i] = Math.sin(timeIdx * Math.PI / seqLength) * normalizedPrices[timeIdx] || 0;
        }
      }
      
      // Set targets
      if (seq.labels && seq.labels.length > 0) {
        priceTargetData[batchIdx] = seq.labels[0]; // Next price
        
        // Trend classification (0: bearish, 1: neutral, 2: bullish)
        const trendLabel = seq.labels[1] || 1;
        trendTargetData[batchIdx * 3 + trendLabel] = 1.0;
        
        // Volatility prediction
        volatilityTargetData[batchIdx] = seq.labels[2] || 0.5;
      }
    });
    
    return {
      inputs: tf.tensor3d(inputData, [batchSize, seqLength, featureDim]),
      priceTargets: tf.tensor2d(priceTargetData, [batchSize, 1]),
      trendTargets: tf.tensor2d(trendTargetData, [batchSize, 3]),
      volatilityTargets: tf.tensor2d(volatilityTargetData, [batchSize, 1])
    };
  }

  private normalizeSequence(sequence: number[]): number[] {
    if (sequence.length === 0) return [];
    
    const mean = sequence.reduce((a, b) => a + b, 0) / sequence.length;
    const std = Math.sqrt(sequence.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sequence.length);
    
    return sequence.map(val => std > 0 ? (val - mean) / std : 0);
  }

  // Train transformer on market data
  async trainTransformer(marketSequences: MarketSequence[]): Promise<void> {
    if (!this.model) {
      await this.buildTransformerModel();
    }
    
    if (this.isTraining) {
      console.log('Training already in progress...');
      return;
    }
    
    this.isTraining = true;
    console.log(`Training transformer on ${marketSequences.length} sequences...`);
    
    try {
      const { inputs, priceTargets, trendTargets, volatilityTargets } = 
        this.preprocessMarketData(marketSequences);
      
      // Training configuration
      const trainConfig = {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch: number, logs: any) => {
            console.log(`Epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)}, val_loss=${logs.val_loss.toFixed(4)}`);
          }
        }
      };
      
      // Train the model
      await this.model!.fit(
        inputs,
        {
          price_prediction: priceTargets,
          trend_classification: trendTargets,
          volatility_prediction: volatilityTargets
        },
        trainConfig
      );
      
      console.log('Transformer training completed');
      
      // Cleanup tensors
      inputs.dispose();
      priceTargets.dispose();
      trendTargets.dispose();
      volatilityTargets.dispose();
      
    } catch (error) {
      console.error('Training failed:', error);
      throw error;
    } finally {
      this.isTraining = false;
    }
  }

  // Make predictions using transformer
  async predict(marketSequence: MarketSequence): Promise<TransformerPrediction> {
    if (!this.model) {
      throw new Error('Model not trained. Call trainTransformer first.');
    }
    
    const { inputs } = this.preprocessMarketData([marketSequence]);
    
    try {
      const predictions = this.model.predict(inputs) as tf.Tensor[];
      
      // Extract predictions
      const priceData = await predictions[0].data();
      const trendData = await predictions[1].data();
      const volatilityData = await predictions[2].data();
      
      // Get trend classification
      const trendIndex = trendData.indexOf(Math.max(...Array.from(trendData)));
      const trends = ['bearish', 'neutral', 'bullish'] as const;
      
      // Calculate confidence based on prediction certainty
      const maxTrendProb = Math.max(...Array.from(trendData));
      const confidence = maxTrendProb * (1 - Math.abs(priceData[0] - 0.5));
      
      inputs.dispose();
      predictions.forEach(tensor => tensor.dispose());

      return {
        nextPrice: priceData[0],
        confidence,
        trend: trends[trendIndex]
      };
      
    } catch (error) {
      inputs.dispose();
      throw error;
    }
  }

  // Analyze trading signals using transformer
  async analyzeSignalWithTransformer(signal: TradeSignal, historicalData: MarketSequence): Promise<{
    enhancedSignal: TradeSignal;
    transformerScore: number;
    marketRegime: string;
    riskAssessment: string;
  }> {
    const prediction = await this.predict(historicalData);
    
    // Calculate transformer-based enhancement score
    let transformerScore = 0.5; // Base score
    
    // Factor in price prediction alignment
    if (signal.type === 'CALL' && prediction.trend === 'bullish') {
      transformerScore += 0.3;
    } else if (signal.type === 'PUT' && prediction.trend === 'bearish') {
      transformerScore += 0.3;
    }
    
    // Factor in confidence
    transformerScore += (prediction.confidence - 0.5) * 0.4;
    
    // Clamp score between 0 and 1
    transformerScore = Math.max(0, Math.min(1, transformerScore));
    
    // Determine market regime
    const volatility = prediction.feature_importance?.['volatility_regime'] ?? 0;
    let marketRegime = 'normal';
    if (volatility > 0.15) marketRegime = 'high_volatility';
    else if (volatility < 0.05) marketRegime = 'low_volatility';
    
    // Risk assessment
    let riskAssessment = 'moderate';
    if (prediction.confidence < 0.3) riskAssessment = 'high';
    else if (prediction.confidence > 0.8 && transformerScore > 0.7) riskAssessment = 'low';
    
    // Enhanced signal with transformer insights
    const enhancedSignal: TradeSignal = {
      ...signal,
        confidence: Math.max(parseFloat(signal.confidence), transformerScore).toString(),
      analysis: {
        ...signal.analysis,
        transformer_score: transformerScore,
        predicted_trend: prediction.trend,
        market_regime: marketRegime,
        feature_importance: prediction.feature_importance
      }
    };
    
    return {
      enhancedSignal,
      transformerScore,
      marketRegime,
      riskAssessment
    };
  }

  // Save trained model
  async saveModel(path: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }
    
    await this.model.save(`file://${path}`);
    console.log(`Transformer model saved to ${path}`);
  }

  // Load pre-trained model
  async loadModel(path: string): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(`file://${path}`);
      console.log(`Transformer model loaded from ${path}`);
    } catch (error) {
      console.error('Failed to load model:', error);
      throw error;
    }
  }

  // Get model statistics
  getModelStats(): {
    parameters: number;
    layers: number;
    memoryUsage: string;
    isTraining: boolean;
  } | null {
    if (!this.model) return null;
    
    return {
      parameters: this.model.countParams(),
      layers: this.model.layers.length,
      memoryUsage: `${(tf.memory().numBytes / 1024 / 1024).toFixed(1)} MB`,
      isTraining: this.isTraining
    };
  }
}

export const transformerML = new TransformerMLEngine();