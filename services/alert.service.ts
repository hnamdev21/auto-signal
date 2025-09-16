import {
  AlertConfig,
  VolumeAlert,
  RSIAlert,
  MultiPairMarketData,
} from "../types/market.model";
import { VolumeDivergenceService } from "./volume-divergence.service";
import { RSIDivergenceService } from "./rsi-divergence.service";

export class AlertService {
  private config: AlertConfig;
  private volumeDivergenceService: VolumeDivergenceService;
  private rsiDivergenceService: RSIDivergenceService;

  constructor(config: AlertConfig) {
    this.config = config;
    this.volumeDivergenceService = new VolumeDivergenceService(config);
    this.rsiDivergenceService = new RSIDivergenceService(config);
  }

  /**
   * Process market data for all pairs and timeframes
   */
  processMarketData(
    marketData: MultiPairMarketData
  ): (VolumeAlert | RSIAlert)[] {
    const alerts: (VolumeAlert | RSIAlert)[] = [];

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

    // Update the configuration in both services
    this.volumeDivergenceService = new VolumeDivergenceService(this.config);
    this.rsiDivergenceService = new RSIDivergenceService(this.config);

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
   * Clear all divergence trackers
   */
  clearAllDivergenceTrackers(): void {
    this.clearVolumeDivergenceTracker();
    this.clearRSIDivergenceTracker();
    console.log("🗑️ All divergence trackers cleared");
  }
}
