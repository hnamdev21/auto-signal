# Advanced Cryptocurrency Alert & Trading System

A sophisticated cryptocurrency alert and trading system that monitors multiple trading pairs across different timeframes to detect volume spikes, RSI divergences, scalping signals, and provides OKX exchange integration with balance alerts and extensible trading actions.

## Features

### 🚨 Volume Spike Detection

- Monitors volume spikes when current volume exceeds 1.5x the average volume
- Configurable threshold via environment variables
- Real-time alerts via Telegram

### ⚠️ Volume Divergence Detection

- Detects when price is rising but volume is declining (bearish divergence)
- Analyzes 3 consecutive closed candles by default
- Prevents duplicate alerts with JSON-based tracking
- Configurable candle count for analysis

### 📊 RSI Divergence Detection

- Detects bullish and bearish RSI divergences
- Configurable RSI period and overbought/oversold levels
- Advanced pattern recognition with lookback periods
- Prevents duplicate alerts with intelligent tracking

### 🚀 Scalping Signal Detection (1m timeframe)

- EMA Crossover signals (9/21 periods)
- Stochastic Oscillator signals
- Bollinger Bands squeeze detection
- Volume spike confirmation
- Confidence-based alert filtering

### 💰 OKX Exchange Integration

- **Balance Alerts**: Automatic balance monitoring every 5 minutes
- **Trading Actions**: Extensible action system for future bot trading
- **Futures Support**: Full OKX futures API integration
- **Order Management**: Place, close, and manage futures orders
- **Real-time Monitoring**: Live balance and position tracking

### 📊 Multi-Pair & Multi-Timeframe Support

- Default pairs: BTC-USDT, ETH-USDT
- Default timeframes: 5m, 15m, 1m (for scalping)
- Synchronized execution with smallest timeframe
- Parallel data fetching for optimal performance

### 🔄 Candle-Synchronized Execution

- Executes at exact candle close times
- Uses smallest timeframe for synchronization
- Ensures data consistency across all timeframes

## Configuration

### Environment Variables

```bash
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Alert System Configuration
PAIRS=BTCUSDT,ETHUSDT                    # Comma-separated pairs
TIMEFRAMES=5m,15m,1m                     # Comma-separated timeframes
VOLUME_SPIKE_THRESHOLD=1.5               # Volume spike multiplier
DIVERGENCE_CANDLE_COUNT=3                # Candles for divergence analysis

# RSI Configuration
RSI_PERIOD=14                            # RSI calculation period
RSI_OVERBOUGHT=70                        # RSI overbought threshold
RSI_OVERSOLD=30                          # RSI oversold threshold
RSI_DIVERGENCE_LOOKBACK=20               # Candles to look back for RSI divergence

# Scalping Configuration (1m timeframe)
SCALPING_EMA_FAST=9                      # EMA Fast Period
SCALPING_EMA_SLOW=21                     # EMA Slow Period
SCALPING_STOCHASTIC_K=14                 # Stochastic K Period
SCALPING_STOCHASTIC_D=3                  # Stochastic D Period
SCALPING_STOCHASTIC_OVERBOUGHT=80        # Stochastic Overbought Level
SCALPING_STOCHASTIC_OVERSOLD=20          # Stochastic Oversold Level
SCALPING_BOLLINGER_PERIOD=20             # Bollinger Bands Period
SCALPING_BOLLINGER_STDDEV=2              # Bollinger Bands Standard Deviation
SCALPING_VOLUME_THRESHOLD=2.0            # Volume Spike Threshold for Scalping
SCALPING_MIN_CONFIDENCE=70               # Minimum Confidence Level for Scalping Alerts
SCALPING_ALERT_COOLDOWN=300000           # Alert Cooldown for Scalping (milliseconds)

# OKX Exchange Configuration
OKX_API_KEY=your_okx_api_key             # OKX API Key
OKX_API_SECRET=your_okx_api_secret       # OKX API Secret
OKX_PASSPHRASE=your_okx_passphrase       # OKX Passphrase

# OKX Balance Alert Configuration
OKX_BALANCE_ALERTS_ENABLED=true          # Enable balance alerts
OKX_BALANCE_ALERT_INTERVAL=5             # Balance alert interval in minutes
OKX_MIN_BALANCE_THRESHOLD=0.001          # Minimum balance threshold for alerts
```

### Supported Timeframes

- 1m, 3m, 5m, 15m, 30m
- 1h, 2h, 4h, 6h, 8h, 12h
- 1d, 3d, 1w

## Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment file:

   ```bash
   cp env.example .env
   ```

4. Configure your `.env` file with your Telegram bot credentials

5. Start the bot:
   ```bash
   npm start
   ```

## Alert Types

### Volume Spike Alert

```
🚨 VOLUME SPIKE DETECTED

📊 Symbol: BTCUSDT
⏰ Timeframe: 5m
💰 Price: $43,250.50
📈 Volume: 1,250.75
📊 Average Volume: 800.25
🔥 Spike Ratio: 1.56x
```

### Volume Divergence Alert

```
⚠️ VOLUME DIVERGENCE DETECTED

📊 Symbol: ETHUSDT
⏰ Timeframe: 15m
💰 Current Price: $2,650.25
🕯️ Candles Analyzed: 3

📈 Price Change: +2.45%
📉 Volume Change: -15.30%

Recent Candles:
1. Price: $2,580.50 | Volume: 850.25
2. Price: $2,610.75 | Volume: 720.50
3. Price: $2,650.25 | Volume: 720.00
```

### RSI Divergence Alert

```
📊 RSI DIVERGENCE DETECTED

📊 Symbol: BTCUSDT
⏰ Timeframe: 15m
💰 Current Price: $43,250.50
📈 RSI Current: 45.25

🔍 Divergence Type: BULLISH

📊 Divergence Details:
• Price High: $43,500.00
• Price Low: $42,800.00
• RSI High: 65.50
• RSI Low: 35.25

📈 Changes:
• Price: -1.61%
• RSI: -30.92%

💡 Signal: BUY - Price falling but RSI rising
```

### Scalping Signal Alert

```
🚀 SCALPING SIGNAL

📊 Symbol: ETHUSDT
⏰ Timeframe: 1m
💰 Price: $2,650.25
🎯 Signal: 🟢 BUY
📊 Confidence: 85%
📈 Indicator: EMA CROSSOVER

📊 EMA Crossover:
• EMA 9: 2,648.50
• EMA 21: 2,645.75
```

### OKX Balance Alert

```
💰 CẬP NHẬT SỐ DƯ OKX

• USDT: 1,250.500000 (Available: 1,200.000000)
• BTC: 0.025000 (Available: 0.020000)
• ETH: 0.500000 (Available: 0.450000)

💰 Total Value: 1,250.525000

⏰ Time: 2024-01-15T10:30:00.000Z

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 OKX Futures Balance Alert
```

## Architecture

### Services

- **MultiPairMarketService**: Handles data fetching for multiple pairs/timeframes
- **AlertService**: Processes volume, RSI, and scalping analysis and alert detection
- **TelegramService**: Sends formatted alerts to Telegram
- **OKXBalanceAlertService**: Monitors OKX futures balance and generates alerts
- **BotActionService**: Extensible action system for future trading capabilities
- **OKXService**: OKX exchange API integration for trading operations
- **CandleSyncScheduler**: Ensures synchronized execution

### Data Flow

1. Candle closes → Scheduler triggers execution
2. Fetch market data for all configured pairs/timeframes
3. Process analysis (volume spikes, RSI divergences, scalping signals)
4. Check OKX balance and generate balance alerts if needed
5. Send all alerts via Telegram if conditions are met
6. Update tracking systems to prevent duplicates
7. Execute any pending trading actions (future feature)

### Tracking Systems

- **Volume Divergence**: JSON file storage (`volume-divergence-tracker.json`)
- **RSI Divergence**: JSON file storage (`rsi-divergence-tracker.json`)
- **Scalping Signals**: JSON file storage (`scalping-tracker.json`)
- Tracks alert history per symbol/timeframe
- Prevents duplicate alerts within cooldown periods
- Maintains candle history for pattern analysis

## Monitoring

The bot provides comprehensive logging:

- Service health checks (Market, Telegram, OKX)
- Market data fetching status
- Alert detection and sending (Volume, RSI, Scalping, OKX Balance)
- OKX balance monitoring and alerts
- Trading action execution (future feature)
- Error handling and notifications

## Error Handling

- Graceful degradation on API failures
- Automatic retry mechanisms
- Telegram error notifications
- Comprehensive logging for debugging

## Development

### Project Structure

```
├── services/
│   ├── alert.service.ts                    # Volume, RSI & scalping analysis
│   ├── multi-pair-market.service.ts        # Multi-pair data fetching
│   ├── market.service.ts                   # Binance API integration
│   ├── telegram.service.ts                 # Telegram notifications
│   ├── okx.service.ts                      # OKX exchange API integration
│   ├── okx-balance-alert.service.ts        # OKX balance monitoring
│   ├── bot-action.service.ts               # Extensible trading actions
│   ├── rsi-divergence.service.ts           # RSI divergence detection
│   ├── scalping.service.ts                 # Scalping signal detection
│   └── volume-divergence.service.ts        # Volume divergence detection
├── types/
│   └── market.model.ts                     # TypeScript interfaces
├── utils/
│   ├── candle-sync-scheduler.utils.ts      # Candle synchronization
│   └── scheduler.utils.ts                  # UTC scheduling utilities
├── data/                                   # JSON tracking files
└── index.ts                                # Main application entry
```

### Adding New Features

1. Extend types in `market.model.ts`
2. Implement logic in appropriate service
3. Update main execution flow in `index.ts`
4. Add configuration options to `env.example`

## License

ISC
