import {
  MarketData,
  VolumeDivergenceSignal,
  VolumeAlert,
} from "../types/market.model";
import { detectVolumeDivergence } from "../utils/volume.utils";

export class VolumeDivergenceService {
  private lastVolumeDivergenceSignal: VolumeDivergenceSignal | null = null;
  private signalCooldown: number = 3 * 60 * 1000; // 3 minutes cooldown between volume divergence alerts
  private config: {
    lookbackPeriod: number;
  };

  constructor(config?: { lookbackPeriod?: number }) {
    this.config = {
      lookbackPeriod: config?.lookbackPeriod || 3,
    };
  }

  /**
   * Generate volume divergence alert from market data
   * @param marketData Current market data
   * @returns Volume divergence alert data
   */
  generateVolumeDivergenceAlert(marketData: MarketData): VolumeAlert {
    // Check for volume divergence
    const volumeDivergence = this.checkForVolumeDivergenceSignal(marketData);

    return {
      symbol: marketData.symbol,
      currentPrice: marketData.currentPrice,
      volumeSpike: null, // This service only handles divergence
      timestamp: Date.now(),
      timeframe: "1m",
    };
  }

  /**
   * Check for new volume divergence signals with cooldown
   * @param marketData Current market data
   * @returns Volume divergence signal if found and not in cooldown
   */
  private checkForVolumeDivergenceSignal(
    marketData: MarketData
  ): VolumeDivergenceSignal | null {
    // Check cooldown period
    if (this.lastVolumeDivergenceSignal) {
      const timeSinceLastSignal =
        Date.now() - this.lastVolumeDivergenceSignal.timestamp;
      if (timeSinceLastSignal < this.signalCooldown) {
        return null;
      }
    }

    // Detect volume divergence
    const volumeDivergence = detectVolumeDivergence(
      marketData.klineData,
      this.config.lookbackPeriod
    );

    if (volumeDivergence) {
      // Check if this is a new signal (different type or significant difference)
      if (
        !this.lastVolumeDivergenceSignal ||
        this.lastVolumeDivergenceSignal.divergenceType !==
          volumeDivergence.divergenceType ||
        Math.abs(
          this.lastVolumeDivergenceSignal.confidence -
            volumeDivergence.confidence
        ) > 20 // 20% confidence difference
      ) {
        this.lastVolumeDivergenceSignal = volumeDivergence;
        return volumeDivergence;
      }
    }

    return null;
  }

  /**
   * Get volume divergence signal (public method)
   * @param marketData Current market data
   * @returns Volume divergence signal if detected
   */
  getVolumeDivergenceSignal(
    marketData: MarketData
  ): VolumeDivergenceSignal | null {
    return this.checkForVolumeDivergenceSignal(marketData);
  }

  /**
   * Update volume divergence configuration
   * @param newConfig New configuration
   */
  updateConfig(newConfig: Partial<{ lookbackPeriod: number }>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Get current volume divergence configuration
   * @returns Current configuration
   */
  getConfig(): { lookbackPeriod: number } {
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
   * Get reversal probability emoji
   * @param probability Reversal probability
   * @returns Emoji representation
   */
  getReversalProbabilityEmoji(probability: "LOW" | "MEDIUM" | "HIGH"): string {
    switch (probability) {
      case "LOW":
        return "📊";
      case "MEDIUM":
        return "⚡";
      case "HIGH":
        return "🔥";
      default:
        return "📈";
    }
  }

  /**
   * Format volume divergence signal for display
   * @param signal Volume divergence signal
   * @returns Formatted string
   */
  formatVolumeDivergenceSignal(signal: VolumeDivergenceSignal): string {
    const probabilityEmoji = this.getReversalProbabilityEmoji(
      signal.reversalProbability
    );
    const typeEmoji = signal.divergenceType === "BULLISH" ? "🟢" : "🔴";

    return `${typeEmoji} ${signal.description} ${probabilityEmoji} ${signal.reversalProbability}`;
  }

  /**
   * Check if volume divergence is actionable
   * @param signal Volume divergence signal
   * @returns True if signal is actionable
   */
  isActionableVolumeDivergence(signal: VolumeDivergenceSignal): boolean {
    return (
      signal.confidence >= 60 &&
      (signal.reversalProbability === "HIGH" ||
        signal.reversalProbability === "MEDIUM")
    );
  }

  /**
   * Get volume divergence priority
   * @param signal Volume divergence signal
   * @returns Priority level
   */
  getVolumeDivergencePriority(
    signal: VolumeDivergenceSignal
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (signal.reversalProbability === "HIGH" && signal.confidence >= 80) {
      return "CRITICAL";
    } else if (
      signal.reversalProbability === "HIGH" ||
      signal.confidence >= 70
    ) {
      return "HIGH";
    } else if (
      signal.reversalProbability === "MEDIUM" ||
      signal.confidence >= 50
    ) {
      return "MEDIUM";
    } else {
      return "LOW";
    }
  }

  /**
   * Get volume divergence context information
   * @param marketData Current market data
   * @returns Volume divergence context
   */
  getVolumeDivergenceContext(marketData: MarketData): string {
    const signal = this.getVolumeDivergenceSignal(marketData);

    if (!signal) {
      return "📊 Không có phân kỳ volume";
    }

    const typeEmoji = signal.divergenceType === "BULLISH" ? "🟢" : "🔴";
    const probabilityEmoji = this.getReversalProbabilityEmoji(
      signal.reversalProbability
    );

    return `📊 ${typeEmoji} Phân kỳ ${
      signal.divergenceType === "BULLISH" ? "tăng" : "giảm"
    } | ${probabilityEmoji} ${
      signal.reversalProbability
    } | Confidence: ${signal.confidence.toFixed(1)}%`;
  }

  /**
   * Reset signal history (useful for testing)
   */
  resetSignalHistory(): void {
    this.lastVolumeDivergenceSignal = null;
  }
}
