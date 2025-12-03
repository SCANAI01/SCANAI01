import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart3, ExternalLink, Clock } from "lucide-react";

interface PriceChartProps {
  chartData: {
    candles: Array<{time: number, open: number, high: number, low: number, close: number, volume: number}>;
    resolution: string;
    candleCount: number;
  };
  symbol: string;
  address: string;
  selectedResolution: string;
  onResolutionChange: (resolution: string) => void;
}

const PriceChart = ({ chartData, symbol, address, selectedResolution, onResolutionChange }: PriceChartProps) => {
  const timeframes = [
    { value: 'auto', label: 'Auto' },
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1d' },
  ];
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const resolution = chartData.resolution;
    
    if (resolution.includes('m')) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (resolution.includes('h')) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1) return `$${price.toFixed(4)}`;
    if (price >= 0.0001) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(8)}`;
  };

  // Transform data for chart
  const chartPoints = chartData.candles.map(candle => ({
    time: candle.time,
    price: candle.close,
    timeLabel: formatTime(candle.time)
  }));

  // Use actual price change from backend (calculated from real candles)
  const priceChange = (chartData as any).priceChangePercent || 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/10 via-transparent to-info/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Price Chart</h2>
              <p className="text-sm text-muted-foreground">
                {chartData.candleCount} candles • {selectedResolution === 'auto' ? chartData.resolution : selectedResolution} resolution
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50 border border-border/50">
              <Clock className="w-4 h-4 text-muted-foreground ml-2" />
              {timeframes.map((tf) => (
                <Button
                  key={tf.value}
                  variant={selectedResolution === tf.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onResolutionChange(tf.value)}
                  className="h-8 px-3 text-xs"
                >
                  {tf.label}
                </Button>
              ))}
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-primary/30 hover:bg-primary/10 hover:text-primary"
            >
              <a href={`https://dexscreener.com/bsc/${address}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                View Live Chart
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
        
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Full history from token launch
          </div>
          <div className={`text-lg font-semibold ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartPoints}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="timeLabel" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                interval="preserveStartEnd"
                minTickGap={60}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={formatPrice}
                width={95}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontSize: 12 }}
                itemStyle={{ color: 'hsl(var(--primary))' }}
                formatter={(value: number) => [formatPrice(value), symbol]}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2.5}
                fill="url(#priceGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
          Note: Chart uses interpolated data. For real-time candles, view on DexScreener above.
        </div>
      </div>
    </div>
  );
};

export default PriceChart;
