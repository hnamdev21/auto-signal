import { BotConfigService } from "./bot-config.service";
import { BotService } from "./bot.service";
import { MultiPairMarketService } from "./multi-pair-market.service";
import { AlertService } from "./alert.service";
import { TelegramService } from "./telegram.service";
import { CandleSyncScheduler } from "../utils/candle-sync-scheduler.utils";

export class BotInitializer {
  private configService: BotConfigService;
  private botService!: BotService;
  private candleSyncScheduler!: CandleSyncScheduler;
  private isInitialized: boolean = false;

  constructor() {
    this.configService = new BotConfigService();
    this.initializeServices();
  }

  /**
   * Initialize all services
   */
  private initializeServices(): void {
    const config = this.configService.getConfigSummary();

    // Initialize market service
    const multiPairMarketService = new MultiPairMarketService(config.alert);

    // Initialize alert service
    const alertService = new AlertService(config.alert);

    // Initialize telegram service
    const telegramService = new TelegramService(
      config.bot.telegramBotToken,
      config.bot.telegramChatId
    );

    // Initialize bot service
    this.botService = new BotService(
      multiPairMarketService,
      alertService,
      telegramService
    );

    // Initialize candle sync scheduler
    this.candleSyncScheduler = new CandleSyncScheduler({
      timeframe: config.smallestTimeframe,
      timezone: "UTC",
    });
  }

  /**
   * Initialize and start the bot
   */
  async initializeBot(): Promise<void> {
    try {
      console.log("🚀 Initializing Signals Bot...");

      // Validate configuration
      this.configService.validateConfig();

      // Test services
      console.log("🔍 Testing services...");
      const isHealthy = await this.botService.healthCheck();
      if (!isHealthy) {
        throw new Error("Service health check failed");
      }

      // Send startup message
      await this.botService.sendStartupMessage();

      // Start the candle-synchronized scheduler
      this.candleSyncScheduler.start(() => this.botService.executeBotTask());

      this.isInitialized = true;
      console.log("✅ Bot initialized and started successfully");
    } catch (error) {
      console.error("❌ Failed to initialize bot:", error);
      throw error;
    }
  }

  /**
   * Stop the bot gracefully
   */
  stopBot(): void {
    if (this.candleSyncScheduler) {
      this.candleSyncScheduler.stop();
    }
    this.isInitialized = false;
    console.log("🛑 Bot stopped gracefully");
  }

  /**
   * Restart the bot with new configuration
   */
  async restartBot(): Promise<void> {
    console.log("🔄 Restarting bot...");
    this.stopBot();
    this.initializeServices();
    await this.initializeBot();
  }

  /**
   * Get bot status
   */
  getBotStatus(): {
    isInitialized: boolean;
    isSchedulerActive: boolean;
    config: ReturnType<BotConfigService["getConfigSummary"]>;
    serviceStats: ReturnType<BotService["getServiceStats"]>;
  } {
    return {
      isInitialized: this.isInitialized,
      isSchedulerActive: this.candleSyncScheduler?.isActive() || false,
      config: this.configService.getConfigSummary(),
      serviceStats: this.botService?.getServiceStats() || null,
    };
  }

  /**
   * Update configuration and restart if needed
   */
  async updateConfig(
    botConfig?: Partial<ReturnType<BotConfigService["getBotConfig"]>>,
    alertConfig?: Partial<ReturnType<BotConfigService["getAlertConfig"]>>
  ): Promise<void> {
    if (botConfig) {
      this.configService.updateBotConfig(botConfig);
    }
    if (alertConfig) {
      this.configService.updateAlertConfig(alertConfig);
    }

    // Restart bot with new configuration
    await this.restartBot();
  }

  /**
   * Get configuration service for external access
   */
  getConfigService(): BotConfigService {
    return this.configService;
  }

  /**
   * Get bot service for external access
   */
  getBotService(): BotService {
    return this.botService;
  }

  /**
   * Get candle sync scheduler for external access
   */
  getCandleSyncScheduler(): CandleSyncScheduler {
    return this.candleSyncScheduler;
  }
}
