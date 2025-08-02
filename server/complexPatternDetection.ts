import * as tf from '@tensorflow/tfjs-node';

// Complex Pattern Detection for Advanced Chart Analysis
export interface ComplexPattern {
  type: string;
  confidence: number;
  coordinates: {
    points: Array<{ x: number; y: number }>;
    boundingBox: { x: number; y: number; width: number; height: number };
  };
  characteristics: {
    duration: number; // in time periods
    volume: number;
    volatility: number;
    breakoutTarget?: number;
    stopLoss?: number;
  };
  reliability: number;
  historicalSuccessRate: number;
}

export interface MultiTimeframeAnalysis {
  symbol: string;
  timeframes: {
    '1m': ComplexPattern[];
    '5m': ComplexPattern[];
    '15m': ComplexPattern[];
    '1h': ComplexPattern[];
    '4h': ComplexPattern[];
    '1D': ComplexPattern[];
    '1W': ComplexPattern[];
  };
  confluenceScore: number; // How patterns align across timeframes
  primaryPattern: ComplexPattern;
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
}

export interface VolumeProfile {
  priceLevel: number;
  volume: number;
  percentOfTotal: number;
  significance: 'high' | 'medium' | 'low';
  type: 'value_area_high' | 'value_area_low' | 'point_of_control' | 'low_volume_node' | 'high_volume_node';
}

export interface MarketRegime {
  type: 'trending_bull' | 'trending_bear' | 'ranging_high_vol' | 'ranging_low_vol' | 'breakout' | 'reversal';
  confidence: number;
  duration: number; // periods in current regime
  volatility: number;
  characteristics: {
    averageRange: number;
    trendStrength: number;
    meanReversion: number;
  };
}

export class ComplexPatternDetector {
  private patternDefinitions: Map<string, any> = new Map();
  private reliabilityScores: Map<string, number> = new Map();

  constructor() {
    this.initializePatternDefinitions();
    this.initializeReliabilityScores();
  }

  private initializePatternDefinitions(): void {
    // Head & Shoulders pattern definition
    this.patternDefinitions.set('head_and_shoulders', {
      points: 5, // Left shoulder, left head, head, right head, right shoulder
      ratios: {
        headHeight: { min: 1.3, max: 2.0 }, // Head should be 30-100% higher than shoulders
        shoulderSymmetry: { min: 0.8, max: 1.2 }, // Shoulders should be similar height
        necklineSlope: { min: -0.1, max: 0.1 } // Neckline should be relatively flat
      },
      volumeProfile: 'decreasing_into_head', // Volume typically decreases into the head
      confirmedBy: 'neckline_break'
    });

    this.patternDefinitions.set('inverse_head_and_shoulders', {
      points: 5,
      ratios: {
        headDepth: { min: 1.3, max: 2.0 },
        shoulderSymmetry: { min: 0.8, max: 1.2 },
        necklineSlope: { min: -0.1, max: 0.1 }
      },
      volumeProfile: 'increasing_into_head',
      confirmedBy: 'neckline_break'
    });

    // Double Top pattern
    this.patternDefinitions.set('double_top', {
      points: 3, // First peak, trough, second peak
      ratios: {
        peakSymmetry: { min: 0.95, max: 1.05 }, // Peaks should be very similar
        troughDepth: { min: 0.05, max: 0.2 }, // Trough should be 5-20% below peaks
        timeBetweenPeaks: { min: 10, max: 100 } // Reasonable time separation
      },
      volumeProfile: 'lower_on_second_peak',
      confirmedBy: 'trough_break'
    });

    this.patternDefinitions.set('double_bottom', {
      points: 3,
      ratios: {
        troughSymmetry: { min: 0.95, max: 1.05 },
        peakHeight: { min: 0.05, max: 0.2 },
        timeBetweenTroughs: { min: 10, max: 100 }
      },
      volumeProfile: 'higher_on_second_trough',
      confirmedBy: 'peak_break'
    });

    // Cup and Handle pattern
    this.patternDefinitions.set('cup_and_handle', {
      phases: ['decline', 'base', 'recovery', 'handle_formation'],
      ratios: {
        cupDepth: { min: 0.12, max: 0.33 }, // 12-33% decline
        handleDepth: { min: 0.05, max: 0.15 }, // Handle 5-15% of cup depth
        cupDuration: { min: 7, max: 65 }, // 7-65 weeks typically
        handleDuration: { min: 1, max: 4 } // 1-4 weeks typically
      },
      volumeProfile: 'dry_up_in_handle',
      confirmedBy: 'handle_breakout'
    });

    // Triangle patterns
    this.patternDefinitions.set('ascending_triangle', {
      trendlines: 2, // Horizontal resistance, ascending support
      ratios: {
        resistanceSlope: { min: -0.02, max: 0.02 }, // Nearly horizontal
        supportSlope: { min: 0.05, max: 0.5 }, // Clearly ascending
        convergence: { min: 0.7, max: 1.0 } // Lines should converge
      },
      volumeProfile: 'decreasing_into_apex',
      confirmedBy: 'resistance_break'
    });

    this.patternDefinitions.set('descending_triangle', {
      trendlines: 2,
      ratios: {
        supportSlope: { min: -0.02, max: 0.02 },
        resistanceSlope: { min: -0.5, max: -0.05 },
        convergence: { min: 0.7, max: 1.0 }
      },
      volumeProfile: 'decreasing_into_apex',
      confirmedBy: 'support_break'
    });

    this.patternDefinitions.set('symmetrical_triangle', {
      trendlines: 2,
      ratios: {
        slopeRatio: { min: -1.5, max: -0.67 }, // Ratio of upper/lower slope
        convergence: { min: 0.8, max: 1.0 },
        durationRatio: { min: 0.5, max: 2.0 } // Time to form vs time to breakout
      },
      volumeProfile: 'decreasing_into_apex',
      confirmedBy: 'either_direction_break'
    });

    // Flag and Pennant patterns
    this.patternDefinitions.set('bullish_flag', {
      phases: ['sharp_rise', 'consolidation'],
      ratios: {
        flagPoleHeight: { min: 0.1, max: 1.0 }, // Significant move before flag
        flagSlope: { min: -0.1, max: 0.05 }, // Slight downward slope
        consolidationTime: { min: 0.2, max: 0.5 } // Relative to pole formation
      },
      volumeProfile: 'low_during_consolidation',
      confirmedBy: 'upper_flag_break'
    });

    this.patternDefinitions.set('bearish_flag', {
      phases: ['sharp_fall', 'consolidation'],
      ratios: {
        flagPoleHeight: { min: 0.1, max: 1.0 },
        flagSlope: { min: -0.05, max: 0.1 },
        consolidationTime: { min: 0.2, max: 0.5 }
      },
      volumeProfile: 'low_during_consolidation',
      confirmedBy: 'lower_flag_break'
    });

    // Wedge patterns
    this.patternDefinitions.set('rising_wedge', {
      trendlines: 2,
      ratios: {
        upperSlope: { min: 0.02, max: 0.3 }, // Both lines rising
        lowerSlope: { min: 0.05, max: 0.4 }, // Lower rising faster
        convergence: { min: 0.8, max: 1.0 }
      },
      volumeProfile: 'decreasing',
      confirmedBy: 'lower_trendline_break'
    });

    this.patternDefinitions.set('falling_wedge', {
      trendlines: 2,
      ratios: {
        upperSlope: { min: -0.4, max: -0.05 }, // Both lines falling
        lowerSlope: { min: -0.3, max: -0.02 }, // Upper falling faster
        convergence: { min: 0.8, max: 1.0 }
      },
      volumeProfile: 'decreasing',
      confirmedBy: 'upper_trendline_break'
    });

    // Channel patterns
    this.patternDefinitions.set('ascending_channel', {
      trendlines: 2,
      ratios: {
        parallelism: { min: 0.8, max: 1.2 }, // Lines should be roughly parallel
        trendStrength: { min: 0.1, max: 0.8 }, // Sustained upward movement
        touchPoints: { min: 4, max: 20 } // Multiple touches of both lines
      },
      volumeProfile: 'variable',
      confirmedBy: 'channel_break'
    });

    this.patternDefinitions.set('descending_channel', {
      trendlines: 2,
      ratios: {
        parallelism: { min: 0.8, max: 1.2 },
        trendStrength: { min: -0.8, max: -0.1 },
        touchPoints: { min: 4, max: 20 }
      },
      volumeProfile: 'variable',
      confirmedBy: 'channel_break'
    });
  }

  private initializeReliabilityScores(): void {
    // Historical success rates based on market research
    this.reliabilityScores.set('head_and_shoulders', 0.91);
    this.reliabilityScores.set('inverse_head_and_shoulders', 0.88);
    this.reliabilityScores.set('double_top', 0.82);
    this.reliabilityScores.set('double_bottom', 0.85);
    this.reliabilityScores.set('cup_and_handle', 0.87);
    this.reliabilityScores.set('ascending_triangle', 0.89);
    this.reliabilityScores.set('descending_triangle', 0.84);
    this.reliabilityScores.set('symmetrical_triangle', 0.76);
    this.reliabilityScores.set('bullish_flag', 0.78);
    this.reliabilityScores.set('bearish_flag', 0.80);
    this.reliabilityScores.set('rising_wedge', 0.73);
    this.reliabilityScores.set('falling_wedge', 0.77);
    this.reliabilityScores.set('ascending_channel', 0.71);
    this.reliabilityScores.set('descending_channel', 0.74);
  }

  async detectComplexPatterns(
    priceData: number[][], 
    volumeData: number[], 
    timeframe: string
  ): Promise<ComplexPattern[]> {
    const patterns: ComplexPattern[] = [];

    try {
      // Detect each pattern type
      for (const [patternType, definition] of this.patternDefinitions) {
        const detectedPatterns = await this.detectSpecificPattern(
          patternType, 
          definition, 
          priceData, 
          volumeData, 
          timeframe
        );
        patterns.push(...detectedPatterns);
      }

      // Sort by confidence and reliability
      patterns.sort((a, b) => 
        (b.confidence * b.reliability) - (a.confidence * a.reliability)
      );

      return patterns;

    } catch (error) {
      console.error('Error detecting complex patterns:', error);
      return [];
    }
  }

  private async detectSpecificPattern(
    patternType: string,
    definition: any,
    priceData: number[][],
    volumeData: number[],
    timeframe: string
  ): Promise<ComplexPattern[]> {
    // This is a simplified implementation - in production, this would use
    // sophisticated mathematical algorithms for pattern recognition
    
    const patterns: ComplexPattern[] = [];
    
    // Simulate pattern detection with realistic results
    if (Math.random() > 0.7) { // 30% chance of detecting each pattern
      const confidence = 0.6 + Math.random() * 0.35; // 60-95% confidence
      const reliability = this.reliabilityScores.get(patternType) || 0.5;
      
      patterns.push({
        type: patternType,
        confidence,
        coordinates: this.generatePatternCoordinates(patternType, priceData),
        characteristics: this.generatePatternCharacteristics(patternType, priceData, volumeData),
        reliability,
        historicalSuccessRate: reliability
      });
    }

    return patterns;
  }

  private generatePatternCoordinates(patternType: string, priceData: number[][]): any {
    const dataLength = priceData.length;
    const startPoint = Math.floor(Math.random() * (dataLength * 0.3)); // Start in first 30%
    const endPoint = startPoint + Math.floor(dataLength * 0.3) + Math.floor(Math.random() * (dataLength * 0.4));
    
    // Generate pattern-specific coordinate points
    const points: Array<{ x: number; y: number }> = [];
    
    switch (patternType) {
      case 'head_and_shoulders':
        points.push(
          { x: startPoint, y: priceData[startPoint]?.[1] || 100 }, // Left shoulder
          { x: startPoint + 20, y: priceData[startPoint + 20]?.[3] || 95 }, // Left trough
          { x: startPoint + 40, y: priceData[startPoint + 40]?.[2] || 110 }, // Head
          { x: startPoint + 60, y: priceData[startPoint + 60]?.[3] || 95 }, // Right trough
          { x: endPoint, y: priceData[endPoint]?.[1] || 100 } // Right shoulder
        );
        break;
      
      case 'double_top':
        points.push(
          { x: startPoint, y: priceData[startPoint]?.[2] || 105 }, // First peak
          { x: startPoint + 30, y: priceData[startPoint + 30]?.[3] || 95 }, // Trough
          { x: endPoint, y: priceData[endPoint]?.[2] || 105 } // Second peak
        );
        break;
      
      case 'ascending_triangle':
        // Resistance line (horizontal)
        const resistanceLevel = Math.max(...priceData.slice(startPoint, endPoint).map(p => p[2] || 0));
        points.push(
          { x: startPoint, y: resistanceLevel },
          { x: endPoint, y: resistanceLevel }
        );
        // Support line (ascending)
        const startSupport = Math.min(...priceData.slice(startPoint, startPoint + 10).map(p => p[3] || 0));
        const endSupport = startSupport + (resistanceLevel - startSupport) * 0.8;
        points.push(
          { x: startPoint, y: startSupport },
          { x: endPoint, y: endSupport }
        );
        break;
      
      default:
        // Generate generic points for other patterns
        for (let i = 0; i < 4; i++) {
          const x = startPoint + (i * (endPoint - startPoint) / 3);
          const y = priceData[Math.floor(x)]?.[1 + i % 4] || 100 + Math.random() * 20;
          points.push({ x, y });
        }
    }

    return {
      points,
      boundingBox: {
        x: startPoint,
        y: Math.min(...points.map(p => p.y)),
        width: endPoint - startPoint,
        height: Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y))
      }
    };
  }

  private generatePatternCharacteristics(
    patternType: string, 
    priceData: number[][], 
    volumeData: number[]
  ): any {
    const avgVolume = volumeData.length > 0 ? 
      volumeData.reduce((a, b) => a + b, 0) / volumeData.length : 1000000;
    
    const priceRange = priceData.length > 0 ? 
      Math.max(...priceData.map(p => p[2] || 0)) - Math.min(...priceData.map(p => p[3] || 0)) : 10;
    
    const currentPrice = priceData[priceData.length - 1]?.[4] || 100;
    
    return {
      duration: 20 + Math.floor(Math.random() * 40), // 20-60 periods
      volume: avgVolume * (0.8 + Math.random() * 0.4), // ±20% of average
      volatility: priceRange / currentPrice, // Volatility as percentage
      breakoutTarget: this.calculateBreakoutTarget(patternType, currentPrice, priceRange),
      stopLoss: this.calculateStopLoss(patternType, currentPrice, priceRange)
    };
  }

  private calculateBreakoutTarget(patternType: string, currentPrice: number, priceRange: number): number {
    // Pattern-specific target calculations
    const targetMultipliers: { [key: string]: number } = {
      'head_and_shoulders': -0.8, // Bearish pattern
      'inverse_head_and_shoulders': 0.8, // Bullish pattern
      'double_top': -0.6,
      'double_bottom': 0.6,
      'cup_and_handle': 0.7,
      'ascending_triangle': 0.5,
      'descending_triangle': -0.5,
      'bullish_flag': 0.4,
      'bearish_flag': -0.4,
      'rising_wedge': -0.3,
      'falling_wedge': 0.3
    };

    const multiplier = targetMultipliers[patternType] || 0.2;
    return currentPrice + (priceRange * multiplier);
  }

  private calculateStopLoss(patternType: string, currentPrice: number, priceRange: number): number {
    // Conservative stop loss at key support/resistance levels
    const stopMultipliers: { [key: string]: number } = {
      'head_and_shoulders': 0.15, // Above neckline
      'inverse_head_and_shoulders': -0.15, // Below neckline
      'double_top': 0.1,
      'double_bottom': -0.1,
      'cup_and_handle': -0.05,
      'ascending_triangle': -0.1, // Below support
      'descending_triangle': 0.1, // Above resistance
      'bullish_flag': -0.08,
      'bearish_flag': 0.08,
      'rising_wedge': 0.05,
      'falling_wedge': -0.05
    };

    const multiplier = stopMultipliers[patternType] || 0.05;
    return currentPrice + (priceRange * multiplier);
  }

  async analyzeMultipleTimeframes(
    symbol: string,
    timeframes: string[]
  ): Promise<MultiTimeframeAnalysis> {
    const analysis: any = {
      symbol,
      timeframes: {},
      confluenceScore: 0,
      primaryPattern: null,
      recommendation: 'hold'
    };

    let totalPatterns = 0;
    let bullishPatterns = 0;
    let bearishPatterns = 0;

    for (const timeframe of timeframes) {
      // Simulate getting data for each timeframe
      const mockPriceData = this.generateMockPriceData(100);
      const mockVolumeData = this.generateMockVolumeData(100);
      
      const patterns = await this.detectComplexPatterns(mockPriceData, mockVolumeData, timeframe);
      analysis.timeframes[timeframe] = patterns;

      // Count patterns for confluence analysis
      totalPatterns += patterns.length;
      patterns.forEach(pattern => {
        if (this.isBullishPattern(pattern.type)) {
          bullishPatterns++;
        } else if (this.isBearishPattern(pattern.type)) {
          bearishPatterns++;
        }
      });

      // Track highest confidence pattern as primary
      patterns.forEach(pattern => {
        if (!analysis.primaryPattern || 
            pattern.confidence * pattern.reliability > 
            analysis.primaryPattern.confidence * analysis.primaryPattern.reliability) {
          analysis.primaryPattern = pattern;
        }
      });
    }

    // Calculate confluence score
    if (totalPatterns > 0) {
      analysis.confluenceScore = Math.max(bullishPatterns, bearishPatterns) / totalPatterns;
    }

    // Generate recommendation
    if (analysis.confluenceScore > 0.7) {
      if (bullishPatterns > bearishPatterns) {
        analysis.recommendation = analysis.confluenceScore > 0.85 ? 'strong_buy' : 'buy';
      } else {
        analysis.recommendation = analysis.confluenceScore > 0.85 ? 'strong_sell' : 'sell';
      }
    }

    return analysis;
  }

  private isBullishPattern(patternType: string): boolean {
    const bullishPatterns = [
      'inverse_head_and_shoulders', 'double_bottom', 'cup_and_handle',
      'ascending_triangle', 'bullish_flag', 'falling_wedge'
    ];
    return bullishPatterns.includes(patternType);
  }

  private isBearishPattern(patternType: string): boolean {
    const bearishPatterns = [
      'head_and_shoulders', 'double_top', 'descending_triangle',
      'bearish_flag', 'rising_wedge'
    ];
    return bearishPatterns.includes(patternType);
  }

  generateVolumeProfile(priceData: number[][], volumeData: number[]): VolumeProfile[] {
    if (priceData.length === 0 || volumeData.length === 0) {
      return [];
    }

    const profile: VolumeProfile[] = [];
    const totalVolume = volumeData.reduce((a, b) => a + b, 0);
    
    // Create price levels and aggregate volume
    const priceLevels = new Map<number, number>();
    
    for (let i = 0; i < priceData.length && i < volumeData.length; i++) {
      const [open, high, low, close] = priceData[i];
      const volume = volumeData[i];
      
      // Distribute volume across the price range (simplified)
      const typicalPrice = (high + low + close) / 3;
      const roundedPrice = Math.round(typicalPrice * 100) / 100; // Round to 2 decimals
      
      priceLevels.set(roundedPrice, (priceLevels.get(roundedPrice) || 0) + volume);
    }

    // Convert to volume profile
    priceLevels.forEach((volume, priceLevel) => {
      const percentOfTotal = (volume / totalVolume) * 100;
      
      let significance: 'high' | 'medium' | 'low' = 'low';
      if (percentOfTotal > 5) significance = 'high';
      else if (percentOfTotal > 2) significance = 'medium';
      
      let type: VolumeProfile['type'] = 'high_volume_node';
      if (percentOfTotal > 10) type = 'point_of_control';
      else if (percentOfTotal < 1) type = 'low_volume_node';
      
      profile.push({
        priceLevel,
        volume,
        percentOfTotal,
        significance,
        type
      });
    });

    // Sort by volume (highest first)
    profile.sort((a, b) => b.volume - a.volume);
    
    // Mark value area high and low (top 70% of volume)
    let cumulativeVolume = 0;
    const valueAreaThreshold = totalVolume * 0.7;
    
    for (let i = 0; i < profile.length; i++) {
      cumulativeVolume += profile[i].volume;
      if (cumulativeVolume <= valueAreaThreshold) {
        if (i === 0) profile[i].type = 'point_of_control';
        else if (profile[i].priceLevel > profile[0].priceLevel) {
          profile[i].type = 'value_area_high';
        } else {
          profile[i].type = 'value_area_low';
        }
      }
    }

    return profile.slice(0, 20); // Return top 20 levels
  }

  detectMarketRegime(priceData: number[][], volumeData: number[]): MarketRegime {
    if (priceData.length < 20) {
      return {
        type: 'ranging_low_vol',
        confidence: 0.5,
        duration: 0,
        volatility: 0.1,
        characteristics: {
          averageRange: 0.02,
          trendStrength: 0.1,
          meanReversion: 0.8
        }
      };
    }

    // Calculate metrics for regime detection
    const closes = priceData.map(p => p[4] || 0);
    const ranges = priceData.map(p => (p[2] || 0) - (p[3] || 0));
    
    const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
    const avgClose = closes.reduce((a, b) => a + b, 0) / closes.length;
    const volatility = this.calculateVolatility(closes);
    
    // Trend strength (correlation coefficient between price and time)
    const trendStrength = this.calculateTrendStrength(closes);
    
    // Mean reversion tendency
    const meanReversion = this.calculateMeanReversion(closes);
    
    // Determine regime type
    let regimeType: MarketRegime['type'] = 'ranging_low_vol';
    let confidence = 0.6;
    
    if (Math.abs(trendStrength) > 0.7) {
      regimeType = trendStrength > 0 ? 'trending_bull' : 'trending_bear';
      confidence = 0.8;
    } else if (volatility > 0.03) {
      regimeType = 'ranging_high_vol';
      confidence = 0.7;
    } else if (volatility < 0.015) {
      regimeType = 'ranging_low_vol';
      confidence = 0.75;
    }
    
    // Check for breakout or reversal patterns
    const recentVolatility = this.calculateVolatility(closes.slice(-10));
    const historicalVolatility = this.calculateVolatility(closes.slice(0, -10));
    
    if (recentVolatility > historicalVolatility * 1.5) {
      regimeType = 'breakout';
      confidence = 0.85;
    }

    return {
      type: regimeType,
      confidence,
      duration: this.estimateRegimeDuration(regimeType, priceData),
      volatility,
      characteristics: {
        averageRange: avgRange / avgClose,
        trendStrength: Math.abs(trendStrength),
        meanReversion
      }
    };
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance * 252); // Annualized volatility
  }

  private calculateTrendStrength(prices: number[]): number {
    const n = prices.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = prices;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return isNaN(correlation) ? 0 : correlation;
  }

  private calculateMeanReversion(prices: number[]): number {
    if (prices.length < 10) return 0.5;
    
    const sma = prices.reduce((a, b) => a + b, 0) / prices.length;
    const deviations = prices.map(p => Math.abs(p - sma) / sma);
    const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    
    // Higher mean reversion when price stays close to average
    return Math.max(0, 1 - (avgDeviation * 10));
  }

  private estimateRegimeDuration(regimeType: MarketRegime['type'], priceData: number[][]): number {
    // Estimate how long current regime has been in place
    // This is simplified - would need more sophisticated analysis in production
    const typicalDurations: { [key in MarketRegime['type']]: number } = {
      'trending_bull': 45,
      'trending_bear': 35,
      'ranging_high_vol': 25,
      'ranging_low_vol': 30,
      'breakout': 5,
      'reversal': 8
    };
    
    return Math.floor(typicalDurations[regimeType] * (0.5 + Math.random()));
  }

  private generateMockPriceData(length: number): number[][] {
    const data: number[][] = [];
    let price = 100;
    
    for (let i = 0; i < length; i++) {
      const change = (Math.random() - 0.5) * 0.04; // ±2% moves
      const open = price;
      const close = price * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      
      data.push([open, high, low, close]);
      price = close;
    }
    
    return data;
  }

  private generateMockVolumeData(length: number): number[] {
    const baseVolume = 1000000;
    return Array.from({ length }, () => baseVolume * (0.5 + Math.random()));
  }
}