"use client";

import { TrendingUp, TrendingDown, Activity, Shield } from 'lucide-react';
import { Icon } from "@/src/components/ui/evervault-card";

interface SentimentPanelProps {
  sentiment: string;
  sentimentDetail: string;
  recommendation: string;
  recommendationDetail: string;
}

export default function SentimentPanel({ sentiment, sentimentDetail, recommendation, recommendationDetail }: SentimentPanelProps) {
  const getSentimentIcon = () => {
    if (sentiment.toLowerCase().includes('bullish')) return TrendingUp;
    if (sentiment.toLowerCase().includes('bearish')) return TrendingDown;
    return Activity;
  };

  const getSentimentColor = () => {
    if (sentiment.toLowerCase().includes('bullish')) return 'text-emerald-400';
    if (sentiment.toLowerCase().includes('bearish')) return 'text-red-400';
    return 'text-[#F2B900]';
  };

  const getSentimentBg = () => {
    if (sentiment.toLowerCase().includes('bullish')) return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30';
    if (sentiment.toLowerCase().includes('bearish')) return 'from-red-500/20 to-red-500/5 border-red-500/30';
    return 'from-[#F2B900]/20 to-[#F2B900]/5 border-[#F2B900]/30';
  };

  const getRecommendationColor = () => {
    if (recommendation.toLowerCase() === 'buy') return 'text-emerald-400';
    if (recommendation.toLowerCase() === 'sell' || recommendation.toLowerCase() === 'avoid') return 'text-red-400';
    return 'text-[#F2B900]';
  };

  const getRecommendationBg = () => {
    if (recommendation.toLowerCase() === 'buy') return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30';
    if (recommendation.toLowerCase() === 'sell' || recommendation.toLowerCase() === 'avoid') return 'from-red-500/20 to-red-500/5 border-red-500/30';
    return 'from-[#F2B900]/20 to-[#F2B900]/5 border-[#F2B900]/30';
  };

  const SentimentIcon = getSentimentIcon();

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      {/* Market Sentiment Card */}
      <article className="relative flex flex-col items-start border border-white/18 bg-black/95 px-6 py-7 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
        <Icon className="pointer-events-none absolute -top-3 -left-3 h-4 w-4 text-white/40" />
        <Icon className="pointer-events-none absolute -top-3 -right-3 h-4 w-4 text-white/40" />
        <Icon className="pointer-events-none absolute -bottom-3 -left-3 h-4 w-4 text-white/40" />
        <Icon className="pointer-events-none absolute -bottom-3 -right-3 h-4 w-4 text-white/40" />

        <div className="flex items-center gap-4 mb-5">
          <div className={`flex h-14 w-14 items-center justify-center rounded-xl border bg-gradient-to-br ${getSentimentBg()}`}>
            <SentimentIcon className={`w-7 h-7 ${getSentimentColor()}`} />
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/50 block">
              Market Sentiment
            </span>
            <div className={`text-3xl font-bold capitalize mt-1 ${getSentimentColor()}`}>
              {sentiment}
            </div>
          </div>
        </div>
        <p className="text-sm text-white/80 leading-relaxed">{sentimentDetail}</p>
      </article>

      {/* Recommendation Card */}
      <article className="relative flex flex-col items-start border border-white/18 bg-black/95 px-6 py-7 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
        <Icon className="pointer-events-none absolute -top-3 -left-3 h-4 w-4 text-white/40" />
        <Icon className="pointer-events-none absolute -top-3 -right-3 h-4 w-4 text-white/40" />
        <Icon className="pointer-events-none absolute -bottom-3 -left-3 h-4 w-4 text-white/40" />
        <Icon className="pointer-events-none absolute -bottom-3 -right-3 h-4 w-4 text-white/40" />

        <div className="flex items-center gap-4 mb-5">
          <div className={`flex h-14 w-14 items-center justify-center rounded-xl border bg-gradient-to-br ${getRecommendationBg()}`}>
            <Shield className={`w-7 h-7 ${getRecommendationColor()}`} />
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/50 block">
              Recommendation
            </span>
            <div className={`text-3xl font-bold capitalize mt-1 ${getRecommendationColor()}`}>
              {recommendation}
            </div>
          </div>
        </div>
        <p className="text-sm text-white/80 leading-relaxed">{recommendationDetail}</p>
      </article>
    </section>
  );
}
