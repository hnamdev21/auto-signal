# Volume Alert System

A sophisticated cryptocurrency volume alert system that monitors multiple trading pairs across different timeframes to detect volume spikes and divergences.

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

### 📊 Multi-Pair & Multi-Timeframe Support

- Default pairs: BTC-USDT, ETH-USDT
- Default timeframes: 5m, 15m
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
TIMEFRAMES=5m,15m                        # Comma-separated timeframes
VOLUME_SPIKE_THRESHOLD=1.5               # Volume spike multiplier
DIVERGENCE_CANDLE_COUNT=3                # Candles for divergence analysis
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

## Architecture

### Services

- **MultiPairMarketService**: Handles data fetching for multiple pairs/timeframes
- **AlertService**: Processes volume analysis and alert detection
- **TelegramService**: Sends formatted alerts to Telegram
- **CandleSyncScheduler**: Ensures synchronized execution

### Data Flow

1. Candle closes → Scheduler triggers execution
2. Fetch market data for all configured pairs/timeframes
3. Process volume analysis (spike & divergence detection)
4. Send alerts via Telegram if conditions are met
5. Update divergence tracking to prevent duplicates

### Divergence Tracking

- JSON file storage (`divergence-tracker.json`)
- Tracks alert history per symbol/timeframe
- Prevents duplicate alerts within 1-hour window
- Maintains candle history for pattern analysis

## Monitoring

The bot provides comprehensive logging:

- Service health checks
- Market data fetching status
- Alert detection and sending
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
│   ├── alert.service.ts              # Volume analysis & alert detection
│   ├── multi-pair-market.service.ts  # Multi-pair data fetching
│   ├── market.service.ts             # Binance API integration
│   └── telegram.service.ts           # Telegram notifications
├── types/
│   └── market.model.ts               # TypeScript interfaces
├── utils/
│   ├── candle-sync-scheduler.utils.ts # Candle synchronization
│   └── scheduler.utils.ts            # UTC scheduling utilities
└── index.ts                          # Main application entry
```

### Adding New Features

1. Extend types in `market.model.ts`
2. Implement logic in appropriate service
3. Update main execution flow in `index.ts`
4. Add configuration options to `env.example`

## License

ISC
