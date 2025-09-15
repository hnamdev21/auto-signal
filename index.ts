import dotenv from "dotenv";
import { MarketService } from "./services/market.service";
import { TelegramService } from "./services/telegram.service";
import { SignalService } from "./services/signal.service";
import { MACDSignalService } from "./services/macd-signal.service";
import { MarketStructureService } from "./services/market-structure.service";
import { VolumeAlertService } from "./services/volume-alert.service";
import { VolumeDivergenceService } from "./services/volume-divergence.service";
import { TPSLService } from "./services/tpsl.service";
import { UTCScheduler } from "./utils/scheduler.utils";
import {
  BotConfig,
  DivergenceConfig,
  MultiSignalAlert,
} from "./types/market.model";

// Load environment variables
dotenv.config();

// Bot configuration
const config: BotConfig = {
  symbol: process.env.SYMBOL || "BTCUSDT",
  rsiPeriod: parseInt(process.env.RSI_PERIOD || "14"),
  interval: process.env.INTERVAL || "5m",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
};

// Divergence configuration
const divergenceConfig: DivergenceConfig = {
  pivotLength: parseInt(process.env.PIVOT_LENGTH || "2"),
  bullDivergenceDiff: parseFloat(process.env.BULL_DIV_DIFF || "1"),
  bearDivergenceDiff: parseFloat(process.env.BEAR_DIV_DIFF || "1"),
  bullRsiLevel: parseFloat(process.env.BULL_RSI_LEVEL || "45"),
  bearRsiLevel: parseFloat(process.env.BEAR_RSI_LEVEL || "55"),
  tpPercent: parseFloat(process.env.TP_PERCENT || "2.0"),
  slPercent: parseFloat(process.env.SL_PERCENT || "1.0"),
};

// Initialize services
const marketService = new MarketService(config.symbol, config.interval);
const telegramService = new TelegramService(
  config.telegramBotToken,
  config.telegramChatId
);
const signalService = new SignalService(divergenceConfig);
const macdSignalService = new MACDSignalService({
  pivotLength: divergenceConfig.pivotLength,
  tpPercent: divergenceConfig.tpPercent,
  slPercent: divergenceConfig.slPercent,
});
const marketStructureService = new MarketStructureService({
  pivotLength: divergenceConfig.pivotLength,
  tpPercent: divergenceConfig.tpPercent,
  slPercent: divergenceConfig.slPercent,
});
const volumeAlertService = new VolumeAlertService({
  volumePeriod: 20,
  lowThreshold: 1.5,
  mediumThreshold: 2.0,
  highThreshold: 3.0,
  extremeThreshold: 5.0,
});
const volumeDivergenceService = new VolumeDivergenceService({
  lookbackPeriod: 3,
});
const tpslService = new TPSLService();
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

    // Generate signals from all services (running in parallel)
    const [
      rsiSignal,
      macdSignal,
      structureSignal,
      volumeAlert,
      volumeDivergence,
    ] = await Promise.all([
      signalService.generateTradingSignal(marketData),
      macdSignalService.generateMACDSignal(marketData),
      marketStructureService.generateStructureSignal(marketData),
      volumeAlertService.generateVolumeAlert(marketData),
      volumeDivergenceService.getVolumeDivergenceSignal(marketData),
    ]);

    if (!rsiSignal) {
      console.log("No RSI signal generated");
      return;
    }

    // Create multi-signal alert
    const multiSignalAlert: MultiSignalAlert = {
      symbol: marketData.symbol,
      currentPrice: marketData.currentPrice,
      rsi: rsiSignal.rsi,
      macd: macdSignal.macd,
      timestamp: Date.now(),
      timeframe: config.interval,
      rsiDivergence: rsiSignal.divergenceSignal || null,
      macdDivergence: macdSignal.divergenceSignal || null,
      marketStructure: structureSignal.structureSignal || null,
    };

    // Check if any signals are detected
    const hasAnySignal =
      multiSignalAlert.rsiDivergence ||
      multiSignalAlert.macdDivergence ||
      multiSignalAlert.marketStructure;

    // Check for volume spike (independent alert)
    if (volumeAlert.volumeSpike) {
      await telegramService.sendVolumeAlert(volumeAlert);
      console.log(
        `📊 VOLUME SPIKE - ${
          volumeAlert.volumeSpike.severity
        } | ${volumeAlert.volumeSpike.volumeRatio.toFixed(
          1
        )}x avg volume | Price: ${marketData.currentPrice}`
      );
    }

    // Check for volume divergence (independent alert)
    if (volumeDivergence) {
      await telegramService.sendVolumeDivergenceAlert(
        marketData.symbol,
        marketData.currentPrice,
        volumeDivergence,
        Date.now()
      );
      console.log(
        `📊 VOLUME DIVERGENCE - ${volumeDivergence.divergenceType} | ${volumeDivergence.reversalProbability} probability | Price: ${marketData.currentPrice}`
      );
    }

    if (hasAnySignal) {
      await telegramService.sendMultiSignalAlert(multiSignalAlert);

      // Log all detected signals
      const signals = [];
      if (multiSignalAlert.rsiDivergence) {
        signals.push(`RSI ${multiSignalAlert.rsiDivergence.type}`);
      }
      if (multiSignalAlert.macdDivergence) {
        signals.push(`MACD ${multiSignalAlert.macdDivergence.type}`);
      }
      if (multiSignalAlert.marketStructure) {
        signals.push(
          `STRUCTURE ${multiSignalAlert.marketStructure.structureType}`
        );
      }

      console.log(
        `🎯 MULTIPLE SIGNALS DETECTED - ${signals.join(", ")} | Price: ${
          marketData.currentPrice
        } | RSI: ${rsiSignal.rsi.toFixed(2)}`
      );
    } else {
      // Just log regular monitoring without sending alerts
      const volumeContext = volumeAlertService.getVolumeContext(marketData);
      console.log(
        `📊 Monitoring - Price: ${
          marketData.currentPrice
        }, RSI: ${rsiSignal.rsi.toFixed(2)}, Trend: ${
          structureSignal.trend
        } | ${volumeContext}`
      );
    }
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

    console.log(
      "🎉 Multi-Signal Bot with Volume Alerts initialized successfully!"
    );
    console.log(`📊 Monitoring: ${config.symbol}`);
    console.log(`📈 RSI Period: ${config.rsiPeriod}`);
    console.log(`⏰ Interval: ${config.interval}`);
    console.log(`🎯 RSI Divergence Detection: ENABLED`);
    console.log(`📊 MACD Divergence Detection: ENABLED`);
    console.log(`🏗️ Market Structure Detection: ENABLED`);
    console.log(`📈 Volume Spike Detection: ENABLED`);
    console.log(`📊 Volume Divergence Detection: ENABLED`);
    console.log(`   - Pivot Length: ${divergenceConfig.pivotLength}`);
    console.log(`   - Bull RSI Level: ${divergenceConfig.bullRsiLevel}`);
    console.log(`   - Bear RSI Level: ${divergenceConfig.bearRsiLevel}`);
    console.log(
      `   - TP/SL: ${divergenceConfig.tpPercent}%/${divergenceConfig.slPercent}%`
    );
    console.log(`   - Volume Thresholds: 1.5x/2.0x/3.0x/5.0x`);
    console.log(`   - Volume Divergence Lookback: 3 candles`);
    console.log(`🎯 Smart TP/SL System: ENABLED`);
    console.log(tpslService.getConfigSummary());
    console.log(`🔥 Multi-Confirmation Alerts: ENABLED`);
    console.log(`📊 Volume Spike Alerts: ENABLED (Independent)`);
    console.log(`📊 Volume Divergence Alerts: ENABLED (Independent)`);
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
