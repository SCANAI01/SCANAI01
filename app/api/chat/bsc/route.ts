import {
  convertToModelMessages,
  type InferUITools,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
  validateUIMessages,
} from "ai";
import { z } from "zod";

export const maxDuration = 60;

// Birdeye API Key
// const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || ""
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

// const BIRDEYE_BASE_URL = "https://public-api.birdeye.so"
async function fetchGeckoTerminalOHLCV(
  poolAddress: string,
  timeframe: "minute" | "hour" | "day" = "minute",
  aggregate = 5
): Promise<{
  success: boolean;
  data?: {
    candles: Array<{
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
  };
  error?: { stage: string; status: number; message: string; details: string };
}> {
  try {
    // GeckoTerminal OHLCV endpoint - FREE, 30 calls/minute
    const url = `https://api.geckoterminal.com/api/v2/networks/bsc/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=500&currency=usd`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json;version=20230302",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => "Unable to read error response");
      return {
        success: false,
        error: {
          stage: "geckoterminal_ohlcv",
          status: response.status,
          message: `GeckoTerminal OHLCV request failed`,
          details: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
        },
      };
    }

    const json = await response.json();

    // GeckoTerminal response structure: { data: { id, type, attributes: { ohlcv_list: [[timestamp, o, h, l, c, v], ...] } } }
    const ohlcvList = json.data?.attributes?.ohlcv_list;

    if (!ohlcvList || ohlcvList.length === 0) {
      return {
        success: false,
        error: {
          stage: "geckoterminal_ohlcv",
          status: 404,
          message: "No OHLCV data available for this pool on BSC",
          details:
            "GeckoTerminal returned empty ohlcv_list - pool may be too new or inactive",
        },
      };
    }

    // Map GeckoTerminal format [timestamp, o, h, l, c, v] to standardized format
    const candles = ohlcvList
      .map((item: number[]) => ({
        timestamp: item[0],
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
        volume: item[5],
      }))
      .filter(
        (c: any) => c.close !== undefined && c.close !== null && !isNaN(c.close)
      )
      .sort((a: any, b: any) => a.timestamp - b.timestamp); // chronological order

    return {
      success: true,
      data: { candles },
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        stage: "geckoterminal_ohlcv",
        status: 500,
        message: "Failed to fetch OHLCV from GeckoTerminal",
        details: error.message || "Network error or timeout",
      },
    };
  }
}

async function getPoolAddressForToken(tokenAddress: string): Promise<{
  success: boolean;
  data?: {
    poolAddress: string;
    pairName: string;
    dex: string;
    priceUsd: number;
    liquidity: number;
  };
  error?: string;
}> {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    );
    const data = await response.json();

    if (!data.pairs || data.pairs.length === 0) {
      return { success: false, error: "No trading pairs found for this token" };
    }

    // Find best BSC pair with highest liquidity
    const bscPairs = data.pairs
      .filter((p: any) => p.chainId === "bsc")
      .sort(
        (a: any, b: any) =>
          (Number(b.liquidity?.usd) || 0) - (Number(a.liquidity?.usd) || 0)
      );

    if (bscPairs.length === 0) {
      return {
        success: false,
        error: "No BSC trading pairs found for this token",
      };
    }

    const bestPair = bscPairs[0];

    return {
      success: true,
      data: {
        poolAddress: bestPair.pairAddress,
        pairName: `${bestPair.baseToken?.symbol}/${bestPair.quoteToken?.symbol}`,
        dex: bestPair.dexId,
        priceUsd: Number(bestPair.priceUsd) || 0,
        liquidity: Number(bestPair.liquidity?.usd) || 0,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch pool address",
    };
  }
}
// Helper to fetch token profile (logo, description, links)
async function fetchTokenProfile(address: string) {
  try {
    const response = await fetch(
      "https://api.dexscreener.com/token-profiles/latest/v1",
      {
        signal: AbortSignal.timeout(5000),
      }
    );
    const profiles = await response.json();
    if (Array.isArray(profiles)) {
      const profile = profiles.find(
        (p: any) =>
          p.tokenAddress?.toLowerCase() === address.toLowerCase() &&
          p.chainId === "bsc"
      );
      return profile || null;
    }
    return null;
  } catch {
    return null;
  }
}

// Technical Analysis Helper Functions
function calculateRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  if (gains.length < period) return null;

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Wilder smoothing for remaining periods
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA for first value
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  ema.push(sum / Math.min(period, data.length));

  // Calculate EMA for remaining values
  for (let i = period; i < data.length; i++) {
    ema.push(
      (data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]
    );
  }

  return ema;
}

function calculateMACD(
  closes: number[]
): { macd: number; signal: number; histogram: number } | null {
  if (closes.length < 26) return null;

  const ema = (data: number[], period: number): number[] => {
    const k = 2 / (period + 1);
    const result: number[] = [];
    let prevEma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push(prevEma);

    for (let i = period; i < data.length; i++) {
      const newEma = data[i] * k + prevEma * (1 - k);
      result.push(newEma);
      prevEma = newEma;
    }
    return result;
  };

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);

  if (ema12.length === 0 || ema26.length === 0) return null;

  const macdLine: number[] = [];
  const offset = ema12.length - ema26.length;
  for (let i = 0; i < ema26.length; i++) {
    macdLine.push(ema12[i + offset] - ema26[i]);
  }

  if (macdLine.length < 9) return null;

  const signalLine = ema(macdLine, 9);
  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];

  return { macd, signal, histogram: macd - signal };
}

function calculateBollingerBands(
  closes: number[],
  period = 20,
  stdDev = 2
): { upper: number; middle: number; lower: number; percentB: number } | null {
  if (closes.length < period) return null;

  const slice = closes.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance =
    slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
  const std = Math.sqrt(variance);
  const upper = middle + stdDev * std;
  const lower = middle - stdDev * std;
  const current = closes[closes.length - 1];
  const percentB =
    upper !== lower ? ((current - lower) / (upper - lower)) * 100 : 50;

  return { upper, middle, lower, percentB };
}

function calculateStochRSI(
  closes: number[],
  rsiPeriod = 14,
  stochPeriod = 14,
  kPeriod = 3,
  dPeriod = 3
): { k: number; d: number; signal: string } | null {
  if (closes.length < rsiPeriod + stochPeriod + kPeriod + dPeriod) return null;

  // Calculate RSI values for the stoch period
  const rsiValues: number[] = [];
  for (let i = rsiPeriod; i <= closes.length; i++) {
    const slice = closes.slice(i - rsiPeriod - 1, i);
    const rsiVal = calculateRSI(slice, rsiPeriod);
    if (rsiVal !== null) rsiValues.push(rsiVal);
  }

  if (rsiValues.length < stochPeriod) return null;

  // Calculate Stochastic of RSI
  const stochValues: number[] = [];
  for (let i = stochPeriod; i <= rsiValues.length; i++) {
    const slice = rsiValues.slice(i - stochPeriod, i);
    const minRsi = Math.min(...slice);
    const maxRsi = Math.max(...slice);
    const stoch =
      maxRsi !== minRsi
        ? ((rsiValues[i - 1] - minRsi) / (maxRsi - minRsi)) * 100
        : 50;
    stochValues.push(stoch);
  }

  if (stochValues.length < kPeriod + dPeriod) return null;

  // %K is SMA of stoch values
  const kValues: number[] = [];
  for (let i = kPeriod; i <= stochValues.length; i++) {
    const kSlice = stochValues.slice(i - kPeriod, i);
    kValues.push(kSlice.reduce((a, b) => a + b, 0) / kPeriod);
  }

  if (kValues.length < dPeriod) return null;

  // %D is SMA of %K
  const dSlice = kValues.slice(-dPeriod);
  const d = dSlice.reduce((a, b) => a + b, 0) / dPeriod;
  const k = kValues[kValues.length - 1];

  let signal = "Neutral";
  if (k > 80 && d > 80) signal = "Overbought";
  else if (k < 20 && d < 20) signal = "Oversold";
  else if (k > d) signal = "Bullish";
  else if (k < d) signal = "Bearish";

  return { k, d, signal };
}

function calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): { adx: number; plusDI: number; minusDI: number; trend: string } | null {
  if (
    highs.length < period * 2 ||
    lows.length < period * 2 ||
    closes.length < period * 2
  )
    return null;

  const trueRanges: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < highs.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const prevHigh = highs[i - 1];
    const prevLow = lows[i - 1];
    const prevClose = closes[i - 1];

    // True Range
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);

    // Directional Movement
    const plusDM =
      high - prevHigh > prevLow - low ? Math.max(high - prevHigh, 0) : 0;
    const minusDM =
      prevLow - low > high - prevHigh ? Math.max(prevLow - low, 0) : 0;
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
  }

  if (trueRanges.length < period) return null;

  // Smoothed averages
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedPlusDM = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothedMinusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

  const dxValues: number[] = [];

  for (let i = period; i < trueRanges.length; i++) {
    atr = atr - atr / period + trueRanges[i];
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDMs[i];
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDMs[i];

    const plusDI = atr !== 0 ? (smoothedPlusDM / atr) * 100 : 0;
    const minusDI = atr !== 0 ? (smoothedMinusDM / atr) * 100 : 0;
    const diSum = plusDI + minusDI;
    const dx = diSum !== 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;
    dxValues.push(dx);
  }

  if (dxValues.length < period) return null;

  // ADX is smoothed DX
  let adx = dxValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dxValues.length; i++) {
    adx = (adx * (period - 1) + dxValues[i]) / period;
  }

  // Get latest +DI and -DI
  const latestATR = atr;
  const latestPlusDI = latestATR !== 0 ? (smoothedPlusDM / latestATR) * 100 : 0;
  const latestMinusDI =
    latestATR !== 0 ? (smoothedMinusDM / latestATR) * 100 : 0;

  let trend = "No Trend";
  if (adx < 20) trend = "Weak/No Trend";
  else if (adx < 40) trend = "Moderate Trend";
  else if (adx < 60) trend = "Strong Trend";
  else trend = "Very Strong Trend";

  return { adx, plusDI: latestPlusDI, minusDI: latestMinusDI, trend };
}

// Helper function to find support and resistance levels
function findSupportResistance(
  highs: number[],
  lows: number[],
  closes: number[]
): { support: number | null; resistance: number | null } | null {
  if (highs.length < 10 || lows.length < 10 || closes.length < 10) return null; // Need at least a few candles for meaningful levels

  // A simple approach: identify recent swing highs and lows
  // More sophisticated methods exist (e.g., pivot points, volume profile)

  const supportLevels: number[] = [];
  const resistanceLevels: number[] = [];

  // Look for lows that are lower than the candles immediately before and after
  for (let i = 1; i < lows.length - 1; i++) {
    if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) {
      supportLevels.push(lows[i]);
    }
  }

  // Look for highs that are higher than the candles immediately before and after
  for (let i = 1; i < highs.length - 1; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) {
      resistanceLevels.push(highs[i]);
    }
  }

  // Consider recent closing prices as well, especially if few swing points found
  if (supportLevels.length === 0) {
    supportLevels.push(...closes.slice(-5)); // Last 5 closing prices
  }
  if (resistanceLevels.length === 0) {
    resistanceLevels.push(...closes.slice(-5)); // Last 5 closing prices
  }

  // Basic filtering and selection of the most significant levels
  const support =
    supportLevels.length > 0
      ? Math.min(...supportLevels.filter(Number.isFinite))
      : null;
  const resistance =
    resistanceLevels.length > 0
      ? Math.max(...resistanceLevels.filter(Number.isFinite))
      : null;

  // Ensure support is not higher than resistance (can happen with very short data)
  if (support !== null && resistance !== null && support >= resistance) {
    return null; // Or adjust logic to handle this edge case
  }

  return { support, resistance };
}

// Tool: Get Token Data from DexScreener with logo
const getTokenDataTool = tool({
  description:
    "Get real-time token data including price, volume, liquidity, market cap from DexScreener for a BSC token address. Use for basic token info.",
  inputSchema: z.object({
    address: z.string().describe("The BSC token contract address (0x...)"),
  }),
  async execute({ address }) {
    try {
      const [pairResponse, profile] = await Promise.all([
        fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`),
        fetchTokenProfile(address),
      ]);
      const data = await pairResponse.json();

      if (!data.pairs || data.pairs.length === 0) {
        return { error: "Token not found on DexScreener" };
      }

      const bscPairs = data.pairs
        .filter((p: any) => p.chainId === "bsc")
        .sort(
          (a: any, b: any) =>
            (Number.parseFloat(b.liquidity?.usd) || 0) -
            (Number.parseFloat(a.liquidity?.usd) || 0)
        );

      const pair = bscPairs[0] || data.pairs[0];

      return {
        name: pair.baseToken?.name || "Unknown",
        symbol: pair.baseToken?.symbol || "???",
        address: pair.baseToken?.address,
        pairAddress: pair.pairAddress,
        logo: profile?.icon || pair.info?.imageUrl || null,
        description: profile?.description || null,
        website:
          profile?.links?.find((l: any) => l.type === "website")?.url || null,
        twitter:
          profile?.links?.find((l: any) => l.type === "twitter")?.url || null,
        priceUsd: Number.parseFloat(pair.priceUsd) || 0,
        priceChange5m: Number.parseFloat(pair.priceChange?.m5) || 0,
        priceChange1h: Number.parseFloat(pair.priceChange?.h1) || 0,
        priceChange6h: Number.parseFloat(pair.priceChange?.h6) || 0,
        priceChange24h: Number.parseFloat(pair.priceChange?.h24) || 0,
        volume24h: Number.parseFloat(pair.volume?.h24) || 0,
        liquidityUsd: Number.parseFloat(pair.liquidity?.usd) || 0,
        fdv: Number.parseFloat(pair.fdv) || 0,
        marketCap:
          Number.parseFloat(pair.marketCap) || Number.parseFloat(pair.fdv) || 0,
        pairCreatedAt: pair.pairCreatedAt,
        dex: pair.dexId,
        txns24h: {
          buys: pair.txns?.h24?.buys || 0,
          sells: pair.txns?.h24?.sells || 0,
        },
      };
    } catch (error) {
      return { error: "Failed to fetch token data" };
    }
  },
});

// Tool: Security Check via GoPlusLabs
const checkSecurityTool = tool({
  description:
    "Check if a BSC token is a honeypot and get security info including buy/sell taxes.",
  inputSchema: z.object({
    address: z.string().describe("The BSC token contract address"),
  }),
  async execute({ address }) {
    try {
      const response = await fetch(
        `https://api.gopluslabs.io/api/v1/token_security/56?contract_addresses=${address}`,
        {
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        return {
          error: "Security API unavailable",
          isHoneypot: false,
          canSell: true,
        };
      }

      const data = await response.json();
      const tokenData = data.result?.[address.toLowerCase()];

      if (!tokenData) {
        return {
          error: "Token not found in security database",
          isHoneypot: false,
          canSell: true,
        };
      }

      const isHoneypot = tokenData.is_honeypot === "1";
      const cannotSell = tokenData.cannot_sell_all === "1";
      const buyTax = tokenData.buy_tax
        ? (Number.parseFloat(tokenData.buy_tax) * 100).toFixed(1)
        : "0";
      const sellTax = tokenData.sell_tax
        ? (Number.parseFloat(tokenData.sell_tax) * 100).toFixed(1)
        : "0";

      let reason = null;
      if (isHoneypot) reason = "Token flagged as honeypot - cannot sell";
      else if (cannotSell) reason = "Cannot sell all tokens";
      else if (Number.parseFloat(tokenData.sell_tax || "0") > 0.5)
        reason = `High sell tax detected: ${sellTax}%`;

      return {
        isHoneypot: isHoneypot || cannotSell,
        canSell: !cannotSell,
        buyTax,
        sellTax,
        reason,
        isOpenSource: tokenData.is_open_source === "1",
        isProxy: tokenData.is_proxy === "1",
        ownerAddress: tokenData.owner_address,
        creatorAddress: tokenData.creator_address,
        holderCount: tokenData.holder_count,
      };
    } catch (error) {
      return {
        error: "Failed to check security",
        isHoneypot: false,
        canSell: true,
      };
    }
  },
});

// Tool: Get Trending Tokens - NO AI commentary needed
const getTrendingTokensTool = tool({
  description:
    "Get trending tokens on BSC by volume. Returns data only, no analysis needed.",
  inputSchema: z.object({
    limit: z.number().optional().describe("Number of tokens (default 10)"),
  }),
  async execute({ limit = 10 }) {
    try {
      const [pairsResponse, profilesResponse] = await Promise.all([
        fetch("https://api.dexscreener.com/latest/dex/search?q=bnb"),
        fetch("https://api.dexscreener.com/token-profiles/latest/v1"),
      ]);

      const [pairsData, profiles] = await Promise.all([
        pairsResponse.json(),
        profilesResponse.json().catch(() => []),
      ]);

      if (!pairsData.pairs) {
        return { error: "Failed to fetch trending tokens", tokens: [] };
      }

      const profileMap = new Map();
      if (Array.isArray(profiles)) {
        profiles.forEach((p: any) => {
          if (p.chainId === "bsc" && p.tokenAddress) {
            profileMap.set(p.tokenAddress.toLowerCase(), p);
          }
        });
      }

      const bscPairs = pairsData.pairs
        .filter(
          (p: any) =>
            p.chainId === "bsc" &&
            (Number.parseFloat(p.liquidity?.usd) || 0) > 1000
        )
        .sort(
          (a: any, b: any) =>
            (Number.parseFloat(b.volume?.h24) || 0) -
            (Number.parseFloat(a.volume?.h24) || 0)
        )
        .slice(0, limit);

      const tokens = bscPairs.map((pair: any) => {
        const address = pair.baseToken?.address?.toLowerCase();
        const profile = profileMap.get(address);
        return {
          name: pair.baseToken?.name || "Unknown",
          symbol: pair.baseToken?.symbol || "???",
          address: pair.baseToken?.address,
          logo: profile?.icon || pair.info?.imageUrl || null,
          priceUsd: Number.parseFloat(pair.priceUsd) || 0,
          priceChange24h: Number.parseFloat(pair.priceChange?.h24) || 0,
          volume24h: Number.parseFloat(pair.volume?.h24) || 0,
          liquidityUsd: Number.parseFloat(pair.liquidity?.usd) || 0,
          dex: pair.dexId,
        };
      });

      return { tokens, _noInsight: true };
    } catch (error) {
      return { error: "Failed to fetch trending tokens", tokens: [] };
    }
  },
});

// Tool: Get Boosted Tokens - NO AI commentary needed
const getBoostedTokensTool = tool({
  description:
    "Get tokens currently boosted on DexScreener. Returns data only.",
  inputSchema: z.object({}),
  async execute() {
    try {
      const response = await fetch(
        "https://api.dexscreener.com/token-boosts/top/v1"
      );
      const boosts = await response.json();

      if (!Array.isArray(boosts)) {
        return { error: "Failed to fetch boosted tokens", tokens: [] };
      }

      const bscBoosts = boosts
        .filter((b: any) => b.chainId === "bsc")
        .slice(0, 10);

      const tokensWithData = await Promise.all(
        bscBoosts.map(async (boost: any) => {
          try {
            const priceRes = await fetch(
              `https://api.dexscreener.com/latest/dex/tokens/${boost.tokenAddress}`
            );
            const priceData = await priceRes.json();
            const pair = priceData.pairs?.find((p: any) => p.chainId === "bsc");

            return {
              address: boost.tokenAddress,
              name:
                pair?.baseToken?.name ||
                boost.description?.split(" ")[0] ||
                "Unknown",
              symbol: pair?.baseToken?.symbol || "???",
              logo: boost.icon || null,
              description: boost.description || null,
              totalBoosts: boost.totalAmount || 0,
              url: boost.url,
              priceUsd: Number.parseFloat(pair?.priceUsd) || 0,
              priceChange24h: Number.parseFloat(pair?.priceChange?.h24) || 0,
              volume24h: Number.parseFloat(pair?.volume?.h24) || 0,
              liquidityUsd: Number.parseFloat(pair?.liquidity?.usd) || 0,
            };
          } catch {
            return {
              address: boost.tokenAddress,
              name: "Unknown",
              symbol: "???",
              logo: boost.icon || null,
              totalBoosts: boost.totalAmount || 0,
              url: boost.url,
            };
          }
        })
      );

      return { tokens: tokensWithData, _noInsight: true };
    } catch (error) {
      return { error: "Failed to fetch boosted tokens", tokens: [] };
    }
  },
});

// Tool: Get Updated/Latest Token Profiles on BSC
const getUpdatedTokensTool = tool({
  description:
    "Get latest updated token profiles on BSC from DexScreener. Returns data only.",
  inputSchema: z.object({}),
  async execute() {
    try {
      const response = await fetch(
        "https://api.dexscreener.com/token-profiles/latest/v1"
      );
      const profiles = await response.json();

      if (!Array.isArray(profiles)) {
        return { error: "Failed to fetch updated tokens", tokens: [] };
      }

      const bscProfiles = profiles
        .filter((p: any) => p.chainId === "bsc")
        .slice(0, 10);

      const tokensWithData = await Promise.all(
        bscProfiles.map(async (profile: any) => {
          try {
            const priceRes = await fetch(
              `https://api.dexscreener.com/latest/dex/tokens/${profile.tokenAddress}`
            );
            const priceData = await priceRes.json();
            const pair = priceData.pairs?.find((p: any) => p.chainId === "bsc");

            return {
              address: profile.tokenAddress,
              name:
                pair?.baseToken?.name ||
                profile.description?.split(" ")[0] ||
                "Unknown",
              symbol: pair?.baseToken?.symbol || "???",
              logo: profile.icon || pair?.info?.imageUrl || null,
              description: profile.description || null,
              url: profile.url,
              priceUsd: Number.parseFloat(pair?.priceUsd) || 0,
              priceChange24h: Number.parseFloat(pair?.priceChange?.h24) || 0,
              volume24h: Number.parseFloat(pair?.volume?.h24) || 0,
              liquidityUsd: Number.parseFloat(pair?.liquidity?.usd) || 0,
            };
          } catch {
            return {
              address: profile.tokenAddress,
              name: "Unknown",
              symbol: "???",
              logo: profile.icon || null,
              url: profile.url,
            };
          }
        })
      );

      return { tokens: tokensWithData, _noInsight: true };
    } catch (error) {
      return { error: "Failed to fetch updated tokens", tokens: [] };
    }
  },
});

// Tool: Get BNB Price ONLY - not all tokens
const getBnbPriceTool = tool({
  description:
    "Get ONLY the current BNB price. Use when user asks specifically for BNB price.",
  inputSchema: z.object({}),
  async execute() {
    try {
      const res = await fetch(
        "https://api.dexscreener.com/latest/dex/tokens/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
      );
      const data = await res.json();
      const pair = data.pairs?.find((p: any) => p.chainId === "bsc");

      return {
        bnb: {
          symbol: "BNB",
          name: "BNB",
          priceUsd: Number.parseFloat(pair?.priceUsd) || 0,
          priceChange24h: Number.parseFloat(pair?.priceChange?.h24) || 0,
          volume24h: Number.parseFloat(pair?.volume?.h24) || 0,
          marketCap: Number.parseFloat(pair?.marketCap) || 0,
        },
        _noInsight: true,
      };
    } catch (error) {
      return { error: "Failed to fetch BNB price", bnb: null };
    }
  },
});

// Tool: Search Token - NO AI commentary needed
const searchTokenTool = tool({
  description:
    "Search for a token by name, symbol, or contract address on BSC. Returns data only.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("Token name, symbol, or contract address to search"),
  }),
  async execute({ query }) {
    try {
      // Check if query is a contract address (starts with 0x and is 42 chars)
      const isContractAddress = query.startsWith("0x") && query.length === 42;

      if (isContractAddress) {
        // For contract address, fetch directly from tokens endpoint for exact match
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${query}`
        );
        const data = await response.json();

        if (!data.pairs || data.pairs.length === 0) {
          return { error: "Token not found", results: [] };
        }

        // Filter to BSC only and get the main pair (highest liquidity)
        const bscPairs = data.pairs.filter((p: any) => p.chainId === "bsc");
        if (bscPairs.length === 0) {
          return { error: "Token not found on BSC", results: [] };
        }

        // Sort by liquidity and take the top pair only
        const mainPair = bscPairs.sort(
          (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];

        return {
          results: [
            {
              name: mainPair.baseToken?.name || "Unknown",
              symbol: mainPair.baseToken?.symbol || "???",
              address: mainPair.baseToken?.address,
              logo: mainPair.info?.imageUrl || null,
              priceUsd: Number.parseFloat(mainPair.priceUsd) || 0,
              priceChange24h: Number.parseFloat(mainPair.priceChange?.h24) || 0,
              volume24h: Number.parseFloat(mainPair.volume?.h24) || 0,
              liquidityUsd: Number.parseFloat(mainPair.liquidity?.usd) || 0,
              pairAddress: mainPair.pairAddress,
              dexId: mainPair.dexId,
            },
          ],
          _noInsight: true,
        };
      }

      // For name/symbol search, use search endpoint
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(
          query
        )}`
      );
      const data = await response.json();

      if (!data.pairs) {
        return { error: "No tokens found", results: [] };
      }

      const bscResults = data.pairs
        .filter((p: any) => p.chainId === "bsc")
        .slice(0, 8)
        .map((pair: any) => ({
          name: pair.baseToken?.name || "Unknown",
          symbol: pair.baseToken?.symbol || "???",
          address: pair.baseToken?.address,
          logo: pair.info?.imageUrl || null,
          priceUsd: Number.parseFloat(pair.priceUsd) || 0,
          priceChange24h: Number.parseFloat(pair.priceChange?.h24) || 0,
          volume24h: Number.parseFloat(pair.volume?.h24) || 0,
          liquidityUsd: Number.parseFloat(pair.liquidity?.usd) || 0,
        }));

      return { results: bscResults, _noInsight: true };
    } catch (error) {
      return { error: "Search failed", results: [] };
    }
  },
});

/*
// Tool: Get Contract Info
const getContractInfoTool = tool({
  description: "Get basic contract information for a BSC token (creator, creation date, etc.)",
  inputSchema: z.object({
    address: z.string().describe("The BSC token contract address (0x...)"),
  }),
  async execute({ address }) {
    try {
      // Using Etherscan V2 API with chainid=56 for BSC
      const response = await fetch(
        `https://api.etherscan.io/v2/api?chainid=56&module=contract&action=getcontractcreation&contractaddresses=${address}&apikey=${BSCSCAN_API_KEY}`,
      )
      const data = await response.json()

      if (data.message === "NOTOK" || !data.result || data.result.length === 0) {
        return { error: data.result || "Could not retrieve contract info", contractInfo: null }
      }

      const creationInfo = data.result[0]
      return {
        contractInfo: {
          address: creationInfo.contractAddress,
          creator: creationInfo.contractCreator,
          creationTxHash: creationInfo.txHash,
        },
        _noInsight: true,
      }
    } catch (error: any) {
      return { error: "Failed to fetch contract info", contractInfo: null }
    }
  },
})
*/

// Tool: Get Token Chart Data (Simplified) - NOW USES GECKO TERMINAL OHLCV
const getTokenChartTool = tool({
  description:
    "Get OHLCV candlestick data for a BSC token for charting and technical analysis.",
  inputSchema: z.object({
    address: z.string().describe("The BSC token contract address (0x...)"),
    days: z
      .number()
      .optional()
      .describe("Number of past days (default 7, max 30)"),
  }),
  async execute({ address, days = 7 }) {
    try {
      // Step 1: Get pool address from DexScreener
      const dexResponse = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${address}`
      );
      const dexData = await dexResponse.json();

      if (!dexData.pairs || dexData.pairs.length === 0) {
        return {
          error: "Token not found on DexScreener",
          chartData: [],
          ohlcv: [],
        };
      }

      // Get BSC pair with highest liquidity
      const bscPairs = dexData.pairs
        .filter((p: any) => p.chainId === "bsc")
        .sort(
          (a: any, b: any) =>
            (Number.parseFloat(b.liquidity?.usd) || 0) -
            (Number.parseFloat(a.liquidity?.usd) || 0)
        );

      if (bscPairs.length === 0) {
        return {
          error: "No BSC trading pairs found",
          chartData: [],
          ohlcv: [],
        };
      }

      const poolAddress = bscPairs[0].pairAddress;

      // Step 2: Determine timeframe and aggregate based on days requested
      // For proper TA we need at least 50-100 candles
      let timeframe: "minute" | "hour" | "day" = "hour";
      let aggregate = 1;

      if (days <= 3) {
        timeframe = "minute";
        aggregate = 15; // 15-minute candles
      } else if (days <= 14) {
        timeframe = "hour";
        aggregate = 1; // 1-hour candles
      } else {
        timeframe = "hour";
        aggregate = 4; // 4-hour candles
      }

      // Step 3: Fetch OHLCV from GeckoTerminal
      const ohlcvResult = await fetchGeckoTerminalOHLCV(
        poolAddress,
        timeframe,
        aggregate
      );

      if (
        !ohlcvResult.success ||
        !ohlcvResult.data?.candles ||
        ohlcvResult.data.candles.length === 0
      ) {
        return {
          error:
            ohlcvResult.error?.message ||
            "Failed to fetch OHLCV data from GeckoTerminal",
          chartData: [],
          ohlcv: [],
        };
      }

      const candles = ohlcvResult.data.candles;

      // Return both formats: simplified chartData (for backward compat) and full OHLCV
      const chartData = candles.map((c) => ({
        timestamp: c.timestamp,
        price: c.close,
      }));

      return {
        chartData,
        ohlcv: candles, // Full OHLCV data for technical analysis
        poolAddress,
        timeframe: `${aggregate}${
          timeframe === "minute" ? "m" : timeframe === "hour" ? "h" : "d"
        }`,
        candleCount: candles.length,
        _noInsight: true,
      };
    } catch (error: any) {
      console.log("getTokenChartTool exception:", error.message);
      return {
        error: error.message || "Failed to fetch chart data",
        chartData: [],
        ohlcv: [],
      };
    }
  },
});

// Tool: Get Chart Analysis (updated to use real OHLCV data)
const getChartAnalysisTool = tool({
  description:
    "Get detailed technical chart analysis for a BSC token. Use for comprehensive analysis of price action, indicators, and trend.",
  inputSchema: z.object({
    address: z.string().describe("The BSC token contract address (0x...)"),
  }),
  async execute({ address }) {
    try {
      const [chartResult, tokenData, securityData] = await Promise.all([
        getTokenChartTool.execute({ address, days: 14 }), // 14 days of hourly data
        getTokenDataTool.execute({ address }),
        checkSecurityTool.execute({ address }),
      ]);

      // Check if we got real OHLCV data
      if (
        chartResult.error ||
        !chartResult.ohlcv ||
        chartResult.ohlcv.length < 26
      ) {
        return {
          error: `Could not get enough OHLCV data for technical analysis. ${
            chartResult.error ||
            `Only ${
              chartResult.ohlcv?.length || 0
            } candles available, need at least 26.`
          }`,
        };
      }

      if (tokenData.error) {
        return { error: `Could not get token data: ${tokenData.error}` };
      }

      const ohlcv = chartResult.ohlcv;
      const closes = ohlcv.map((c: any) => c.close);
      const highs = ohlcv.map((c: any) => c.high);
      const lows = ohlcv.map((c: any) => c.low);
      const volumes = ohlcv.map((c: any) => c.volume);

      // GeckoTerminal returns OHLCV in USD for most tokens, but for wrapped tokens (WBNB/WETH)
      // the prices are pairatios (~1.0) that need scaling to actual USD
      const avgOhlcvPrice =
        closes.reduce((a: number, b: number) => a + b, 0) / closes.length;
      const actualUsdPrice = tokenData.priceUsd || avgOhlcvPrice;

      // Only apply scaling if the factor is > 2 (meaning OHLCV is in ratio form, not USD)
      // For regular tokens where OHLCV is already in USD, factor will be close to 1
      const rawScaleFactor =
        avgOhlcvPrice !== 0 ? actualUsdPrice / avgOhlcvPrice : 1;
      const priceScaleFactor = rawScaleFactor > 2 ? rawScaleFactor : 1; // Only scale up, never scale down

      // Technical Indicators using REAL data
      const rsi = calculateRSI(closes);
      const macdResult = calculateMACD(closes);
      const bollinger = calculateBollingerBands(closes); // Renamed to 'bollinger' for consistency
      const stochRsi = calculateStochRSI(closes);
      const adxResult = calculateADX(highs, lows, closes);
      const supportResistance = findSupportResistance(highs, lows, closes);

      // Determine trend from momentum data
      const priceChange5m = tokenData.priceChange5m || 0;
      const priceChange1h = tokenData.priceChange1h || 0;
      const priceChange6h = tokenData.priceChange6h || 0;
      const priceChange24h = tokenData.priceChange24h || 0;

      // Determine overall trend
      let overallTrend = "Neutral"; // Renamed to 'overallTrend' for clarity
      let trendStrength = "Weak";
      const avgMomentum =
        (priceChange5m + priceChange1h + priceChange6h + priceChange24h) / 4;
      if (avgMomentum > 10) {
        overallTrend = "Strong Bullish";
        trendStrength = "Strong";
      } else if (avgMomentum > 3) {
        overallTrend = "Bullish";
        trendStrength = "Moderate";
      } else if (avgMomentum < -10) {
        overallTrend = "Strong Bearish";
        trendStrength = "Strong";
      } else if (avgMomentum < -3) {
        overallTrend = "Bearish";
        trendStrength = "Moderate";
      }

      // Volume signal
      const volumeToLiq =
        tokenData.volume24h &&
        tokenData.liquidityUsd &&
        tokenData.liquidityUsd > 0
          ? tokenData.volume24h / tokenData.liquidityUsd
          : 0;
      let volumeSignal = "Normal";
      if (volumeToLiq > 2) volumeSignal = "Very High";
      else if (volumeToLiq > 1) volumeSignal = "High";
      else if (volumeToLiq < 0.1) volumeSignal = "Low";

      // Build reasoning
      const reasoning: string[] = [];
      if (rsi !== null) {
        if (rsi > 70) reasoning.push("RSI overbought - potential pullback");
        else if (rsi < 30) reasoning.push("RSI oversold - potential bounce");
      }
      if (macdResult) {
        if (macdResult.histogram > 0) reasoning.push("MACD bullish crossover");
        else if (macdResult.histogram < 0)
          reasoning.push("MACD bearish crossover");
      }
      if (avgMomentum > 5) reasoning.push("Strong momentum");
      else if (avgMomentum < -5) reasoning.push("Weak momentum");
      if (tokenData.liquidityUsd && tokenData.liquidityUsd < 10000)
        reasoning.push("Low liquidity warning");

      // Recommendation
      let action = "Hold";
      let confidence = "Medium";
      if (rsi !== null && rsi < 30 && macdResult && macdResult.histogram > 0) {
        action = "Buy";
        confidence = "High";
      } else if (
        rsi !== null &&
        rsi > 70 &&
        macdResult &&
        macdResult.histogram < 0
      ) {
        action = "Sell";
        confidence = "High";
      } else if (avgMomentum > 10 && volumeSignal === "High") {
        action = "Buy";
        confidence = "Medium";
      } else if (avgMomentum < -10) {
        action = "Sell";
        confidence = "Medium";
      }

      const formatPrice = (price: number | null): number | null => {
        if (price === null || price === undefined || isNaN(price)) return null;
        if (price === 0) return 0;
        // For very small prices, keep more decimals
        if (price < 0.0001) return Number(price.toFixed(10));
        if (price < 0.01) return Number(price.toFixed(8));
        if (price < 1) return Number(price.toFixed(6));
        if (price < 100) return Number(price.toFixed(4));
        return Number(price.toFixed(2));
      };

      const scaledSupport = supportResistance?.support
        ? formatPrice(supportResistance.support * priceScaleFactor)
        : null;
      const scaledResistance = supportResistance?.resistance
        ? formatPrice(supportResistance.resistance * priceScaleFactor)
        : null;
      const scaledBollingerUpper = bollinger?.upper
        ? formatPrice(bollinger.upper * priceScaleFactor)
        : null;
      const scaledBollingerMiddle = bollinger?.middle
        ? formatPrice(bollinger.middle * priceScaleFactor)
        : null;
      const scaledBollingerLower = bollinger?.lower
        ? formatPrice(bollinger.lower * priceScaleFactor)
        : null;

      // </CHANGE> Return flat structure that matches ChartAnalysisCard expectations
      return {
        // Token info at root level
        tokenName: tokenData.name,
        tokenSymbol: tokenData.symbol,
        tokenAddress: tokenData.address,
        logo: tokenData.logo,
        priceUsd: tokenData.priceUsd,
        priceChange24h: tokenData.priceChange24h,
        marketCap: tokenData.marketCap,

        // Data quality info
        dataSource: "GeckoTerminal OHLCV",
        dataQuality: "real",
        timeframe: "1h", // Assuming 1-hour candles are most common based on aggregate logic
        candleInfo: {
          count: ohlcv.length,
          periodHours: Math.round(
            (ohlcv[ohlcv.length - 1].timestamp - ohlcv[0].timestamp) / 3600
          ),
          firstCandle: new Date(ohlcv[0].timestamp * 1000).toISOString(),
          lastCandle: new Date(
            ohlcv[ohlcv.length - 1].timestamp * 1000
          ).toISOString(),
        },
        priceScaleFactor: Number(priceScaleFactor.toFixed(4)), // Added priceScaleFactor

        // Technical indicators - matches UI structure
        technicalIndicators: {
          rsi:
            rsi !== null
              ? {
                  value: Number(rsi.toFixed(2)),
                  period: 14,
                  timeframe: "1h",
                  signal:
                    rsi > 70
                      ? "Overbought"
                      : rsi < 30
                      ? "Oversold"
                      : rsi > 50
                      ? "Bullish"
                      : "Bearish",
                }
              : null,
          macd: macdResult
            ? {
                macd: formatPrice(macdResult.macd * priceScaleFactor),
                signal: formatPrice(macdResult.signal * priceScaleFactor),
                histogram: formatPrice(macdResult.histogram * priceScaleFactor),
                periods: "12/26/9",
                timeframe: "1h",
                interpretation:
                  macdResult.histogram > 0
                    ? "Bullish"
                    : macdResult.histogram < 0
                    ? "Bearish"
                    : "Neutral",
              }
            : null,
          bollingerBands: bollinger
            ? {
                upper: scaledBollingerUpper,
                middle: scaledBollingerMiddle,
                lower: scaledBollingerLower,
                percentB: Number(bollinger.percentB.toFixed(0)),
                period: 20,
                timeframe: "1h",
              }
            : null,
          stochRSI: stochRsi
            ? {
                k: Number(stochRsi.k.toFixed(2)),
                d: Number(stochRsi.d.toFixed(2)),
                signal: stochRsi.signal,
                timeframe: "1h",
              }
            : null,
          adx: adxResult
            ? {
                value: Number(adxResult.adx.toFixed(2)),
                plusDI: Number(adxResult.plusDI.toFixed(2)),
                minusDI: Number(adxResult.minusDI.toFixed(2)),
                signal:
                  adxResult.adx > 50
                    ? "Very Strong"
                    : adxResult.adx > 25
                    ? "Strong"
                    : adxResult.adx > 20
                    ? "Moderate"
                    : "Weak",
              }
            : null,
        },

        // Price action - matches UI structure
        priceAction: {
          trend: overallTrend,
          trendStrength,
          momentum: {
            m5: priceChange5m,
            h1: priceChange1h,
            h6: priceChange6h,
            h24: priceChange24h,
          },
          support: scaledSupport,
          resistance: scaledResistance,
        },

        // Volume analysis - matches UI structure
        volumeAnalysis: {
          volume24h: tokenData.volume24h,
          liquidity: tokenData.liquidityUsd,
          signal: volumeSignal,
        },

        orderFlow: {
          buys: tokenData.txns24h?.buys || 0,
          sells: tokenData.txns24h?.sells || 0,
          buyPressure:
            tokenData.txns24h?.buys && tokenData.txns24h?.sells
              ? (tokenData.txns24h.buys /
                  (tokenData.txns24h.buys + tokenData.txns24h.sells)) *
                100
              : 50,
        },

        // Recommendation - matches UI structure
        recommendation: {
          action,
          confidence,
          reasoning,
        },

        // Security info
        security: {
          isHoneypot: securityData.isHoneypot || false,
          buyTax: securityData.buyTax,
          sellTax: securityData.sellTax,
        },
      };
    } catch (error: any) {
      console.error("[v0] Error in getChartAnalysisTool:", error);
      return { error: error.message || "Failed to perform chart analysis." };
    }
  },
});

// Tool: Analyze Token (Direct Implementation)
const analyzeFullTokenTool = tool({
  description:
    "Get comprehensive token analysis including risk score, momentum, volatility, market health, survival analysis, and trading recommendation. Use this for in-depth analysis, NOT for basic token lookup.",
  inputSchema: z.object({
    address: z.string().describe("The BSC token contract address (0x...)"),
  }),
  async execute({ address }) {
    try {
      // Fetch token data from DexScreener
      const dexResponse = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${address}`
      );
      const dexData = await dexResponse.json();

      if (!dexData.pairs || dexData.pairs.length === 0) {
        return { error: "Token not found on BSC DEXes" };
      }

      // Get best BSC pair
      const bscPairs = dexData.pairs
        .filter((p: any) => p.chainId === "bsc")
        .sort(
          (a: any, b: any) =>
            (Number(b.liquidity?.usd) || 0) - (Number(a.liquidity?.usd) || 0)
        );

      if (bscPairs.length === 0) {
        return { error: "No BSC trading pairs found" };
      }

      const pair = bscPairs[0];

      // Extract market data
      const marketData = {
        pairAddress: pair.pairAddress || "",
        dexName: pair.dexId || "PancakeSwap",
        priceUsd: Number.parseFloat(pair.priceUsd) || 0,
        priceChange24hPct: Number.parseFloat(pair.priceChange?.h24) || 0,
        priceChange6hPct: Number.parseFloat(pair.priceChange?.h6) || 0,
        priceChange1hPct: Number.parseFloat(pair.priceChange?.h1) || 0,
        priceChange5mPct: Number.parseFloat(pair.priceChange?.m5) || 0,
        volume24hUsd: Number.parseFloat(pair.volume?.h24) || 0,
        volume6hUsd: Number.parseFloat(pair.volume?.h6) || 0,
        volume1hUsd: Number.parseFloat(pair.volume?.h1) || 0,
        liquidityUsd: Number.parseFloat(pair.liquidity?.usd) || 0,
        fdv: Number.parseFloat(pair.fdv) || 0,
        pairCreatedAt: pair.pairCreatedAt || 0,
        txns24h: {
          buys: pair.txns?.h24?.buys || 0,
          sells: pair.txns?.h24?.sells || 0,
        },
        txns1h: {
          buys: pair.txns?.h1?.buys || 0,
          sells: pair.txns?.h1?.sells || 0,
        },
      };

      // Calculate token age
      let tokenAgeDays = 0;
      if (marketData.pairCreatedAt > 0) {
        tokenAgeDays =
          (Date.now() - marketData.pairCreatedAt) / (1000 * 60 * 60 * 24);
      }

      // Calculate Momentum Score
      const momentumScore =
        marketData.priceChange5mPct * 0.1 +
        marketData.priceChange1hPct * 0.25 +
        marketData.priceChange6hPct * 0.35 +
        marketData.priceChange24hPct * 0.3;

      let momentumLabel = "Neutral";
      if (momentumScore > 5) momentumLabel = "Strong Bullish";
      else if (momentumScore > 2) momentumLabel = "Bullish";
      else if (momentumScore > -2) momentumLabel = "Neutral";
      else if (momentumScore > -5) momentumLabel = "Bearish";
      else momentumLabel = "Strong Bearish";

      // Calculate Volatility
      const volatilityIndex =
        Math.abs(marketData.priceChange5mPct) * 0.1 +
        Math.abs(marketData.priceChange1hPct) * 0.25 +
        Math.abs(marketData.priceChange6hPct) * 0.35 +
        Math.abs(marketData.priceChange24hPct) * 0.3;

      let volatilityLabel = "Low";
      if (volatilityIndex > 10) volatilityLabel = "Extreme";
      else if (volatilityIndex > 5) volatilityLabel = "High";
      else if (volatilityIndex > 2) volatilityLabel = "Moderate";

      // Calculate Buy/Sell Pressure
      const buySellRatio24h =
        marketData.txns24h.sells > 0
          ? marketData.txns24h.buys / marketData.txns24h.sells
          : 1;
      const buySellRatio1h =
        marketData.txns1h.sells > 0
          ? marketData.txns1h.buys / marketData.txns1h.sells
          : 1;

      let pressureLabel = "Balanced";
      if (buySellRatio24h > 1.5) pressureLabel = "Strong Buy Pressure";
      else if (buySellRatio24h > 1.1) pressureLabel = "Buy Pressure";
      else if (buySellRatio24h < 0.6) pressureLabel = "Strong Sell Pressure";
      else if (buySellRatio24h < 0.9) pressureLabel = "Sell Pressure";

      // Volume/Liquidity Ratio (Market Health)
      const volumeLiquidityRatio =
        marketData.liquidityUsd > 0
          ? marketData.volume24hUsd / marketData.liquidityUsd
          : 0;

      let marketHealthLabel = "Low Activity";
      let marketHealthScore = 50;
      if (volumeLiquidityRatio > 3) {
        marketHealthLabel = "Very Active";
        marketHealthScore = 90;
      } else if (volumeLiquidityRatio > 1) {
        marketHealthLabel = "Healthy";
        marketHealthScore = 75;
      } else if (volumeLiquidityRatio > 0.5) {
        marketHealthLabel = "Moderate";
        marketHealthScore = 60;
      }

      // Check honeypot
      let honeypotCheck = { isHoneypot: false, reason: null as string | null };
      try {
        const hpResponse = await fetch(
          `https://api.gopluslabs.io/api/v1/token_security/56?contract_addresses=${address}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (hpResponse.ok) {
          const hpData = await hpResponse.json();
          const tokenInfo = hpData.result?.[address.toLowerCase()];
          if (tokenInfo) {
            const isHoneypot = tokenInfo.is_honeypot === "1";
            const cannotSell = tokenInfo.cannot_sell_all === "1";
            honeypotCheck = {
              isHoneypot: isHoneypot || cannotSell,
              reason: isHoneypot
                ? "Honeypot detected"
                : cannotSell
                ? "Cannot sell"
                : null,
            };
          }
        }
      } catch {
        // Ignore honeypot check errors
      }

      // Calculate Risk Score
      let riskScore = 100;
      const riskFlags: string[] = [];

      if (honeypotCheck.isHoneypot) {
        riskScore -= 50;
        riskFlags.push(honeypotCheck.reason || "Honeypot detected");
      }
      if (marketData.liquidityUsd < 10000) {
        riskScore -= 25;
        riskFlags.push("Low liquidity");
      } else if (marketData.liquidityUsd < 50000) {
        riskScore -= 10;
        riskFlags.push("Moderate liquidity");
      }
      if (tokenAgeDays < 1) {
        riskScore -= 15;
        riskFlags.push("Token < 24h old");
      } else if (tokenAgeDays < 7) {
        riskScore -= 5;
        riskFlags.push("Token < 1 week old");
      }
      if (marketData.volume24hUsd < 1000) {
        riskScore -= 10;
        riskFlags.push("Very low volume");
      }

      riskScore = Math.max(0, Math.min(100, riskScore));

      let riskLevel = "High";
      if (riskScore >= 80) riskLevel = "Low";
      else if (riskScore >= 60) riskLevel = "Moderate";
      else if (riskScore >= 40) riskLevel = "Elevated";

      // Survival Analysis
      let survivalScore = 50;
      const survivalIndicators: string[] = [];

      if (tokenAgeDays > 7) {
        survivalScore += 25;
        survivalIndicators.push("Established token (7+ days)");
      } else if (tokenAgeDays > 1) {
        survivalScore += 10;
        survivalIndicators.push("Passed 24h survival period");
      }
      if (momentumScore > 2) {
        survivalScore += 15;
        survivalIndicators.push("Positive momentum");
      }
      if (buySellRatio24h > 1.2) {
        survivalScore += 10;
        survivalIndicators.push("Strong buy pressure");
      }
      if (marketData.liquidityUsd > 50000) {
        survivalScore += 15;
        survivalIndicators.push("Strong liquidity");
      }

      survivalScore = Math.max(0, Math.min(100, survivalScore));

      let survivalProbability = "Low";
      if (survivalScore >= 70) survivalProbability = "High";
      else if (survivalScore >= 50) survivalProbability = "Moderate";

      // Trading Recommendation
      let recommendation = "Hold";
      let recommendationDetail = "Mixed signals - monitor for clearer trend";

      if (honeypotCheck.isHoneypot) {
        recommendation = "Avoid";
        recommendationDetail = "Token flagged as honeypot - do not trade";
      } else if (riskScore >= 70 && momentumScore > 3) {
        recommendation = "Buy";
        recommendationDetail = "Strong momentum with acceptable risk profile";
      } else if (riskScore < 40 || momentumScore < -5) {
        recommendation = "Avoid";
        recommendationDetail = "High risk or negative momentum";
      }

      // Sentiment
      let sentiment = "Neutral";
      if (momentumScore > 3 && buySellRatio24h > 1.2) sentiment = "Bullish";
      else if (momentumScore < -3 || buySellRatio24h < 0.8)
        sentiment = "Bearish";

      // Get token profile
      const profile = await fetchTokenProfile(address);

      return {
        type: "fullAnalysis",
        address,
        token: {
          name: pair.baseToken?.name || "Unknown",
          symbol: pair.baseToken?.symbol || "???",
        },
        profile: profile
          ? {
              icon: profile.icon || null,
              description: profile.description || null,
            }
          : null,
        market: {
          priceUsd: marketData.priceUsd,
          priceChange24hPct: marketData.priceChange24hPct,
          volume24hUsd: marketData.volume24hUsd,
          liquidityUsd: marketData.liquidityUsd,
          fdv: marketData.fdv,
          dexName: marketData.dexName,
          txns24h: marketData.txns24h,
        },
        risk: {
          score: riskScore,
          level: riskLevel,
          flags: riskFlags,
          tokenAgeDays, // Add tokenAgeDays to risk object for UI
        },
        technical: {
          momentum: { score: momentumScore, label: momentumLabel },
          volatility: { index: volatilityIndex, label: volatilityLabel },
          pressure: { ratio: buySellRatio24h, label: pressureLabel },
          marketHealth: {
            score: marketHealthScore,
            label: marketHealthLabel,
            consistencyLabel: marketHealthLabel, // Add consistencyLabel for UI
          },
        },
        survivalAnalysis: {
          score: survivalScore,
          probability: survivalProbability,
          survivalProbability, // Add survivalProbability for UI
          indicators: survivalIndicators,
          tokenAgeDays,
        },
        commentary: {
          sentiment,
          recommendation,
          recommendationDetail,
        },
        honeypot: honeypotCheck,
      };
    } catch (error: any) {
      console.error("[v0] Error in analyzeFullTokenTool:", error);
      return { error: error.message || "Failed to analyze token" };
    }
  },
});

// Tool: Suggest Token to Buy
const suggestTokenToBuyTool = tool({
  description:
    "Suggest a token to buy based on current market trends, liquidity, volume, and community interest. Use this when the user asks for token recommendations.",
  inputSchema: z.object({
    reasoning: z
      .string()
      .optional()
      .describe(
        "The reasoning for the recommendation. This will be filled by the AI."
      ),
  }),
  async execute({ reasoning }) {
    try {
      // Prioritize tokens with high liquidity and volume, and good buy pressure.
      const [trending, boosted, updated] = await Promise.all([
        getTrendingTokensTool.execute({ limit: 15 }),
        getBoostedTokensTool.execute(),
        getUpdatedTokensTool.execute(),
      ]);

      let candidateTokens: any[] = [];

      if (!trending.error && trending.tokens)
        candidateTokens.push(...trending.tokens);
      if (!boosted.error && boosted.tokens)
        candidateTokens.push(...boosted.tokens);
      if (!updated.error && updated.tokens)
        candidateTokens.push(...updated.tokens);

      // Deduplicate tokens by address
      const uniqueTokensMap = new Map();
      candidateTokens.forEach((token: any) => {
        if (token.address)
          uniqueTokensMap.set(token.address.toLowerCase(), token);
      });
      candidateTokens = Array.from(uniqueTokensMap.values());

      // Filter for tokens with sufficient liquidity and volume, and reasonable price change
      const filteredTokens = candidateTokens.filter(
        (t: any) =>
          (t.liquidityUsd || 0) > 50000 &&
          (t.volume24h || 0) > 10000 &&
          Math.abs(t.priceChange24h || 0) < 50 // Avoid extreme pumps/dumps unless they are the primary reason
      );

      // Sort by a combination of factors: higher liquidity, higher volume, positive price change, higher boosts
      filteredTokens.sort((a, b) => {
        const liquidityScore = (b.liquidityUsd || 0) - (a.liquidityUsd || 0);
        const volumeScore = (b.volume24h || 0) - (a.volume24h || 0);
        const priceChangeScore =
          (b.priceChange24h || 0) - (a.priceChange24h || 0);
        const boostScore = (b.totalBoosts || 0) - (a.totalBoosts || 0); // For boosted tokens

        // Weighting factors - adjust as needed
        return (
          liquidityScore * 0.3 +
          volumeScore * 0.3 +
          priceChangeScore * 0.2 +
          boostScore * 0.2
        );
      });

      if (filteredTokens.length === 0) {
        return {
          error: "Could not find suitable tokens to recommend at this time.",
          suggestion: null,
        };
      }

      // Select the top token
      const topToken = filteredTokens[0];

      // Fetch security info for the top token
      const securityResult = await checkSecurityTool.execute({
        address: topToken.address,
      });

      let finalReasoning = "";
      if (reasoning) {
        finalReasoning = reasoning;
      } else {
        finalReasoning = `Based on current market trends and data, ${
          topToken.name || topToken.symbol
        } is a potential candidate due to its strong liquidity, healthy volume, and positive momentum. The token is currently boosted on DexScreener, indicating community interest.`;
      }

      if (securityResult.error) {
        finalReasoning += ` However, there was an issue checking its security: ${securityResult.error}. Please exercise caution.`;
      } else if (securityResult.isHoneypot) {
        finalReasoning += ` IMPORTANT SECURITY WARNING: This token has been flagged as a honeypot and cannot be sold. It is extremely risky.`;
      } else if (!securityResult.canSell) {
        finalReasoning += ` IMPORTANT SECURITY WARNING: It appears you cannot sell this token.`;
      } else if (Number.parseFloat(securityResult.sellTax || "0") > 5) {
        // Higher threshold for warning
        finalReasoning += ` NOTE: This token has a high sell tax of ${securityResult.sellTax}%, which could impact your returns.`;
      }

      // Provide a summary object
      const suggestion = {
        address: topToken.address,
        name: topToken.name,
        symbol: topToken.symbol,
        logo: topToken.logo,
        priceUsd: topToken.priceUsd,
        priceChange24h: topToken.priceChange24h,
        volume24h: topToken.volume24h,
        liquidityUsd: topToken.liquidityUsd,
        dex: topToken.dex,
        security: {
          isHoneypot: securityResult.isHoneypot || false,
          canSell:
            securityResult.canSell !== undefined
              ? securityResult.canSell
              : true,
          buyTax: securityResult.buyTax,
          sellTax: securityResult.sellTax,
          reason: securityResult.reason,
        },
        reasoning: finalReasoning,
      };

      return { suggestion, _noInsight: true };
    } catch (error: any) {
      console.error("Error in suggestTokenToBuyTool:", error);
      return {
        error: error.message || "Failed to suggest a token.",
        suggestion: null,
      };
    }
  },
});

const tools = {
  getTrendingTokens: getTrendingTokensTool,
  getBoostedTokens: getBoostedTokensTool,
  getUpdatedTokens: getUpdatedTokensTool,
  getTokenData: getTokenDataTool,
  analyzeFullToken: analyzeFullTokenTool, // Add the new tool here
  searchToken: searchTokenTool,
  checkSecurity: checkSecurityTool,
  getTokenChart: getTokenChartTool,
  getChartAnalysis: getChartAnalysisTool,
  getBnbPrice: getBnbPriceTool,
  suggestTokenToBuy: suggestTokenToBuyTool,
} as const;

export type BSCChatMessage = UIMessage<
  never,
  never,
  InferUITools<typeof tools>
>;

export async function POST(req: Request) {
  const body = await req.json();

  const messages = await validateUIMessages<BSCChatMessage>({
    messages: body.messages,
    tools,
  });

  const systemPrompt = `You are ScanAI, an expert BSC (BNB Smart Chain) trading assistant.

AVAILABLE TOOLS:
- getTrendingTokens: Top 10 trending BSC tokens
- getBoostedTokens: Tokens with active marketing boosts
- getUpdatedTokens: Latest updated token profiles
- getTokenData: Quick basic token info (price, volume, liquidity)
- analyzeFullToken: COMPREHENSIVE token analysis with Risk Score, Momentum, Volatility, Market Health, Survival Analysis - USE THIS for "analyze token" requests
- searchToken: Find tokens by name/symbol/address
- checkSecurity: Security audit (honeypot, taxes, risks)
- getTokenChart: Get price chart and historical data
- getChartAnalysis: Technical chart analysis (RSI, MACD, Bollinger, support/resistance) - USE THIS for "chart analysis" requests
- getBnbPrice: Current BNB price
- suggestTokenToBuy: AI recommendation based on trending tokens

WHEN USER ASKS:
- "analyze token X" or "analyze X" → Use analyzeFullToken for comprehensive analysis
- "chart analysis X" or "technical analysis X" → Use getChartAnalysis for technical indicators
- "which token to buy" or "what should I buy" → Use suggestTokenToBuy
- "search X" or "find X" → Use searchToken
- "is X safe" or "security check X" → Use checkSecurity
- "trending" → Use getTrendingTokens
- "BNB price" → Use getBnbPrice

RESPONSE STYLE - ABSOLUTE RULES:
1. NEVER use markdown formatting. NO asterisks, NO bullets, NO numbered lists, NO headers, NO code blocks, NO links like [text](url), NO images like ![](url).
2. Write ONLY flowing prose sentences. Plain text only.
3. The UI already shows data cards with all numbers. AVOID repeating exact numbers unless they are CRITICAL inflection points for the trade setup.
4. Keep responses SHORT: 2-4 sentences maximum for simple queries.

FOR CHART ANALYSIS - Write Like a Senior Prop Trader:
The card displays all raw indicator values. Your role is INTERPRETATION and ACTIONABLE TRADE SETUP. Follow this framework:

MARKET STRUCTURE: Identify the current phase - is price in accumulation (base building after downtrend), markup (trending up), distribution (topping), or markdown (trending down)? Describe the swing structure: higher highs/higher lows = bullish, lower highs/lower lows = bearish, equal highs/lows = range.

MOMENTUM CONFLUENCE: Are oscillators aligned with price action or diverging? Aligned = trend continuation likely. Divergence = reversal risk. Example: "Momentum confirms the markup phase" or "RSI divergence flags exhaustion despite new highs."

VOLATILITY REGIME: Is volatility compressing (Bollinger squeeze = explosive move incoming) or expanding (trend in motion)? This tells traders WHEN to expect the move.

TIMEFRAME CONTEXT: On lower timeframes (4H and below), setups typically resolve within 4-12 candles. Mention this so traders know the expected holding period.

ACTIONABLE BIAS: State your directional call with conviction. Include:
- Bias direction (Bullish/Bearish/Neutral)
- Key level to watch (the make-or-break price)
- Invalidation level (where the thesis is wrong)
- Risk/Reward framing when clear (example: "2:1 R/R to upper target")

EXAMPLE OUTPUT STYLE:
"Structure is in late-stage markup with a bull flag forming after the recent impulse. Momentum oscillators confirm buyer control without overextension, suggesting continuation rather than reversal. Volatility is compressing within the flag - expect expansion within 6-10 candles. Holding above the flag low targets the measured move higher for a 2.5:1 setup. Bias remains bullish with high conviction while price defends the breakout level."

NEVER write like this: "RSI is at 62 indicating bullish momentum, MACD shows bullish crossover, support at 0.00023." The card shows these numbers - interpret them instead.

FOR TOKEN ANALYSIS:
Provide institutional-grade interpretation of what the scores MEAN:
- Risk Score: "Risk profile indicates [institutional grade / elevated speculation / high-risk microcap]. Size positions accordingly."
- Momentum: "Momentum reading shows [early-stage accumulation / mid-trend strength / late-stage exhaustion]."
- Liquidity context: Mention if liquidity supports the position size or if slippage is a concern.
- Survival outlook: "Token fundamentals suggest [strong staying power / moderate runway / survival risk]."

FOR TOKEN LISTS (Trending/Boosted/Updated):
Simply say "Here are the current [trending/boosted/updated] tokens on BSC." No additional commentary needed - let the cards speak.

FOR SEARCH RESULTS:
One sentence confirming the result. The card displays all details.

FOR SECURITY CHECK:
Summarize the safety verdict in one sentence. Example: "Contract passed all security checks - no honeypot risk detected, taxes within normal range." Or flag specific concerns if found.

PERSONALITY:
You are a senior institutional trader sharing real alpha. Be direct and confident. Avoid weak language like "might," "could possibly," "seems like." State your market read with conviction based on the data. If the setup is unclear, say "No clear edge here - sitting out until structure resolves."`;

  const result = streamText({
    model: "openai/gpt-4o-mini",
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools,
  });

  return result.toUIMessageStreamResponse();
}
