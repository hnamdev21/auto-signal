import { MultiPairMarketService } from "./multi-pair-market.service";
import { AlertService } from "./alert.service";
import { TelegramService } from "./telegram.service";
import { OKXBalanceAlertService } from "./okx-balance-alert.service";
import { BotActionService } from "./bot-action.service";
import {
  VolumeAlert,
  RSIAlert,
  ScalpingAlert,
  OKXBalanceAlert,
} from "../types/market.model";

export class BotService {
  private multiPairMarketService: MultiPairMarketService;
  private alertService: AlertService;
  private telegramService: TelegramService;
  private okxBalanceAlertService: OKXBalanceAlertService;
  private botActionService: BotActionService;

  constructor(
    multiPairMarketService: MultiPairMarketService,
    alertService: AlertService,
    telegramService: TelegramService,
    okxBalanceAlertService: OKXBalanceAlertService,
    botActionService: BotActionService
  ) {
    this.multiPairMarketService = multiPairMarketService;
    this.alertService = alertService;
    this.telegramService = telegramService;
    this.okxBalanceAlertService = okxBalanceAlertService;
    this.botActionService = botActionService;
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
      const alerts: (
        | VolumeAlert
        | RSIAlert
        | ScalpingAlert
        | OKXBalanceAlert
      )[] = this.alertService.processMarketData(marketData);

      // Check for OKX balance alerts
      const okxBalanceAlert =
        await this.okxBalanceAlertService.getBalanceAlert();
      if (okxBalanceAlert) {
        alerts.push(okxBalanceAlert);
      }

      if (alerts.length > 0) {
        console.log(`🚨 Found ${alerts.length} alerts`);

        // Send alerts to Telegram
        await this.telegramService.sendAlerts(alerts);

        // Log alert details
        this.logAlertDetails(alerts);
      } else {
        console.log("✅ No alerts detected");
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
  private logAlertDetails(
    alerts: (VolumeAlert | RSIAlert | ScalpingAlert | OKXBalanceAlert)[]
  ): void {
    alerts.forEach((alert) => {
      if (alert.type === "okx_balance") {
        const okxAlert = alert as OKXBalanceAlert;
        console.log(`💰 ${alert.type.toUpperCase()} alert:`, {
          alertType: okxAlert.alertType,
          balanceCount: okxAlert.balances.length,
          totalValue: okxAlert.totalPortfolioValue,
          balances: okxAlert.balances.map(
            (b) => `${b.asset}: ${b.available + b.locked}`
          ),
        });
      } else if (alert.type === "rsi_divergence") {
        const rsiAlert = alert as RSIAlert;
        console.log(
          `📊 ${alert.type.toUpperCase()} alert for ${alert.symbol} ${
            alert.timeframe
          }:`,
          {
            price: alert.currentPrice,
            rsiValue: rsiAlert.rsiValue,
            divergenceType: rsiAlert.divergenceType,
            divergenceData: rsiAlert.divergenceData,
          }
        );
      } else if (
        alert.type === "ema_crossover" ||
        alert.type === "stochastic_signal" ||
        alert.type === "bollinger_squeeze" ||
        alert.type === "volume_spike"
      ) {
        const scalpingAlert = alert as ScalpingAlert;
        console.log(
          `🚀 ${alert.type.toUpperCase()} alert for ${alert.symbol} ${
            alert.timeframe
          }:`,
          {
            price: alert.currentPrice,
            signal: scalpingAlert.signal,
            confidence: scalpingAlert.confidence,
            indicatorData: scalpingAlert.indicatorData,
          }
        );
      } else {
        const volumeAlert = alert as VolumeAlert;
        console.log(
          `📊 ${alert.type.toUpperCase()} alert for ${alert.symbol} ${
            alert.timeframe
          }:`,
          {
            price: alert.currentPrice,
            volume: volumeAlert.volume,
            averageVolume: volumeAlert.averageVolume,
            spikeRatio: volumeAlert.spikeRatio,
            divergenceData: volumeAlert.divergenceData,
          }
        );
      }
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

      // Check OKX connection if configured
      const okxStatus = this.okxBalanceAlertService.getStatus();
      if (okxStatus.config.apiKey && okxStatus.config.apiSecret) {
        const isOKXWorking = await this.okxBalanceAlertService.testConnection();
        if (!isOKXWorking) {
          console.error("❌ OKX service connection failed");
          return false;
        }
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
    const okxStatus = this.okxBalanceAlertService.getStatus();

    let okxInfo = "";
    if (okxStatus.config.apiKey && okxStatus.config.apiSecret) {
      okxInfo = `
<b>💰 OKX INTEGRATION:</b>
• Balance Alerts: ${
        okxStatus.config.balanceAlertsEnabled ? "ENABLED" : "DISABLED"
      }
• Alert Interval: ${okxStatus.config.balanceAlertInterval} minutes
• Min Threshold: ${okxStatus.config.minBalanceThreshold}
• Action System: READY`;
    } else {
      okxInfo = `
<b>💰 OKX INTEGRATION:</b>
• Status: NOT CONFIGURED
• Add OKX_API_KEY and OKX_API_SECRET to enable`;
    }

    const startupMessage = `
<b>BOT CẢNH BÁO VOLUME, RSI, SCALPING & OKX ĐÃ KHỞI ĐỘNG</b>

<b>Cặp tiền:</b> ${alertConfig.pairs.join(", ")}
<b>Khung thời gian:</b> ${alertConfig.timeframes.join(", ")}
<b>Ngưỡng tăng volume:</b> ${alertConfig.volumeSpikeThreshold}x
<b>Số nến phân kỳ:</b> ${alertConfig.divergenceCandleCount}
<b>RSI Period:</b> ${alertConfig.rsiPeriod}
<b>RSI Overbought:</b> ${alertConfig.rsiOverbought}
<b>RSI Oversold:</b> ${alertConfig.rsiOversold}

<b>🚀 SCALPING (1m):</b>
• EMA Crossover (9/21)
• Stochastic Oscillator
• Bollinger Bands
• Volume Spike Detection

${okxInfo}

<b>🤖 LỆNH BOT:</b>
/balance - Kiểm tra số dư OKX
/filled - Kiểm tra lệnh đã khớp
/order - Đặt lệnh futures
/test - Test kết nối OKX
/help - Danh sách lệnh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Khởi động lúc: ${new Date().toISOString()}</i>
    `.trim();

    await this.telegramService.sendMessage(startupMessage);
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    market: ReturnType<MultiPairMarketService["getServiceStats"]>;
    alert: ReturnType<AlertService["getConfig"]>;
    okx: ReturnType<OKXBalanceAlertService["getStatus"]>;
    actions: ReturnType<BotActionService["getStatus"]>;
  } {
    return {
      market: this.multiPairMarketService.getServiceStats(),
      alert: this.alertService.getConfig(),
      okx: this.okxBalanceAlertService.getStatus(),
      actions: this.botActionService.getStatus(),
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

  /**
   * Get OKX balance alert service
   */
  getOKXBalanceAlertService(): OKXBalanceAlertService {
    return this.okxBalanceAlertService;
  }

  /**
   * Get bot action service
   */
  getBotActionService(): BotActionService {
    return this.botActionService;
  }
}
