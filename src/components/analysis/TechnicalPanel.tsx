import { Activity } from "lucide-react";

interface TechnicalPanelProps {
  technical: {
    rsi: number;
    ema20: number;
    ema50: number;
    trendLabel: string;
    macd: {
      value: number;
      signal: number;
      histogram: number;
      label: string;
    };
    bollinger: {
      middle: number;
      upper: number;
      lower: number;
      bandwidth: number;
      volatilityLabel: string;
      priceBandPosition: string;
    };
  };
}

const TechnicalPanel = ({ technical }: TechnicalPanelProps) => {
  const getRSIColor = (rsi: number) => {
    if (rsi < 30) return "text-success";
    if (rsi > 70) return "text-destructive";
    return "text-warning";
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Technical View</h2>
      </div>

      <div className="space-y-6">
        {/* RSI */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">RSI (14)</div>
          <div className={`text-2xl font-bold ${getRSIColor(technical.rsi)}`}>
            {technical.rsi.toFixed(1)}
          </div>
        </div>

        {/* Trend */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Trend</div>
          <div className="text-base font-semibold text-foreground capitalize">
            {technical.trendLabel}
          </div>
        </div>

        {/* MACD */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">MACD Status</div>
          <div className="text-base font-semibold text-foreground capitalize">
            {technical.macd.label}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
            <div>
              <div className="text-muted-foreground">Value</div>
              <div className="font-mono text-foreground">{technical.macd.value.toFixed(8)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Signal</div>
              <div className="font-mono text-foreground">{technical.macd.signal.toFixed(8)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Hist</div>
              <div className="font-mono text-foreground">{technical.macd.histogram.toFixed(8)}</div>
            </div>
          </div>
        </div>

        {/* Bollinger */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Bollinger Bands</div>
          <div className="text-base font-semibold text-foreground capitalize">
            {technical.bollinger.volatilityLabel}
          </div>
          <div className="mt-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Upper:</span>
              <span className="font-mono text-foreground">{technical.bollinger.upper.toFixed(8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Middle:</span>
              <span className="font-mono text-foreground">{technical.bollinger.middle.toFixed(8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lower:</span>
              <span className="font-mono text-foreground">{technical.bollinger.lower.toFixed(8)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-border">
              <span className="text-muted-foreground">Position:</span>
              <span className="font-semibold text-foreground capitalize">
                {technical.bollinger.priceBandPosition}
              </span>
            </div>
          </div>
        </div>

        {/* EMAs */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div>
            <div className="text-xs text-muted-foreground mb-1">EMA 20</div>
            <div className="font-mono text-sm text-foreground">
              {technical.ema20.toFixed(8)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">EMA 50</div>
            <div className="font-mono text-sm text-foreground">
              {technical.ema50.toFixed(8)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicalPanel;
