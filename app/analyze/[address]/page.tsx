"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  LineChart,
  Coins,
  CalendarClock,
  LockKeyhole,
  Copy,
  Check,
  Gauge,
  ChartBar,
  Menu,
  X,
  Wallet,
  Target,
  Sparkles,
  Activity,
} from "lucide-react";
// Using Lucide icons as Tabler alternative
// import { IconExternalLink, IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import ChartEmbed from "@/components/analysis/ChartEmbed";
import CommentaryPanel from "@/components/analysis/CommentaryPanel";
import SentimentPanel from "@/components/analysis/SentimentPanel";
import { formatTokenAge } from "@/lib/utils";
import { WavyBackground } from "@/src/components/ui/wavy-background";
import { EvervaultCard, Icon } from "@/src/components/ui/evervault-card";

const BASE_BG = "#000000";
const ACCENT = "#F2B900";

/* ---------------- MAIN CONTENT ---------------- */

function AnalyzePageContent({ address }: { address: string }) {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const { toast } = useToast();
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!address) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/analyze-token?address=${address}`);
        if (!response.ok) throw new Error("Failed to analyze token");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [address]);

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center text-white z-50"
        style={{ backgroundColor: BASE_BG }}
      >
        {/* Dot pattern overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="dot-grid-loading"
                x="0"
                y="0"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.18)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dot-grid-loading)" />
          </svg>
        </div>

        <div className="relative flex flex-col items-center justify-center space-y-8">
          {/* Loading spinner in center */}
              <div className="relative">
            {/* Outer spinning ring */}
            <Loader2 className="w-16 h-16 sm:w-20 sm:h-20 text-[#F2B900] animate-spin" />
            
            {/* Logo inside circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/80 border border-[#F2B900]/30 p-2 backdrop-blur-sm flex items-center justify-center">
                <img 
                  src="/Logo1.png" 
                  alt="ScanAI" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Text content */}
          <div className="space-y-4 text-center px-4">
            <div className="flex items-center justify-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#F2B900] animate-pulse" style={{ animationDelay: '0s' }} />
              <div className="h-1.5 w-1.5 rounded-full bg-[#F2B900] animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="h-1.5 w-1.5 rounded-full bg-[#F2B900] animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
            
            <p className="text-lg sm:text-xl font-semibold tracking-tight text-white">
              Analyzing token…
            </p>
            
            <p className="text-sm text-white/60 leading-relaxed max-w-md mx-auto">
              Rebuilding structure, liquidity and market tape into a single score.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4 text-white"
        style={{ backgroundColor: BASE_BG }}
      >
        <GradientFrame className="max-w-md p-8">
          <div className="space-y-6 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">
                Analysis failed
              </h2>
              <p className="text-sm text-white/70">
                {error instanceof Error
                  ? error.message
                  : "Unable to analyze this token. Please verify the contract address."}
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="mx-auto bg-white text-black hover:bg-zinc-200"
            >
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Analyze another token
              </Link>
            </Button>
          </div>
        </GradientFrame>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4 text-white"
        style={{ backgroundColor: BASE_BG }}
      >
        <GradientFrame className="max-w-md p-8">
          <div className="space-y-4 text-center">
            <p className="text-sm text-white/70">
              Please enter a token address to analyze.
            </p>
            <Button
              asChild
              size="lg"
              className="mx-auto bg-white text-black hover:bg-zinc-200"
            >
              <Link href="/">Go back</Link>
            </Button>
          </div>
        </GradientFrame>
      </div>
    );
  }

  const getRiskColor = (level: string) => {
    const colors = {
      low: {
        chip: "border-emerald-500/60 bg-emerald-500/10 text-emerald-300",
        text: "text-emerald-300",
      },
      moderate: {
        chip: "border-amber-400/70 bg-amber-400/10 text-amber-200",
        text: "text-amber-200",
      },
      elevated: {
        chip: "border-red-500/70 bg-red-500/10 text-red-300",
        text: "text-red-300",
      },
      high: {
        chip: "border-red-500/70 bg-red-500/10 text-red-300",
        text: "text-red-300",
      },
    };
    return (
      colors[level.toLowerCase() as keyof typeof colors] || colors.moderate
    );
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return "N/A";
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const riskColors = getRiskColor(data.risk.level);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    toast({
      title: "Copied",
      description: "Contract address copied to clipboard",
    });
    setTimeout(() => setCopiedAddress(false), 1600);
  };

  const logoUrl = `https://dd.dexscreener.com/ds-data/tokens/bsc/${address?.toLowerCase()}.png`;

  /* ---------- MAIN CONTENT (sections) ---------- */

  // Get risk level variant for Pill component
  const getRiskVariant = (level: string): "primary" | "success" | "warning" | "danger" | "neutral" => {
    const levelLower = level.toLowerCase();
    if (levelLower === "low") return "success";
    if (levelLower === "moderate") return "warning";
    if (levelLower === "elevated" || levelLower === "high") return "danger";
    return "neutral";
  };

  return (
    <div className="space-y-12">
      {/* 1. TOKEN OVERVIEW */}
      <section>
        <GradientFrame className="p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
            {/* Left: Token Info */}
            <div className="lg:col-span-8">
              <div className="flex flex-wrap items-center gap-5">
                <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/[0.18] bg-black shadow-[0_20px_40px_rgba(0,0,0,0.85)]">
            <img
              src={logoUrl || "/placeholder.svg"}
              alt={`${data.token.symbol} logo`}
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src.includes("dexscreener")) {
                  target.src = `https://assets.dexscreener.com/token-images/bsc/${address?.toLowerCase()}.png`;
                } else {
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector(".fallback-text")) {
                    const fallback = document.createElement("div");
                    fallback.className =
                            "fallback-text flex h-full w-full items-center justify-center bg-black text-lg font-semibold text-white";
                    fallback.textContent = data.token.symbol
                      .slice(0, 2)
                      .toUpperCase();
                    parent.appendChild(fallback);
                  }
                }
              }}
            />
          </div>
                <div className="flex-1 min-w-[200px]">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/50">
                    TOKEN OVERVIEW
            </p>
                  <h1 className="mt-1.5 text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              {data.token.symbol}
              <span className="font-normal text-white/40">
                      {" "}/ {data.token.name}
              </span>
            </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2 rounded-full border border-white/[0.18] bg-black/90 px-3 py-1 backdrop-blur-sm">
                      <span className="font-mono text-[10px] text-white/80">
                        {address?.slice(0, 8)}...{address?.slice(-6)}
                </span>
                <button
                  onClick={copyAddress}
                        className="rounded-full p-0.5 transition-colors hover:bg-white/5"
                >
                  {copiedAddress ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                          <Copy className="h-3 w-3 text-white/40" />
                  )}
                </button>
              </div>
                    <Pill variant="success">
                      <span className="h-1 w-1 rounded-full bg-emerald-400 mr-1.5" />
                BNB Mainnet · Read-only
                    </Pill>
            </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { label: "BscScan", href: `https://bscscan.com/token/${address}` },
                      { label: "DexScreener", href: `https://dexscreener.com/bsc/${address}` },
                      { label: "Birdeye", href: `https://birdeye.so/token/${address}?chain=bsc` },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-full border border-white/[0.18] bg-black/90 px-3 py-1 text-[10px] text-white/70 transition-all hover:border-[#F2B900]/40 hover:text-[#F2B900] backdrop-blur-sm"
            >
              {link.label}
                        <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>
        </div>
              </div>
            </div>

            {/* Right: Micro Metrics */}
            <div className="lg:col-span-4 lg:pl-6 lg:border-l border-white/[0.08]">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <div>
                  <MetricLabel label="FDV" />
                  <p className="mt-1 text-xl font-semibold text-white">
                    {formatNumber(data.market.fdv)}
                  </p>
              </div>
              <div>
                  <MetricLabel label="24h Change" />
              <p
                className={`mt-1 text-xl font-semibold ${
                      data.market.priceChange24hPct >= 0
                    ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {data.market.priceChange24hPct >= 0 ? "+" : ""}
                    {data.market.priceChange24hPct.toFixed(2)}%
              </p>
            </div>
            <div>
                  <MetricLabel label="24h Volume" />
                  <p className="mt-1 text-xl font-semibold text-white">
                    {formatNumber(data.market.volume24hUsd)}
              </p>
            </div>
          </div>
            </div>
          </div>
        </GradientFrame>
      </section>

      {/* 2. RISK SPINE */}
      <section>
        <SectionFrame>
          <SectionHeader
            overline="RISK SPINE"
            subtitle="Composite risk from structure, liquidity and flow rails."
            icon={<ScanaiRiskIcon className="w-4 h-4" />}
            accentWord="SPINE"
          />
          <div className="relative grid gap-6 lg:grid-cols-12">
            {/* Connection line */}
            <HorizontalConnector className="hidden lg:block left-[66.67%] right-0 top-1/2" />
            
            {/* Risk Score - Hero Card (60-65% width) */}
            <HeroCard className="lg:col-span-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.18] bg-gradient-to-br from-[#F2B900]/10 to-transparent">
                    <ScanaiRiskIcon className={`h-7 w-7 ${riskColors.text}`} />
                  </div>
            <div>
                    <MetricLabel label="Risk Score" />
                    <div className="flex items-baseline gap-2 mt-1">
                      <RiskScoreAnimated score={data.risk.score} className={riskColors.text} />
                      <span className="text-2xl text-white/40">/100</span>
            </div>
            </div>
          </div>
                <Pill variant={getRiskVariant(data.risk.level)}>
                  {data.risk.level.toUpperCase()}
                </Pill>
          </div>

              {/* Visual Gauge */}
              <div className="mb-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
                  <RiskGaugeAnimated
                    score={data.risk.score}
                    className={`h-2 rounded-full transition-all ${
                      data.risk.score >= 80
                        ? "bg-emerald-400"
                : data.risk.score >= 60
                        ? "bg-amber-400"
                : data.risk.score >= 40
                        ? "bg-orange-400"
                        : "bg-red-400"
                    }`}
            />
          </div>
        </div>

              <p className="text-xs text-white/60 leading-relaxed">
                Composite score from structure, liquidity and flow rails.
              </p>
            </HeroCard>

            {/* Right Stack: Liquidity + Token Age */}
            <div className="lg:col-span-4 space-y-6">
              <SecondaryCard>
                <MetricLabel icon={<ScanaiLiquidityIcon className="h-4 w-4" />} label="Liquidity" />
                <p className="mt-2 text-3xl font-semibold text-white">
                  {formatNumber(data.risk.liquidity.usd)}
                </p>
                <div className="mt-3 space-y-2">
                  <Pill variant={data.risk.liquidity.status.includes("LOCKED") ? "success" : data.risk.liquidity.status.includes("PARTIAL") ? "warning" : "danger"}>
                    {data.risk.liquidity.status}
                  </Pill>
                  <p className="text-xs text-white/70 leading-relaxed">
                    {data.technical.marketHealth.volumeLiquidityRatio > 2
                      ? "Pool can absorb mid-size trades"
                      : "Thin pool – size entries and exits carefully."}
                </p>
              </div>
              </SecondaryCard>

              <SecondaryCard>
                <MetricLabel icon={<CalendarClock className="h-4 w-4" />} label="Token Age" />
                <p className="mt-2 text-3xl font-semibold text-white">
                  {formatTokenAge(data.risk.tokenAgeDays)}
                </p>
                <div className="mt-3 space-y-2">
                  <Pill variant={data.risk.tokenAgeDays >= 30 ? "success" : data.risk.tokenAgeDays >= 7 ? "warning" : "danger"}>
                    {data.risk.tokenAgeDays >= 30 ? "MATURE" : "EARLY-LIFE"}
                  </Pill>
                  <p className="text-xs text-white/70 leading-relaxed">
                    {data.risk.tokenAgeDays < 7 
                      ? "Young asset – limited history for pattern reliability."
                      : data.risk.tokenAgeDays < 30
                      ? "Moderate age – some pattern reliability."
                      : "Mature asset – sufficient history for analysis."}
                </p>
              </div>
              </SecondaryCard>
            </div>
        </div>
        </SectionFrame>
      </section>


      {/* 3. PRICE & LIQUIDITY */}
      <section>
        <SectionFrame>
          <SectionHeader
            overline="PRICE & LIQUIDITY"
            subtitle="Live price action and execution depth on BNB."
            icon={<ScanaiRiskIcon className="w-4 h-4" />}
            accentWord="LIQUIDITY"
          />
          <div className="space-y-6">
            {/* Price Chart Card */}
            <HeroCard>
              <div className="flex items-center justify-between mb-4">
                <MetricLabel icon={<LineChart className="h-4 w-4" />} label="Price Chart" />
                <a
                  href={`https://dexscreener.com/bsc/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-white/[0.18] bg-black/90 px-3 py-1 text-[10px] text-white/70 transition-all hover:border-[#F2B900]/40 hover:text-[#F2B900] backdrop-blur-sm"
                >
                  View on DexScreener
                  <ExternalLink className="h-3 w-3" />
                </a>
        </div>
              <ChartEmbed pairAddress={data.market.pairAddress} chain={data.chain} />
            </HeroCard>

            {/* Price Impact Cards */}
            <div className="grid gap-5 md:grid-cols-3">
          <ImpactCard
            label="$100 buy"
            value={data.priceImpact.buy100}
            low={1}
            mid={3}
            multiplier={10}
          />
          <ImpactCard
            label="$500 buy"
            value={data.priceImpact.buy500}
            low={2}
            mid={5}
            multiplier={5}
          />
          <ImpactCard
            label="$1k buy"
            value={data.priceImpact.buy1000}
            low={3}
            mid={7}
            multiplier={3.33}
          />
        </div>
              </div>
        </SectionFrame>
      </section>

      {/* 4. TREND & FLOW */}
      <section>
        <SectionFrame>
          <SectionHeader
            overline="TREND & FLOW"
            subtitle="Momentum, volatility and real orderflow on BNB."
            icon={<ScanaiMomentumIcon className="w-4 h-4" />}
            accentWord="FLOW"
          />
          <div className="relative grid gap-6 lg:grid-cols-2 lg:items-stretch">
            {/* Vertical connection line */}
            <VerticalConnector className="hidden lg:block" />
            
            {/* Momentum Card */}
            <SecondaryCard className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <MetricLabel icon={<ScanaiMomentumIcon className="h-4 w-4" />} label="Momentum & price action" />
                <Pill variant={data.technical.momentum.score > 5 ? "success" : data.technical.momentum.score > 0 ? "warning" : "danger"}>
                {data.technical.momentum.label}
                </Pill>
              </div>
              <div className="mb-4">
                <p className="text-4xl font-semibold text-white">
                  {data.technical.momentum.score > 0 ? "+" : ""}
                  {data.technical.momentum.score.toFixed(2)}
                </p>
                <p className="text-xs text-white/50 mt-1">Momentum score</p>
                <p className="text-xs text-white/60 mt-2 leading-relaxed">
                  Weighted trend across 5m / 1h / 6h / 24h windows.
              </p>
            </div>
              <div className="grid gap-4 border-t border-white/[0.12] pt-6 sm:grid-cols-2 flex-1">
                {[
                  { label: "5m change", v: data.technical.momentum.priceChange5m },
                  { label: "1h change", v: data.technical.momentum.priceChange1h },
                  { label: "6h change", v: data.technical.momentum.priceChange6h },
                  { label: "24h change", v: data.technical.momentum.priceChange24h },
              ].map((x) => (
                <div key={x.label} className="space-y-1">
                    <span className="text-xs font-medium text-white/60">{x.label}</span>
                    <span className={`block text-2xl font-semibold ${x.v >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {x.v >= 0 ? "+" : ""}
                    {x.v.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
            </SecondaryCard>

            {/* Volatility Card */}
            <SecondaryCard className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <MetricLabel icon={<ScanaiVolatilityIcon className="h-4 w-4" />} label="Volatility & flow" />
                <Pill variant={data.technical.volatility.index > 10 ? "danger" : data.technical.volatility.index > 5 ? "warning" : "success"}>
                {data.technical.volatility.label} volatility
                </Pill>
              </div>
              <div className="mb-4">
                <p className="text-4xl font-semibold text-white">
                  {data.technical.volatility.index.toFixed(2)}
                </p>
                <p className="text-xs text-white/50 mt-1">Volatility index</p>
                <p className="text-xs text-white/60 mt-2 leading-relaxed">
                  Regime: {data.technical.volatility.label.toLowerCase()} – treat position size like leverage.
              </p>
            </div>
              <div className="space-y-6 flex-1">
                <div className="space-y-2 border-t border-white/[0.12] pt-6">
                  <MetricLabel label="Price compression" />
                  <p className="text-2xl font-semibold text-white">
                  {data.technical.volatility.priceRangeCompression.toFixed(2)}x
                  </p>
                  <p className="text-xs text-white/60">{data.technical.volatility.compressionLabel}</p>
              </div>
                <div className="space-y-2 border-t border-white/[0.12] pt-6">
                  <MetricLabel label="Buy / sell pressure" />
              <div className="grid grid-cols-2 gap-4">
                    <PressureMetric label="24h ratio" value={data.technical.pressure.buySellRatio24h} />
                    <PressureMetric label="1h ratio" value={data.technical.pressure.buySellRatio1h} />
              </div>
                  <p className="text-xs text-white/60">{data.technical.pressure.label}</p>
            </div>
                <div className="space-y-2 border-t border-white/[0.12] pt-6">
                  <MetricLabel label="Velocity" />
                  <p className={`text-2xl font-semibold ${data.technical.velocity.value > 0 ? "text-emerald-400" : data.technical.velocity.value < 0 ? "text-red-400" : "text-white"}`}>
                  {data.technical.velocity.value > 0 ? "+" : ""}
                  {data.technical.velocity.value.toFixed(2)}
              </p>
                  <p className="text-xs text-white/60">{data.technical.velocity.label}</p>
            </div>
          </div>
            </SecondaryCard>
          </div>
        </SectionFrame>
      </section>

      {/* 5. MARKET HEALTH */}
      <section>
        <SectionFrame>
          <SectionHeader
            overline="MARKET HEALTH"
            subtitle="How volume, liquidity and participation behave in this pool."
            icon={<ScanaiHealthIcon className="w-4 h-4" />}
            accentWord="HEALTH"
          />
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Volume consistency",
                  value: `${data.technical.marketHealth.volumeConsistency.toFixed(1)}%`,
                  status: "Steady – flow is not purely event-driven.",
                  icon: <LineChart className="h-4 w-4" />,
                },
                {
                  label: "Liquidity stability",
                  value: `${data.technical.marketHealth.volumeLiquidityRatio.toFixed(2)}x`,
                  status: "Healthy turnover relative to pool size.",
                  icon: <Wallet className="h-4 w-4" />,
                },
                {
                  label: "Txn frequency",
                  value: `${data.technical.marketHealth.txnFrequency1h.toFixed(0)}/h`,
                  status: "Thin flow – fewer discrete participants.",
                  icon: <Activity className="h-4 w-4" />,
                },
                {
                  label: "Avg trade size",
                  value: `$${data.technical.marketHealth.avgTradeSize.toFixed(0)}`,
                  status: "Small tickets – mostly retail-sized orders.",
                  icon: <Target className="h-4 w-4" />,
                },
              ].map((metric, idx) => (
                <SecondaryCard key={idx}>
                  <MetricLabel icon={metric.icon} label={metric.label} />
                  <p className="mt-3 text-3xl font-semibold text-white mb-2">{metric.value}</p>
                  <p className="text-xs text-white/60">{metric.status}</p>
                </SecondaryCard>
              ))}
              </div>

            {/* Market Sentiment + Recommendation */}
            <div className="grid gap-6 md:grid-cols-2">
              {(() => {
                const sentiment = data.commentary.sentiment || "Bullish";
                const styles = getSentimentStyles(sentiment);
                return (
                  <SecondaryCard className={`${styles.borderColor} border ${styles.accentBg} relative overflow-hidden`}>
                    {/* Background gradient */}
                    <div className={`absolute inset-0 pointer-events-none ${styles.accentBg}`} style={{
                      background: sentiment.toLowerCase().includes("bull") 
                        ? 'radial-gradient(circle at 30% 30%, rgba(16,185,129,0.13) 0%, transparent 60%)'
                        : sentiment.toLowerCase().includes("bear")
                        ? 'radial-gradient(circle at 30% 30%, rgba(239,68,68,0.13) 0%, transparent 60%)'
                        : 'radial-gradient(circle at 30% 30%, rgba(245,158,11,0.11) 0%, transparent 60%)',
                    }} />
                    
                    <div className="relative">
                      <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/50 mb-4" style={{ marginTop: '0px' }}>
                        MARKET <span className="text-[#F2B900]">SENTIMENT</span>
                      </p>
                      <div className="flex items-center gap-4 mb-4">
                        {styles.icon}
                        <p className={`text-5xl font-semibold ${styles.textColor}`}>
                          {sentiment}
                        </p>
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed">
                        {data.commentary.sentimentDetail || "Strong upward momentum with healthy buy pressure supporting continuation."}
                      </p>
                    </div>
                  </SecondaryCard>
                );
              })()}

              {(() => {
                const recommendation = data.commentary.recommendation || "Hold";
                const styles = getRecommendationStyles(recommendation);
                return (
                  <SecondaryCard className={`${styles.borderColor} border ${styles.accentBg} relative overflow-hidden`}>
                    {/* Background gradient */}
                    <div className={`absolute inset-0 pointer-events-none ${styles.accentBg}`} style={{
                      background: recommendation.toLowerCase().includes("buy") || recommendation.toLowerCase().includes("long")
                        ? 'radial-gradient(circle at 30% 30%, rgba(16,185,129,0.11) 0%, transparent 60%)'
                        : recommendation.toLowerCase().includes("avoid")
                        ? 'radial-gradient(circle at 30% 30%, rgba(239,68,68,0.11) 0%, transparent 60%)'
                        : 'radial-gradient(circle at 30% 30%, rgba(242,185,0,0.11) 0%, transparent 60%)',
                    }} />
                    
                    <div className="relative">
                      <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/50 mb-4" style={{ marginTop: '0px' }}>
                        <span className="text-[#F2B900]">POSITIONING</span>
                      </p>
                      <div className="flex items-center gap-4 mb-4">
                        {styles.icon}
                        <p className={`text-5xl font-semibold ${styles.textColor}`}>
                          {recommendation}
                        </p>
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed">
                        {data.commentary.recommendationDetail || "Decent fundamentals with mixed momentum. Monitor for clearer signals."}
                      </p>
                    </div>
                  </SecondaryCard>
                );
              })()}
            </div>
          </div>
        </SectionFrame>
      </section>

      {/* Critical Alerts - Rug Risk */}
      {data.rugRisk && data.rugRisk.isHighRisk && (
        <SecondaryCard className="border-red-500/40 bg-[radial-gradient(circle_at_0%_0%,rgba(248,113,113,0.2),transparent_55%),#000]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <AlertTriangle className="h-8 w-8 flex-shrink-0 text-red-400" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-red-300">
                  Rug risk detected ({data.rugRisk.severity.toUpperCase()})
            </h3>
                <Pill variant="danger">Critical</Pill>
          </div>
              <p className="text-sm leading-relaxed text-red-100/90 mb-4">
                Multiple structural and market flags suggest rug-like behaviour. If you touch this, assume lotto sizing.
              </p>
              <ul className="space-y-2 text-sm leading-relaxed text-red-100/90">
                {data.rugRisk.flags.map((f, i) => (
                  <li key={i} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                    <span>{f}</span>
              </li>
            ))}
          </ul>
            </div>
          </div>
        </SecondaryCard>
      )}

      {/* Early-Life Risk */}
      {data.survivalAnalysis && data.survivalAnalysis.tokenAgeDays < 7 && (
        <SecondaryCard>
          <SectionHeader
            overline="EARLY-LIFE RISK"
            subtitle="Token survival analysis for the first week."
            className="mb-6"
          />
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex-1">
              <p className="text-sm leading-relaxed text-white/80">
                {data.survivalAnalysis.passed24h
                  ? "Token has passed the 24h death-zone, but early-stage risk is still elevated."
                  : "Most degen tokens die in the first 24 hours — treat sizing like a lotto ticket."}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50">Survival score</p>
              <p className="text-4xl font-semibold text-white">
                {data.survivalAnalysis.survivalScore}
                <span className="text-sm text-white/40"> / 100</span>
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4 mb-6">
            <SurvivalStat label="Age (hours)" value={data.survivalAnalysis.ageInHours.toFixed(1)} />
            <SurvivalStat label="Age (days)" value={data.survivalAnalysis.tokenAgeDays.toFixed(2)} />
            <SurvivalStat label="24h milestone" value={data.survivalAnalysis.passed24h ? "Passed" : "Active"} />
            <SurvivalStat label="Probability" value={data.survivalAnalysis.survivalProbability} />
          </div>
          <p className="rounded-2xl border border-white/[0.18] bg-black/90 p-5 text-sm leading-relaxed text-white/80 backdrop-blur-sm">
            {data.survivalAnalysis.recommendation}
          </p>
        </SecondaryCard>
      )}

      {/* 6. AI OUTLOOK */}
      <section>
        <SectionFrame>
          <SectionHeader
            overline="AI OUTLOOK"
            subtitle="Narrative summary from the SCANAI analyst."
            icon={<ScanaiAiIcon className="w-4 h-4" />}
            accentWord="OUTLOOK"
          />
          <HeroCard>
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/[0.08]">
              <MetricLabel icon={<ScanaiAiIcon className="h-4 w-4" />} label="AI OUTLOOK" />
              <Pill variant="primary">Generated by SCANAI Analyst</Pill>
              </div>
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-white mb-3">Technical assessment</p>
                <p className="text-sm leading-relaxed text-white/80">
                  {data.commentary.technicalAssessment || data.commentary.technicalView || data.commentary.summary || "Market structure exhibits strong bullish characteristics across multiple timeframes, with accelerating down price action suggesting breakdown risk as distribution patterns emerge. Order flow analysis reveals strong buy pressure, indicating institutional or whale accumulation patterns. The prevailing volatility regime classifies as extreme, warranting heightened risk management protocols."}
                </p>
            </div>
              <div>
                <p className="text-sm font-semibold text-white mb-3">Risk & market overview</p>
                <p className="text-sm leading-relaxed text-white/80">
                  {data.commentary.riskOverview || data.commentary.overallView || data.commentary.overview || "Risk architecture places this asset in the low category for sophisticated traders operating with disciplined frameworks. Liquidity depth sits at moderate levels; execution quality degrades materially on larger orders requiring staged entry strategies. Sufficient price history exists for statistical pattern recognition and technical framework application. Moderate trading activity relative to available liquidity suggests organic participant engagement without manipulation concerns."}
                </p>
              </div>
            </div>
            {data.commentary.recommendation && (
              <SecondaryCard className="mt-8">
                <div className="flex items-center gap-3 mb-3">
                  <MetricLabel label="Trading scenario" />
                  <Pill variant={data.commentary.recommendation.toLowerCase().includes("avoid") ? "danger" : data.commentary.recommendation.toLowerCase().includes("hold") ? "warning" : "success"}>
                    {data.commentary.recommendation.toUpperCase()} / MONITOR
                  </Pill>
                </div>
                <p className="text-sm leading-relaxed text-white/80">
                  {data.commentary.recommendationDetail || data.commentary.detail || "Maintain position and watch for momentum shifts or trend confirmation."}
                </p>
              </SecondaryCard>
            )}
          </HeroCard>

          {/* Mini Chat Panel */}
          <MiniChatPanel tokenAddress={address} />
        </SectionFrame>
      </section>

      {/* 7. RISK FLAGS */}
      {data.risk.flags.length > 0 && (
        <section>
          <SectionFrame>
            <SectionHeader
              overline="RISK FLAGS"
              subtitle="Structural and market warnings detected by SCANAI rails."
              icon={<AlertTriangle className="w-4 h-4" />}
              accentWord="FLAGS"
            />
            <SecondaryCard>
              <div className="flex items-center justify-between mb-6">
                <MetricLabel label="Risk flags" />
                <Pill variant="danger">{data.risk.flags.length}</Pill>
              </div>
              <div className="space-y-3">
                {data.risk.flags.map((flag, idx) => {
                  const severity = flag.toLowerCase().includes("critical") || flag.toLowerCase().includes("high") ? "danger" : flag.toLowerCase().includes("warning") ? "warning" : "neutral";
                  return (
                    <div key={idx} className="group flex items-start gap-3 p-3 rounded-xl border border-white/[0.08] bg-black/60 hover:bg-black/80 hover:border-white/[0.12] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                      <Pill variant={severity as any} className="mt-0.5 flex-shrink-0">
                        {severity === "danger" ? "CRITICAL" : severity === "warning" ? "WARNING" : "INFO"}
                      </Pill>
                      <p className="text-sm leading-relaxed text-white/90 flex-1">{flag}</p>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
            </div>
        </div>
                  );
                })}
              </div>
            </SecondaryCard>
          </SectionFrame>
      </section>
      )}

      {/* Critical Alerts */}
      {data.honeypot.isHoneypot && (
        <SecondaryCard className="border-red-500/40 bg-[radial-gradient(circle_at_0%_0%,rgba(248,113,113,0.2),transparent_55%),#000]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <AlertTriangle className="h-8 w-8 flex-shrink-0 text-red-400" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-red-300">CRITICAL: Honeypot detected</h3>
                <Pill variant="danger">Critical</Pill>
              </div>
              <p className="text-sm leading-relaxed text-red-100/90">
                {data.honeypot.reason || "This token is flagged as a honeypot. Treat it as effectively untradeable."}
              </p>
            </div>
        </div>
        </SecondaryCard>
      )}
    </div>
  );
}

interface AnalyzePageProps {
  // Added interface for AnalyzePageProps
  params: Promise<{ address: string }>;
}

export default function AnalyzePage({ params }: AnalyzePageProps) {
  const [address, setAddress] = React.useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    params.then((p) => setAddress(p.address));
  }, [params]);

  // Prevent body scroll when mobile menu is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  if (!address) return null;

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white"
      style={{ backgroundColor: BASE_BG }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="dot-grid"
              x="0"
              y="0"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.18)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[600px]">
        <WavyBackground
          backgroundFill="#000000"
          colors={["#F3BA2F", "#F0B90B", "#C8871E", "#f97316"]}
          waveWidth={60}
          blur={11}
          speed="slow"
          waveOpacity={0.3}
          containerClassName="absolute inset-0 -z-10 pointer-events-none flex items-center justify-center"
          className="h-full w-full"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[400px]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.85) 65%, #000000 100%)",
          }}
        />
      </div>

      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
          {/* logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
            <img src="/logo.png" className="w-32 object-cover" />
          </Link>
          </div>

          {/* center nav */}
          <nav className="hidden items-center gap-8 text-sm text-white/65 md:flex">
            <a href="/#analyzer" className="hover:text-white transition-colors">
              Product
            </a>
            <a href="/#stack" className="hover:text-white transition-colors">
              Stack
            </a>
            <a href="/#methodology" className="hover:text-white transition-colors">
              Methodology
            </a>
            <a href="/#about" className="hover:text-white transition-colors">
              About
            </a>
          </nav>

          {/* right CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="hidden rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-medium text-white/85 shadow-sm hover:bg-white/15 md:inline-block transition-colors"
            >
              Chat
            </Link>
            <a
              href="https://github.com/SCANAI01"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-medium text-white/85 shadow-sm hover:bg-white/15 md:inline-block"
            >
              View GitHub
            </a>
            <a
              href="https://x.com/Scanai01"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold text-black shadow-sm hover:bg-[#f5f5f5] md:inline-block"
            >
              Follow on X
            </a>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden relative z-50 p-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-all duration-200 active:scale-95"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-white transition-transform duration-300 rotate-90" />
              ) : (
                <Menu className="w-6 h-6 text-white transition-transform duration-300" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Backdrop */}
      <div
        className={`md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Menu Drawer - Slide from right */}
      <div
        className={`md:hidden fixed top-0 right-0 bottom-0 w-[85%] max-w-sm z-50 bg-gradient-to-b from-black via-black to-black/95 backdrop-blur-2xl border-l border-white/[0.1] shadow-[-8px_0_32px_rgba(0,0,0,0.9)] transition-transform duration-300 ease-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <img src="/logo.png" className="w-24 object-cover" />
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-white/80" />
          </button>
        </div>

        {/* Menu Content */}
        <nav className="flex flex-col px-4 py-6 h-[calc(100vh-81px)] overflow-y-auto">
          {/* Navigation Links */}
          <div className="space-y-1 mb-6">
            <a
              href="/#analyzer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-transparent active:bg-white/15 transition-all duration-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F2B900] opacity-60" />
              Product
            </a>
            <a
              href="/#stack"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-transparent active:bg-white/15 transition-all duration-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F2B900] opacity-60" />
              Stack
            </a>
            <a
              href="/#methodology"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-transparent active:bg-white/15 transition-all duration-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F2B900] opacity-60" />
              Methodology
            </a>
            <a
              href="/#about"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-transparent active:bg-white/15 transition-all duration-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F2B900] opacity-60" />
              About
            </a>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.08] my-4" />

          {/* Action Buttons */}
          <div className="space-y-3 mt-2">
            <Link
              href="/chat"
              onClick={() => setMobileMenuOpen(false)}
              className="group relative flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-white/12 to-white/8 hover:from-white/18 hover:to-white/12 active:from-white/22 active:to-white/15 transition-all duration-200 shadow-[0_4px_12px_rgba(242,185,0,0.15)]"
            >
              <span>Chat</span>
              <svg className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            
            <a
              href="https://github.com/SCANAI01"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium text-white/85 bg-white/5 hover:bg-white/10 hover:text-white active:bg-white/15 transition-all duration-200 border border-white/10"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>View GitHub</span>
            </a>
            
            <a
              href="https://x.com/Scanai01"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold text-black bg-white hover:bg-[#f5f5f5] active:bg-[#e5e5e5] transition-all duration-200 shadow-[0_4px_12px_rgba(255,255,255,0.2)]"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>Follow on X</span>
            </a>
          </div>

          {/* Footer note */}
          <div className="mt-auto pt-6 pb-4">
            <p className="text-[10px] text-white/40 text-center px-4">
              © 2025 SCANAI
            </p>
          </div>
        </nav>
      </div>

      <main className="relative z-10">
        <div className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-8">
          <div className="mb-8 flex items-center gap-4">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/90 backdrop-blur transition-colors duration-200 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to analyzer
            </Link>
          </div>

          <div className="space-y-8">
            <AnalyzePageContent address={address} />
          </div>
        </div>
      </main>
    </div>
  );
}

function GradientFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-12 -top-6 h-16 opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(242,185,0,0.35), transparent 70%)",
        }}
      />
      <div className="relative rounded-3xl bg-[conic-gradient(from_140deg,rgba(242,185,0,0.4),rgba(255,255,255,0.08),rgba(242,185,0,0.4))] p-[1px]">
        <div
          className={`rounded-3xl bg-black/95 backdrop-blur-sm ${className}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function GradientHeading({
  children,
  size = "md",
  className = "",
  highlight,
}: {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  highlight?: string;
}) {
  const sizeClasses = {
    sm: "text-lg sm:text-xl",
    md: "text-xl sm:text-2xl",
    lg: "text-2xl sm:text-3xl",
  };

  const processText = (text: React.ReactNode): React.ReactNode => {
    if (typeof text !== "string") return text;
    if (!highlight) return text;

    const parts = text.split(new RegExp(`(${highlight})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <span
          key={i}
          className="bg-[linear-gradient(180deg,#F2B900_0%,#F9E400_45%,#C8871E_100%)] bg-clip-text text-transparent"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <h2
      className={`font-semibold tracking-tight text-white ${sizeClasses[size]} ${className}`}
    >
      {processText(children)}
    </h2>
  );
}

function SurvivalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.18] bg-black/90 p-5 backdrop-blur-sm">
      <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/50">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function RiskMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/50">
        {icon}
        {label}
      </div>
      <div className="text-xl font-semibold capitalize text-white">{value}</div>
    </div>
  );
}

// MarketCard removed - replaced with bento grid design

function ImpactCard({
  label,
  value,
  low,
  mid,
  multiplier,
}: {
  label: string;
  value: number;
  low: number;
  mid: number;
  multiplier: number;
}) {
  const status = value < low ? "low" : value < mid ? "mid" : "high";

  const barColor =
    status === "low"
      ? "bg-emerald-400"
      : status === "mid"
      ? "bg-amber-400"
      : "bg-red-400";

  const text =
    label === "$100 buy"
      ? "Low impact – execution quality is strong at this size."
      : label === "$500 buy"
      ? "Low impact – room to scale entries without stressing the pool."
      : "Moderate impact – acceptable for active traders, avoid panic sizing.";

  return (
    <SecondaryCard>
      <MetricLabel label={label} />
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={`text-3xl font-semibold ${
            status === "low"
              ? "text-emerald-400"
              : status === "mid"
              ? "text-amber-300"
              : "text-red-400"
          }`}
        >
          {value.toFixed(2)}%
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, value * multiplier)}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-white/70 leading-relaxed">{text}</p>
    </SecondaryCard>
  );
}

function PressureMetric({ label, value }: { label: string; value: number }) {
  const color =
    value > 1.1
      ? "text-emerald-400"
      : value < 0.9
      ? "text-red-400"
      : "text-white";
  return (
    <div className="space-y-1">
      <span className="text-xs text-white/60">{label}</span>
      <span className={`block text-2xl font-semibold ${color}`}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

/* === Custom SCANAI Icons === */

function ScanaiRiskIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2L3 6V10C3 14 6 17 10 18C14 17 17 14 17 10V6L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M10 10V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="10" cy="13" r="1" fill="currentColor"/>
    </svg>
  );
}

function ScanaiLiquidityIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 10H15M10 5V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="13" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="7" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="13" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

function ScanaiMomentumIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 14L7 10L10 13L17 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M17 6H13V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function ScanaiVolatilityIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 10H7L9 6L11 14L13 10H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M5 4V16M15 4V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function ScanaiHealthIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M10 6V10L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
    </svg>
  );
}

function ScanaiAiIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2L12 8L18 8L13 12L15 18L10 14L5 18L7 12L2 8L8 8L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
    </svg>
  );
}

/* === Section Frame Component === */

function SectionFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* Outer border */}
      <div className="absolute inset-0 rounded-2xl border border-white/[0.12] pointer-events-none z-0" />
      
      {/* Corner ticks */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#F2B900]/30 rounded-tl-lg pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#F2B900]/30 rounded-br-lg pointer-events-none z-0" />
      
      {/* Crosshair marker (top-right) */}
      <div className="absolute top-0 right-0 w-6 h-6 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3">
          <div className="absolute top-1/2 left-0 w-full h-px bg-[#F2B900]/20" />
          <div className="absolute left-1/2 top-0 w-px h-full bg-[#F2B900]/20" />
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 px-4 py-4 lg:px-8 lg:py-6">
        {children}
      </div>
    </div>
  );
}

/* === Card Variants === */

function HeroCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[20px] overflow-hidden ${className}`}>
      {/* Border gradient wrapper */}
      <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-[#F2B900]/30 via-[#F2B900]/10 to-[#F2B900]/30 p-[1px]">
        <div className="h-full w-full rounded-[20px] bg-[#0a0a0c]" />
      </div>
      {/* Card content with homepage-matching gradient */}
      <div 
        className="relative rounded-[20px] px-6 py-5 lg:px-8 lg:py-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] group hover:shadow-[0_24px_72px_rgba(0,0,0,0.95)] hover:-translate-y-0.5 transition-all duration-300"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(242,185,0,0.12) 0%, rgba(249,228,0,0.06) 30%, transparent 60%), linear-gradient(135deg, rgba(242,185,0,0.05) 0%, transparent 50%), #0a0a0c',
        }}
      >
        <div className="absolute inset-0 rounded-[20px] border border-[#F2B900]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        {children}
      </div>
    </div>
  );
}

function SecondaryCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-xl border border-white/[0.08] bg-[#0a0a0c] px-5 py-6 lg:px-6 lg:py-6 shadow-[0_8px_32px_rgba(0,0,0,0.8)] group hover:border-white/[0.12] hover:shadow-[0_12px_40px_rgba(0,0,0,0.9)] hover:-translate-y-0.5 transition-all duration-300 ${className}`}
    >
      <div className="relative">{children}</div>
    </div>
  );
}

/* === Connection Lines === */

function HorizontalConnector({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute top-1/2 -translate-y-1/2 h-px bg-[#F2B900]/22 pointer-events-none z-10 ${className}`} />
  );
}

function VerticalConnector({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute left-1/2 -translate-x-1/2 w-[1.5px] bg-[#F2B900]/18 pointer-events-none z-10 top-[10%] bottom-[10%] ${className}`} />
  );
}

/* === Animated Components === */

function RiskScoreAnimated({ score, className = "" }: { score: number; className?: string }) {
  const [displayScore, setDisplayScore] = React.useState(0);

  React.useEffect(() => {
    const duration = 400;
    const steps = 30;
    const increment = score / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  return <p className={`text-6xl font-semibold ${className}`}>{displayScore}</p>;
}

function RiskGaugeAnimated({ score, className = "" }: { score: number; className?: string }) {
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const duration = 400;
    const steps = 30;
    const increment = score / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setWidth(score);
        clearInterval(timer);
      } else {
        setWidth(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  return <div className={className} style={{ width: `${width}%` }} />;
}

/* === Sentiment & Recommendation Helpers === */

function getSentimentStyles(sentiment: string) {
  const sentimentLower = sentiment?.toLowerCase() || "";
  if (sentimentLower.includes("bull") || sentimentLower.includes("positive") || sentimentLower.includes("up")) {
    return {
      textColor: "text-emerald-400",
      accentBg: "bg-emerald-500/8",
      borderColor: "border-emerald-500/40",
      icon: <TrendingUp className="h-[18px] w-[18px] text-emerald-400" />,
    };
  }
  if (sentimentLower.includes("bear") || sentimentLower.includes("negative") || sentimentLower.includes("down")) {
    return {
      textColor: "text-red-400",
      accentBg: "bg-red-500/8",
      borderColor: "border-red-500/40",
      icon: <TrendingDown className="h-[18px] w-[18px] text-red-400" />,
    };
  }
  return {
    textColor: "text-amber-300",
    accentBg: "bg-amber-500/6",
    borderColor: "border-amber-500/30",
    icon: <Activity className="h-[18px] w-[18px] text-amber-300" />,
  };
}

function getRecommendationStyles(recommendation: string) {
  const recLower = recommendation?.toLowerCase() || "";
  if (recLower.includes("buy") || recLower.includes("long") || recLower.includes("accumulate")) {
    return {
      textColor: "text-emerald-400",
      accentBg: "bg-emerald-500/6",
      borderColor: "border-emerald-500/35",
      icon: <Check className="h-[18px] w-[18px] text-emerald-400" />,
    };
  }
  if (recLower.includes("avoid") || recLower.includes("exit") || recLower.includes("sell")) {
    return {
      textColor: "text-red-400",
      accentBg: "bg-red-500/6",
      borderColor: "border-red-500/35",
      icon: <X className="h-[18px] w-[18px] text-red-400" />,
    };
  }
  // Hold / Monitor / Neutral
  return {
    textColor: "text-[#F2B900]",
    accentBg: "bg-[#F2B900]/6",
    borderColor: "border-[#F2B900]/35",
    icon: <AlertTriangle className="h-[18px] w-[18px] text-[#F2B900]" />,
  };
}

/* === Mini Chat Panel === */

function MiniChatPanel({ tokenAddress }: { tokenAddress: string }) {
  const [question, setQuestion] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    const encodedQuestion = encodeURIComponent(question.trim());
    const encodedToken = encodeURIComponent(tokenAddress);
    router.push(`/chat?token=${encodedToken}&q=${encodedQuestion}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <SecondaryCard className={`mt-6 group ${isFocused ? 'border-[#F2B900]/30' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.18] bg-gradient-to-br from-[#F2B900]/10 to-transparent flex-shrink-0 group-hover:from-[#F2B900]/15 transition-colors">
          <ScanaiAiIcon className="h-5 w-5 text-[#F2B900]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white mb-3">Chat with SCANAI about this token</p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about this token's risk, momentum or liquidity…"
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none transition-all ${
                isFocused 
                  ? 'border-[#F2B900]/50 bg-[#F2B900]/5' 
                  : 'border-white/[0.18] bg-black/90 group-hover:border-white/[0.25]'
              }`}
            />
            <button
              type="submit"
              className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all ${
                isFocused || question.trim()
                  ? 'bg-[#F2B900]/15 border-[#F2B900]/50 text-[#F2B900] hover:bg-[#F2B900]/20'
                  : 'bg-[#F2B900]/10 border-[#F2B900]/40 text-[#F2B900]/80 hover:bg-[#F2B900]/15'
              }`}
            >
              Ask in AI Chat
            </button>
          </form>
        </div>
      </div>
    </SecondaryCard>
  );
}

/* === Reusable Components === */

function Pill({
  variant = "neutral",
  children,
  className = "",
}: {
  variant?: "primary" | "success" | "warning" | "danger" | "neutral";
  children: React.ReactNode;
  className?: string;
}) {
  const variants = {
    primary: "border-[#F2B900]/40 bg-[#F2B900]/10 text-[#F2B900]",
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    warning: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    danger: "border-red-500/40 bg-red-500/10 text-red-300",
    neutral: "border-white/20 bg-white/5 text-white/70",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

function MetricLabel({
  icon,
  label,
  className = "",
}: {
  icon?: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/50 ${className}`}>
      {icon && <span className="text-white/40">{icon}</span>}
      {label}
    </div>
  );
}

function SectionHeader({
  overline,
  subtitle,
  icon,
  className = "",
  accentWord,
}: {
  overline: string;
  subtitle: string;
  icon?: React.ReactNode;
  className?: string;
  accentWord?: string;
}) {
  const words = overline.split(" ");
  const renderOverline = () => {
    if (accentWord) {
      return words.map((word, idx) => {
        const shouldAccent = word.toLowerCase() === accentWord.toLowerCase() || 
                            (accentWord === "second" && idx === 1);
        return (
          <span key={idx}>
            {shouldAccent ? (
              <span className="text-[#F2B900]">{word}</span>
            ) : (
              word
            )}
            {idx < words.length - 1 && " "}
          </span>
        );
      });
    }
    return overline;
  };

  return (
    <div className={`mb-5 ${className}`} style={{ marginTop: '20px' }}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-white/40">{icon}</span>}
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/50">
          {renderOverline()}
        </p>
      </div>
      <p className="mt-2 text-sm text-white/60 leading-relaxed max-w-2xl">
        {subtitle}
      </p>
    </div>
  );
}

// Legacy AnalysisCard - keeping for backward compatibility, but prefer HeroCard/SecondaryCard
function AnalysisCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SecondaryCard className={className}>
      {children}
    </SecondaryCard>
  );
}

// HealthMetric removed - replaced with bento grid design
