import {
  KlineData,
  MarketStructurePoint,
  MarketStructureSignal,
} from "../types/market.model";
import { detectPivotHighs, detectPivotLows } from "./pivot.utils";

/**
 * Detect market structure points (swing highs and lows)
 * @param klineData Array of kline data
 * @param pivotLength Pivot detection length
 * @returns Array of market structure points
 */
export function detectMarketStructurePoints(
  klineData: KlineData[],
  pivotLength: number = 2
): MarketStructurePoint[] {
  const structurePoints: MarketStructurePoint[] = [];

  const closePrices = klineData.map((kline) => parseFloat(kline.close));
  const highPrices = klineData.map((kline) => parseFloat(kline.high));
  const lowPrices = klineData.map((kline) => parseFloat(kline.low));

  // Detect pivot highs and lows
  const pivotHighs = detectPivotHighs(highPrices, pivotLength, pivotLength);
  const pivotLows = detectPivotLows(lowPrices, pivotLength, pivotLength);

  // Convert pivot highs to structure points
  pivotHighs.forEach((pivot) => {
    structurePoints.push({
      price: pivot.value,
      index: pivot.index,
      timestamp: pivot.timestamp,
      type: "HIGH",
    });
  });

  // Convert pivot lows to structure points
  pivotLows.forEach((pivot) => {
    structurePoints.push({
      price: pivot.value,
      index: pivot.index,
      timestamp: pivot.timestamp,
      type: "LOW",
    });
  });

  // Sort by index
  structurePoints.sort((a, b) => a.index - b.index);

  return structurePoints;
}

/**
 * Analyze market structure and detect break signals
 * @param structurePoints Array of market structure points
 * @param currentPrice Current market price
 * @param config Configuration for TP/SL
 * @returns Market structure signal if detected
 */
export function analyzeMarketStructure(
  structurePoints: MarketStructurePoint[],
  currentPrice: number,
  config: { tpPercent: number; slPercent: number }
): MarketStructureSignal | null {
  try {
    if (structurePoints.length < 4) {
      return null;
    }

    // Get recent structure points
    const recentPoints = structurePoints.slice(-4);

    // Analyze the last 4 points to determine structure
    const lastPoint = recentPoints[recentPoints.length - 1];
    const secondLastPoint = recentPoints[recentPoints.length - 2];
    const thirdLastPoint = recentPoints[recentPoints.length - 3];
    const fourthLastPoint = recentPoints[recentPoints.length - 4];

    if (!lastPoint || !secondLastPoint || !thirdLastPoint || !fourthLastPoint) {
      return null;
    }

    // Check for Higher High (HH) - Bullish break
    if (
      lastPoint.type === "HIGH" &&
      secondLastPoint.type === "LOW" &&
      thirdLastPoint.type === "HIGH" &&
      lastPoint.price > thirdLastPoint.price &&
      secondLastPoint.price > fourthLastPoint.price
    ) {
      const { takeProfit, stopLoss } = calculateTPSL(
        currentPrice,
        true,
        config.tpPercent,
        config.slPercent
      );

      return {
        type: "BULLISH_BREAK",
        price: currentPrice,
        structureType: "HH",
        timestamp: Date.now(),
        takeProfit,
        stopLoss,
        confidence: calculateStructureConfidence(
          lastPoint.price,
          thirdLastPoint.price,
          "HH"
        ),
      };
    }

    // Check for Higher Low (HL) - Bullish continuation
    if (
      lastPoint.type === "LOW" &&
      secondLastPoint.type === "HIGH" &&
      thirdLastPoint.type === "LOW" &&
      lastPoint.price > thirdLastPoint.price
    ) {
      const { takeProfit, stopLoss } = calculateTPSL(
        currentPrice,
        true,
        config.tpPercent,
        config.slPercent
      );

      return {
        type: "BULLISH_CONTINUATION",
        price: currentPrice,
        structureType: "HL",
        timestamp: Date.now(),
        takeProfit,
        stopLoss,
        confidence: calculateStructureConfidence(
          lastPoint.price,
          thirdLastPoint.price,
          "HL"
        ),
      };
    }

    // Check for Lower Low (LL) - Bearish break
    if (
      lastPoint.type === "LOW" &&
      secondLastPoint.type === "HIGH" &&
      thirdLastPoint.type === "LOW" &&
      lastPoint.price < thirdLastPoint.price &&
      secondLastPoint.price < fourthLastPoint.price
    ) {
      const { takeProfit, stopLoss } = calculateTPSL(
        currentPrice,
        false,
        config.tpPercent,
        config.slPercent
      );

      return {
        type: "BEARISH_BREAK",
        price: currentPrice,
        structureType: "LL",
        timestamp: Date.now(),
        takeProfit,
        stopLoss,
        confidence: calculateStructureConfidence(
          lastPoint.price,
          thirdLastPoint.price,
          "LL"
        ),
      };
    }

    // Check for Lower High (LH) - Bearish continuation
    if (
      lastPoint.type === "HIGH" &&
      secondLastPoint.type === "LOW" &&
      thirdLastPoint.type === "HIGH" &&
      lastPoint.price < thirdLastPoint.price
    ) {
      const { takeProfit, stopLoss } = calculateTPSL(
        currentPrice,
        false,
        config.tpPercent,
        config.slPercent
      );

      return {
        type: "BEARISH_CONTINUATION",
        price: currentPrice,
        structureType: "LH",
        timestamp: Date.now(),
        takeProfit,
        stopLoss,
        confidence: calculateStructureConfidence(
          lastPoint.price,
          thirdLastPoint.price,
          "LH"
        ),
      };
    }

    return null;
  } catch (error) {
    console.error("Error analyzing market structure:", error);
    return null;
  }
}

/**
 * Calculate take profit and stop loss levels
 */
function calculateTPSL(
  price: number,
  isBullish: boolean,
  tpPercent: number,
  slPercent: number
): { takeProfit: number; stopLoss: number } {
  if (isBullish) {
    return {
      takeProfit: price * (1 + tpPercent / 100),
      stopLoss: price * (1 - slPercent / 100),
    };
  } else {
    return {
      takeProfit: price * (1 - tpPercent / 100),
      stopLoss: price * (1 + slPercent / 100),
    };
  }
}

/**
 * Calculate confidence based on structure strength
 */
function calculateStructureConfidence(
  currentPrice: number,
  previousPrice: number,
  structureType: "HH" | "HL" | "LH" | "LL"
): number {
  const priceDiff = Math.abs(currentPrice - previousPrice);
  const percentageDiff = (priceDiff / previousPrice) * 100;

  // Higher percentage difference = higher confidence
  let confidence = Math.min(100, percentageDiff * 20);

  // Adjust confidence based on structure type
  switch (structureType) {
    case "HH":
    case "LL":
      confidence *= 1.2; // Break structures are more significant
      break;
    case "HL":
    case "LH":
      confidence *= 1.0; // Continuation structures
      break;
  }

  return Math.min(100, confidence);
}

/**
 * Get market structure trend direction
 * @param structurePoints Array of market structure points
 * @returns Trend direction
 */
export function getMarketTrend(
  structurePoints: MarketStructurePoint[]
): "BULLISH" | "BEARISH" | "SIDEWAYS" {
  if (structurePoints.length < 4) {
    return "SIDEWAYS";
  }

  const recentPoints = structurePoints.slice(-4);
  let bullishCount = 0;
  let bearishCount = 0;

  for (let i = 1; i < recentPoints.length; i++) {
    const current = recentPoints[i];
    const previous = recentPoints[i - 1];

    if (!current || !previous) {
      continue;
    }

    if (current.type === "HIGH" && previous.type === "HIGH") {
      if (current.price > previous.price) bullishCount++;
      else bearishCount++;
    } else if (current.type === "LOW" && previous.type === "LOW") {
      if (current.price > previous.price) bullishCount++;
      else bearishCount++;
    }
  }

  if (bullishCount > bearishCount) return "BULLISH";
  if (bearishCount > bullishCount) return "BEARISH";
  return "SIDEWAYS";
}

/**
 * Detect market structure signal from kline data
 * @param klineData Array of kline data
 * @param currentPrice Current market price
 * @param config Configuration
 * @returns Market structure signal if detected
 */
export function detectMarketStructureSignal(
  klineData: KlineData[],
  currentPrice: number,
  config: { pivotLength: number; tpPercent: number; slPercent: number }
): MarketStructureSignal | null {
  try {
    if (klineData.length < 20) {
      return null;
    }

    const structurePoints = detectMarketStructurePoints(
      klineData,
      config.pivotLength
    );
    return analyzeMarketStructure(structurePoints, currentPrice, config);
  } catch (error) {
    console.error("Error detecting market structure signal:", error);
    return null;
  }
}
