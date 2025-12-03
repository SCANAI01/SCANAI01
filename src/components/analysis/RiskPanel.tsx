import { Shield, AlertTriangle } from "lucide-react";

interface RiskPanelProps {
  risk: {
    score: number;
    level: string;
    flags: string[];
    liquidity: {
      status: string;
      usd: number;
    };
    holderConcentration: {
      top10Pct: number | null;
      largestNonLpPct: number | null;
    };
    tokenAgeDays: number;
  };
}

const RiskPanel = ({ risk }: RiskPanelProps) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatPct = (n: number | null | undefined) => {
    return typeof n === 'number' && Number.isFinite(n) ? `${n.toFixed(1)}%` : 'N/A';
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Structural Risk</h2>
      </div>

      <div className="space-y-6">
        {/* Risk Flags */}
        {risk.flags.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-2">Risk Flags</div>
            <div className="space-y-2">
              {risk.flags.map((flag, index) => (
                <div key={index} className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">{flag}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Liquidity Status</div>
            <div className="text-base font-semibold text-foreground capitalize">
              {risk.liquidity.status}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Liquidity USD</div>
            <div className="text-base font-semibold text-foreground">
              {formatNumber(risk.liquidity.usd)}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Top 10 Holders</div>
            <div className="text-base font-semibold text-foreground">
              {formatPct(risk.holderConcentration.top10Pct)}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Largest Holder</div>
            <div className="text-base font-semibold text-foreground">
              {formatPct(risk.holderConcentration.largestNonLpPct)}
            </div>
          </div>

          <div className="col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Token Age</div>
            <div className="text-base font-semibold text-foreground">
              {risk.tokenAgeDays.toFixed(1)} days
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskPanel;
