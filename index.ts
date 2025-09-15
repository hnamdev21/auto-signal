import dotenv from "dotenv";
import { MarketService } from "./services/market.service";
import { TelegramService } from "./services/telegram.service";
import { UTCScheduler } from "./utils/scheduler.utils";
import { calculateRSI } from "./utils/rsi.utils";
import { AlertData, BotConfig } from "./types/market.model";

// Load environment variables
dotenv.config();

// Bot configuration
const config: BotConfig = {
  symbol: process.env.SYMBOL || "BTCUSDT",
  rsiPeriod: parseInt(process.env.RSI_PERIOD || "14"),
  interval: process.env.INTERVAL || "1m",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
};

// Initialize services
const marketService = new MarketService(config.symbol, config.interval);
const telegramService = new TelegramService(
  config.telegramBotToken,
  config.telegramChatId
);
const scheduler = new UTCScheduler();

// Validate configuration
function validateConfig(): void {
  if (!config.telegramBotToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }
  if (!config.telegramChatId) {
    throw new Error("TELEGRAM_CHAT_ID is required");
  }
  if (config.rsiPeriod < 2) {
    throw new Error("RSI_PERIOD must be at least 2");
  }
}

// Main bot execution function
async function executeBotTask(): Promise<void> {
  try {
    console.log(`🔄 Fetching market data for ${config.symbol}...`);

    // Get market data
    const marketData = await marketService.getMarketData();

    // Calculate RSI
    const rsiData = calculateRSI(marketData.klineData, config.rsiPeriod);

    // Create alert data
    const alertData: AlertData = {
      symbol: config.symbol,
      currentPrice: marketData.currentPrice,
      rsi: rsiData.rsi,
      timestamp: Date.now(),
      timeframe: config.interval,
    };

    // Send alert
    await telegramService.sendPriceAlert(alertData);

    console.log(
      `✅ Alert sent - Price: ${alertData.currentPrice}, RSI: ${alertData.rsi}`
    );
  } catch (error) {
    console.error("❌ Error in bot task:", error);

    // Send error notification
    try {
      await telegramService.sendErrorMessage(
        error instanceof Error ? error.message : "Unknown error",
        "Main bot execution"
      );
    } catch (telegramError) {
      console.error("Failed to send error notification:", telegramError);
    }
  }
}

// Initialize and start the bot
async function initializeBot(): Promise<void> {
  try {
    console.log("🚀 Initializing Signals Bot...");

    // Validate configuration
    validateConfig();

    // Test services
    console.log("🔍 Testing services...");

    const isMarketHealthy = await marketService.healthCheck();
    if (!isMarketHealthy) {
      throw new Error("Market service health check failed");
    }

    const isTelegramWorking = await telegramService.testConnection();
    if (!isTelegramWorking) {
      throw new Error("Telegram service connection failed");
    }

    console.log("✅ All services are healthy");

    // Send startup message
    await telegramService.sendStartupMessage();

    // Start the scheduler
    scheduler.startMinuteScheduler(executeBotTask);

    console.log("🎉 Bot initialized successfully!");
    console.log(`📊 Monitoring: ${config.symbol}`);
    console.log(`📈 RSI Period: ${config.rsiPeriod}`);
    console.log(`⏰ Interval: ${config.interval}`);
    console.log(
      `🕐 Next execution in ${scheduler.getSecondsUntilNextMinute()} seconds`
    );
  } catch (error) {
    console.error("❌ Failed to initialize bot:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT, shutting down gracefully...");
  scheduler.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
  scheduler.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  scheduler.stop();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  scheduler.stop();
  process.exit(1);
});

// Start the bot
initializeBot().catch((error) => {
  console.error("❌ Failed to start bot:", error);
  process.exit(1);
});
