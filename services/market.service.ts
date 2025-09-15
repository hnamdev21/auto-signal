import axios from "axios";
import { KlineData, MarketData } from "../types/market.model";

export class MarketService {
  private readonly baseUrl = "https://api.binance.com/api/v3";
  private readonly symbol: string;
  private readonly interval: string;

  constructor(symbol: string = "BTCUSDT", interval: string = "1m") {
    this.symbol = symbol;
    this.interval = interval;
  }

  /**
   * Fetch current price for the symbol
   */
  async getCurrentPrice(): Promise<number> {
    try {
      const response = await axios.get(`${this.baseUrl}/ticker/price`, {
        params: { symbol: this.symbol },
      });

      return parseFloat(response.data.price);
    } catch (error) {
      console.error("Error fetching current price:", error);
      throw new Error(`Failed to fetch current price for ${this.symbol}`);
    }
  }

  /**
   * Fetch kline data for RSI calculation
   * @param limit Number of klines to fetch (default: 100 to ensure we have enough data)
   */
  async getKlineData(limit: number = 100): Promise<KlineData[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/klines`, {
        params: {
          symbol: this.symbol,
          interval: this.interval,
          limit: limit,
        },
      });

      return response.data.map((kline: any[]) => ({
        openTime: kline[0],
        open: kline[1],
        high: kline[2],
        low: kline[3],
        close: kline[4],
        volume: kline[5],
        closeTime: kline[6],
        quoteAssetVolume: kline[7],
        numberOfTrades: kline[8],
        takerBuyBaseAssetVolume: kline[9],
        takerBuyQuoteAssetVolume: kline[10],
        ignore: kline[11],
      }));
    } catch (error) {
      console.error("Error fetching kline data:", error);
      throw new Error(`Failed to fetch kline data for ${this.symbol}`);
    }
  }

  /**
   * Get complete market data including current price and kline data
   */
  async getMarketData(): Promise<MarketData> {
    try {
      const [currentPrice, klineData] = await Promise.all([
        this.getCurrentPrice(),
        this.getKlineData(),
      ]);

      return {
        symbol: this.symbol,
        currentPrice,
        timestamp: Date.now(),
        klineData,
      };
    } catch (error) {
      console.error("Error fetching market data:", error);
      throw error;
    }
  }

  /**
   * Check if the service is healthy by making a simple API call
   */
  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/ping`);
      return true;
    } catch (error) {
      console.error("Market service health check failed:", error);
      return false;
    }
  }
}
