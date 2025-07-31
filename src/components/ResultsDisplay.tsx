import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface AssessmentResults {
  primode: number;
  cap_adj: number;
  flexion: number;
  grain: number;
  anchory_mod: number;
  slip: number;
  latent_load: number;
  drive: number;
  verdict: string;
  verdictType: 'ready' | 'borderline' | 'not-ready';
}

interface ResultsDisplayProps {
  results: AssessmentResults;
}

export function ResultsDisplay({ results }: ResultsDisplayProps) {
  const getVerdictIcon = () => {
    switch (results.verdictType) {
      case 'ready':
        return <CheckCircle className="w-6 h-6 text-success" />;
      case 'borderline':
        return <AlertTriangle className="w-6 h-6 text-warning" />;
      case 'not-ready':
        return <XCircle className="w-6 h-6 text-destructive" />;
    }
  };

  const getVerdictColor = () => {
    switch (results.verdictType) {
      case 'ready':
        return 'bg-success text-success-foreground';
      case 'borderline':
        return 'bg-warning text-warning-foreground';
      case 'not-ready':
        return 'bg-destructive text-destructive-foreground';
    }
  };

  const metrics = [
    { label: "Primode", value: results.primode },
    { label: "CAP (adjusted)", value: results.cap_adj },
    { label: "Flexion", value: results.flexion },
    { label: "Grain", value: results.grain },
    { label: "Anchory (modified)", value: results.anchory_mod },
    { label: "Slip", value: results.slip },
    { label: "Latent Load", value: results.latent_load },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Verdict Card */}
      <Card className="shadow-soft border-border/50">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            {getVerdictIcon()}
            <CardTitle className="text-2xl">LTA Readiness Assessment</CardTitle>
          </div>
          <Badge className={`text-lg py-2 px-4 ${getVerdictColor()}`}>
            Drive Score: {results.drive.toFixed(2)}
          </Badge>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-xl text-foreground font-medium">{results.verdict}</p>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <Card className="shadow-soft border-border/50">
        <CardHeader>
          <CardTitle className="text-xl text-center">Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground font-medium">{metric.label}</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {metric.value.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Explanation */}
      <Card className="shadow-soft border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Understanding Your Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><strong>Drive Score &gt; 1.2:</strong> You&apos;re cognitively ready to start the task.</p>
          <p><strong>Drive Score 0.8-1.2:</strong> Borderline readiness. You may start but risk instability.</p>
          <p><strong>Drive Score &lt; 0.8:</strong> Not ready. Consider reducing mental load or stabilizing first.</p>
        </CardContent>
      </Card>
    </div>
  );
}