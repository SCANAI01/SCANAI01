import { TrendingUp, TrendingDown, Clock, Droplets, DollarSign, Activity } from "lucide-react";

interface SummaryStripProps {
  data: {
    risk: { score: number; level: string; tokenAgeDays: number; liquidity: { status: string } };
    market: { priceUsd: number; priceChange24hPct: number; volume24hUsd: number };
  };
}

const SummaryStrip = ({ data }: SummaryStripProps) => {
  const getRiskColor = (level: string) => {
    const colors = {
      low: { bg: "bg-success/10", border: "border-success/30", text: "text-success" },
      moderate: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning" },
      elevated: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive" },
      high: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive" },
    };
    return colors[level.toLowerCase() as keyof typeof colors] || colors.moderate;
  };

  const formatNumber = (num: number) => {
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const riskColors = getRiskColor(data.risk.level);

  return (
    <div className="relative group mb-8">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-info/20 to-primary/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
      <div className="relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl p-6 shadow-xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
              <div className="w-1 h-1 rounded-full bg-primary" />Risk Score
            </div>
            <div className="flex items-baseline gap-3">
              <span className={`text-3xl font-bold ${riskColors.text}`}>{data.risk.score}</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${riskColors.bg} ${riskColors.border} border`}>
                {data.risk.level}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
              <Clock className="w-3 h-3" />Token Age
            </div>
            <div className="text-xl font-bold text-foreground">{data.risk.tokenAgeDays > 0 ? `${data.risk.tokenAgeDays.toFixed(1)}d` : 'Unknown'}</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
              <Droplets className="w-3 h-3" />Liquidity
            </div>
            <div className="text-xl font-bold text-foreground capitalize">{data.risk.liquidity.status}</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
              <DollarSign className="w-3 h-3" />Price
            </div>
            <div className="text-xl font-bold text-foreground font-mono">${data.market.priceUsd.toFixed(8)}</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
              <Activity className="w-3 h-3" />24h Change
            </div>
            <div className={`flex items-center gap-2 text-xl font-bold ${data.market.priceChange24hPct >= 0 ? "text-success" : "text-destructive"}`}>
              {data.market.priceChange24hPct >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {Math.abs(data.market.priceChange24hPct).toFixed(2)}%
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
              <Activity className="w-3 h-3" />24h Volume
            </div>
            <div className="text-xl font-bold text-foreground">{formatNumber(data.market.volume24hUsd)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryStrip;
