import {
  MarketData,
  MarketStructureSignal,
  MarketStructurePoint,
} from "../types/market.model";
import {
  detectMarketStructureSignal,
  detectMarketStructurePoints,
  getMarketTrend,
} from "../utils/market-structure.utils";

export class MarketStructureService {
  private lastStructureSignal: MarketStructureSignal | null = null;
  private signalCooldown: number = 10 * 60 * 1000; // 10 minutes cooldown between signals (longer than divergence)
  private config: { pivotLength: number; tpPercent: number; slPercent: number };

  constructor(config?: {
    pivotLength?: number;
    tpPercent?: number;
    slPercent?: number;
  }) {
    this.config = {
      pivotLength: config?.pivotLength || 2,
      tpPercent: config?.tpPercent || 2.0,
      slPercent: config?.slPercent || 1.0,
    };
  }

  /**
   * Generate market structure signal from market data
   * @param marketData Current market data
   * @returns Market structure signal data
   */
  generateStructureSignal(marketData: MarketData): {
    structurePoints: MarketStructurePoint[];
    trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
    structureSignal: MarketStructureSignal | null;
  } {
    // Detect market structure points
    const structurePoints = detectMarketStructurePoints(
      marketData.klineData,
      this.config.pivotLength
    );

    // Get market trend
    const trend = getMarketTrend(structurePoints);

    // Check for structure signals
    const structureSignal = this.checkForStructureSignal(
      marketData,
      structurePoints
    );

    return {
      structurePoints,
      trend,
      structureSignal,
    };
  }

  /**
   * Check for new market structure signals with cooldown
   * @param marketData Current market data
   * @param structurePoints Array of structure points
   * @returns Market structure signal if found and not in cooldown
   */
  private checkForStructureSignal(
    marketData: MarketData,
    structurePoints: MarketStructurePoint[]
  ): MarketStructureSignal | null {
    // Check cooldown period
    if (this.lastStructureSignal) {
      const timeSinceLastSignal =
        Date.now() - this.lastStructureSignal.timestamp;
      if (timeSinceLastSignal < this.signalCooldown) {
        return null;
      }
    }

    // Detect market structure signal
    const structureSignal = detectMarketStructureSignal(
      marketData.klineData,
      marketData.currentPrice,
      this.config
    );

    if (structureSignal) {
      // Check if this is a new signal (different type or significant price difference)
      if (
        !this.lastStructureSignal ||
        this.lastStructureSignal.type !== structureSignal.type ||
        this.lastStructureSignal.structureType !==
          structureSignal.structureType ||
        Math.abs(this.lastStructureSignal.price - structureSignal.price) >
          structureSignal.price * 0.02 // 2% price difference (larger than divergence)
      ) {
        this.lastStructureSignal = structureSignal;
        return structureSignal;
      }
    }

    return null;
  }

  /**
   * Update market structure configuration
   * @param newConfig New configuration
   */
  updateConfig(
    newConfig: Partial<{
      pivotLength: number;
      tpPercent: number;
      slPercent: number;
    }>
  ): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Get current market structure configuration
   * @returns Current configuration
   */
  getConfig(): { pivotLength: number; tpPercent: number; slPercent: number } {
    return { ...this.config };
  }

  /**
   * Set signal cooldown period
   * @param cooldownMs Cooldown in milliseconds
   */
  setSignalCooldown(cooldownMs: number): void {
    this.signalCooldown = cooldownMs;
  }

  /**
   * Get signal strength description
   * @param confidence Confidence score
   * @returns Strength description
   */
  getSignalStrength(confidence: number): string {
    if (confidence >= 80) return "🔥 STRONG";
    if (confidence >= 60) return "⚡ MEDIUM";
    if (confidence >= 40) return "💡 WEAK";
    return "❓ VERY WEAK";
  }

  /**
   * Format market structure signal for display
   * @param signal Market structure signal
   * @returns Formatted string
   */
  formatStructureSignal(signal: MarketStructureSignal): string {
    const strength = this.getSignalStrength(signal.confidence);
    const type = signal.type.includes("BULLISH") ? "🟢 BULLISH" : "🔴 BEARISH";
    const structureType = signal.structureType;

    return `${type} STRUCTURE BREAK ${structureType} ${strength}`;
  }

  /**
   * Check if signal is actionable (high confidence)
   * @param signal Market structure signal
   * @returns True if signal is actionable
   */
  isActionableSignal(signal: MarketStructureSignal): boolean {
    return signal.confidence >= 60; // Higher threshold for structure signals
  }

  /**
   * Get structure signal priority
   * @param signal Market structure signal
   * @returns Priority level
   */
  getSignalPriority(signal: MarketStructureSignal): "HIGH" | "MEDIUM" | "LOW" {
    if (signal.type.includes("BREAK")) {
      return "HIGH"; // Structure breaks are high priority
    } else {
      return "MEDIUM"; // Continuations are medium priority
    }
  }

  /**
   * Analyze structure points for patterns
   * @param structurePoints Array of structure points
   * @returns Pattern analysis
   */
  analyzeStructurePatterns(structurePoints: MarketStructurePoint[]): {
    hasDoubleTop: boolean;
    hasDoubleBottom: boolean;
    hasAscendingTriangle: boolean;
    hasDescendingTriangle: boolean;
  } {
    if (structurePoints.length < 6) {
      return {
        hasDoubleTop: false,
        hasDoubleBottom: false,
        hasAscendingTriangle: false,
        hasDescendingTriangle: false,
      };
    }

    const recentPoints = structurePoints.slice(-6);

    // Simple pattern detection (can be enhanced)
    const hasDoubleTop = this.detectDoubleTop(recentPoints);
    const hasDoubleBottom = this.detectDoubleBottom(recentPoints);
    const hasAscendingTriangle = this.detectAscendingTriangle(recentPoints);
    const hasDescendingTriangle = this.detectDescendingTriangle(recentPoints);

    return {
      hasDoubleTop,
      hasDoubleBottom,
      hasAscendingTriangle,
      hasDescendingTriangle,
    };
  }

  /**
   * Detect double top pattern
   */
  private detectDoubleTop(points: MarketStructurePoint[]): boolean {
    const highs = points.filter((p) => p.type === "HIGH");
    if (highs.length < 2) return false;

    const lastHigh = highs[highs.length - 1];
    const secondLastHigh = highs[highs.length - 2];

    if (!lastHigh || !secondLastHigh) {
      return false;
    }

    // Check if two highs are similar in price
    const priceDiff = Math.abs(lastHigh.price - secondLastHigh.price);
    const avgPrice = (lastHigh.price + secondLastHigh.price) / 2;
    const percentageDiff = (priceDiff / avgPrice) * 100;

    return percentageDiff < 2; // Within 2% of each other
  }

  /**
   * Detect double bottom pattern
   */
  private detectDoubleBottom(points: MarketStructurePoint[]): boolean {
    const lows = points.filter((p) => p.type === "LOW");
    if (lows.length < 2) return false;

    const lastLow = lows[lows.length - 1];
    const secondLastLow = lows[lows.length - 2];

    if (!lastLow || !secondLastLow) {
      return false;
    }

    // Check if two lows are similar in price
    const priceDiff = Math.abs(lastLow.price - secondLastLow.price);
    const avgPrice = (lastLow.price + secondLastLow.price) / 2;
    const percentageDiff = (priceDiff / avgPrice) * 100;

    return percentageDiff < 2; // Within 2% of each other
  }

  /**
   * Detect ascending triangle pattern
   */
  private detectAscendingTriangle(points: MarketStructurePoint[]): boolean {
    const highs = points.filter((p) => p.type === "HIGH");
    const lows = points.filter((p) => p.type === "LOW");

    if (highs.length < 2 || lows.length < 2) return false;

    // Check if highs are similar and lows are ascending
    const lastHigh = highs[highs.length - 1];
    const secondLastHigh = highs[highs.length - 2];
    const lastLow = lows[lows.length - 1];
    const secondLastLow = lows[lows.length - 2];

    if (!lastHigh || !secondLastHigh || !lastLow || !secondLastLow) {
      return false;
    }

    const highDiff = Math.abs(lastHigh.price - secondLastHigh.price);
    const avgHigh = (lastHigh.price + secondLastHigh.price) / 2;
    const highPercentageDiff = (highDiff / avgHigh) * 100;

    return highPercentageDiff < 1 && lastLow.price > secondLastLow.price;
  }

  /**
   * Detect descending triangle pattern
   */
  private detectDescendingTriangle(points: MarketStructurePoint[]): boolean {
    const highs = points.filter((p) => p.type === "HIGH");
    const lows = points.filter((p) => p.type === "LOW");

    if (highs.length < 2 || lows.length < 2) return false;

    // Check if lows are similar and highs are descending
    const lastHigh = highs[highs.length - 1];
    const secondLastHigh = highs[highs.length - 2];
    const lastLow = lows[lows.length - 1];
    const secondLastLow = lows[lows.length - 2];

    if (!lastHigh || !secondLastHigh || !lastLow || !secondLastLow) {
      return false;
    }

    const lowDiff = Math.abs(lastLow.price - secondLastLow.price);
    const avgLow = (lastLow.price + secondLastLow.price) / 2;
    const lowPercentageDiff = (lowDiff / avgLow) * 100;

    return lowPercentageDiff < 1 && lastHigh.price < secondLastHigh.price;
  }

  /**
   * Reset signal history (useful for testing)
   */
  resetSignalHistory(): void {
    this.lastStructureSignal = null;
  }
}
