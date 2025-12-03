import { TrendingUp, TrendingDown, Minus, ShoppingCart, PauseCircle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SentimentPanelProps {
  sentiment: string;
  recommendation: string;
  recommendationDetail: string;
}

const SentimentPanel = ({ sentiment, recommendation, recommendationDetail }: SentimentPanelProps) => {
  const getSentimentStyle = (sentiment: string) => {
    if (sentiment === 'Bullish') 
      return { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success', icon: TrendingUp };
    if (sentiment === 'Bearish')
      return { bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive', icon: TrendingDown };
    return { bg: 'bg-muted/10', border: 'border-muted-foreground/30', text: 'text-muted-foreground', icon: Minus };
  };

  const getRecommendationStyle = (recommendation: string) => {
    if (recommendation === 'Buy')
      return { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success', icon: ShoppingCart };
    if (recommendation === 'Hold')
      return { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', icon: PauseCircle };
    return { bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive', icon: XCircle };
  };

  const sentimentStyle = getSentimentStyle(sentiment);
  const recommendationStyle = getRecommendationStyle(recommendation);
  const SentimentIcon = sentimentStyle.icon;
  const RecommendationIcon = recommendationStyle.icon;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Sentiment Card */}
      <Card className={`relative overflow-hidden border-2 ${sentimentStyle.border} ${sentimentStyle.bg} p-6`}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${sentimentStyle.bg} ${sentimentStyle.border} border-2 flex items-center justify-center`}>
              <SentimentIcon className={`w-6 h-6 ${sentimentStyle.text}`} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Market Sentiment</div>
              <div className={`text-2xl font-bold ${sentimentStyle.text}`}>{sentiment}</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Based on technical indicators including RSI, trend direction, MACD, and price action relative to moving averages.
          </p>
        </div>
      </Card>

      {/* Recommendation Card */}
      <Card className={`relative overflow-hidden border-2 ${recommendationStyle.border} ${recommendationStyle.bg} p-6`}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${recommendationStyle.bg} ${recommendationStyle.border} border-2 flex items-center justify-center`}>
              <RecommendationIcon className={`w-6 h-6 ${recommendationStyle.text}`} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Recommendation</div>
              <div className={`text-2xl font-bold ${recommendationStyle.text}`}>{recommendation}</div>
            </div>
          </div>
          <p className="text-sm text-foreground/80">{recommendationDetail}</p>
        </div>
      </Card>
    </div>
  );
};

export default SentimentPanel;
