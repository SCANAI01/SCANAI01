"use client";

import { FileText, TrendingUp } from 'lucide-react';
import { Icon } from "@/src/components/ui/evervault-card";

interface CommentaryPanelProps {
  commentary: {
    technicalView: string;
    overallView: string;
    scenario: string;
    scenarioDetail: string;
  };
}

export default function CommentaryPanel({ commentary }: CommentaryPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.18] bg-gradient-to-br from-[#F2B900]/20 to-[#F2B900]/5">
          <FileText className="w-6 h-6 text-[#F2B900]" />
        </div>
        <h3 className="text-2xl font-bold text-white">
          Professional Analysis
        </h3>
      </div>

      <div className="space-y-6">
        {/* Technical Assessment */}
        <article className="relative flex flex-col items-start border border-white/18 bg-black/95 px-6 py-7 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
          <Icon className="pointer-events-none absolute -top-3 -left-3 h-4 w-4 text-white/40" />
          <Icon className="pointer-events-none absolute -top-3 -right-3 h-4 w-4 text-white/40" />
          <Icon className="pointer-events-none absolute -bottom-3 -left-3 h-4 w-4 text-white/40" />
          <Icon className="pointer-events-none absolute -bottom-3 -right-3 h-4 w-4 text-white/40" />

          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Technical Assessment</h4>
          <p className="text-sm text-white/80 leading-relaxed">{commentary.technicalView}</p>
        </article>

        {/* Risk & Market Overview */}
        <article className="relative flex flex-col items-start border border-white/18 bg-black/95 px-6 py-7 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
          <Icon className="pointer-events-none absolute -top-3 -left-3 h-4 w-4 text-white/40" />
          <Icon className="pointer-events-none absolute -top-3 -right-3 h-4 w-4 text-white/40" />
          <Icon className="pointer-events-none absolute -bottom-3 -left-3 h-4 w-4 text-white/40" />
          <Icon className="pointer-events-none absolute -bottom-3 -right-3 h-4 w-4 text-white/40" />

          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Risk & Market Overview</h4>
          <p className="text-sm text-white/80 leading-relaxed">{commentary.overallView}</p>
        </article>

        {/* Trading Scenario */}
        <article className="relative flex flex-col items-start border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 px-6 py-7 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
          <Icon className="pointer-events-none absolute -top-3 -left-3 h-4 w-4 text-emerald-400/40" />
          <Icon className="pointer-events-none absolute -top-3 -right-3 h-4 w-4 text-emerald-400/40" />
          <Icon className="pointer-events-none absolute -bottom-3 -left-3 h-4 w-4 text-emerald-400/40" />
          <Icon className="pointer-events-none absolute -bottom-3 -right-3 h-4 w-4 text-emerald-400/40" />

          <div className="flex items-start gap-4 w-full">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/20 flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">Trading Scenario</h4>
              <p className="text-xl font-semibold text-emerald-300 mb-2">{commentary.scenario}</p>
              <p className="text-sm text-white/80 leading-relaxed">{commentary.scenarioDetail}</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

