import { SignalStatistics, SignalRecord } from "../types/market.model";

export class StatisticsService {
  /**
   * Format statistics for display
   */
  formatStatistics(stats: SignalStatistics): string {
    const {
      totalSignals,
      activeSignals,
      completedSignals,
      tpHit,
      slHit,
      expired,
      winRate,
      totalPnl,
      totalPnlPercent,
      averagePnl,
      averagePnlPercent,
      averageDuration,
      bestTrade,
      worstTrade,
      signalTypeStats,
    } = stats;

    let message = `
📊 <b>BÁO CÁO THỐNG KÊ SIGNALS</b>

📈 <b>Tổng Quan:</b>
• Tổng Signals: ${totalSignals}
• Đang Hoạt Động: ${activeSignals}
• Đã Hoàn Thành: ${completedSignals}
• Win Rate: ${winRate.toFixed(1)}%

🎯 <b>Kết Quả:</b>
• TP Hit: ${tpHit} (${
      completedSignals > 0 ? ((tpHit / completedSignals) * 100).toFixed(1) : 0
    }%)
• SL Hit: ${slHit} (${
      completedSignals > 0 ? ((slHit / completedSignals) * 100).toFixed(1) : 0
    }%)
• Hết Hạn: ${expired} (${
      completedSignals > 0 ? ((expired / completedSignals) * 100).toFixed(1) : 0
    }%)

💰 <b>P&L:</b>
• Tổng P&L: ${totalPnl.toFixed(2)} USDT (${totalPnlPercent.toFixed(2)}%)
• P&L Trung Bình: ${averagePnl.toFixed(2)} USDT (${averagePnlPercent.toFixed(
      2
    )}%)
• Thời Gian Trung Bình: ${averageDuration.toFixed(0)} phút
    `;

    if (bestTrade) {
      message += `
🏆 <b>Trade Tốt Nhất:</b>
• ${bestTrade.signalType} - ${bestTrade.signalSubType}
• P&L: ${bestTrade.pnl?.toFixed(2)} USDT (${bestTrade.pnlPercent?.toFixed(2)}%)
• Thời gian: ${bestTrade.duration} phút
      `;
    }

    if (worstTrade) {
      message += `
💔 <b>Trade Tệ Nhất:</b>
• ${worstTrade.signalType} - ${worstTrade.signalSubType}
• P&L: ${worstTrade.pnl?.toFixed(2)} USDT (${worstTrade.pnlPercent?.toFixed(
        2
      )}%)
• Thời gian: ${worstTrade.duration} phút
      `;
    }

    message += `
📊 <b>Thống Kê Theo Loại Signal:</b>`;

    for (const [signalType, typeStats] of Object.entries(signalTypeStats)) {
      if (typeStats.count > 0) {
        const typeName = this.getSignalTypeName(signalType);
        message += `
• ${typeName}: ${typeStats.count} signals
  - Win Rate: ${typeStats.winRate.toFixed(1)}%
  - P&L: ${typeStats.totalPnl.toFixed(2)} USDT
  - P&L TB: ${typeStats.averagePnl.toFixed(2)} USDT`;
      }
    }

    message += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>📊 Báo cáo được tạo tự động bởi Signals Bot</i>
    `;

    return message.trim();
  }

  /**
   * Get signal type name in Vietnamese
   */
  private getSignalTypeName(signalType: string): string {
    switch (signalType) {
      case "RSI_DIVERGENCE":
        return "🎯 RSI Divergence";
      case "MACD_DIVERGENCE":
        return "📊 MACD Divergence";
      case "MARKET_STRUCTURE":
        return "🏗️ Market Structure";
      case "VOLUME_SPIKE":
        return "📈 Volume Spike";
      case "VOLUME_DIVERGENCE":
        return "📊 Volume Divergence";
      default:
        return signalType;
    }
  }

  /**
   * Format recent signals for display
   */
  formatRecentSignals(signals: SignalRecord[], limit: number = 5): string {
    if (signals.length === 0) {
      return "📊 Chưa có signals nào được ghi lại.";
    }

    let message = `
📊 <b>SIGNALS GẦN ĐÂY (${Math.min(limit, signals.length)} mới nhất)</b>

`;

    const recentSignals = signals.slice(0, limit);

    for (const signal of recentSignals) {
      const statusEmoji = this.getStatusEmoji(signal.status);
      const pnlEmoji =
        signal.pnl && signal.pnl > 0
          ? "🟢"
          : signal.pnl && signal.pnl < 0
          ? "🔴"
          : "⚪";
      const entryTime = new Date(signal.entryTime).toLocaleString("vi-VN");

      message += `
${statusEmoji} <b>${signal.symbol}</b> - ${this.getSignalTypeName(
        signal.signalType
      )}
• Loại: ${signal.signalSubType}
• Entry: ${signal.entryPrice.toLocaleString()} USDT
• TP: ${signal.takeProfit.toLocaleString()} USDT
• SL: ${signal.stopLoss.toLocaleString()} USDT
• Thời gian: ${entryTime}
• Lý do: ${signal.entryReason}
`;

      if (signal.status !== "ACTIVE") {
        const exitTime = signal.exitTime
          ? new Date(signal.exitTime).toLocaleString("vi-VN")
          : "N/A";
        message += `• Exit: ${signal.exitPrice?.toLocaleString()} USDT (${exitTime})
• P&L: ${pnlEmoji} ${signal.pnl?.toFixed(2)} USDT (${signal.pnlPercent?.toFixed(
          2
        )}%)
• Duration: ${signal.duration} phút
`;
      } else {
        message += `• Status: Đang hoạt động
`;
      }

      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }

    return message.trim();
  }

  /**
   * Get status emoji
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case "ACTIVE":
        return "🟡";
      case "TP_HIT":
        return "🟢";
      case "SL_HIT":
        return "🔴";
      case "EXPIRED":
        return "⚪";
      default:
        return "❓";
    }
  }

  /**
   * Format active signals for display
   */
  formatActiveSignals(signals: SignalRecord[]): string {
    if (signals.length === 0) {
      return "📊 Không có signals nào đang hoạt động.";
    }

    let message = `
📊 <b>SIGNALS ĐANG HOẠT ĐỘNG (${signals.length})</b>

`;

    for (const signal of signals) {
      const entryTime = new Date(signal.entryTime).toLocaleString("vi-VN");
      const duration = Math.round(
        (Date.now() - signal.entryTime) / (1000 * 60)
      );

      message += `
🟡 <b>${signal.symbol}</b> - ${this.getSignalTypeName(signal.signalType)}
• Loại: ${signal.signalSubType}
• Entry: ${signal.entryPrice.toLocaleString()} USDT
• TP: ${signal.takeProfit.toLocaleString()} USDT
• SL: ${signal.stopLoss.toLocaleString()} USDT
• Thời gian: ${entryTime}
• Duration: ${duration} phút
• R/R: ${signal.riskRewardRatio.toFixed(2)}:1
• Lý do: ${signal.entryReason}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }

    return message.trim();
  }

  /**
   * Format performance summary
   */
  formatPerformanceSummary(stats: SignalStatistics): string {
    const {
      totalSignals,
      winRate,
      totalPnl,
      totalPnlPercent,
      averagePnl,
      averagePnlPercent,
      tpHit,
      slHit,
    } = stats;

    const performanceEmoji =
      winRate >= 70 ? "🚀" : winRate >= 60 ? "📈" : winRate >= 50 ? "📊" : "📉";
    const pnlEmoji = totalPnl > 0 ? "🟢" : totalPnl < 0 ? "🔴" : "⚪";

    return `
${performanceEmoji} <b>TÓM TẮT HIỆU SUẤT</b>

📊 <b>Thống Kê Cơ Bản:</b>
• Tổng Signals: ${totalSignals}
• Win Rate: ${winRate.toFixed(1)}%
• TP Hit: ${tpHit} | SL Hit: ${slHit}

💰 <b>P&L:</b>
• Tổng: ${pnlEmoji} ${totalPnl.toFixed(2)} USDT (${totalPnlPercent.toFixed(2)}%)
• Trung Bình: ${averagePnl.toFixed(2)} USDT (${averagePnlPercent.toFixed(2)}%)

${this.getPerformanceRating(winRate, totalPnlPercent)}
    `.trim();
  }

  /**
   * Get performance rating
   */
  private getPerformanceRating(
    winRate: number,
    totalPnlPercent: number
  ): string {
    if (winRate >= 70 && totalPnlPercent > 0) {
      return "🏆 <b>XUẤT SẮC</b> - Bot đang hoạt động rất tốt!";
    } else if (winRate >= 60 && totalPnlPercent > 0) {
      return "📈 <b>TỐT</b> - Bot đang có lợi nhuận ổn định";
    } else if (winRate >= 50) {
      return "📊 <b>TRUNG BÌNH</b> - Cần cải thiện thêm";
    } else {
      return "📉 <b>CẦN CẢI THIỆN</b> - Xem xét lại strategy";
    }
  }

  /**
   * Generate daily report
   */
  generateDailyReport(stats: SignalStatistics, date: string): string {
    return `
📅 <b>BÁO CÁO NGÀY ${date}</b>

${this.formatPerformanceSummary(stats)}

📊 <b>Chi Tiết:</b>
• Signals mới: ${stats.totalSignals}
• Win Rate: ${stats.winRate.toFixed(1)}%
• P&L: ${stats.totalPnl.toFixed(2)} USDT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>📊 Báo cáo hàng ngày tự động</i>
    `.trim();
  }
}
