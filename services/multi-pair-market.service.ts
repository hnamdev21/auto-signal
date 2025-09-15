import { MarketService } from "./market.service";
import { MultiPairMarketData, AlertConfig } from "../types/market.model";

export class MultiPairMarketService {
  private marketServices: Map<string, MarketService> = new Map();
  private config: AlertConfig;

  constructor(config: AlertConfig) {
    this.config = config;
    this.initializeMarketServices();
  }

  /**
   * Initialize market services for all pairs and timeframes
   */
  private initializeMarketServices(): void {
    for (const symbol of this.config.pairs) {
      for (const timeframe of this.config.timeframes) {
        const key = `${symbol}-${timeframe}`;
        const marketService = new MarketService(symbol, timeframe);
        this.marketServices.set(key, marketService);
      }
    }
    console.log(`📊 Initialized ${this.marketServices.size} market services`);
  }

  /**
   * Fetch market data for all configured pairs and timeframes
   */
  async fetchAllMarketData(): Promise<MultiPairMarketData> {
    const marketData: MultiPairMarketData = {};
    const promises: Promise<void>[] = [];

    for (const symbol of this.config.pairs) {
      marketData[symbol] = {};

      for (const timeframe of this.config.timeframes) {
        const key = `${symbol}-${timeframe}`;
        const marketService = this.marketServices.get(key);

        if (marketService) {
          const promise = marketService
            .getMarketData()
            .then((data) => {
              if (marketData[symbol]) {
                marketData[symbol][timeframe] = data;
              }
            })
            .catch((error) => {
              console.error(
                `❌ Error fetching data for ${symbol} ${timeframe}:`,
                error
              );
              // Set empty data structure to maintain consistency
              if (marketData[symbol]) {
                marketData[symbol][timeframe] = {
                  symbol,
                  currentPrice: 0,
                  timestamp: Date.now(),
                  klineData: [],
                };
              }
            });

          promises.push(promise);
        }
      }
    }

    // Wait for all requests to complete
    await Promise.allSettled(promises);

    console.log(
      `📈 Fetched market data for ${this.config.pairs.length} pairs × ${this.config.timeframes.length} timeframes`
    );
    return marketData;
  }

  /**
   * Get market data for a specific symbol and timeframe
   */
  async getMarketData(symbol: string, timeframe: string) {
    const key = `${symbol}-${timeframe}`;
    const marketService = this.marketServices.get(key);

    if (!marketService) {
      throw new Error(`No market service found for ${symbol} ${timeframe}`);
    }

    return await marketService.getMarketData();
  }

  /**
   * Health check for all market services
   */
  async healthCheck(): Promise<boolean> {
    const promises = Array.from(this.marketServices.values()).map((service) =>
      service.healthCheck()
    );

    const results = await Promise.allSettled(promises);
    const allHealthy = results.every(
      (result) => result.status === "fulfilled" && result.value === true
    );

    if (!allHealthy) {
      console.warn("⚠️ Some market services failed health check");
    }

    return allHealthy;
  }

  /**
   * Get current configuration
   */
  getConfig(): AlertConfig {
    return { ...this.config };
  }

  /**
   * Update configuration and reinitialize services
   */
  updateConfig(newConfig: AlertConfig): void {
    this.config = newConfig;
    this.marketServices.clear();
    this.initializeMarketServices();
    console.log("📝 Multi-pair market service config updated");
  }

  /**
   * Get list of active market service keys
   */
  getActiveServices(): string[] {
    return Array.from(this.marketServices.keys());
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    totalServices: number;
    pairs: string[];
    timeframes: string[];
    serviceKeys: string[];
  } {
    return {
      totalServices: this.marketServices.size,
      pairs: [...this.config.pairs],
      timeframes: [...this.config.timeframes],
      serviceKeys: Array.from(this.marketServices.keys()),
    };
  }
}
