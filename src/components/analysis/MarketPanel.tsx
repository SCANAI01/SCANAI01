import { TrendingUp } from "lucide-react";

interface MarketPanelProps {
  market: {
    pairAddress: string;
    dexName: string;
    priceUsd: number;
    priceChange24hPct: number;
    volume24hUsd: number;
    liquidityUsd: number;
  };
}

const MarketPanel = ({ market }: MarketPanelProps) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Market Behaviour</h2>
      </div>

      <div className="space-y-6">
        {/* DEX Info */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">DEX Pair</div>
          <div className="text-base font-semibold text-foreground">
            {market.dexName}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Current Price</div>
            <div className="text-base font-semibold text-foreground">
              ${market.priceUsd.toFixed(8)}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">24h Change</div>
            <div className={`text-base font-semibold ${
              market.priceChange24hPct >= 0 ? "text-success" : "text-destructive"
            }`}>
              {market.priceChange24hPct >= 0 ? "+" : ""}{market.priceChange24hPct.toFixed(2)}%
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">24h Volume</div>
            <div className="text-base font-semibold text-foreground">
              {formatNumber(market.volume24hUsd)}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Liquidity</div>
            <div className="text-base font-semibold text-foreground">
              {formatNumber(market.liquidityUsd)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketPanel;
