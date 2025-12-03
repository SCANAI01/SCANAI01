import { NextRequest, NextResponse } from "next/server";

const BNB_RPC = "https://bsc-dataseed.binance.org/";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function rpcCall(method: string, params: any[]) {
  const response = await fetch(BNB_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

function encodeFunctionCall(functionName: string): string {
  const signatures: { [key: string]: string } = {
    name: "0x06fdde03",
    symbol: "0x95d89b41",
    decimals: "0x313ce567",
    totalSupply: "0x18160ddd",
    owner: "0x8da5cb5b",
  };
  return signatures[functionName] || "0x";
}

function decodeString(hex: string): string {
  if (!hex || hex === "0x") return "";

  try {
    const cleaned = hex.slice(2);
    const dataStart = 128;
    const data = cleaned.slice(dataStart);

    let result = "";
    for (let i = 0; i < data.length; i += 2) {
      const byte = parseInt(data.substr(i, 2), 16);
      if (byte === 0) break;
      if (byte >= 32 && byte <= 126) {
        result += String.fromCharCode(byte);
      }
    }

    return result || "Unknown";
  } catch {
    return "Unknown";
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function calculatePriceImpact(buyAmount: number, liquidityUsd: number): number {
  if (liquidityUsd === 0) return 100;
  const impact = (buyAmount / liquidityUsd) * 100;
  return Math.min(100, impact);
}

async function checkHoneypot(
  address: string,
  chain: string = "bsc"
): Promise<{ isHoneypot: boolean; canSell: boolean; reason: string | null }> {
  try {
    const response = await fetch(
      `https://api.gopluslabs.io/api/v1/token_security/${chain}?contract_addresses=${address}`,
      {
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return { isHoneypot: false, canSell: true, reason: null };
    }

    const data = await response.json();
    const tokenData = data.result?.[address.toLowerCase()];

    if (!tokenData) {
      return { isHoneypot: false, canSell: true, reason: null };
    }

    const isHoneypot = tokenData.is_honeypot === "1";
    const cannotSell =
      tokenData.cannot_sell_all === "1" || tokenData.sell_tax === "100";
    const highSellTax = parseInt(tokenData.sell_tax || "0") > 50;

    let reason = null;
    if (isHoneypot) reason = "Token flagged as honeypot";
    else if (cannotSell) reason = "Token cannot be sold";
    else if (highSellTax)
      reason = `Extremely high sell tax: ${tokenData.sell_tax}%`;

    return {
      isHoneypot: isHoneypot || cannotSell || highSellTax,
      canSell: !cannotSell,
      reason,
    };
  } catch (error: any) {
    console.error("[v0] Honeypot check error:", error.message);
    return { isHoneypot: false, canSell: true, reason: null };
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address");

  if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return NextResponse.json(
      { error: "Invalid BNB token address" },
      { status: 400 }
    );
  }

  try {
    const [nameHex, symbolHex, decimalsHex, ownerHex, honeypotCheck] =
      await Promise.all([
        rpcCall("eth_call", [
          { to: address, data: encodeFunctionCall("name") },
          "latest",
        ]).catch(() => "0x"),
        rpcCall("eth_call", [
          { to: address, data: encodeFunctionCall("symbol") },
          "latest",
        ]).catch(() => "0x"),
        rpcCall("eth_call", [
          { to: address, data: encodeFunctionCall("decimals") },
          "latest",
        ]).catch(() => "0x12"),
        rpcCall("eth_call", [
          { to: address, data: encodeFunctionCall("owner") },
          "latest",
        ]).catch(() => ZERO_ADDRESS),
        checkHoneypot(address),
      ]);

    const name = nameHex !== "0x" ? decodeString(nameHex) : "Unknown Token";
    const symbol = symbolHex !== "0x" ? decodeString(symbolHex) : "UNKNOWN";
    const decimals = parseInt(decimalsHex, 16) || 18;
    const isOwnerRenounced =
      ownerHex === ZERO_ADDRESS ||
      ownerHex.toLowerCase().includes("000000000000000000000000");

    const [tokenProfileRes, tokenBoostRes] = await Promise.all([
      fetch("https://api.dexscreener.com/token-profiles/latest/v1").catch(
        () => null
      ),
      fetch("https://api.dexscreener.com/token-boosts/latest/v1").catch(
        () => null
      ),
    ]);

    let tokenProfile = null;
    let tokenBoosts = null;

    if (tokenProfileRes && tokenProfileRes.ok) {
      const profiles = await tokenProfileRes.json();
      if (Array.isArray(profiles)) {
        tokenProfile = profiles.find(
          (p: any) =>
            p.tokenAddress?.toLowerCase() === address.toLowerCase() &&
            p.chainId === "bsc"
        );
      }
    }

    if (tokenBoostRes && tokenBoostRes.ok) {
      const boosts = await tokenBoostRes.json();
      if (Array.isArray(boosts)) {
        tokenBoosts = boosts.find(
          (b: any) =>
            b.tokenAddress?.toLowerCase() === address.toLowerCase() &&
            b.chainId === "bsc"
        );
      }
    }

    const dexResponse = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`
    );
    const dexData = await dexResponse.json();

    let marketData = {
      pairAddress: "",
      dexName: "Unknown DEX",
      priceUsd: 0,
      priceChange24hPct: 0,
      priceChange6hPct: 0,
      priceChange1hPct: 0,
      priceChange5mPct: 0,
      volume24hUsd: 0,
      volume6hUsd: 0,
      volume1hUsd: 0,
      volume5mUsd: 0,
      liquidityUsd: 0,
      fdv: 0,
      pairCreatedAt: 0,
      txns24h: { buys: 0, sells: 0 },
      txns6h: { buys: 0, sells: 0 },
      txns1h: { buys: 0, sells: 0 },
      txns5m: { buys: 0, sells: 0 },
    };

    let websites: string[] = [];
    let socials: { platform: string; handle: string }[] = [];

    if (dexData.pairs && dexData.pairs.length > 0) {
      const sortedPairs = dexData.pairs.sort(
        (a: any, b: any) =>
          (parseFloat(b.liquidity?.usd) || 0) -
          (parseFloat(a.liquidity?.usd) || 0)
      );
      const pair = sortedPairs[0];

      if (pair.info) {
        if (Array.isArray(pair.info.websites)) {
          websites = pair.info.websites
            .map((w: any) => (typeof w === "string" ? w : w.url))
            .filter(Boolean);
        }
        if (Array.isArray(pair.info.socials)) {
          socials = pair.info.socials
            .filter((s: any) => s && (s.type || s.platform))
            .map((s: any) => ({
              platform: s.type || s.platform || "Unknown",
              handle: s.url || s.handle || "",
            }));
        }
      }

      marketData = {
        pairAddress: pair.pairAddress || "",
        dexName: pair.dexId || "PancakeSwap",
        priceUsd: parseFloat(pair.priceUsd) || 0,
        priceChange24hPct: parseFloat(pair.priceChange?.h24) || 0,
        priceChange6hPct: parseFloat(pair.priceChange?.h6) || 0,
        priceChange1hPct: parseFloat(pair.priceChange?.h1) || 0,
        priceChange5mPct: parseFloat(pair.priceChange?.m5) || 0,
        volume24hUsd: parseFloat(pair.volume?.h24) || 0,
        volume6hUsd: parseFloat(pair.volume?.h6) || 0,
        volume1hUsd: parseFloat(pair.volume?.h1) || 0,
        volume5mUsd: parseFloat(pair.volume?.m5) || 0,
        liquidityUsd: parseFloat(pair.liquidity?.usd) || 0,
        fdv: parseFloat(pair.fdv) || 0,
        pairCreatedAt: pair.pairCreatedAt || 0,
        txns24h: {
          buys: pair.txns?.h24?.buys || 0,
          sells: pair.txns?.h24?.sells || 0,
        },
        txns6h: {
          buys: pair.txns?.h6?.buys || 0,
          sells: pair.txns?.h6?.sells || 0,
        },
        txns1h: {
          buys: pair.txns?.h1?.buys || 0,
          sells: pair.txns?.h1?.sells || 0,
        },
        txns5m: {
          buys: pair.txns?.m5?.buys || 0,
          sells: pair.txns?.m5?.sells || 0,
        },
      };
    }

    let tokenAgeDays = 0;
    if (marketData.pairCreatedAt > 0) {
      const ageMs = Date.now() - marketData.pairCreatedAt;
      tokenAgeDays = ageMs / (1000 * 60 * 60 * 24);
    }

    // MOMENTUM SCORE
    const momentum5m = marketData.priceChange5mPct * 0.1;
    const momentum1h = marketData.priceChange1hPct * 0.25;
    const momentum6h = marketData.priceChange6hPct * 0.35;
    const momentum24h = marketData.priceChange24hPct * 0.3;

    const momentumScore = momentum5m + momentum1h + momentum6h + momentum24h;

    let momentumLabel = "Neutral";
    if (momentumScore > 5) momentumLabel = "Strong Bullish";
    else if (momentumScore > 2) momentumLabel = "Bullish";
    else if (momentumScore > -2) momentumLabel = "Neutral";
    else if (momentumScore > -5) momentumLabel = "Bearish";
    else momentumLabel = "Strong Bearish";

    // VOLATILITY INDEX
    const priceVolatility =
      Math.abs(marketData.priceChange5mPct) * 0.1 +
      Math.abs(marketData.priceChange1hPct) * 0.25 +
      Math.abs(marketData.priceChange6hPct) * 0.35 +
      Math.abs(marketData.priceChange24hPct) * 0.3;

    const recentVolumeRatio =
      marketData.volume24hUsd > 0
        ? marketData.volume1hUsd / (marketData.volume24hUsd / 24)
        : 1;

    const volatilityIndex =
      priceVolatility * (1 + (recentVolumeRatio - 1) * 0.5);

    let volatilityLabel = "Low";
    if (volatilityIndex > 10) volatilityLabel = "Extreme";
    else if (volatilityIndex > 5) volatilityLabel = "High";
    else if (volatilityIndex > 2) volatilityLabel = "Moderate";

    // BUY/SELL PRESSURE
    const buySellRatio24h =
      marketData.txns24h.sells > 0
        ? marketData.txns24h.buys / marketData.txns24h.sells
        : 0;
    const buySellRatio1h =
      marketData.txns1h.sells > 0
        ? marketData.txns1h.buys / marketData.txns1h.sells
        : 0;
    const avgBuySellRatio = (buySellRatio24h + buySellRatio1h) / 2;

    let pressureLabel = "Neutral";
    if (avgBuySellRatio > 1.5) pressureLabel = "Strong Buy Pressure";
    else if (avgBuySellRatio > 1.1) pressureLabel = "Buy Pressure";
    else if (avgBuySellRatio > 0.9) pressureLabel = "Balanced";
    else if (avgBuySellRatio > 0.6) pressureLabel = "Sell Pressure";
    else pressureLabel = "Strong Sell Pressure";

    // VELOCITY
    const shortTermMomentum =
      (marketData.priceChange5mPct + marketData.priceChange1hPct) / 2;
    const longTermMomentum =
      (marketData.priceChange6hPct + marketData.priceChange24hPct) / 2;
    const velocity = shortTermMomentum - longTermMomentum;

    let velocityLabel = "Stable";
    if (velocity > 3) velocityLabel = "Accelerating Up";
    else if (velocity > 1) velocityLabel = "Gaining Momentum";
    else if (velocity > -1) velocityLabel = "Stable";
    else if (velocity > -3) velocityLabel = "Losing Momentum";
    else velocityLabel = "Accelerating Down";

    // VOLATILITY METRICS
    const volatility5m = Math.abs(marketData.priceChange5mPct);
    const volatility24h = Math.abs(marketData.priceChange24hPct);
    const priceRangeCompression =
      volatility24h > 0 ? volatility5m / volatility24h : 1;

    let compressionLabel = "Stable";
    if (priceRangeCompression > 2) compressionLabel = "Extremely Volatile";
    else if (priceRangeCompression > 1.5) compressionLabel = "High Volatility";
    else if (priceRangeCompression > 0.8) compressionLabel = "Moderate";
    else compressionLabel = "Low Volatility";

    // VOLUME CONSISTENCY
    const volumeRatios = [
      marketData.volume5mUsd * 288,
      marketData.volume1hUsd * 24,
      marketData.volume6hUsd * 4,
      marketData.volume24hUsd,
    ].filter((v) => v > 0);

    const avgVolume =
      volumeRatios.reduce((a, b) => a + b, 0) / volumeRatios.length;
    const volumeVariance =
      volumeRatios.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) /
      volumeRatios.length;
    const volumeStdDev = Math.sqrt(volumeVariance);
    const volumeConsistency =
      avgVolume > 0 ? (1 - volumeStdDev / avgVolume) * 100 : 0;

    let consistencyLabel = "Erratic";
    if (volumeConsistency > 70) consistencyLabel = "Very Steady";
    else if (volumeConsistency > 50) consistencyLabel = "Steady";
    else if (volumeConsistency > 30) consistencyLabel = "Moderate";

    // LIQUIDITY STABILITY
    const volumeLiquidityRatio =
      marketData.liquidityUsd > 0
        ? marketData.volume24hUsd / marketData.liquidityUsd
        : 0;

    let liquidityStabilityLabel = "Stable";
    if (volumeLiquidityRatio > 5)
      liquidityStabilityLabel = "High Risk - Extreme Volume";
    else if (volumeLiquidityRatio > 3)
      liquidityStabilityLabel = "Moderate Risk";
    else if (volumeLiquidityRatio > 1)
      liquidityStabilityLabel = "Healthy Activity";
    else liquidityStabilityLabel = "Low Activity";

    // TRANSACTION FREQUENCY
    const txnFrequency1h = marketData.txns1h.buys + marketData.txns1h.sells;

    let txnFrequencyLabel = "Low";
    if (txnFrequency1h > 100) txnFrequencyLabel = "Very High";
    else if (txnFrequency1h > 50) txnFrequencyLabel = "High";
    else if (txnFrequency1h > 20) txnFrequencyLabel = "Moderate";

    // AVERAGE TRADE SIZE
    const txnFrequency24h =
      (marketData.txns24h.buys + marketData.txns24h.sells) / 24;
    const avgTradeSize =
      txnFrequency24h > 0
        ? marketData.volume24hUsd /
          (marketData.txns24h.buys + marketData.txns24h.sells)
        : 0;

    let tradeSizeLabel = "Small Trades";
    if (avgTradeSize > 10000) tradeSizeLabel = "Large Whale Activity";
    else if (avgTradeSize > 5000) tradeSizeLabel = "Medium-Large Trades";
    else if (avgTradeSize > 1000) tradeSizeLabel = "Medium Trades";

    // PRICE IMPACT
    const priceImpact100 = calculatePriceImpact(100, marketData.liquidityUsd);
    const priceImpact500 = calculatePriceImpact(500, marketData.liquidityUsd);
    const priceImpact1000 = calculatePriceImpact(1000, marketData.liquidityUsd);

    const isLowMcap = marketData.fdv > 0 && marketData.fdv < 20000;
    const hasSharpDrop24h = marketData.priceChange24hPct < -80;
    const hasSharpDrop6h = marketData.priceChange6hPct < -70;
    const hasSharpDrop1h = marketData.priceChange1hPct < -50;
    const hasStrongSells = buySellRatio24h < 0.7 || buySellRatio1h < 0.6;
    const allNegative =
      marketData.priceChange5mPct < 0 &&
      marketData.priceChange1hPct < 0 &&
      marketData.priceChange6hPct < 0 &&
      marketData.priceChange24hPct < 0;
    const volumeDeclining =
      marketData.volume1hUsd < (marketData.volume24hUsd / 24) * 0.5;

    let rugRisk = {
      isHighRisk: false,
      severity: "low" as "low" | "medium" | "high" | "critical",
      flags: [] as string[],
      recovery: {
        possible: true,
        indicators: [] as string[],
      },
    };

    if (hasSharpDrop24h || hasSharpDrop6h) {
      rugRisk.isHighRisk = true;

      if (hasSharpDrop24h)
        rugRisk.flags.push(
          `Catastrophic 24h drop: ${marketData.priceChange24hPct.toFixed(1)}%`
        );
      if (hasSharpDrop6h)
        rugRisk.flags.push(
          `Severe 6h drop: ${marketData.priceChange6hPct.toFixed(1)}%`
        );
      if (hasSharpDrop1h)
        rugRisk.flags.push(
          `Sharp 1h drop: ${marketData.priceChange1hPct.toFixed(1)}%`
        );

      if (isLowMcap) {
        rugRisk.flags.push(
          `Extremely low market cap: ${formatNumber(marketData.fdv)}`
        );
        rugRisk.severity = "critical";
      } else {
        rugRisk.severity = "high";
      }

      if (hasStrongSells)
        rugRisk.flags.push(
          `Heavy sell pressure (ratio: ${buySellRatio24h.toFixed(2)})`
        );

      if (
        marketData.priceChange5mPct > 0 &&
        marketData.priceChange1hPct < marketData.priceChange6hPct
      ) {
        rugRisk.recovery.indicators.push("Recent price stabilization detected");
      }

      if (buySellRatio1h > buySellRatio24h && buySellRatio1h > 0.9) {
        rugRisk.recovery.indicators.push(
          "Buy pressure returning in recent hour"
        );
      }

      if (marketData.volume1hUsd > (marketData.volume24hUsd / 24) * 1.5) {
        rugRisk.recovery.indicators.push(
          "Volume increasing - potential accumulation"
        );
      }

      if (
        allNegative &&
        volumeDeclining &&
        rugRisk.recovery.indicators.length === 0
      ) {
        rugRisk.recovery.possible = false;
        rugRisk.severity = "critical";
        rugRisk.flags.push("No recovery signs - token may be dead");
      } else if (rugRisk.recovery.indicators.length > 0) {
        rugRisk.recovery.possible = true;
      } else {
        rugRisk.recovery.possible = false;
      }
    }

    let survivalScore = 50;
    const survivalAnalysis = {
      tokenAgeDays,
      ageInHours: tokenAgeDays * 24,
      passed24h: tokenAgeDays > 1,
      survivalScore: 0,
      survivalProbability: "Unknown" as
        | "Unknown"
        | "Very Low"
        | "Low"
        | "Moderate"
        | "High"
        | "Very High",
      risks: [] as string[],
      positiveIndicators: [] as string[],
      recommendation: "",
    };

    if (tokenAgeDays < 1) {
      survivalScore += 10;
      survivalAnalysis.positiveIndicators.push(
        "Within 24h launch window - prime momentum phase"
      );
      survivalAnalysis.risks.push(
        "Still in high-risk initial period - watch for dump signals"
      );
    } else if (tokenAgeDays < 2) {
      survivalAnalysis.positiveIndicators.push(
        "Passed 24h mark - survived initial pump phase"
      );
      if (momentumScore > 0 && buySellRatio24h > 1.0) {
        survivalScore += 25;
        survivalAnalysis.positiveIndicators.push(
          "Still maintaining momentum post-24h - rare survivor"
        );
      } else {
        survivalScore -= 15;
        survivalAnalysis.risks.push(
          "Lost momentum after 24h - typical death pattern"
        );
      }
    } else if (tokenAgeDays < 7) {
      survivalAnalysis.positiveIndicators.push(
        "Survived multiple days - strong validation signal"
      );
      survivalScore += 20;
    } else {
      survivalScore += 30;
      survivalAnalysis.positiveIndicators.push(
        "Established token beyond 1 week - proven longevity"
      );
    }

    const volumeTrend =
      marketData.volume24hUsd > 0
        ? marketData.volume1hUsd / (marketData.volume24hUsd / 24)
        : 1;
    if (tokenAgeDays > 1) {
      if (volumeTrend > 1.5 && marketData.volume24hUsd > 5000) {
        survivalScore += 20;
        survivalAnalysis.positiveIndicators.push(
          "Volume surging post-24h - strong survival signal"
        );
      } else if (volumeTrend < 0.3 || marketData.volume24hUsd < 1000) {
        survivalScore -= 25;
        survivalAnalysis.risks.push(
          "Volume dying post-24h - token losing interest"
        );
      } else if (volumeTrend < 0.7) {
        survivalScore -= 10;
        survivalAnalysis.risks.push("Volume declining - concerning trend");
      }
    } else {
      if (marketData.volume24hUsd > 10000) {
        survivalScore += 15;
        survivalAnalysis.positiveIndicators.push(
          "Strong initial volume - high interest"
        );
      }
    }

    if (tokenAgeDays > 1) {
      if (momentumScore > 5) {
        survivalScore += 20;
        survivalAnalysis.positiveIndicators.push(
          "Strong bullish momentum - capable of new ATHs"
        );
      } else if (momentumScore < -5) {
        survivalScore -= 20;
        survivalAnalysis.risks.push("Bearish momentum - unlikely to recover");
      } else if (momentumScore < 0) {
        survivalScore -= 10;
        survivalAnalysis.risks.push("Negative momentum - needs reversal");
      }
    }

    if (buySellRatio24h > 1.3) {
      survivalScore += 15;
      survivalAnalysis.positiveIndicators.push(
        "Strong buy pressure - demand building"
      );
    } else if (buySellRatio24h < 0.7) {
      survivalScore -= 15;
      survivalAnalysis.risks.push("Heavy selling - weak demand");
    }

    if (marketData.liquidityUsd > 50000) {
      survivalScore += 10;
      survivalAnalysis.positiveIndicators.push(
        "Strong liquidity - less rug risk"
      );
    } else if (marketData.liquidityUsd < 10000) {
      survivalScore -= 15;
      survivalAnalysis.risks.push("Low liquidity - high rug risk");
    }

    if (tokenAgeDays > 1) {
      const isStabilizing =
        Math.abs(marketData.priceChange1hPct) < 20 && momentumScore > -5;
      const isClimbing =
        marketData.priceChange24hPct > 0 && marketData.priceChange6hPct > 0;

      if (isStabilizing && isClimbing) {
        survivalScore += 15;
        survivalAnalysis.positiveIndicators.push(
          "Stabilizing with upward bias - ideal post-launch pattern"
        );
      } else if (Math.abs(marketData.priceChange24hPct) > 80) {
        survivalScore -= 15;
        survivalAnalysis.risks.push(
          "Extreme volatility - unstable price action"
        );
      }
    }

    const hasWebsite = websites.length > 0;
    const hasSocials = socials.length > 0;
    const hasEnhancedInfo =
      tokenProfile && (tokenProfile.description || tokenProfile.icon);

    if (hasWebsite && hasSocials && hasEnhancedInfo) {
      survivalScore += 10;
      survivalAnalysis.positiveIndicators.push(
        "Full social presence - legitimate project"
      );
    } else if (!hasWebsite && !hasSocials) {
      survivalScore -= 10;
      survivalAnalysis.risks.push("No social presence - potential scam");
    }

    survivalAnalysis.survivalScore = Math.max(0, Math.min(100, survivalScore));

    if (survivalAnalysis.survivalScore >= 80) {
      survivalAnalysis.survivalProbability = "Very High";
    } else if (survivalAnalysis.survivalScore >= 60) {
      survivalAnalysis.survivalProbability = "High";
    } else if (survivalAnalysis.survivalScore >= 40) {
      survivalAnalysis.survivalProbability = "Moderate";
    } else if (survivalAnalysis.survivalScore >= 20) {
      survivalAnalysis.survivalProbability = "Low";
    } else {
      survivalAnalysis.survivalProbability = "Very Low";
    }

    if (!survivalAnalysis.passed24h) {
      if (
        momentumScore > 5 &&
        buySellRatio24h > 1.2 &&
        marketData.volume24hUsd > 10000
      ) {
        survivalAnalysis.recommendation =
          "ACTIVE OPPORTUNITY - Token in prime 0-24h window with strong momentum. High risk but potential for gains. Use tight stop losses.";
      } else if (momentumScore < -10 || buySellRatio24h < 0.7) {
        survivalAnalysis.recommendation =
          "AVOID - Token showing dump signals in critical first 24h. Likely pump-and-dump.";
      } else {
        survivalAnalysis.recommendation =
          "MONITOR - Token in early phase. Wait for clearer momentum signals or pass 24h mark to assess survival.";
      }
    } else if (tokenAgeDays < 2) {
      if (survivalAnalysis.survivalScore >= 60) {
        survivalAnalysis.recommendation =
          "SURVIVOR - Token passed 24h with strong metrics. Reduced risk but monitor for momentum maintenance.";
      } else {
        survivalAnalysis.recommendation =
          "DYING - Token past 24h but losing momentum/volume. Typical death pattern for failed launches. Avoid or exit.";
      }
    } else {
      if (survivalAnalysis.survivalScore >= 70) {
        survivalAnalysis.recommendation =
          "ESTABLISHED - Token survived multiple days with solid fundamentals. Can potentially reach new ATHs with volume.";
      } else if (survivalAnalysis.survivalScore >= 40) {
        survivalAnalysis.recommendation =
          "STRUGGLING - Token survived but showing weakness. Needs volume/momentum catalyst for new ATHs.";
      } else {
        survivalAnalysis.recommendation =
          "DEAD/DYING - Token past initial period but metrics suggest project abandonment. Avoid.";
      }
    }

    let riskScore = 100;
    const flags: string[] = [];

    if (honeypotCheck.isHoneypot) {
      riskScore -= 50;
      flags.push(honeypotCheck.reason || "Honeypot detected");
    }

    let liquidityStatus = "unknown";
    if (marketData.liquidityUsd > 50000) {
      liquidityStatus = "locked";
    } else if (marketData.liquidityUsd > 10000) {
      liquidityStatus = "partial";
      riskScore -= 15;
      flags.push("Moderate liquidity detected");
    } else {
      liquidityStatus = "unlocked";
      riskScore -= 30;
      flags.push("Low liquidity - high risk");
    }

    if (!isOwnerRenounced) {
      riskScore -= 15;
      flags.push("Ownership not renounced");
    }

    if (tokenAgeDays < 3 && tokenAgeDays > 0) {
      riskScore -= 10;
      flags.push("Very young token (< 3 days old)");
    } else if (tokenAgeDays < 7 && tokenAgeDays > 0) {
      riskScore -= 5;
      flags.push("Young token (< 1 week old)");
    }

    if (marketData.volume24hUsd < 1000) {
      riskScore -= 5;
      flags.push("Low 24h trading volume");
    }

    if (rugRisk.isHighRisk) {
      if (rugRisk.severity === "critical") {
        riskScore -= 60;
        flags.push("CRITICAL: Rug/dump pattern detected - token may be dead");
      } else if (rugRisk.severity === "high") {
        riskScore -= 40;
        flags.push("HIGH RISK: Sharp drop detected - potential rug");
      }

      if (!rugRisk.recovery.possible) {
        riskScore -= 20;
        flags.push("No recovery signs - avoid");
      }
    }

    riskScore = Math.max(0, Math.min(100, riskScore));

    let riskLevel = "high";
    if (riskScore >= 80) riskLevel = "low";
    else if (riskScore >= 60) riskLevel = "moderate";
    else if (riskScore >= 40) riskLevel = "elevated";

    let recommendation = "Sell";
    let recommendationDetail = "";

    const isMemeToken = tokenAgeDays < 7;

    if (honeypotCheck.isHoneypot) {
      recommendation = "Avoid";
      recommendationDetail =
        "Token flagged as honeypot or has suspicious contract code. Do not buy.";
    } else if (
      !survivalAnalysis.passed24h &&
      survivalAnalysis.survivalScore < 30
    ) {
      recommendation = "Wait";
      recommendationDetail =
        "Token is less than 24 hours old and showing weak survival signals. Most tokens die in this period - wait for 24h+ and monitor volume/price stability before considering entry.";
    } else if (
      !survivalAnalysis.passed24h &&
      survivalAnalysis.survivalScore >= 30
    ) {
      recommendation = "Research";
      recommendationDetail =
        "Token under 24 hours old but showing some positive signals. High risk period - only enter with tight stop losses and accept that most tokens die within 24h.";
    } else if (rugRisk.isHighRisk && rugRisk.severity === "critical") {
      recommendation = "Avoid";
      recommendationDetail = rugRisk.recovery.possible
        ? "Severe dump detected but showing early recovery signs. Extreme risk - only for experienced traders with strict stop losses."
        : "Token has crashed with no recovery signs. Likely rugged or dead. Do not buy.";
    } else if (rugRisk.isHighRisk && rugRisk.severity === "high") {
      recommendation = "Avoid";
      recommendationDetail =
        "Sharp price drop indicates potential rug or major dump. Wait for clear recovery signals.";
    } else if (isMemeToken) {
      const hasStrongMomentum = momentumScore > 5;
      const hasGoodBuyPressure = buySellRatio24h > 1.1;
      const hasStabilized = tokenAgeDays > 1 && volumeConsistency > 25;
      const isNotRugged = !rugRisk.isHighRisk;
      const goodSurvival = survivalAnalysis.survivalScore >= 50;

      if (
        hasStrongMomentum &&
        hasGoodBuyPressure &&
        riskScore >= 60 &&
        isNotRugged &&
        goodSurvival
      ) {
        recommendation = "Buy";
        recommendationDetail =
          "Strong bullish momentum with healthy buy pressure. Token passed 24h survival period with favorable metrics.";
      } else if (
        momentumScore > 0 &&
        buySellRatio24h > 0.9 &&
        riskScore >= 50 &&
        hasStabilized
      ) {
        recommendation = "Hold";
        recommendationDetail =
          "Positive momentum developing. Token showing signs of stabilization after launch phase.";
      } else if (
        riskScore < 40 ||
        momentumScore < -10 ||
        buySellRatio24h < 0.7 ||
        survivalAnalysis.survivalScore < 30
      ) {
        recommendation = "Avoid";
        recommendationDetail =
          "Negative momentum and risk factors outweigh potential upside. Token may be dying.";
      } else {
        recommendation = "Research";
        recommendationDetail =
          "Mixed signals. High volatility expected for new launch. Watch for clear trend formation.";
      }
    } else {
      if (riskScore >= 70 && momentumScore > 2 && volatilityIndex < 8) {
        recommendation = "Buy";
        recommendationDetail =
          "Strong fundamentals with bullish momentum support entry opportunities.";
      } else if (riskScore >= 50 && momentumScore > -2) {
        recommendation = "Hold";
        recommendationDetail =
          "Decent fundamentals with mixed momentum. Monitor for clearer signals.";
      } else {
        recommendation = "Sell";
        recommendationDetail =
          "Risk factors and negative momentum suggest defensive positioning.";
      }
    }

    let scenario = "Watchlist / Research";
    let scenarioDetail =
      "Monitor for improved momentum or reduced volatility before considering entry.";

    if (recommendation === "Buy") {
      scenario = "Accumulate / Enter";
      scenarioDetail =
        "Favorable setup with momentum confirmation supports gradual position building.";
    } else if (recommendation === "Sell" || recommendation === "Avoid") {
      scenario = "Avoid / Exit";
      scenarioDetail =
        "Risk-reward unfavorable; capital better deployed elsewhere.";
    } else if (recommendation === "Hold") {
      scenario = "Hold / Monitor";
      scenarioDetail =
        "Maintain position and watch for momentum shifts or trend confirmation.";
    }

    const technicalView = `Market structure exhibits ${momentumLabel.toLowerCase()} characteristics across multiple timeframes, with ${velocityLabel.toLowerCase()} price action suggesting ${
      velocity > 3
        ? "continuation potential as accumulation phase develops"
        : velocity < -3
        ? "breakdown risk as distribution patterns emerge"
        : "consolidation dynamics requiring catalyst for directional clarity"
    }. Order flow analysis reveals ${pressureLabel.toLowerCase()}, ${
      avgBuySellRatio > 1.3
        ? "indicating institutional or whale accumulation patterns"
        : avgBuySellRatio < 0.7
        ? "reflecting risk-off sentiment and potential capitulation"
        : "suggesting equilibrium between buyers and sellers"
    }. The prevailing volatility regime classifies as ${volatilityLabel.toLowerCase()}, ${
      volatilityIndex > 10
        ? "warranting heightened risk management protocols"
        : volatilityIndex > 5
        ? "requiring active monitoring of position sizes"
        : "supporting confidence in technical pattern reliability"
    }.`;

    const overallView = `${
      honeypotCheck.isHoneypot
        ? "🚨 CRITICAL: Contract analysis confirms honeypot characteristics - token cannot be safely traded regardless of other metrics."
        : rugRisk.isHighRisk && !rugRisk.recovery.possible
        ? "🚨 CRITICAL: Token has experienced catastrophic price collapse with no recovery indicators - characteristic of rug pulls or complete project abandonment. All metrics suggest token is dead."
        : rugRisk.isHighRisk && rugRisk.recovery.possible
        ? "⚠️ WARNING: Severe price dump detected. While early recovery signs exist, this exhibits classic post-rug volatility. Only suitable for high-risk traders with disciplined exit strategies."
        : `Risk architecture places this asset in the ${riskLevel} category for sophisticated traders operating with disciplined frameworks.`
    } ${
      liquidityStatus === "locked"
        ? "Liquidity infrastructure demonstrates institutional-grade depth, enabling seamless execution across position sizes."
        : liquidityStatus === "partial"
        ? "Liquidity depth sits at moderate levels; execution quality degrades materially on larger orders requiring staged entry strategies."
        : "Liquidity environment presents significant constraints; price impact on modest orders creates unfavorable risk-reward dynamics."
    } ${
      tokenAgeDays > 0 && tokenAgeDays < 3
        ? `As a sub-three-day launch, fundamental validation remains absent while volatility persists at extreme levels characteristic of speculative meme token price discovery.`
        : tokenAgeDays >= 3 && tokenAgeDays < 7
        ? `Recent launch dynamics (${tokenAgeDays.toFixed(
            1
          )}-day history) necessitate observation for post-pump stabilization and sideways-climbing consolidation patterns that distinguish sustainable projects from pump-and-dump schemes.`
        : "Sufficient price history exists for statistical pattern recognition and technical framework application."
    } ${
      volumeLiquidityRatio > 5
        ? "Volume significantly exceeding liquidity pools raises red flags for potential manipulation or coordinated pump activity."
        : volumeLiquidityRatio > 3
        ? "Healthy volume-to-liquidity dynamics validate genuine market interest and organic price discovery mechanisms."
        : volumeLiquidityRatio > 1
        ? "Moderate trading activity relative to available liquidity suggests organic participant engagement without manipulation concerns."
        : "Subdued volume relative to liquidity depth may indicate waning interest or project dormancy requiring catalyst identification."
    }`;

    let sentiment = "Neutral";
    let sentimentDetail = "";

    if (
      honeypotCheck.isHoneypot ||
      (rugRisk.isHighRisk && !rugRisk.recovery.possible)
    ) {
      sentiment = "Bearish";
      sentimentDetail = "Critical risk factors override all technical signals.";
    } else if (rugRisk.isHighRisk && rugRisk.recovery.possible) {
      sentiment = "Bearish";
      sentimentDetail =
        "Severe downside pressure with early recovery attempts.";
    } else {
      const sentimentScore = momentumScore * 0.6 + (avgBuySellRatio - 1) * 20;

      if (sentimentScore > 5) {
        sentiment = "Bullish";
        sentimentDetail =
          "Strong upward momentum with healthy buy pressure supporting continuation.";
      } else if (sentimentScore > 2) {
        sentiment = "Bullish";
        sentimentDetail =
          "Positive momentum developing with buyers stepping in at key levels.";
      } else if (sentimentScore > -2) {
        sentiment = "Neutral";
        sentimentDetail =
          "Balanced forces between buyers and sellers awaiting directional catalyst.";
      } else if (sentimentScore > -5) {
        sentiment = "Bearish";
        sentimentDetail =
          "Downward pressure building as sellers overwhelm demand zones.";
      } else {
        sentiment = "Bearish";
        sentimentDetail =
          "Heavy distribution pattern with sustained selling pressure across timeframes.";
      }
    }

    const result = {
      address,
      token: { name, symbol, decimals },
      chain: "bsc",
      profile: tokenProfile
        ? {
            description: tokenProfile.description || null,
            icon: tokenProfile.icon || null,
            header: tokenProfile.header || null,
            links: tokenProfile.links || [],
            hasEnhancedInfo: !!(tokenProfile.description || tokenProfile.icon),
          }
        : null,
      socials: {
        websites,
        platforms: socials,
        hasWebsite: websites.length > 0,
        hasTwitter: socials.some((s) => {
          const platform = (s.platform || "").toLowerCase();
          return (
            platform.includes("twitter") ||
            platform === "x" ||
            platform.includes("telegram")
          );
        }),
      },
      boost: tokenBoosts
        ? {
            active: tokenBoosts.amount || 0,
            total: tokenBoosts.totalAmount || 0,
          }
        : null,
      honeypot: honeypotCheck,
      risk: {
        score: riskScore,
        level: riskLevel,
        flags,
        liquidity: { status: liquidityStatus, usd: marketData.liquidityUsd },
        tokenAgeDays,
      },
      market: {
        pairAddress: marketData.pairAddress,
        dexName: marketData.dexName,
        priceUsd: marketData.priceUsd,
        priceChange24hPct: marketData.priceChange24hPct,
        priceChange6hPct: marketData.priceChange6hPct,
        priceChange1hPct: marketData.priceChange1hPct,
        priceChange5mPct: marketData.priceChange5mPct,
        volume24hUsd: marketData.volume24hUsd,
        volume6hUsd: marketData.volume6hUsd,
        volume1hUsd: marketData.volume1hUsd,
        volume5mUsd: marketData.volume5mUsd,
        liquidityUsd: marketData.liquidityUsd,
        fdv: marketData.fdv,
        txns24h: marketData.txns24h,
        txns6h: marketData.txns6h,
        txns1h: marketData.txns1h,
        txns5m: marketData.txns5m,
      },
      priceImpact: {
        buy100: priceImpact100,
        buy500: priceImpact500,
        buy1000: priceImpact1000,
      },
      technical: {
        momentum: {
          score: momentumScore,
          label: momentumLabel,
          priceChange5m: marketData.priceChange5mPct,
          priceChange1h: marketData.priceChange1hPct,
          priceChange6h: marketData.priceChange6hPct,
          priceChange24h: marketData.priceChange24hPct,
        },
        volatility: {
          index: volatilityIndex,
          label: volatilityLabel,
          recentVolumeRatio,
          priceRangeCompression,
          compressionLabel,
        },
        pressure: {
          buySellRatio24h,
          buySellRatio1h,
          label: pressureLabel,
        },
        velocity: {
          value: velocity,
          label: velocityLabel,
        },
        marketHealth: {
          volumeConsistency,
          consistencyLabel,
          volumeLiquidityRatio,
          liquidityStabilityLabel,
          txnFrequency1h,
          txnFrequencyLabel,
          avgTradeSize,
          tradeSizeLabel,
        },
      },
      commentary: {
        technicalView,
        overallView,
        sentiment,
        sentimentDetail,
        recommendation,
        recommendationDetail,
        scenario,
        scenarioDetail,
      },
      rugRisk,
      survivalAnalysis,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[v0] Analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze token" },
      { status: 500 }
    );
  }
}
