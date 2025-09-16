import {
  AlertConfig,
  VolumeAlert,
  RSIAlert,
  ScalpingAlert,
  MultiPairMarketData,
} from "../types/market.model";
import { VolumeDivergenceService } from "./volume-divergence.service";
import { RSIDivergenceService } from "./rsi-divergence.service";
import { ScalpingService } from "./scalping.service";

export class AlertService {
  private config: AlertConfig;
  private volumeDivergenceService: VolumeDivergenceService;
  private rsiDivergenceService: RSIDivergenceService;
  private scalpingService: ScalpingService;

  constructor(config: AlertConfig) {
    this.config = config;
    this.volumeDivergenceService = new VolumeDivergenceService(config);
    this.rsiDivergenceService = new RSIDivergenceService(config);

    // Create scalping config from alert config
    const scalpingConfig = {
      pairs: config.pairs,
      timeframes: config.timeframes,
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      stochasticKPeriod: 14,
      stochasticDPeriod: 3,
      stochasticOverbought: 80,
      stochasticOversold: 20,
      bollingerPeriod: 20,
      bollingerStdDev: 2,
      volumeSpikeThreshold: 2.0,
      volumePeriod: 20,
      minConfidence: 70,
      alertCooldown: 300000, // 5 minutes
    };

    this.scalpingService = new ScalpingService(scalpingConfig);
  }

  /**
   * Process market data for all pairs and timeframes
   */
  processMarketData(
    marketData: MultiPairMarketData
  ): (VolumeAlert | RSIAlert | ScalpingAlert)[] {
    const alerts: (VolumeAlert | RSIAlert | ScalpingAlert)[] = [];

    for (const symbol of this.config.pairs) {
      for (const timeframe of this.config.timeframes) {
        const data = marketData[symbol]?.[timeframe];
        if (!data || !data.klineData.length) continue;

        // Check for volume spike
        const spikeAlert = this.volumeDivergenceService.detectVolumeSpike(
          symbol,
          timeframe,
          data.klineData,
          data.currentPrice
        );
        if (spikeAlert) {
          alerts.push(spikeAlert);
        }

        // Check for volume divergence
        const divergenceAlert =
          this.volumeDivergenceService.detectVolumeDivergence(
            symbol,
            timeframe,
            data.klineData,
            data.currentPrice
          );
        if (divergenceAlert) {
          alerts.push(divergenceAlert);
        }

        // Check for RSI divergence
        const rsiDivergenceAlert =
          this.rsiDivergenceService.detectRSIDivergence(
            symbol,
            timeframe,
            data.klineData,
            data.currentPrice
          );
        if (rsiDivergenceAlert) {
          alerts.push(rsiDivergenceAlert);
        }

        // Check for scalping signals (only for 1m timeframe)
        if (timeframe === "1m") {
          const scalpingAlerts = this.scalpingService.processMarketData(
            symbol,
            timeframe,
            data.klineData,
            data.currentPrice
          );
          alerts.push(...scalpingAlerts);
        }
      }
    }

    return alerts;
  }

  /**
   * Get current configuration
   */
  getConfig(): AlertConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update the configuration in all services
    this.volumeDivergenceService = new VolumeDivergenceService(this.config);
    this.rsiDivergenceService = new RSIDivergenceService(this.config);

    // Recreate scalping service with updated config
    const scalpingConfig = {
      pairs: this.config.pairs,
      timeframes: this.config.timeframes,
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      stochasticKPeriod: 14,
      stochasticDPeriod: 3,
      stochasticOverbought: 80,
      stochasticOversold: 20,
      bollingerPeriod: 20,
      bollingerStdDev: 2,
      volumeSpikeThreshold: 2.0,
      volumePeriod: 20,
      minConfidence: 70,
      alertCooldown: 300000, // 5 minutes
    };
    this.scalpingService = new ScalpingService(scalpingConfig);

    console.log("📝 Alert service config updated:", this.config);
  }

  /**
   * Get volume divergence tracker status
   */
  getVolumeDivergenceTrackerStatus() {
    return this.volumeDivergenceService.getDivergenceTrackerStatus();
  }

  /**
   * Get RSI divergence tracker status
   */
  getRSIDivergenceTrackerStatus() {
    return this.rsiDivergenceService.getDivergenceTrackerStatus();
  }

  /**
   * Clear volume divergence tracker
   */
  clearVolumeDivergenceTracker(): void {
    this.volumeDivergenceService.clearDivergenceTracker();
  }

  /**
   * Clear RSI divergence tracker
   */
  clearRSIDivergenceTracker(): void {
    this.rsiDivergenceService.clearDivergenceTracker();
  }

  /**
   * Get scalping tracker status
   */
  getScalpingTrackerStatus() {
    return this.scalpingService.getTrackerStatus();
  }

  /**
   * Clear scalping tracker
   */
  clearScalpingTracker(): void {
    this.scalpingService.clearTracker();
  }

  /**
   * Clear all divergence trackers
   */
  clearAllDivergenceTrackers(): void {
    this.clearVolumeDivergenceTracker();
    this.clearRSIDivergenceTracker();
    this.clearScalpingTracker();
    console.log("🗑️ All divergence trackers cleared");
  }
}
