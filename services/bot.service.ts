import { MultiPairMarketService } from "./multi-pair-market.service";
import { AlertService } from "./alert.service";
import { TelegramService } from "./telegram.service";
import { VolumeAlert } from "../types/market.model";

export class BotService {
  private multiPairMarketService: MultiPairMarketService;
  private alertService: AlertService;
  private telegramService: TelegramService;

  constructor(
    multiPairMarketService: MultiPairMarketService,
    alertService: AlertService,
    telegramService: TelegramService
  ) {
    this.multiPairMarketService = multiPairMarketService;
    this.alertService = alertService;
    this.telegramService = telegramService;
  }

  /**
   * Execute the main bot task
   */
  async executeBotTask(): Promise<void> {
    try {
      const alertConfig = this.alertService.getConfig();
      console.log(
        `🔄 Fetching market data for ${alertConfig.pairs.join(
          ", "
        )} on timeframes: ${alertConfig.timeframes.join(", ")}...`
      );

      // Get market data for all pairs and timeframes
      const marketData = await this.multiPairMarketService.fetchAllMarketData();

      // Process alerts
      const alerts = this.alertService.processMarketData(marketData);

      if (alerts.length > 0) {
        console.log(`🚨 Found ${alerts.length} volume alerts`);

        // Send alerts to Telegram
        await this.telegramService.sendVolumeAlerts(alerts);

        // Log alert details
        this.logAlertDetails(alerts);
      } else {
        console.log("✅ No volume alerts detected");
      }

      // Log current status
      this.logServiceStatus();
    } catch (error) {
      await this.handleBotTaskError(error);
    }
  }

  /**
   * Log detailed information about detected alerts
   */
  private logAlertDetails(alerts: VolumeAlert[]): void {
    alerts.forEach((alert) => {
      console.log(
        `📊 ${alert.type.toUpperCase()} alert for ${alert.symbol} ${
          alert.timeframe
        }:`,
        {
          price: alert.currentPrice,
          volume: alert.volume,
          averageVolume: alert.averageVolume,
          spikeRatio: alert.spikeRatio,
          divergenceData: alert.divergenceData,
        }
      );
    });
  }

  /**
   * Log current service status
   */
  private logServiceStatus(): void {
    const stats = this.multiPairMarketService.getServiceStats();
    console.log(
      `📈 Monitoring ${stats.totalServices} market services (${stats.pairs.length} pairs × ${stats.timeframes.length} timeframes)`
    );
  }

  /**
   * Handle errors that occur during bot task execution
   */
  private async handleBotTaskError(error: unknown): Promise<void> {
    console.error("❌ Error in bot task:", error);

    // Send error notification
    try {
      await this.telegramService.sendErrorMessage(
        error instanceof Error ? error.message : "Unknown error",
        "Main bot execution"
      );
    } catch (telegramError) {
      console.error("Failed to send error notification:", telegramError);
    }
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<boolean> {
    try {
      const isMarketHealthy = await this.multiPairMarketService.healthCheck();
      if (!isMarketHealthy) {
        console.error("❌ Market service health check failed");
        return false;
      }

      const isTelegramWorking = await this.telegramService.testConnection();
      if (!isTelegramWorking) {
        console.error("❌ Telegram service connection failed");
        return false;
      }

      console.log("✅ All services are healthy");
      return true;
    } catch (error) {
      console.error("❌ Health check failed:", error);
      return false;
    }
  }

  /**
   * Send startup message with configuration details
   */
  async sendStartupMessage(): Promise<void> {
    const alertConfig = this.alertService.getConfig();
    const startupMessage = `
<b>VOLUME ALERT BOT STARTED</b>

<b>Pairs:</b> ${alertConfig.pairs.join(", ")}
<b>Timeframes:</b> ${alertConfig.timeframes.join(", ")}
<b>Spike Threshold:</b> ${alertConfig.volumeSpikeThreshold}x
<b>Divergence Candles:</b> ${alertConfig.divergenceCandleCount}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Started at: ${new Date().toISOString()}</i>
    `.trim();

    await this.telegramService.sendMessage(startupMessage);
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    market: ReturnType<MultiPairMarketService["getServiceStats"]>;
    alert: ReturnType<AlertService["getConfig"]>;
  } {
    return {
      market: this.multiPairMarketService.getServiceStats(),
      alert: this.alertService.getConfig(),
    };
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(
    newConfig: Partial<ReturnType<AlertService["getConfig"]>>
  ): void {
    this.alertService.updateConfig(newConfig);
    // Only update if we have a complete config
    if (newConfig.pairs && newConfig.timeframes) {
      this.multiPairMarketService.updateConfig(
        newConfig as ReturnType<AlertService["getConfig"]>
      );
    }
  }
}
