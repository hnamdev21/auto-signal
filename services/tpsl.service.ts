import { KlineData, TPSLConfig, TPSLResult } from "../types/market.model";
import {
  calculateRSIDivergenceTPSL,
  calculateMACDDivergenceTPSL,
  calculateMarketStructureTPSL,
  calculateVolumeSpikeTPSL,
  calculateVolumeDivergenceTPSL,
  getDefaultTPSLConfig,
} from "../utils/tpsl.utils";

export class TPSLService {
  private config: TPSLConfig;

  constructor(config?: Partial<TPSLConfig>) {
    this.config = {
      ...getDefaultTPSLConfig(),
      ...config,
    };
  }

  /**
   * Calculate TP/SL for RSI Divergence signal
   * @param entryPrice Entry price
   * @param isBullish Whether it's bullish divergence
   * @param klineData Kline data for calculations
   * @returns TP/SL result
   */
  calculateRSIDivergenceTPSL(
    entryPrice: number,
    isBullish: boolean,
    klineData: KlineData[]
  ): TPSLResult {
    return calculateRSIDivergenceTPSL(
      entryPrice,
      isBullish,
      this.config.rsiDivergence,
      klineData
    );
  }

  /**
   * Calculate TP/SL for MACD Divergence signal
   * @param entryPrice Entry price
   * @param isBullish Whether it's bullish divergence
   * @param klineData Kline data for calculations
   * @returns TP/SL result
   */
  calculateMACDDivergenceTPSL(
    entryPrice: number,
    isBullish: boolean,
    klineData: KlineData[]
  ): TPSLResult {
    return calculateMACDDivergenceTPSL(
      entryPrice,
      isBullish,
      this.config.macdDivergence,
      klineData
    );
  }

  /**
   * Calculate TP/SL for Market Structure signal
   * @param entryPrice Entry price
   * @param structureType Structure type
   * @param klineData Kline data for calculations
   * @returns TP/SL result
   */
  calculateMarketStructureTPSL(
    entryPrice: number,
    structureType: "HH" | "HL" | "LH" | "LL",
    klineData: KlineData[]
  ): TPSLResult {
    return calculateMarketStructureTPSL(
      entryPrice,
      structureType,
      this.config.marketStructure,
      klineData
    );
  }

  /**
   * Calculate TP/SL for Volume Spike signal
   * @param entryPrice Entry price
   * @param volumeRatio Volume ratio
   * @param klineData Kline data for calculations
   * @returns TP/SL result
   */
  calculateVolumeSpikeTPSL(
    entryPrice: number,
    volumeRatio: number,
    klineData: KlineData[]
  ): TPSLResult {
    return calculateVolumeSpikeTPSL(
      entryPrice,
      volumeRatio,
      this.config.volumeSpike,
      klineData
    );
  }

  /**
   * Calculate TP/SL for Volume Divergence signal
   * @param entryPrice Entry price
   * @param reversalProbability Reversal probability
   * @param isBullish Whether it's bullish divergence
   * @param klineData Kline data for calculations
   * @returns TP/SL result
   */
  calculateVolumeDivergenceTPSL(
    entryPrice: number,
    reversalProbability: "LOW" | "MEDIUM" | "HIGH",
    isBullish: boolean,
    klineData: KlineData[]
  ): TPSLResult {
    return calculateVolumeDivergenceTPSL(
      entryPrice,
      reversalProbability,
      isBullish,
      this.config.volumeDivergence,
      klineData
    );
  }

  /**
   * Update TP/SL configuration
   * @param newConfig New configuration
   */
  updateConfig(newConfig: Partial<TPSLConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Get current TP/SL configuration
   * @returns Current configuration
   */
  getConfig(): TPSLConfig {
    return { ...this.config };
  }

  /**
   * Get TP/SL method description
   * @param method Method name
   * @returns Description in Vietnamese
   */
  getMethodDescription(method: string): string {
    switch (method) {
      case "RSI_DIVERGENCE_ATR":
        return "RSI Phân Kỳ + ATR";
      case "MACD_DIVERGENCE_ATR":
        return "MACD Phân Kỳ + ATR";
      case "MARKET_STRUCTURE_BASIC":
        return "Cấu Trúc Thị Trường Cơ Bản";
      case "MARKET_STRUCTURE_SUPPORT":
        return "Cấu Trúc + Hỗ Trợ";
      case "MARKET_STRUCTURE_RESISTANCE":
        return "Cấu Trúc + Kháng Cự";
      case "VOLUME_SPIKE_DYNAMIC":
        return "Volume Spike Động";
      case "VOLUME_DIVERGENCE_REVERSAL":
        return "Volume Phân Kỳ + Đảo Chiều";
      default:
        return "Phương Pháp Khác";
    }
  }

  /**
   * Get risk level description
   * @param riskRewardRatio Risk/Reward ratio
   * @returns Risk level description
   */
  getRiskLevel(riskRewardRatio: number): {
    level: "THẤP" | "TRUNG BÌNH" | "CAO" | "RẤT CAO";
    emoji: string;
    description: string;
  } {
    if (riskRewardRatio >= 3) {
      return {
        level: "THẤP",
        emoji: "🟢",
        description: "Rủi ro thấp, lợi nhuận cao",
      };
    } else if (riskRewardRatio >= 2) {
      return {
        level: "TRUNG BÌNH",
        emoji: "🟡",
        description: "Rủi ro trung bình, lợi nhuận tốt",
      };
    } else if (riskRewardRatio >= 1.5) {
      return {
        level: "CAO",
        emoji: "🟠",
        description: "Rủi ro cao, lợi nhuận vừa phải",
      };
    } else {
      return {
        level: "RẤT CAO",
        emoji: "🔴",
        description: "Rủi ro rất cao, cần cẩn thận",
      };
    }
  }

  /**
   * Validate TP/SL result
   * @param result TP/SL result
   * @param entryPrice Entry price
   * @returns Validation result
   */
  validateTPSL(
    result: TPSLResult,
    entryPrice: number
  ): {
    isValid: boolean;
    warnings: string[];
    suggestions: string[];
  } {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check if TP/SL are reasonable
    if (result.riskRewardRatio < 1) {
      warnings.push("Tỷ lệ R/R < 1 - Rủi ro cao hơn lợi nhuận");
      suggestions.push("Cân nhắc điều chỉnh TP/SL để cải thiện R/R");
    }

    if (result.riskRewardRatio > 5) {
      warnings.push("Tỷ lệ R/R > 5 - Có thể quá lạc quan");
      suggestions.push("Kiểm tra lại tính thực tế của TP");
    }

    // Check if SL is too close to entry
    const slDistance = Math.abs(result.stopLoss - entryPrice) / entryPrice;
    if (slDistance < 0.005) {
      warnings.push("Stop Loss quá gần entry (< 0.5%)");
      suggestions.push("Mở rộng SL để tránh bị stop out bởi noise");
    }

    // Check if TP is too far
    const tpDistance = Math.abs(result.takeProfit - entryPrice) / entryPrice;
    if (tpDistance > 0.1) {
      warnings.push("Take Profit quá xa entry (> 10%)");
      suggestions.push("Cân nhắc chia nhỏ TP thành nhiều levels");
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      suggestions,
    };
  }

  /**
   * Get TP/SL summary for display
   * @param result TP/SL result
   * @param entryPrice Entry price
   * @returns Summary string
   */
  getTPSLSummary(result: TPSLResult, entryPrice: number): string {
    const riskLevel = this.getRiskLevel(result.riskRewardRatio);
    const methodDesc = this.getMethodDescription(result.method);
    const validation = this.validateTPSL(result, entryPrice);

    let summary = `📊 ${methodDesc} | R/R: ${result.riskRewardRatio.toFixed(
      2
    )} | ${riskLevel.emoji} ${riskLevel.level}`;

    if (!validation.isValid) {
      summary += ` | ⚠️ ${validation.warnings.length} cảnh báo`;
    }

    return summary;
  }

  /**
   * Calculate optimal position size based on risk
   * @param accountBalance Account balance
   * @param riskPercent Risk percentage per trade
   * @param entryPrice Entry price
   * @param stopLoss Stop loss price
   * @returns Position size
   */
  calculatePositionSize(
    accountBalance: number,
    riskPercent: number,
    entryPrice: number,
    stopLoss: number
  ): number {
    const riskAmount = accountBalance * (riskPercent / 100);
    const riskPerUnit = Math.abs(entryPrice - stopLoss);

    if (riskPerUnit === 0) return 0;

    return riskAmount / riskPerUnit;
  }

  /**
   * Get TP/SL configuration summary
   * @returns Configuration summary
   */
  getConfigSummary(): string {
    const {
      rsiDivergence,
      macdDivergence,
      marketStructure,
      volumeSpike,
      volumeDivergence,
    } = this.config;

    return `
📊 Cấu Hình TP/SL:
🎯 RSI Divergence: TP ${rsiDivergence.tpPercent}% | SL ${
      rsiDivergence.slPercent
    }% | ATR x${rsiDivergence.atrMultiplier}
📊 MACD Divergence: TP ${macdDivergence.tpPercent}% | SL ${
      macdDivergence.slPercent
    }% | ATR x${macdDivergence.atrMultiplier}
🏗️ Market Structure: TP ${marketStructure.tpPercent}% | SL ${
      marketStructure.slPercent
    }% | ${marketStructure.structureBased ? "Structure-based" : "Basic"}
📈 Volume Spike: TP ${volumeSpike.tpPercent}% | SL ${
      volumeSpike.slPercent
    }% | ${volumeSpike.volumeBased ? "Volume-based" : "Basic"}
📊 Volume Divergence: TP ${volumeDivergence.tpPercent}% | SL ${
      volumeDivergence.slPercent
    }% | ${volumeDivergence.reversalBased ? "Reversal-based" : "Basic"}
    `.trim();
  }
}
