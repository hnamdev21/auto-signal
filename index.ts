import dotenv from "dotenv";
import { MultiPairMarketService } from "./services/multi-pair-market.service";
import { AlertService } from "./services/alert.service";
import { TelegramService } from "./services/telegram.service";
import { UTCScheduler } from "./utils/scheduler.utils";
import { BotConfig, AlertConfig } from "./types/market.model";
import { CandleSyncScheduler } from "./utils/candle-sync-scheduler.utils";

// Load environment variables
dotenv.config();

// Bot configuration
const config: BotConfig = {
  symbol: process.env.SYMBOL || "BTCUSDT",
  interval: process.env.INTERVAL || "5m",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
};

// Alert system configuration
const alertConfig: AlertConfig = {
  pairs: process.env.PAIRS
    ? process.env.PAIRS.split(",")
    : ["BTCUSDT", "ETHUSDT"],
  timeframes: process.env.TIMEFRAMES
    ? process.env.TIMEFRAMES.split(",")
    : ["5m", "15m"],
  volumeSpikeThreshold: parseFloat(process.env.VOLUME_SPIKE_THRESHOLD || "1.5"),
  divergenceCandleCount: parseInt(process.env.DIVERGENCE_CANDLE_COUNT || "3"),
};

// Initialize services
const multiPairMarketService = new MultiPairMarketService(alertConfig);
const alertService = new AlertService(alertConfig);
const telegramService = new TelegramService(
  config.telegramBotToken,
  config.telegramChatId
);
const scheduler = new UTCScheduler();

// Use the smallest timeframe for candle synchronization
const smallestTimeframe = alertConfig.timeframes.reduce((smallest, current) => {
  const smallestMs = parseInt(smallest.replace("m", "")) * 60 * 1000;
  const currentMs = parseInt(current.replace("m", "")) * 60 * 1000;
  return currentMs < smallestMs ? current : smallest;
}, alertConfig.timeframes[0] || "5m");

const candleSyncScheduler = new CandleSyncScheduler({
  timeframe: smallestTimeframe,
  timezone: "UTC",
});

// Validate configuration
function validateConfig(): void {
  if (!config.telegramBotToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }
  if (!config.telegramChatId) {
    throw new Error("TELEGRAM_CHAT_ID is required");
  }
}

// Main bot execution function
async function executeBotTask(): Promise<void> {
  try {
    console.log(
      `🔄 Fetching market data for ${alertConfig.pairs.join(
        ", "
      )} on timeframes: ${alertConfig.timeframes.join(", ")}...`
    );

    // Get market data for all pairs and timeframes
    const marketData = await multiPairMarketService.fetchAllMarketData();

    // Process alerts
    const alerts = alertService.processMarketData(marketData);

    if (alerts.length > 0) {
      console.log(`🚨 Found ${alerts.length} volume alerts`);

      // Send alerts to Telegram
      await telegramService.sendVolumeAlerts(alerts);

      // Log alert details
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
    } else {
      console.log("✅ No volume alerts detected");
    }

    // Log current status
    const stats = multiPairMarketService.getServiceStats();
    console.log(
      `📈 Monitoring ${stats.totalServices} market services (${stats.pairs.length} pairs × ${stats.timeframes.length} timeframes)`
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

    const isMarketHealthy = await multiPairMarketService.healthCheck();
    if (!isMarketHealthy) {
      throw new Error("Market service health check failed");
    }

    const isTelegramWorking = await telegramService.testConnection();
    if (!isTelegramWorking) {
      throw new Error("Telegram service connection failed");
    }

    console.log("✅ All services are healthy");

    // Send startup message with alert configuration
    const startupMessage = `
🚀 <b>Volume Alert Bot Đã Khởi Động</b>

📊 <b>Pairs:</b> ${alertConfig.pairs.join(", ")}
⏰ <b>Timeframes:</b> ${alertConfig.timeframes.join(", ")}
🔥 <b>Volume Spike Threshold:</b> ${alertConfig.volumeSpikeThreshold}x
⚠️ <b>Divergence Candles:</b> ${alertConfig.divergenceCandleCount}
🕐 <b>Sync Timeframe:</b> ${smallestTimeframe}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Bot khởi động lúc: ${new Date().toISOString()}</i>
    `.trim();

    await telegramService.sendMessage(startupMessage);

    // Start the candle-synchronized scheduler
    candleSyncScheduler.start(executeBotTask);
  } catch (error) {
    console.error("❌ Failed to initialize bot:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT, shutting down gracefully...");
  candleSyncScheduler.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
  candleSyncScheduler.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  candleSyncScheduler.stop();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  candleSyncScheduler.stop();
  process.exit(1);
});

// Start the bot
initializeBot().catch((error) => {
  console.error("❌ Failed to start bot:", error);
  process.exit(1);
});
