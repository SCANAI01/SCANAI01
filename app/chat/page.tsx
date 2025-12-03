"use client";
import { useState, memo, useCallback, useEffect } from "react";
import type React from "react";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

import {
  Send,
  TrendingUp,
  Shield,
  Search,
  Zap,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Plus,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Copy,
  Check,
  BarChart3,
  Target,
  Activity,
  Brain,
  Home,
  DollarSign,
  LineChart,
  FileCode,
  RefreshCw,
  Newspaper,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

function processAIText(text: string): React.ReactNode {
  // Strip all markdown formatting
  const processed = text
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]$$[^)]+$$/g, "$1")
    // Remove markdown images ![alt](url)
    .replace(/!\[[^\]]*\]$$[^)]+$$/g, "")
    // Remove bullet points and numbered lists
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    // Remove headers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    // Clean up extra whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Convert plain URLs to clickable links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = processed.split(urlRegex);

  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#F3BA2F] hover:underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

const quickActionCategories = [
  {
    title: "Market Intelligence",
    icon: BarChart3,
    actions: [
      {
        icon: TrendingUp,
        label: "Trending Tokens",
        prompt: "Get trending tokens on BSC",
        sendDirect: true,
      },
      {
        icon: Zap,
        label: "Boosted Tokens",
        prompt: "Show boosted tokens on DexScreener",
        sendDirect: true,
      },
      {
        icon: RefreshCw,
        label: "Updated Tokens",
        prompt: "Show latest updated tokens on BSC",
        sendDirect: true,
      },
      {
        icon: DollarSign,
        label: "BNB Price",
        prompt: "Get BNB price",
        sendDirect: true,
      },
    ],
  },
  {
    title: "Token Analysis",
    icon: Target,
    actions: [
      {
        icon: Search,
        label: "Search Token",
        prompt: "Search for token: ",
        sendDirect: false,
      },
      {
        icon: Activity,
        label: "Analyze Token",
        prompt: "Analyze token: ",
        sendDirect: false,
      },
      {
        icon: LineChart,
        label: "Chart Analysis",
        prompt: "Give me professional chart analysis for: ",
        sendDirect: false,
      },
      {
        icon: LineChart,
        label: "BNB Chart Analysis",
        prompt:
          "Give me professional chart analysis for: 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        sendDirect: true,
      },
    ],
  },
  {
    title: "Security",
    icon: Shield,
    actions: [
      {
        icon: Shield,
        label: "Security Check",
        prompt: "Check security for: ",
        sendDirect: false,
      },
    ],
  },
];

function formatNumber(num: number): string {
  if (!num || isNaN(num)) return "$0";
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatPrice(price: number): string {
  if (!price || isNaN(price)) return "$0";
  if (price < 0.00001) return `$${price.toExponential(2)}`;
  if (price < 0.01) return `$${price.toFixed(8)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

// Copy button component
const CopyButton = memo(function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={copy}
      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
      aria-label="Copy"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-white/40" />
      )}
    </button>
  );
});

// Token Card Component
const TokenCard = memo(function TokenCard({ token }: { token: any }) {
  const logoUrl = token.logo || token.icon || null;

  return (
    <div className="group relative bg-gradient-to-br from-white/[0.02] via-white/[0.01] to-transparent border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-300 backdrop-blur-sm hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#F2B900]/0 via-[#F2B900]/0 to-[#F2B900]/0 group-hover:from-[#F2B900]/5 group-hover:via-[#F2B900]/0 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
      
      <div className="relative flex items-start gap-3">
        <div className="relative w-12 h-12 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-white/[0.15] transition-colors">
          {logoUrl ? (
            <img
              src={logoUrl || "/placeholder.svg"}
              alt={token.symbol}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement!.innerHTML = `<span class="text-[#F2B900] font-semibold text-base">${
                  (token.symbol || "?")[0]
                }</span>`;
              }}
            />
          ) : (
            <span className="text-[#F2B900] font-semibold text-base">
              {(token.symbol || "?")[0]}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-semibold text-white text-base tracking-tight break-words">
              {token.name || "Unknown"}
            </span>
            <span className="text-xs text-white/50 uppercase tracking-wider font-medium whitespace-nowrap">
              {token.symbol}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-white font-semibold text-base">
              $
              {token.priceUsd < 0.0001
                ? token.priceUsd?.toFixed(8)
                : token.priceUsd?.toFixed(4) || "0"}
            </span>
            {token.priceChange24h !== undefined && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${
                  token.priceChange24h >= 0 
                    ? "text-emerald-300 bg-emerald-500/15" 
                    : "text-red-300 bg-red-500/15"
                }`}
              >
                {token.priceChange24h >= 0 ? "↑" : "↓"}{" "}
                {Math.abs(token.priceChange24h).toFixed(2)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-white/60 flex-wrap">
            {token.volume24h > 0 && (
              <span className="whitespace-nowrap">
                Vol: <span className="text-white font-medium">{formatNumber(token.volume24h)}</span>
              </span>
            )}
            {token.liquidityUsd > 0 && (
              <span className="whitespace-nowrap">
                Liq: <span className="text-white font-medium">{formatNumber(token.liquidityUsd)}</span>
              </span>
            )}
          </div>
          {token.totalBoosts > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-[#F3BA2F]">
              <Zap className="w-3 h-3" />
              <span>{token.totalBoosts} boosts</span>
            </div>
          )}
        </div>
      </div>
      {token.address && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-white/50 font-mono tracking-tight break-all text-[10px]">
            {token.address}
          </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => navigator.clipboard.writeText(token.address)}
                className="p-2 hover:bg-white/[0.05] rounded-lg transition-all duration-200 border border-transparent hover:border-white/[0.08] group/btn min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Copy address"
            >
                <Copy className="w-4 h-4 text-white/40 group-hover/btn:text-white/70 transition-colors" />
            </button>
            <a
              href={`https://dexscreener.com/bsc/${token.address}`}
              target="_blank"
              rel="noopener noreferrer"
                className="p-2 hover:bg-white/[0.05] rounded-lg transition-all duration-200 border border-transparent hover:border-white/[0.08] group/btn min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="View on DexScreener"
            >
                <ExternalLink className="w-4 h-4 text-white/40 group-hover/btn:text-white/70 transition-colors" />
            </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Security Card Component
const SecurityCard = memo(function SecurityCard({
  security,
}: {
  security: any;
}) {
  const isHoneypot = security.isHoneypot;
  const hasHighTax = Number.parseFloat(security.sellTax || "0") > 10;

  return (
    <div
      className={`rounded-xl p-4 border ${
        isHoneypot
          ? "bg-red-500/10 border-red-500/30"
          : "bg-emerald-500/10 border-emerald-500/30"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        {isHoneypot ? (
          <AlertTriangle className="w-6 h-6 text-red-400" />
        ) : (
          <CheckCircle className="w-6 h-6 text-emerald-400" />
        )}
        <span
          className={`font-semibold ${
            isHoneypot ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {isHoneypot ? "HONEYPOT DETECTED" : "Token Appears Safe"}
        </span>
      </div>
      {security.reason && (
        <p className="text-sm text-gray-300 mb-3">{security.reason}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black/20 rounded-lg p-2">
          <span className="text-xs text-gray-400">Buy Tax</span>
          <p
            className={`text-sm font-medium ${
              Number.parseFloat(security.buyTax || "0") > 10
                ? "text-yellow-400"
                : "text-white"
            }`}
          >
            {security.buyTax || "0"}%
          </p>
        </div>
        <div className="bg-black/20 rounded-lg p-2">
          <span className="text-xs text-gray-400">Sell Tax</span>
          <p
            className={`text-sm font-medium ${
              hasHighTax ? "text-red-400" : "text-white"
            }`}
          >
            {security.sellTax || "0"}%
          </p>
        </div>
      </div>
    </div>
  );
});

// Add NewsCard component
const NewsCard = ({ result }: { result: any }) => {
  const news = result?.news || [];
  const hasBscNews = result?.hasBscNews;

  if (news.length === 0) {
    return (
      <div className="bg-[#1a1a2e]/80 backdrop-blur-sm rounded-xl p-4 border border-amber-500/10">
        <p className="text-gray-400">No news available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center gap-2 mb-3 sm:mb-4 flex-wrap">
        <Newspaper className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
        <span className="font-medium text-white text-sm sm:text-base">
          {hasBscNews ? "BSC & BNB News" : "Crypto News"}
        </span>
        <span className="text-[10px] sm:text-xs text-gray-500">({news.length} articles)</span>
      </div>

      {news.map((item: any, index: number) => (
        <a
          key={item.id || index}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-[#1a1a2e]/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-amber-500/10 hover:border-amber-500/30 transition-all group"
        >
          <div className="flex gap-3 sm:gap-4">
            {item.imageUrl && (
              <img
                src={item.imageUrl || "/placeholder.svg"}
                alt=""
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-medium text-xs sm:text-sm group-hover:text-amber-500 transition-colors line-clamp-2 break-words">
                {item.title}
              </h4>
              <p className="text-gray-400 text-[10px] sm:text-xs mt-1 line-clamp-2 break-words">
                {item.body}
              </p>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-2 text-[10px] sm:text-xs text-gray-500 flex-wrap">
                <span className="text-amber-500/70">{item.source}</span>
                <span>•</span>
                <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

// Price Card Component
const PriceCard = memo(function PriceCard({ prices }: { prices: any }) {
  return (
    <div className="bg-gradient-to-br from-[#F3BA2F]/10 to-transparent border border-[#F3BA2F]/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-[#F3BA2F]" />
        <span className="font-medium text-white">BSC Token Prices</span>
      </div>
      <div className="grid gap-3">
        {prices.map((token: any, i: number) => {
          const isPositive = (token.priceChange24h || 0) >= 0;
          return (
            <div
              key={i}
              className="flex items-center justify-between bg-black/20 rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                {token.logo ? (
                  <Image
                    src={token.logo || "/placeholder.svg"}
                    alt={token.symbol}
                    width={32}
                    height={32}
                    className="rounded-full"
                    unoptimized
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#F3BA2F]/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-[#F3BA2F]">
                      {token.symbol?.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-white">{token.symbol}</span>
                  <p className="text-xs text-gray-400">{token.name}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-medium text-white">
                  {formatPrice(token.priceUsd)}
                </span>
                <p
                  className={`text-xs ${
                    isPositive ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {token.priceChange24h?.toFixed(2) || 0}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// Gas Price Card Component
// const GasPriceCard = memo(function GasPriceCard({ gasPrice }: { gasPrice: any }) {
//   return (
//     <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-xl p-4">
//       <div className="flex items-center gap-2 mb-4">
//         <Fuel className="w-5 h-5 text-blue-400" />
//         <span className="font-medium text-white">BSC Gas Prices</span>
//       </div>
//       <div className="grid grid-cols-3 gap-3">
//         <div className="bg-black/20 rounded-lg p-3 text-center">
//           <span className="text-xs text-gray-500 block mb-1">Safe</span>
//           <span className="text-lg font-bold text-emerald-400">{gasPrice.safe}</span>
//           <span className="text-xs text-gray-500 block">Gwei</span>
//         </div>
//         <div className="bg-black/20 rounded-lg p-3 text-center">
//           <span className="text-xs text-gray-500 block mb-1">Standard</span>
//           <span className="text-lg font-bold text-yellow-400">{gasPrice.proposed}</span>
//           <span className="text-xs text-gray-500 block">Gwei</span>
//         </div>
//         <div className="bg-black/20 rounded-lg p-3 text-center">
//           <span className="text-xs text-gray-500 block mb-1">Fast</span>
//           <span className="text-lg font-bold text-red-400">{gasPrice.fast}</span>
//           <span className="text-xs text-gray-500 block">Gwei</span>
//         </div>
//       </div>
//     </div>
//   )
// })

// Contract Info Card
const ContractInfoCard = memo(function ContractInfoCard({
  contract,
}: {
  contract: any;
}) {
  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-xl p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <FileCode className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
        <span className="font-medium text-white text-sm sm:text-base">Contract Info</span>
      </div>
      <div className="space-y-2 sm:space-y-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
          <span className="text-xs sm:text-sm text-gray-400">Contract Name</span>
          <span className="text-xs sm:text-sm text-white break-words text-right sm:text-left">{contract.contractName}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
          <span className="text-xs sm:text-sm text-gray-400">Verified</span>
          <span
            className={`text-xs sm:text-sm ${
              contract.isVerified ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {contract.isVerified ? "Yes" : "No"}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
          <span className="text-xs sm:text-sm text-gray-400">Compiler</span>
          <span className="text-xs sm:text-sm text-white break-words text-right sm:text-left">{contract.compilerVersion}</span>
        </div>
        {contract.proxy && (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
            <span className="text-xs sm:text-sm text-gray-400">Proxy</span>
            <span className="text-xs sm:text-sm text-yellow-400">Yes</span>
          </div>
        )}
      </div>
    </div>
  );
});

// TokenAnalysisSummaryCard component START
const TokenAnalysisSummaryCard = memo(function TokenAnalysisSummaryCard({
  analysis,
}: {
  analysis: any;
}) {
  const getRiskColor = (level: string) => {
    const l = level?.toLowerCase() || "";
    if (l === "low")
      return {
        bg: "bg-emerald-500/20",
        text: "text-emerald-400",
        border: "border-emerald-500/30",
      };
    if (l === "moderate")
      return {
        bg: "bg-yellow-500/20",
        text: "text-yellow-400",
        border: "border-yellow-500/30",
      };
    if (l === "elevated" || l === "high")
      return {
        bg: "bg-red-500/20",
        text: "text-red-400",
        border: "border-red-500/30",
      };
    return {
      bg: "bg-gray-500/20",
      text: "text-gray-400",
      border: "border-gray-500/30",
    };
  };

  const getMomentumColor = (label: string) => {
    const l = label?.toLowerCase() || "";
    if (l.includes("bullish")) return "text-emerald-400";
    if (l.includes("bearish")) return "text-red-400";
    return "text-yellow-400";
  };

  const risk = analysis.risk || {};
  const market = analysis.market || {};
  const technical = analysis.technical || {};
  const commentary = analysis.commentary || {};
  const token = analysis.token || {};
  const profile = analysis.profile || {};
  const survivalAnalysis = analysis.survivalAnalysis || {};

  const riskColors = getRiskColor(risk.level);

  const tokenAgeDays = risk.tokenAgeDays || survivalAnalysis.tokenAgeDays || 0;

  const survivalProbability =
    survivalAnalysis.survivalProbability ||
    survivalAnalysis.probability ||
    "N/A";

  const marketHealthLabel =
    technical.marketHealth?.consistencyLabel ||
    technical.marketHealth?.label ||
    "N/A";

  const logoUrl = profile?.icon || analysis.logo || null;

  return (
    <div className="bg-gradient-to-br from-[#12151a] via-[#0f1216] to-[#0a0f0f] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-[#F3BA2F]/10 via-transparent to-transparent p-3 sm:p-4 md:p-5 border-b border-white/[0.06]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            {logoUrl ? (
              <img
                src={logoUrl || "/placeholder.svg"}
                alt={token.symbol}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl ring-2 ring-white/10 flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#F3BA2F]/20 to-[#F3BA2F]/5 flex items-center justify-center ring-2 ring-[#F3BA2F]/20 flex-shrink-0">
                <Brain className="w-6 h-6 sm:w-7 sm:h-7 text-[#F3BA2F]" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-bold text-white text-lg sm:text-xl tracking-tight">
                Token Analysis
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 truncate">
                {token.name || "Unknown"} ({token.symbol || "???"})
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <p className="text-xl sm:text-2xl font-bold text-white">
              {formatPrice(market.priceUsd)}
            </p>
            <p
              className={`text-xs sm:text-sm font-medium ${
                market.priceChange24hPct >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {market.priceChange24hPct >= 0 ? "+" : ""}
              {market.priceChange24hPct?.toFixed(2) || 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 border-b border-white/[0.06] bg-black/20">
        {/* Risk Score */}
        <div className="space-y-1">
          <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">
            Risk Score
          </span>
          <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
            <span className={`text-xl sm:text-2xl font-bold ${riskColors.text}`}>
              {risk.score || 0}
            </span>
            <span
              className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase ${riskColors.bg} ${riskColors.border} border`}
            >
              {risk.level || "Unknown"}
            </span>
          </div>
        </div>

        {/* Momentum */}
        <div className="space-y-1">
          <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">
            Momentum
          </span>
          <p
            className={`text-base sm:text-lg font-bold ${getMomentumColor(
              technical.momentum?.label
            )}`}
          >
            {technical.momentum?.label || "N/A"}
          </p>
        </div>

        {/* Volatility */}
        <div className="space-y-1">
          <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">
            Volatility
          </span>
          <p className="text-base sm:text-lg font-bold text-white">
            {technical.volatility?.label || "N/A"}
          </p>
        </div>

        {/* Market Health - CHANGED to use marketHealthLabel */}
        <div className="space-y-1">
          <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">
            Market Health
          </span>
          <p className="text-base sm:text-lg font-bold text-white break-words">{marketHealthLabel}</p>
        </div>

        {/* Survival - CHANGED to use survivalProbability */}
        <div className="space-y-1">
          <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">
            Survival
          </span>
          <p className="text-base sm:text-lg font-bold text-white break-words">{survivalProbability}</p>
        </div>

        {/* Sentiment */}
        <div className="space-y-1">
          <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">
            Sentiment
          </span>
          <p
            className={`text-base sm:text-lg font-bold ${
              commentary.sentiment === "Bullish"
                ? "text-emerald-400"
                : commentary.sentiment === "Bearish"
                ? "text-red-400"
                : "text-yellow-400"
            }`}
          >
            {commentary.sentiment || "N/A"}
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Market Data */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-black/30 rounded-xl p-2.5 sm:p-3">
            <span className="text-[10px] sm:text-xs text-gray-500">Volume 24h</span>
            <p className="text-base sm:text-lg font-bold text-white break-words">
              {formatNumber(market.volume24hUsd)}
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-2.5 sm:p-3">
            <span className="text-[10px] sm:text-xs text-gray-500">Liquidity</span>
            <p className="text-base sm:text-lg font-bold text-white break-words">
              {formatNumber(market.liquidityUsd)}
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-2.5 sm:p-3">
            <span className="text-[10px] sm:text-xs text-gray-500">FDV</span>
            <p className="text-base sm:text-lg font-bold text-white break-words">
              {formatNumber(market.fdv)}
            </p>
          </div>
          {/* CHANGED to use tokenAgeDays variable */}
          <div className="bg-black/30 rounded-xl p-2.5 sm:p-3">
            <span className="text-[10px] sm:text-xs text-gray-500">Token Age</span>
            <p className="text-base sm:text-lg font-bold text-white break-words">
              {tokenAgeDays > 0 ? `${tokenAgeDays.toFixed(1)} days` : "< 1 day"}
            </p>
          </div>
        </div>

        {/* Buy/Sell Pressure */}
        <div className="bg-black/30 rounded-xl p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-2">
            <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">
              Order Flow (24h)
            </span>
            <span className="text-xs sm:text-sm text-white">
              {technical.pressure?.label || "Balanced"}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <div className="flex-1">
              <div className="h-2.5 sm:h-3 bg-gray-800 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                  style={{
                    width: `${
                      market.txns24h
                        ? (market.txns24h.buys /
                            (market.txns24h.buys + market.txns24h.sells)) *
                          100
                        : 50
                    }%`,
                  }}
                />
                <div className="h-full bg-gradient-to-r from-red-400 to-red-500 flex-1" />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <span className="text-emerald-400">
                {market.txns24h?.buys || 0} buys
              </span>
              <span className="text-red-400">
                {market.txns24h?.sells || 0} sells
              </span>
            </div>
          </div>
        </div>

        {/* Risk Flags */}
        {risk.flags && risk.flags.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-red-400">
                Risk Flags
              </span>
            </div>
            <div className="space-y-1">
              {risk.flags.map((flag: string, i: number) => (
                <p key={i} className="text-xs sm:text-sm text-gray-300 break-words">
                  • {flag}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation */}
        <div
          className={`rounded-xl p-3 sm:p-4 border ${
            commentary.recommendation === "Buy"
              ? "bg-emerald-500/10 border-emerald-500/20"
              : commentary.recommendation === "Sell" ||
                commentary.recommendation === "Avoid"
              ? "bg-red-500/10 border-red-500/20"
              : "bg-yellow-500/10 border-yellow-500/20"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-lg sm:text-xl font-bold ${
                commentary.recommendation === "Buy"
                  ? "text-emerald-400"
                  : commentary.recommendation === "Sell" ||
                    commentary.recommendation === "Avoid"
                  ? "text-red-400"
                  : "text-yellow-400"
              }`}
            >
              {commentary.recommendation || "Hold"}
            </span>
          </div>
          {commentary.recommendationDetail && (
            <p className="text-xs sm:text-sm text-gray-300 break-words">
              {commentary.recommendationDetail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
// TokenAnalysisSummaryCard component END

// Professional Chart Analysis Card
const ChartAnalysisCard = memo(function ChartAnalysisCard({
  analysis,
}: {
  analysis: any;
}) {
  const getTrendColor = (trend: string) => {
    if (trend?.toLowerCase().includes("bullish")) return "text-emerald-400";
    if (trend?.toLowerCase().includes("bearish")) return "text-red-400";
    return "text-yellow-400";
  };

  const getRecommendationStyle = (rec: string) => {
    if (rec?.toLowerCase().includes("buy"))
      return "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400";
    if (
      rec?.toLowerCase().includes("sell") ||
      rec?.toLowerCase().includes("avoid")
    )
      return "from-red-500/20 to-red-500/5 border-red-500/30 text-red-400";
    return "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-400";
  };

  const indicators = analysis.technicalIndicators || {};
  const priceAction = analysis.priceAction || {};
  const volumeData = analysis.volumeAnalysis || {};
  const orderFlowData = analysis.orderFlow || {};
  const recommendationData = analysis.recommendation || {};

  return (
    <div className="bg-gradient-to-br from-[#12151a] via-[#0f1216] to-[#0a0f0f] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
      {/* Premium Header */}
      <div className="relative bg-gradient-to-r from-[#F3BA2F]/10 via-transparent to-transparent p-5 border-b border-white/[0.06]">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            {analysis.logo ? (
              <Image
                src={analysis.logo || "/placeholder.svg"}
                alt={analysis.tokenSymbol}
                width={48}
                height={48}
                className="rounded-xl ring-2 ring-white/10"
                unoptimized
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F3BA2F]/20 to-[#F3BA2F]/5 flex items-center justify-center ring-2 ring-[#F3BA2F]/20">
                <LineChart className="w-6 h-6 text-[#F3BA2F]" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-white text-xl tracking-tight">
                Technical Analysis
              </h3>
              <p className="text-sm text-gray-400">
                {analysis.tokenName} ({analysis.tokenSymbol})
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white tracking-tight">
              {formatPrice(analysis.priceUsd)}
            </p>
            <div className="flex items-center gap-1.5 justify-end">
              <span
                className={`text-xs font-medium ${
                  analysis.dataQuality === "real"
                    ? "text-emerald-400"
                    : "text-yellow-400"
                }`}
              >
                {analysis.dataQuality === "real"
                  ? "Live OHLCV"
                  : "Momentum Data"}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {/* Recommendation Banner */}
        <div
          className={`relative overflow-hidden rounded-xl p-3 sm:p-4 bg-gradient-to-r ${getRecommendationStyle(
            recommendationData.action
          )} border`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex-1 min-w-0">
              <span className="text-xl sm:text-2xl font-bold block">
                {recommendationData.action || "Hold"}
              </span>
              <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2">
                {recommendationData.reasoning?.map((r: string, i: number) => (
                  <span
                    key={i}
                    className="text-[10px] sm:text-xs bg-black/30 backdrop-blur px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md break-words"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
              <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider block">
                Confidence
              </span>
              <p className="text-base sm:text-lg font-semibold">
                {recommendationData.confidence || "Medium"}
              </p>
            </div>
          </div>
        </div>

        {/* Indicators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* RSI */}
          <div className="bg-black/40 backdrop-blur rounded-xl p-3 sm:p-4 border border-white/[0.05]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">
                RSI ({indicators.rsi?.period || 14}) ·{" "}
                {analysis.timeframe || "1h"}
              </span>
              <span
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${
                  indicators.rsi?.signal === "Overbought"
                    ? "bg-red-500/20 text-red-400"
                    : indicators.rsi?.signal === "Oversold"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : indicators.rsi?.signal === "Bullish"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : indicators.rsi?.signal === "Bearish"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-gray-500/20 text-gray-400"
                }`}
              >
                {indicators.rsi?.signal || "N/A"}
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              {indicators.rsi?.value !== null &&
              indicators.rsi?.value !== undefined
                ? indicators.rsi.value.toFixed(1)
                : "—"}
            </p>
            <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
              {indicators.rsi?.value !== null &&
              indicators.rsi?.value !== undefined ? (
                <div
                  className={`h-full rounded-full transition-all ${
                    indicators.rsi.value > 70
                      ? "bg-gradient-to-r from-red-500 to-red-400"
                      : indicators.rsi.value < 30
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      : "bg-gradient-to-r from-yellow-500 to-yellow-400"
                  }`}
                  style={{ width: `${Math.min(100, indicators.rsi.value)}%` }}
                />
              ) : (
                <div className="h-full w-full bg-gray-700/50" />
              )}
            </div>
          </div>

          {/* MACD */}
          <div className="bg-black/40 backdrop-blur rounded-xl p-3 sm:p-4 border border-white/[0.05]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">
                MACD · {analysis.timeframe || "1h"}
              </span>
              <span
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${
                  indicators.macd?.interpretation === "Bullish"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : indicators.macd?.interpretation === "Bearish"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-gray-500/20 text-gray-400"
                }`}
              >
                {indicators.macd?.interpretation || "Neutral"}
              </span>
            </div>
            <p
              className={`text-xl sm:text-2xl font-bold ${
                (indicators.macd?.histogram || 0) >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {indicators.macd?.histogram?.toFixed(8) || "0.00000000"}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Histogram</p>
          </div>

          {/* Bollinger */}
          <div className="bg-black/40 backdrop-blur rounded-xl p-3 sm:p-4 border border-white/[0.05]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">
                Bollinger · {analysis.timeframe || "1h"}
              </span>
              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium bg-[#F3BA2F]/20 text-[#F3BA2F]">
                {indicators.bollingerBands?.percentB?.toFixed(0) || 50}%B
              </span>
            </div>
            <div className="space-y-1 sm:space-y-1.5 text-[10px] sm:text-xs">
              <div className="flex justify-between">
                <span className="text-red-400">Upper</span>
                <span className="text-white font-medium break-words">
                  {formatPrice(indicators.bollingerBands?.upper)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Middle</span>
                <span className="text-white font-medium break-words">
                  {formatPrice(indicators.bollingerBands?.middle)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400">Lower</span>
                <span className="text-white font-medium break-words">
                  {formatPrice(indicators.bollingerBands?.lower)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stoch RSI & ADX */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-black/40 backdrop-blur rounded-xl p-3 sm:p-4 border border-white/[0.05]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">
                Stoch RSI
              </span>
              <span
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${
                  indicators.stochRSI?.signal === "Overbought"
                    ? "bg-red-500/20 text-red-400"
                    : indicators.stochRSI?.signal === "Oversold"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-gray-500/20 text-gray-400"
                }`}
              >
                {indicators.stochRSI?.signal || "Neutral"}
              </span>
            </div>
            <div className="flex gap-4 sm:gap-6">
              <div>
                <span className="text-[10px] sm:text-xs text-gray-500">%K</span>
                <p className="text-lg sm:text-xl font-bold text-white">
                  {indicators.stochRSI?.k?.toFixed(1) || "50"}
                </p>
              </div>
              <div>
                <span className="text-[10px] sm:text-xs text-gray-500">%D</span>
                <p className="text-lg sm:text-xl font-bold text-white">
                  {indicators.stochRSI?.d?.toFixed(1) || "50"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur rounded-xl p-3 sm:p-4 border border-white/[0.05]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">
                ADX Trend
              </span>
              <span
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${
                  (indicators.adx?.value || 0) > 25
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-gray-500/20 text-gray-400"
                }`}
              >
                {indicators.adx?.signal || "Weak"}
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">
              {indicators.adx?.value?.toFixed(1) || "25"}
            </p>
          </div>
        </div>

        {/* Trend & Price Levels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-black/40 backdrop-blur rounded-xl p-3 sm:p-4 border border-white/[0.05]">
            <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium block mb-2 sm:mb-3">
              Price Momentum
            </span>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span
                className={`text-lg sm:text-xl font-bold ${getTrendColor(
                  priceAction.trend
                )}`}
              >
                {priceAction.trend || "Neutral"}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-400">
                {priceAction.trendStrength}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {[
                { label: "5m", value: priceAction.momentum?.m5 },
                { label: "1h", value: priceAction.momentum?.h1 },
                { label: "6h", value: priceAction.momentum?.h6 },
                { label: "24h", value: priceAction.momentum?.h24 },
              ].map((m, i) => (
                <div
                  key={i}
                  className="text-center bg-black/30 rounded-lg py-1.5 sm:py-2"
                >
                  <span className="text-[10px] sm:text-xs text-gray-500 block">{m.label}</span>
                  <span
                    className={`text-xs sm:text-sm font-semibold ${
                      (m.value || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {m.value != null
                      ? `${m.value >= 0 ? "+" : ""}${m.value.toFixed(1)}%`
                      : "N/A"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur rounded-xl p-3 sm:p-4 border border-white/[0.05]">
            <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium block mb-2 sm:mb-3">
              Key Levels
            </span>
            <div className="space-y-2 sm:space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-xs text-red-400 font-medium">
                  Resistance
                </span>
                <span className="text-xs sm:text-sm font-bold text-white break-words">
                  {formatPrice(priceAction.resistance)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#F3BA2F]/10 -mx-1 sm:-mx-2 px-1 sm:px-2 py-1 rounded">
                <span className="text-[10px] sm:text-xs text-[#F3BA2F] font-medium">
                  Current
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#F3BA2F] break-words">
                  {formatPrice(analysis.priceUsd)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-xs text-emerald-400 font-medium">
                  Support
                </span>
                <span className="text-xs sm:text-sm font-bold text-white break-words">
                  {formatPrice(priceAction.support)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Volume & Order Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-black/40 backdrop-blur rounded-xl p-3 sm:p-4 border border-white/[0.05]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">
                Volume 24h
              </span>
              <span
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${
                  volumeData.signal === "Very High" ||
                  volumeData.signal === "High"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : volumeData.signal === "Low"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-gray-500/20 text-gray-400"
                }`}
              >
                {volumeData.signal || "Normal"}
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white break-words">
              {formatNumber(volumeData.volume24h)}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1 break-words">
              Liquidity: {formatNumber(volumeData.liquidity)}
            </p>
          </div>

          <div className="bg-black/40 backdrop-blur rounded-xl p-3 sm:p-4 border border-white/[0.05]">
            <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium block mb-2 sm:mb-3">
              Order Flow
            </span>
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <div className="flex-1 h-2.5 sm:h-3 bg-red-500/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                  style={{ width: `${orderFlowData.buyPressure || 50}%` }}
                />
              </div>
              <span className="text-xs sm:text-sm font-bold text-white w-10 sm:w-12 text-right">
                {orderFlowData.buyPressure?.toFixed(0) || 50}%
              </span>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs">
              <span className="text-emerald-400 font-medium">
                {orderFlowData.buys || 0} buys
              </span>
              <span className="text-red-400 font-medium">
                {orderFlowData.sells || 0} sells
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ChartEmbedCard component
function ChartEmbedCard({ chart }: { chart: any }) {
  if (chart.error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
        <p className="text-red-400">{chart.error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#1a1a1f] to-[#121a1a] rounded-2xl border border-[#2a2a35] overflow-hidden">
      <div className="p-4 border-b border-[#2a2a35] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#F3BA2F]/10 rounded-xl">
            <LineChart className="w-5 h-5 text-[#F3BA2F]" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{chart.tokenName}</h3>
            <p className="text-sm text-gray-400">
              {chart.tokenSymbol} Live Chart
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-white">
            {formatPrice(chart.priceUsd)}
          </p>
          <p
            className={`text-sm ${
              chart.priceChange24h >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {chart.priceChange24h >= 0 ? "+" : ""}
            {chart.priceChange24h?.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="relative w-full h-[400px] bg-[#0d0d12]">
        <iframe
          src={chart.chartUrl}
          className="absolute inset-0 w-full h-full border-0"
          title={`${chart.tokenSymbol} Chart`}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      <div className="p-3 border-t border-[#2a2a35] flex items-center justify-between">
        <p className="text-xs text-gray-500">Chart by DEXTools</p>
        <a
          href={chart.dexScreenerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#F3BA2F] hover:underline flex items-center gap-1"
        >
          View on DexScreener <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// TokenRecommendationCard component
function TokenRecommendationCard({ data }: { data: any }) {
  if (data.error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
        <p className="text-red-400">{data.error}</p>
      </div>
    );
  }

  const { recommended, alternatives, reasoning } = data;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-[#F3BA2F]/10 to-[#1a1a1f] rounded-2xl border border-[#F3BA2F]/30 overflow-hidden">
        <div className="p-4 border-b border-[#F3BA2F]/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-[#F3BA2F]/20 rounded-lg">
              <Target className="w-4 h-4 text-[#F3BA2F]" />
            </div>
            <span className="text-[#F3BA2F] font-semibold text-sm">
              TOP PICK
            </span>
          </div>
          <div className="flex items-center gap-3">
            {recommended.logo ? (
              <Image
                src={recommended.logo || "/placeholder.svg"}
                alt={recommended.symbol}
                width={48}
                height={48}
                className="rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#F3BA2F]/20 flex items-center justify-center text-[#F3BA2F] font-bold">
                {recommended.symbol?.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-bold text-white text-lg">
                {recommended.name}
              </h3>
              <p className="text-gray-400">{recommended.symbol}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-white">
                {formatPrice(recommended.priceUsd)}
              </p>
              <p
                className={`text-sm ${
                  recommended.priceChange24h >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {recommended.priceChange24h >= 0 ? "+" : ""}
                {recommended.priceChange24h?.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="bg-[#0d0d12] rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Volume 24h</p>
            <p className="text-white font-semibold">
              {formatNumber(recommended.volume24h)}
            </p>
          </div>
          <div className="bg-[#0d0d12] rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Liquidity</p>
            <p className="text-white font-semibold">
              {formatNumber(recommended.liquidity)}
            </p>
          </div>
          <div className="bg-[#0d0d12] rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Buy Pressure</p>
            <p
              className={`font-semibold ${
                recommended.buyPressure > 55
                  ? "text-emerald-400"
                  : "text-gray-400"
              }`}
            >
              {recommended.buyPressure?.toFixed(1)}%
            </p>
          </div>
          <div className="bg-[#0d0d12] rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Boost Amount</p>
            <p className="text-[#F3BA2F] font-semibold">
              {recommended.boostAmount}
            </p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="bg-[#0d0d12] rounded-xl p-3 space-y-2">
            <p className="text-xs text-gray-500">Why This Token</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-lg">
                {reasoning.liquidityScore}
              </span>
              <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-lg">
                {reasoning.volumeScore}
              </span>
              <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-lg">
                {reasoning.momentumScore}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 flex gap-2">
          <CopyButton text={recommended.address} />
          <a
            href={recommended.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-[#F3BA2F] hover:bg-[#F3BA2F]/90 text-black font-semibold py-2 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            View on DexScreener <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {alternatives && alternatives.length > 0 && (
        <div className="bg-[#1a1a1f] rounded-xl sm:rounded-2xl border border-[#2a2a35] p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">Other Options</p>
          <div className="space-y-2">
            {alternatives.map((alt: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 sm:p-3 bg-[#0d0d12] rounded-lg sm:rounded-xl gap-2 sm:gap-3"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  {alt.logo ? (
                    <Image
                      src={alt.logo || "/placeholder.svg"}
                      alt={alt.symbol}
                      width={32}
                      height={32}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F3BA2F]/20 flex items-center justify-center text-[#F3BA2F] text-[10px] sm:text-xs font-bold flex-shrink-0">
                      {alt.symbol?.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium text-sm sm:text-base truncate">{alt.symbol}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                      {formatNumber(alt.liquidity)} liq
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm sm:text-base text-white break-words">{formatPrice(alt.priceUsd)}</p>
                  <p
                    className={`text-[10px] sm:text-xs ${
                      alt.priceChange24h >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {alt.priceChange24h >= 0 ? "+" : ""}
                    {alt.priceChange24h?.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Bnb Price Card Component
function BnbPriceCard({ bnb }: { bnb: any }) {
  if (!bnb) return null;

  return (
    <div className="bg-gradient-to-br from-[#F3BA2F]/10 to-[#F3BA2F]/5 border border-[#F3BA2F]/20 rounded-xl p-5">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-[#F3BA2F] flex items-center justify-center">
          <span className="text-black font-bold text-xl">BNB</span>
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-400">BNB Price</div>
          <div className="text-3xl font-bold text-white">
            ${bnb.priceUsd?.toFixed(2) || "0"}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={`text-sm font-medium ${
                bnb.priceChange24h >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {bnb.priceChange24h >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(bnb.priceChange24h || 0).toFixed(2)}%
            </span>
            {bnb.volume24h > 0 && (
              <span className="text-xs text-gray-500">
                Vol: {formatNumber(bnb.volume24h)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tool Result Renderer
// Add Updated Tokens rendering and rename renderToolResult
function renderToolResult(toolName: string, result: any, index: number) {
  // Added index parameter
  if (result.error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
        {result.error}
      </div>
    );
  }

  if (toolName === "getTrendingTokens" && result.tokens) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#F3BA2F]/10 border border-[#F3BA2F]/20">
          <TrendingUp className="w-5 h-5 text-[#F3BA2F]" />
        </div>
          <div>
            <h3 className="font-semibold text-white text-lg">Trending on BSC</h3>
            <p className="text-xs text-white/50">{result.tokens.length} tokens found</p>
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {result.tokens.slice(0, 6).map((token: any, i: number) => (
            <TokenCard key={token.address || i} token={token} />
          ))}
        </div>
      </div>
    );
  }

  if (toolName === "getBoostedTokens" && result.tokens) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#F3BA2F]/10 border border-[#F3BA2F]/20">
          <Zap className="w-5 h-5 text-[#F3BA2F]" />
        </div>
          <div>
            <h3 className="font-semibold text-white text-lg">Boosted on DexScreener</h3>
            <p className="text-xs text-white/50">{result.tokens.length} tokens found</p>
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {result.tokens.slice(0, 6).map((token: any, i: number) => (
            <TokenCard key={token.address || i} token={token} />
          ))}
        </div>
      </div>
    );
  }

  // Add rendering for getUpdatedTokens
  if (toolName === "getUpdatedTokens" && result.tokens) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#F3BA2F]/10 border border-[#F3BA2F]/20">
          <RefreshCw className="w-5 h-5 text-[#F3BA2F]" />
        </div>
          <div>
            <h3 className="font-semibold text-white text-lg">Latest Updated on BSC</h3>
            <p className="text-xs text-white/50">{result.tokens.length} tokens found</p>
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {result.tokens.slice(0, 6).map((token: any, i: number) => (
            <TokenCard key={token.address || i} token={token} />
          ))}
        </div>
      </div>
    );
  }

  if (toolName === "searchToken" && result.results) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-[#F3BA2F]/10 border border-[#F3BA2F]/20">
          <Search className="w-5 h-5 text-[#F3BA2F]" />
        </div>
          <div>
            <h3 className="font-semibold text-white text-lg">Search Results</h3>
            <p className="text-xs text-white/50">{result.results.length} tokens found</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {result.results.map((token: any, i: number) => (
            <TokenCard key={token.address || i} token={token} />
          ))}
        </div>
      </div>
    );
  }

  if (toolName === "getTokenData" && result.name) {
    return <TokenCard token={result} />;
  }

  if (toolName === "checkSecurity") {
    return <SecurityCard security={result} />;
  }

  if (toolName === "getBnbPrice" && result.bnb) {
    return <BnbPriceCard bnb={result.bnb} />;
  }

  // if (toolName === "getGasPrice" && result.gasPrice) {
  //   return <GasPriceCard gasPrice={result.gasPrice} />
  // }

  if (toolName === "getContractInfo" && result.contractName) {
    return <ContractInfoCard contract={result} />;
  }

  if (toolName === "getChartAnalysis" && result.tokenName) {
    return <ChartAnalysisCard analysis={result} />;
  }

  if (toolName === "analyzeFullToken" && result.type === "fullAnalysis") {
    return <TokenAnalysisSummaryCard analysis={result} />;
  }

  return null;
}

// Welcome Screen Component
function WelcomeScreen({
  onQuickAction,
  onInputAction,
  activePrompt,
}: {
  onQuickAction: (prompt: string) => void;
  onInputAction: (prompt: string) => void;
  activePrompt: string | null;
}) {
  // Update quickPrompts to reflect the new quickActionCategories structure
  const quickPrompts = [
    {
      icon: TrendingUp,
      label: "Trending Tokens",
      prompt: "Get trending tokens on BSC",
      sendDirect: true,
    },
    {
      icon: Zap,
      label: "Boosted Tokens",
      prompt: "Show boosted tokens on DexScreener",
      sendDirect: true,
    },
    {
      icon: RefreshCw,
      label: "Updated Tokens",
      prompt: "Show latest updated tokens on BSC",
      sendDirect: true,
    },
    {
      icon: DollarSign,
      label: "BNB Price",
      prompt: "Get BNB price",
      sendDirect: true,
    },
    {
      icon: LineChart,
      label: "Chart Analysis",
      prompt: "Give me professional chart analysis for: ",
      sendDirect: false,
    },
    {
      icon: LineChart,
      label: "BNB Chart",
      prompt:
        "Give me professional chart analysis for: 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      sendDirect: true,
    },
    {
      icon: Shield,
      label: "Security Check",
      prompt: "Check security for: ",
      sendDirect: false,
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 pb-20 sm:pb-8 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8 md:mb-12 w-full">
        <h1 className="text-center bg-[radial-gradient(89.47%_51.04%_at_44.27%_50%,_#E2E3E9_0%,_#D4D6DE_52.73%,_#3D3F4C_100%)] bg-clip-text text-transparent font-title font-medium leading-[1.1] tracking-[-0.02em] text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-4 md:mb-6 px-2">
          Ask SCANAI about any{" "}
          <span className="bg-[linear-gradient(180deg,#F2B900_0%,#F9E400_45%,#C8871E_100%)] bg-clip-text text-transparent block sm:inline">
            BNB
          </span>{" "}
          token
        </h1>
        <p className="text-white/60 text-center max-w-xl mx-auto text-sm sm:text-base leading-relaxed tracking-tight px-4">
          Real-time market data, AI-assisted technical analysis and on-chain security checks for BNB Chain.
        </p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4 w-full max-w-4xl px-2 sm:px-4">
        {quickPrompts.map((item, i) => {
          const isActive = activePrompt === item.prompt;
          return (
          <button
            key={i}
            onClick={() =>
              item.sendDirect
                ? onQuickAction(item.prompt)
                : onInputAction(item.prompt)
            }
            className={`group relative flex flex-col items-center justify-center gap-2 p-3 sm:p-4 md:p-5 bg-gradient-to-br from-white/[0.02] via-white/[0.01] to-transparent rounded-xl hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-300 text-center backdrop-blur-sm hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] min-h-[100px] sm:min-h-[120px] ${
              isActive 
                ? "border border-[#F2B900] box-border" 
                : "border border-white/[0.06]"
            }`}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#F2B900]/0 via-[#F2B900]/0 to-[#F2B900]/0 group-hover:from-[#F2B900]/5 group-hover:via-[#F2B900]/0 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
            
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/[0.05] flex items-center justify-center group-hover:bg-white/[0.08] transition-all duration-300 border border-white/[0.08] group-hover:border-white/[0.15] group-hover:scale-105 flex-shrink-0">
              <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white/50 group-hover:text-[#F2B900] transition-colors duration-300" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-white/90 tracking-tight text-center leading-tight">{item.label}</span>
            {item.sendDirect ? (
              <span className="text-[10px] text-white/40 font-mono mt-0.5">no address needed</span>
            ) : (
              <span className="text-[10px] text-white/40 font-mono mt-0.5">+ address</span>
            )}
          </button>
          );
        })}
      </div>
      
      <p className="text-xs text-white/40 mt-6 sm:mt-8 md:mt-10 tracking-tight text-center px-4 max-w-2xl">
        Real-time data from DexScreener, Birdeye, GoPlusLabs, and BscScan. Always DYOR.
      </p>
    </div>
  );
}

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messagesEndRef, setMessagesEndRef] = useState<HTMLDivElement | null>(
    null
  );
  const [activePrompt, setActivePrompt] = useState<string | null>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat/bsc" }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  const scrollToBottom = useCallback(() => {
    messagesEndRef?.scrollIntoView({ behavior: "smooth" });
  }, [messagesEndRef]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim() || isLoading) return;
      sendMessage({ text: inputValue.trim() });
      setInputValue("");
    },
    [inputValue, isLoading, sendMessage]
  );

  const handleQuickAction = useCallback(
    (prompt: string) => {
      if (isLoading) return;
      setActivePrompt(prompt);
      sendMessage({ text: prompt });
    },
    [isLoading, sendMessage]
  );

  const handleInputAction = useCallback((prompt: string) => {
    setActivePrompt(prompt);
    setInputValue(prompt);
  }, []);

  return (
    <div className="flex h-screen bg-black relative overflow-hidden">
      {/* Subtle dot texture overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] z-0">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="dot-grid-chat"
              x="0"
              y="0"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.18)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid-chat)" />
        </svg>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, overlay when open */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 w-72 transition-transform duration-300 ease-in-out overflow-hidden border-r border-white/[0.06] bg-black/95 backdrop-blur-sm flex flex-col z-40 lg:z-10`}
      >
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="flex items-center justify-center">
              <img src="/logo.png" alt="ScanAI" className="h-10 sm:h-12 w-auto object-contain" />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-white/[0.05] rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>
          <Button
            onClick={() => {
              setInputValue("");
              setActivePrompt(null);
              sendMessage({ text: "Hello" });
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className="group relative w-full h-10 rounded-full overflow-hidden border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-200"
          >
            <span className="relative z-10 flex items-center justify-center gap-2 text-sm font-semibold tracking-tight text-white/90">
              <Plus className="w-4 h-4" />
            New Chat
            </span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {quickActionCategories.map((category, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 px-2 py-2 text-[10px] text-white/45 uppercase tracking-[0.2em] font-medium">
                <category.icon className="w-3.5 h-3.5" />
                {category.title}
              </div>
              <div className="space-y-1">
                {category.actions.map((action, j) => {
                  const isActive = activePrompt === action.prompt;
                  return (
                  <button
                    key={j}
                    onClick={() => {
                      if (action.sendDirect) {
                        handleQuickAction(action.prompt);
                      } else {
                        handleInputAction(action.prompt);
                      }
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 text-left group border min-h-[44px] ${
                      isActive
                        ? "bg-white/[0.05] text-white/90 border-[#F2B900]/40"
                        : "text-white/70 hover:bg-white/[0.03] hover:text-white/90 active:bg-white/[0.05] border-transparent hover:border-white/[0.06]"
                    }`}
                  >
                    <action.icon className={`w-4 h-4 transition-colors flex-shrink-0 ${
                      isActive ? "text-[#F2B900]" : "text-white/50 group-hover:text-[#F2B900]"
                    }`} />
                    <span className="flex-1 truncate">{action.label}</span>
                    {!action.sendDirect && (
                      <span className={`text-xs flex-shrink-0 ${
                        isActive ? "text-white/50" : "text-white/30 group-hover:text-white/50"
                      }`}>
                        +
                      </span>
                    )}
                  </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-white/[0.06]">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.03] rounded-lg transition-all duration-200 border border-transparent hover:border-white/[0.06] min-h-[44px]"
            onClick={() => {
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </aside>

      {/* Mobile Menu Button */}
    {!sidebarOpen &&  <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed lg:hidden top-4 left-4 z-50 p-2.5 bg-black/95 backdrop-blur-sm border border-white/[0.12] rounded-lg hover:bg-white/[0.05] transition-all duration-200 shadow-xl"
        aria-label="Toggle menu"
            >
              {sidebarOpen ? (
                null
              ) : (
                <Menu className="w-5 h-5 text-white/90" />
              )}
            </button>
      }
      {/* Main Chat Area - Full width on mobile */}
      <main className="flex-1 flex flex-col relative z-10 w-full lg:w-auto overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto pb-32 lg:pb-24">
          {messages.length === 0 ? (
            <WelcomeScreen
              onQuickAction={handleQuickAction}
              onInputAction={handleInputAction}
              activePrompt={activePrompt}
            />
          ) : (
            <div className="max-w-4xl mx-auto p-4 pb-4 space-y-4">
              {messages.map(
                (
                  message,
                  messageIndex // Added messageIndex parameter
                ) => (
                  <div
                    key={message.id}
                    className={`flex gap-2.5 pb-4 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-white/[0.08] border border-white/[0.06]">
                        <img src="/Logo1.png" alt="ScanAI" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] ${
                        message.role === "user"
                          ? "bg-white/[0.08] border border-white/[0.06] text-white rounded-2xl rounded-br-sm px-4 py-2.5 backdrop-blur-sm"
                          : "space-y-3"
                      }`}
                    >
                      {message.role === "user" ? (
                        <p className="text-sm text-white/90 tracking-tight break-words">
                          {(() => {
                            const textPart = message.parts.find((p: any) => p.type === "text" && "text" in p);
                            return textPart && typeof textPart === "object" && "text" in textPart ? (textPart as any).text : "";
                          })()}
                        </p>
                      ) : (
                        message.parts.map((part: any, i: number) => {
                          if (part.type === "text" && part.text) {
                            return (
                              <div
                                key={i}
                                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 text-white/90 backdrop-blur-sm"
                              >
                                <p className="whitespace-pre-wrap text-sm leading-relaxed tracking-tight break-words">
                                  {processAIText(part.text)}
                                </p>
                              </div>
                            );
                          }
                          if (
                            part.type?.startsWith("tool-") &&
                            part.state === "output-available"
                          ) {
                            const toolName = part.type.replace("tool-", "");
                            // Pass messageIndex to renderToolResult
                            return (
                              <div key={i}>
                                {renderToolResult(
                                  toolName,
                                  part.output,
                                  messageIndex
                                )}
                              </div>
                            );
                          }
                          if (
                            part.type?.startsWith("tool-") &&
                            part.state !== "output-available"
                          ) {
                            return (
                              <div
                                key={i}
                                className="flex items-center gap-2 text-white/50 text-sm"
                              >
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Fetching data...</span>
                              </div>
                            );
                          }
                          return null;
                        })
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-lg bg-white/[0.08] border border-white/[0.06] flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                        <span className="text-xs font-semibold text-white/90">U</span>
                      </div>
                    )}
                  </div>
                )
              )}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                    <img src="/Logo1.png" alt="ScanAI" className="w-full h-full object-contain" />
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={setMessagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="fixed bottom-0 left-0 right-0 lg:static border-t border-white/[0.06] p-4 bg-black/95 backdrop-blur-xl lg:bg-black/50">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask SCANAI about any BNB token…"
                className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-full px-4 py-3 text-white/90 placeholder:text-white/40 focus:outline-none focus:border-white/[0.12] focus:bg-white/[0.05] transition-all duration-200 text-base font-medium tracking-tight backdrop-blur-sm min-h-[44px]"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="group relative h-11 w-11 rounded-full overflow-hidden border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white/70" />
                ) : (
                  <Send className="w-5 h-5 text-white/70 group-hover:text-white/90" />
                )}
              </Button>
            </div>
          
          </form>
        </div>
      </main>
    </div>
  );
}
