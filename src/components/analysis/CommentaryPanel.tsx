import { FileText, TrendingUp, AlertTriangle } from "lucide-react";

interface CommentaryPanelProps {
  commentary: { 
    technicalView: string; 
    overallView: string; 
    scenario: string; 
    scenarioDetail: string;
    sentiment: string;
    recommendation: string;
    recommendationDetail: string;
  };
}

const CommentaryPanel = ({ commentary }: CommentaryPanelProps) => {
  const getScenarioStyle = (scenario: string) => {
    if (scenario.toLowerCase().includes('avoid') || scenario.toLowerCase().includes('high risk'))
      return { bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive', icon: AlertTriangle };
    if (scenario.toLowerCase().includes('speculative'))
      return { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', icon: AlertTriangle };
    return { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success', icon: TrendingUp };
  };

  const scenarioStyle = getScenarioStyle(commentary.scenario);
  const ScenarioIcon = scenarioStyle.icon;

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/10 via-transparent to-info/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Professional Analysis</h2>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Technical Assessment</h3>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed pl-3">{commentary.technicalView}</p>
          </div>

          <div className="pt-6 border-t border-border/50 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-info rounded-full" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Risk & Market Overview</h3>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed pl-3">{commentary.overallView}</p>
          </div>

          <div className="pt-6 border-t border-border/50">
            <div className={`relative overflow-hidden rounded-xl ${scenarioStyle.bg} ${scenarioStyle.border} border p-6`}>
              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${scenarioStyle.bg} ${scenarioStyle.border} border flex items-center justify-center`}>
                    <ScenarioIcon className={`w-5 h-5 ${scenarioStyle.text}`} />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Trading Scenario</div>
                    <div className={`text-lg font-bold ${scenarioStyle.text}`}>{commentary.scenario}</div>
                  </div>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{commentary.scenarioDetail}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentaryPanel;
