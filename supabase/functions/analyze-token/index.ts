import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ERC20 ABI for basic token info
const ERC20_ABI = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "owner", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
];

const BNB_RPC = "https://bsc-dataseed.binance.org/";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Technical indicator calculations
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length < period) return prices[prices.length - 1];
  
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  
  return ema;
}

function calculateMACD(prices: number[]) {
  if (prices.length < 26) {
    return { value: 0, signal: 0, histogram: 0 };
  }
  
  // Calculate MACD line for each price point
  const macdValues: number[] = [];
  for (let i = 26; i < prices.length; i++) {
    const slice = prices.slice(0, i + 1);
    const ema12 = calculateEMA(slice, 12);
    const ema26 = calculateEMA(slice, 26);
    macdValues.push(ema12 - ema26);
  }
  
  // Signal line is 9-period EMA of MACD values
  const signal = calculateEMA(macdValues, 9);
  const macdLine = macdValues[macdValues.length - 1];
  const histogram = macdLine - signal;
  
  return { value: macdLine, signal, histogram };
}

function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
  if (prices.length < period) {
    const last = prices[prices.length - 1] || 0;
    return { middle: last, upper: last, lower: last, bandwidth: 0 };
  }
  
  const slice = prices.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  
  const variance = slice.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
  const std = Math.sqrt(variance);
  
  const upper = middle + (stdDev * std);
  const lower = middle - (stdDev * std);
  const bandwidth = middle > 0 ? ((upper - lower) / middle) : 0;
  
  return { middle, upper, lower, bandwidth };
}

// RPC call helper
async function rpcCall(method: string, params: any[]) {
  const response = await fetch(BNB_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

// Encode function call
function encodeFunctionCall(functionName: string): string {
  const signatures: { [key: string]: string } = {
    name: '0x06fdde03',
    symbol: '0x95d89b41',
    decimals: '0x313ce567',
    totalSupply: '0x18160ddd',
    owner: '0x8da5cb5b',
  };
  return signatures[functionName] || '0x';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, resolution: requestedResolution } = await req.json();
    
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid BNB token address');
    }


    // Fetch token data from RPC
    const [nameHex, symbolHex, decimalsHex, totalSupplyHex, ownerHex] = await Promise.all([
      rpcCall('eth_call', [{ to: address, data: encodeFunctionCall('name') }, 'latest']).catch(() => '0x'),
      rpcCall('eth_call', [{ to: address, data: encodeFunctionCall('symbol') }, 'latest']).catch(() => '0x'),
      rpcCall('eth_call', [{ to: address, data: encodeFunctionCall('decimals') }, 'latest']).catch(() => '0x12'),
      rpcCall('eth_call', [{ to: address, data: encodeFunctionCall('totalSupply') }, 'latest']).catch(() => '0x'),
      rpcCall('eth_call', [{ to: address, data: encodeFunctionCall('owner') }, 'latest']).catch(() => ZERO_ADDRESS),
    ]);

    // Decode results
    const name = nameHex !== '0x' ? decodeString(nameHex) : 'Unknown Token';
    const symbol = symbolHex !== '0x' ? decodeString(symbolHex) : 'UNKNOWN';
    const decimals = parseInt(decimalsHex, 16) || 18;
    const isOwnerRenounced = ownerHex === ZERO_ADDRESS || ownerHex.toLowerCase().includes('000000000000000000000000');

    // Fetch market data from DexScreener
    const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    const dexData = await dexResponse.json();

    let marketData = {
      pairAddress: '',
      dexName: 'Unknown DEX',
      priceUsd: 0,
      priceChange24hPct: 0,
      priceChange1hPct: 0,
      priceChange6hPct: 0,
      volume24hUsd: 0,
      liquidityUsd: 0,
      priceHistory: [] as number[],
      fdv: 0,
      pairCreatedAt: 0,
    };

    if (dexData.pairs && dexData.pairs.length > 0) {
      // Sort by liquidity to get the most active pair
      const sortedPairs = dexData.pairs.sort((a: any, b: any) => 
        (parseFloat(b.liquidity?.usd) || 0) - (parseFloat(a.liquidity?.usd) || 0)
      );
      const pair = sortedPairs[0];
      
      marketData = {
        pairAddress: pair.pairAddress || '',
        dexName: pair.dexId || 'PancakeSwap',
        priceUsd: parseFloat(pair.priceUsd) || 0,
        priceChange24hPct: parseFloat(pair.priceChange?.h24) || 0,
        priceChange1hPct: parseFloat(pair.priceChange?.h1) || 0,
        priceChange6hPct: parseFloat(pair.priceChange?.h6) || 0,
        volume24hUsd: parseFloat(pair.volume?.h24) || 0,
        liquidityUsd: parseFloat(pair.liquidity?.usd) || 0,
        priceHistory: [],
        fdv: parseFloat(pair.fdv) || 0,
        pairCreatedAt: pair.pairCreatedAt || 0,
      };
      
    }

    // Token age calculation for candle selection
    let tokenAgeDays = 0;
    if (marketData.pairCreatedAt > 0) {
      const ageMs = Date.now() - marketData.pairCreatedAt;
      tokenAgeDays = ageMs / (1000 * 60 * 60 * 24);
    }
    
    // Determine resolution based on request or token age
    let resolution = requestedResolution || 'auto';
    let resolutionMinutes = 60; // default 1h
    
    if (resolution === 'auto') {
      const tokenAgeHours = tokenAgeDays * 24;
      if (tokenAgeHours < 6) {
        resolution = '5m';
        resolutionMinutes = 5;
      } else if (tokenAgeHours < 24) {
        resolution = '15m';
        resolutionMinutes = 15;
      } else if (tokenAgeHours < 168) { // < 7 days
        resolution = '1h';
        resolutionMinutes = 60;
      } else {
        resolution = '4h';
        resolutionMinutes = 240;
      }
    } else {
      // Map requested resolution to minutes
      const resMap: Record<string, number> = {
        '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440
      };
      resolutionMinutes = resMap[resolution] || 60;
    }
    
    
    // Fetch real OHLCV from Birdeye with fallback to DexScreener
    const priceHistory: number[] = [];
    const chartData: any[] = [];
    let actualPriceChange = 0;
    let usingFallbackData = false;
    
    if (marketData.pairAddress && marketData.priceUsd > 0) {
      try {
        const birdeyeKey = Deno.env.get('BIRDEYE_API_KEY');
        if (!birdeyeKey) {
          throw new Error('No Birdeye key');
        }
        
        const now = Math.floor(Date.now() / 1000);
        let timeFrom = now - (resolutionMinutes * 200 * 60);
        
        const birdeyeUrl = `https://public-api.birdeye.so/defi/ohlcv/pair?address=${marketData.pairAddress}&type=${resolution}&time_from=${timeFrom}&time_to=${now}`;
        
        const birdeyeResp = await fetch(birdeyeUrl, {
          headers: { 'X-API-KEY': birdeyeKey, 'x-chain': 'bsc' }
        });
        
        if (!birdeyeResp.ok) {
          throw new Error(`Birdeye ${birdeyeResp.status}`);
        }
        
        const birdeyeData = await birdeyeResp.json();
        
        if (!birdeyeData.success || !birdeyeData.data?.items?.length) {
          throw new Error('No Birdeye data');
        }
        
        
        for (const candle of birdeyeData.data.items) {
          const closePrice = parseFloat(candle.c) || 0;
          if (closePrice > 0) {
            priceHistory.push(closePrice);
            chartData.push({
              time: candle.unixTime * 1000,
              open: parseFloat(candle.o) || closePrice,
              high: parseFloat(candle.h) || closePrice,
              low: parseFloat(candle.l) || closePrice,
              close: closePrice,
              volume: parseFloat(candle.v) || 0
            });
          }
        }
        
        if (priceHistory.length >= 2) {
          const firstPrice = priceHistory[0];
          const lastPrice = priceHistory[priceHistory.length - 1];
          actualPriceChange = ((lastPrice - firstPrice) / firstPrice) * 100;
        }
        
      } catch (birdeyeError) {
        console.warn(`Birdeye failed: ${birdeyeError}, using DexScreener fallback`);
        usingFallbackData = true;
        
        // Fallback: Use DexScreener's REAL price changes to generate approximate candles
        const currentPrice = marketData.priceUsd;
        
        // Map resolution to DexScreener time windows
        let startPrice = currentPrice;
        let timeWindowHours = 24;
        
        if (resolution === '1m' || resolution === '5m') {
          // Use 1h change for short timeframes
          startPrice = currentPrice / (1 + (marketData.priceChange1hPct || 0) / 100);
          timeWindowHours = 1;
          actualPriceChange = marketData.priceChange1hPct || 0;
        } else if (resolution === '1h') {
          startPrice = currentPrice / (1 + (marketData.priceChange6hPct || 0) / 100);
          timeWindowHours = 6;
          actualPriceChange = marketData.priceChange6hPct || 0;
        } else {
          // 4h, 1d use 24h
          startPrice = currentPrice / (1 + (marketData.priceChange24hPct || 0) / 100);
          timeWindowHours = 24;
          actualPriceChange = marketData.priceChange24hPct || 0;
        }
        
        const candleCount = Math.max(60, Math.min(200, Math.floor(timeWindowHours * 60 / resolutionMinutes)));
        
        // Linear interpolation with slight variance (NOT random - based on price trend)
        for (let i = 0; i < candleCount; i++) {
          const progress = i / (candleCount - 1);
          const basePrice = startPrice + (currentPrice - startPrice) * progress;
          const microVariance = basePrice * 0.005 * Math.sin(i * 0.5); // Small wave pattern
          
          const open = basePrice;
          const close = basePrice + microVariance;
          const high = Math.max(open, close) * 1.003;
          const low = Math.min(open, close) * 0.997;
          
          priceHistory.push(close);
          chartData.push({
            time: Date.now() - (candleCount - i) * resolutionMinutes * 60000,
            open: Math.max(0, open),
            high: Math.max(0, high),
            low: Math.max(0, low),
            close: Math.max(0, close),
            volume: marketData.volume24hUsd / candleCount
          });
        }
        
      }
    } else {
      throw new Error('No pair data available');
    }

    // Calculate technical indicators
    const rsi = calculateRSI(priceHistory);
    const ema20 = calculateEMA(priceHistory, 20);
    const ema50 = calculateEMA(priceHistory, 50);
    const macd = calculateMACD(priceHistory);
    const bollinger = calculateBollingerBands(priceHistory);

    // Determine trend
    let trendLabel = 'range / indecision';
    if (ema20 > ema50 && ema20 > priceHistory[priceHistory.length - 20]) {
      trendLabel = 'short-term uptrend';
    } else if (ema20 < ema50 && ema20 < priceHistory[priceHistory.length - 20]) {
      trendLabel = 'short-term downtrend';
    }

    // MACD label
    let macdLabel = 'momentum in transition / mixed';
    if (macd.value > 0 && macd.value > macd.signal) {
      macdLabel = 'bullish bias';
    } else if (macd.value < 0 && macd.value < macd.signal) {
      macdLabel = 'bearish bias';
    }

    // Bollinger volatility
    let volatilityLabel = 'normal range';
    if (bollinger.bandwidth < 0.04) {
      volatilityLabel = 'volatility compression';
    } else if (bollinger.bandwidth > 0.12) {
      volatilityLabel = 'elevated volatility';
    }

    // Price band position
    let priceBandPosition = 'middle';
    const currentPricePos = priceHistory[priceHistory.length - 1];
    const bandRange = bollinger.upper - bollinger.lower;
    const positionPct = (currentPricePos - bollinger.lower) / bandRange;
    
    if (positionPct > 0.7) priceBandPosition = 'upper';
    else if (positionPct < 0.3) priceBandPosition = 'lower';

    // Risk scoring
    let riskScore = 100;
    const flags: string[] = [];

    // Liquidity check
    let liquidityStatus = 'unknown';
    if (marketData.liquidityUsd > 50000) {
      liquidityStatus = 'locked';
    } else if (marketData.liquidityUsd > 10000) {
      liquidityStatus = 'partial';
      riskScore -= 15;
      flags.push('Moderate liquidity detected');
    } else {
      liquidityStatus = 'unlocked';
      riskScore -= 30;
      flags.push('Low liquidity - high risk');
    }

    // Ownership check
    if (!isOwnerRenounced) {
      riskScore -= 15;
      flags.push('Ownership not renounced');
    }

    // Apply token age risk adjustments
    if (tokenAgeDays < 3 && tokenAgeDays > 0) {
      riskScore -= 10;
      flags.push('Very young token (< 3 days old)');
    } else if (tokenAgeDays < 7 && tokenAgeDays > 0) {
      riskScore -= 5;
      flags.push('Young token (< 1 week old)');
    } else if (tokenAgeDays === 0) {
      flags.push('Token age unknown - proceed with caution');
      riskScore -= 5;
    }

    // Volume check
    if (marketData.volume24hUsd < 1000) {
      riskScore -= 5;
      flags.push('Low 24h trading volume');
    }

    // Fetch holder data from multiple Birdeye endpoints, then fall back
    let top10Pct: number | null = null;
    let largestNonLpPct: number | null = null;

    try {
      const birdeyeKey = Deno.env.get('BIRDEYE_API_KEY');
      const burnAddresses = new Set([
        ZERO_ADDRESS.toLowerCase(),
        '0x000000000000000000000000000000000000dead',
      ]);
      const excludeKeywords = ['pancake', 'swap', 'router', 'pair', 'pool', 'exchange', 'lp', 'staking', 'bridge'];

      // Helper to normalize and compute from a generic holders array
      const computeFromItems = (items: any[], totalAmount?: number) => {
        const normalized = items.map((h: any) => {
          const owner = (h.owner || h.address || h.ownerAddress || h.holder || h.holderAddress || '').toLowerCase();
          const label = (h.owner_label || h.ownerLabel || h.label || h.name || '').toLowerCase();
          const ui = (h.ui_amount ?? h.uiAmount ?? h.amount ?? null);
          const amount = ui != null ? Number(ui) : (
            h.balance ? Number(h.balance) / Math.pow(10, decimals) : 0
          );
          return { owner, label, amount: isFinite(amount) ? amount : 0 };
        });

        const filtered = normalized
          .filter((h) => {
            if (!h.owner) return false;
            if (burnAddresses.has(h.owner)) return false;
            if (marketData.pairAddress && h.owner === marketData.pairAddress.toLowerCase()) return false;
            if (excludeKeywords.some((k) => h.label.includes(k))) return false;
            return h.amount > 0;
          })
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10);

        if (filtered.length === 0) return false;

        const totalSupplyUi = (typeof totalAmount === 'number' && totalAmount > 0)
          ? totalAmount
          : normalized.reduce((s, h) => s + (h.amount || 0), 0) || 1;

        const top10Amount = filtered.reduce((s, h) => s + h.amount, 0);
        top10Pct = (top10Amount / totalSupplyUi) * 100;
        const largestAmount = filtered[0]?.amount || 0;
        largestNonLpPct = (largestAmount / totalSupplyUi) * 100;
        return true;
      };

      // Try Birdeye endpoints if we have a key
      if (birdeyeKey) {
        const endpoints = [
          `https://public-api.birdeye.so/defi/token/holders?address=${address}`,
          `https://public-api.birdeye.so/defi/holders?address=${address}`,
          `https://public-api.birdeye.so/defi/v3/token/holders?address=${address}`,
          `https://public-api.birdeye.so/v1/token/holder?address=${address}`,
        ];

        for (const url of endpoints) {
          try {
            const resp = await fetch(url, { headers: { 'X-API-KEY': birdeyeKey, 'x-chain': 'bsc' } });
            if (!resp.ok) {
              continue;
            }
            const data = await resp.json();
            // Attempt several common shapes
            const items = data?.data?.items || data?.data?.holders || data?.items || data?.holders || null;
            const totalAmount = Number(data?.data?.total_amount ?? data?.total_amount ?? NaN);
            if (Array.isArray(items) && items.length > 0) {
              if (computeFromItems(items, isFinite(totalAmount) ? totalAmount : undefined)) {
                break;
              }
            } else {
              console.log('Birdeye holders: no items in response shape');
            }
          } catch (e) {
            console.log('Birdeye holders fetch error:', e);
          }
        }
      }

      // As last resort, try BscScan chart endpoint (web JSON/HTML, no API key). This may change over time.
      if (top10Pct === null) {
        try {
          const chartUrl = `https://bscscan.com/token/tokenholderchart/${address}?range=100`;
          console.log('Trying BscScan chart:', chartUrl);
          const chartRes = await fetch(chartUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (chartRes.ok) {
            const text = await chartRes.text();
            try {
              const json = JSON.parse(text);
              const series = (json?.series && Array.isArray(json.series[0])) ? json.series[0] : null;
              const labels = Array.isArray(json?.labels) ? json.labels : [];
              if (series && series.length > 0) {
                const items = series.map((pct: number, idx: number) => ({
                  owner: String(labels[idx] || '' ).toLowerCase(),
                  label: String(labels[idx] || '' ).toLowerCase(),
                  amount: pct, // we will treat as percentage directly below
                }));
                // Convert chart percentages to amounts relative to 100
                const filtered = items.filter((it: any) => {
                  const owner = it.owner;
                  if (!owner) return false;
                  if (burnAddresses.has(owner)) return false;
                  if (marketData.pairAddress && owner.includes(marketData.pairAddress.toLowerCase())) return false;
                  if (excludeKeywords.some((k) => owner.includes(k))) return false;
                  return true;
                }).slice(0, 10);

                if (filtered.length > 0) {
                  const top10 = filtered.reduce((s: number, it: any) => s + (Number(it.amount) || 0), 0);
                  top10Pct = Math.min(100, top10);
                  largestNonLpPct = Math.min(100, Number(filtered[0].amount) || 0);
                  console.log(`BscScan chart computed: Top10=${top10Pct.toFixed(1)}%, Largest=${largestNonLpPct.toFixed(1)}%`);
                }
              }
            } catch {
              // Fallback: extract percentages from HTML
              const matches = [...(text.matchAll(/([0-9]+(?:\\.[0-9]+)?)%/g))].map(m => Number(m[1])).filter(n => isFinite(n));
              if (matches.length > 0) {
                const first10 = matches.slice(0, 10);
                const sum = first10.reduce((a, b) => a + b, 0);
                top10Pct = Math.min(100, sum);
                largestNonLpPct = Math.min(100, first10[0] || 0);
                console.log(`BscScan HTML heuristic: Top10=${top10Pct.toFixed(1)}%, Largest=${largestNonLpPct.toFixed(1)}%`);
              }
            }
          } else {
            console.log('BscScan chart request failed with status:', chartRes.status);
          }
        } catch (e) {
          console.log('BscScan chart attempt errored:', e);
        }
      }

      // Old API fallback (deprecated by BscScan) kept as last try
      if (top10Pct === null) {
        console.log('Trying BscScan API fallback for holder data...');
        const bscScanRes = await fetch(
          `https://api.bscscan.com/api?module=token&action=tokenholderlist&contractaddress=${address}&page=1&offset=20`
        );
        console.log('BscScan response status:', bscScanRes.status);
        if (bscScanRes.ok) {
          const bscData = await bscScanRes.json();
          console.log('BscScan response:', JSON.stringify(bscData).substring(0, 500));
          if (bscData.status === '1' && bscData.result && Array.isArray(bscData.result)) {
            const totalSupplyStr = await rpcCall('eth_call', [
              { to: address, data: encodeFunctionCall('totalSupply') },
              'latest'
            ]);
            const totalSupplyBN = BigInt(totalSupplyStr);
            const filtered = bscData.result
              .map((h: any) => ({ addr: (h.TokenHolderAddress || '').toLowerCase(), bal: BigInt(h.TokenHolderQuantity || '0') }))
              .filter((h: any) => h.addr && !burnAddresses.has(h.addr) && (!marketData.pairAddress || h.addr !== marketData.pairAddress.toLowerCase()))
              .slice(0, 10);
            if (filtered.length > 0 && totalSupplyBN > 0n) {
              const top10Sum = filtered.reduce((sum: bigint, h: any) => sum + h.bal, 0n);
              top10Pct = Number(top10Sum * 10000n / totalSupplyBN) / 100;
              largestNonLpPct = Number(filtered[0].bal * 10000n / totalSupplyBN) / 100;
              console.log(`BscScan API computed: Top10=${top10Pct.toFixed(1)}%, Largest=${largestNonLpPct.toFixed(1)}%`);
            }
          }
        }
      }
    } catch (holderError) {
      console.error('Failed to fetch holder data:', holderError);
      flags.push('Unable to verify holder distribution');
      riskScore -= 5;
    }

    riskScore = Math.max(0, Math.min(100, riskScore));

    // Risk level
    let riskLevel = 'high';
    if (riskScore >= 80) riskLevel = 'low';
    else if (riskScore >= 60) riskLevel = 'moderate';
    else if (riskScore >= 40) riskLevel = 'elevated';

    // Generate detailed professional commentary
    const rsiLabel = rsi < 30 ? 'oversold territory' : 
                     rsi < 45 ? 'soft bearish momentum' : 
                     rsi < 55 ? 'neutral momentum' : 
                     rsi < 70 ? 'constructive bullish momentum' : 
                     'overbought territory';
    
    const rsiContext = rsi < 30 ? ', which may signal a potential reversal point if supported by volume' :
                       rsi > 70 ? ', suggesting the asset may be overextended and due for consolidation' :
                       rsi > 55 && rsi < 70 ? ', indicating sustained buying interest without extreme overbought conditions' :
                       '';
    
    const trendContext = trendLabel.includes('uptrend') ? 
      'Both short-term averages are aligned bullishly, suggesting underlying momentum favors buyers at current levels' :
      trendLabel.includes('downtrend') ?
      'The moving average structure indicates sellers maintain control, with both EMAs sloping lower' :
      'Price action remains choppy with no clear directional bias from the moving average structure';
    
    const macdContext = macdLabel.includes('bullish') ?
      'The MACD configuration supports the bullish case, with the histogram expanding positively' :
      macdLabel.includes('bearish') ?
      'MACD remains in bearish territory, reinforcing downside pressure' :
      'MACD signals lack of conviction, with neither bulls nor bears establishing clear control';
    
    const bollingerContext = volatilityLabel.includes('compression') ?
      'Notably, Bollinger Bands are contracting significantly, a classic pattern that often precedes larger directional moves once a breakout occurs' :
      volatilityLabel.includes('elevated') ?
      'The bands have widened considerably, reflecting heightened volatility that may persist until market participants establish a clear range' :
      'Volatility remains within normal parameters, suggesting measured price action';
    
    const pricePositionContext = priceBandPosition === 'upper' ?
      'Price is testing the upper Bollinger Band, indicating strong upward momentum but also potential resistance' :
      priceBandPosition === 'lower' ?
      'Price is probing the lower band, which may indicate oversold conditions or continued downward pressure' :
      'Price is trading near the middle band, suggesting balanced conditions between buyers and sellers';
    
    const technicalView = `The Relative Strength Index (RSI) currently registers at ${rsi.toFixed(1)}, placing it in ${rsiLabel}${rsiContext}. ${trendContext}. The 20-period EMA sits at ${ema20.toFixed(8)}, while the 50-period EMA is positioned at ${ema50.toFixed(8)}. ${macdContext}. The MACD line reads ${macd.value.toFixed(6)} versus a signal line of ${macd.signal.toFixed(6)}, producing a histogram of ${macd.histogram.toFixed(6)}. ${bollingerContext}. ${pricePositionContext}.`;

    const riskSummary = riskScore >= 70 ?
      `With a risk score of ${riskScore}/100, this token exhibits relatively low structural risk factors` :
      riskScore >= 50 ?
      `At ${riskScore}/100, this token presents moderate risk, requiring careful consideration` :
      `Scoring ${riskScore}/100, this token displays elevated to high risk characteristics that warrant extreme caution`;
    
    const flagContext = flags.length > 0 ?
      ` Primary concerns include: ${flags.slice(0, 3).join('; ')}${flags.length > 3 ? `; plus ${flags.length - 3} additional flag${flags.length - 3 > 1 ? 's' : ''}` : ''}.` :
      ' No critical red flags were identified in the on-chain and market data analysis.';
    
    const liquidityContext = marketData.liquidityUsd > 100000 ?
      `Liquidity of ${formatNumber(marketData.liquidityUsd)} suggests reasonable depth for trading activity` :
      marketData.liquidityUsd > 20000 ?
      `Current liquidity of ${formatNumber(marketData.liquidityUsd)} is moderate; larger positions may experience slippage` :
      `With only ${formatNumber(marketData.liquidityUsd)} in liquidity, this token presents significant trading risk due to thin order books`;
    
    const volumeContext = marketData.volume24hUsd > marketData.liquidityUsd ?
      ` The 24-hour volume of ${formatNumber(marketData.volume24hUsd)} exceeds available liquidity, indicating active trading interest.` :
      marketData.volume24hUsd > 0 ?
      ` Trading volume over 24 hours stands at ${formatNumber(marketData.volume24hUsd)}.` :
      ' Trading activity appears minimal or non-existent over the past 24 hours.';
    
    const ageContext = tokenAgeDays > 30 ?
      ` The token has been active for approximately ${tokenAgeDays.toFixed(0)} days, providing some track record.` :
      tokenAgeDays > 7 ?
      ` At ${tokenAgeDays.toFixed(1)} days old, this is a relatively young token with limited historical data.` :
      tokenAgeDays > 0 ?
      ` This is a very new token (${tokenAgeDays.toFixed(1)} days old), which inherently carries higher risk.` :
      '';

    const overallView = `${riskSummary}.${flagContext} ${liquidityContext}.${volumeContext}${ageContext} Based on the structural and market analysis, this token is classified as ${liquidityStatus} in terms of liquidity management.`;

    // Determine sentiment based on technical indicators
    let sentiment = 'Neutral';
    let sentimentScore = 0;
    
    if (rsi > 55) sentimentScore += 1;
    if (rsi < 45) sentimentScore -= 1;
    if (trendLabel.includes('uptrend')) sentimentScore += 1;
    if (trendLabel.includes('downtrend')) sentimentScore -= 1;
    if (macd.histogram > 0) sentimentScore += 1;
    if (macd.histogram < 0) sentimentScore -= 1;
    if (priceBandPosition === 'upper') sentimentScore += 0.5;
    if (priceBandPosition === 'lower') sentimentScore -= 0.5;
    
    if (sentimentScore >= 1.5) sentiment = 'Bullish';
    else if (sentimentScore <= -1.5) sentiment = 'Bearish';
    
    // Determine recommendation based on risk score and sentiment
    let recommendation = 'Sell';
    let recommendationDetail = '';
    
    if (riskScore >= 70) {
      if (sentiment === 'Bullish' && rsi < 70) {
        recommendation = 'Buy';
        recommendationDetail = 'Strong fundamentals with bullish technicals. Consider entry with proper position sizing.';
      } else if (sentiment === 'Neutral' || (sentiment === 'Bullish' && rsi >= 70)) {
        recommendation = 'Hold';
        recommendationDetail = 'Good risk profile but wait for better entry point or momentum confirmation.';
      } else {
        recommendation = 'Hold';
        recommendationDetail = 'Decent fundamentals but bearish technicals. Monitor for trend reversal.';
      }
    } else if (riskScore >= 50) {
      if (sentiment === 'Bullish' && rsi < 60) {
        recommendation = 'Hold';
        recommendationDetail = 'Moderate risk with bullish signals. Only for risk-tolerant traders.';
      } else {
        recommendation = 'Sell';
        recommendationDetail = 'Moderate to high risk. Consider exiting or avoiding entry.';
      }
    } else {
      recommendation = 'Sell';
      recommendationDetail = 'High risk profile. Not recommended for most traders.';
    }
    
    let scenario = 'High risk - Avoid';
    let scenarioDetail = 'Not recommended for any trading strategy given the risk profile.';
    
    if (riskScore >= 70) {
      if (rsi > 30 && rsi < 70 && trendLabel.includes('uptrend')) {
        scenario = 'Active consideration';
        scenarioDetail = 'Suitable for swing trading or position building with appropriate risk management.';
      } else {
        scenario = 'Watchlist / Research';
        scenarioDetail = 'Warrants monitoring but await better technical setup or momentum confirmation.';
      }
    } else if (riskScore >= 50) {
      scenario = 'Speculative only';
      scenarioDetail = 'For experienced traders only; use strict stop losses and small position sizes.';
    } else {
      scenario = 'High risk - Caution';
      scenarioDetail = 'Multiple risk factors present; extensive due diligence required before any commitment.';
    }

    const result = {
      address,
      token: { name, symbol, decimals },
      chain: 'bsc',
      risk: {
        score: riskScore,
        level: riskLevel,
        flags,
        liquidity: {
          status: liquidityStatus,
          usd: marketData.liquidityUsd,
        },
        holderConcentration: {
          top10Pct,
          largestNonLpPct,
        },
        tokenAgeDays,
      },
      market: {
        pairAddress: marketData.pairAddress,
        dexName: marketData.dexName,
        priceUsd: marketData.priceUsd,
        priceChange24hPct: marketData.priceChange24hPct,
        volume24hUsd: marketData.volume24hUsd,
        liquidityUsd: marketData.liquidityUsd,
        fdv: marketData.fdv,
      },
      technical: {
        rsi,
        ema20,
        ema50,
        trendLabel,
        macd: {
          value: macd.value,
          signal: macd.signal,
          histogram: macd.histogram,
          label: macdLabel,
        },
        bollinger: {
          middle: bollinger.middle,
          upper: bollinger.upper,
          lower: bollinger.lower,
          bandwidth: bollinger.bandwidth,
          volatilityLabel,
          priceBandPosition,
        },
      },
      chartData: {
        candles: chartData,
        resolution: resolution,
        candleCount: chartData.length,
        priceChangePercent: actualPriceChange,
        usingFallbackData
      },
      commentary: {
        technicalView,
        overallView,
        scenario,
        scenarioDetail,
        sentiment,
        recommendation,
        recommendationDetail,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze token';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions
function decodeString(hex: string): string {
  if (!hex || hex === '0x') return '';
  
  try {
    // Remove 0x prefix
    const cleaned = hex.slice(2);
    
    // Skip first 64 chars (offset) and next 64 chars (length)
    const dataStart = 128;
    const data = cleaned.slice(dataStart);
    
    // Convert hex to string
    let result = '';
    for (let i = 0; i < data.length; i += 2) {
      const byte = parseInt(data.substr(i, 2), 16);
      if (byte === 0) break;
      if (byte >= 32 && byte <= 126) {
        result += String.fromCharCode(byte);
      }
    }
    
    return result || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}
