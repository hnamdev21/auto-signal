import dotenv from "dotenv";
import { BotInitializer } from "./services/bot-initializer.service";

// Load environment variables
dotenv.config();

// Initialize bot
const botInitializer = new BotInitializer();

// Graceful shutdown handlers
process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT, shutting down gracefully...");
  botInitializer.stopBot();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
  botInitializer.stopBot();
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  botInitializer.stopBot();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  botInitializer.stopBot();
  process.exit(1);
});

// Start the bot
botInitializer.initializeBot().catch((error) => {
  console.error("❌ Failed to start bot:", error);
  process.exit(1);
});
