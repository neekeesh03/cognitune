import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 animate-in slide-in-from-top duration-500">
      <div className="flex justify-between text-sm text-muted-foreground mb-2">
        <span className="animate-in fade-in duration-300">Question {currentStep} of {totalSteps}</span>
        <span className="animate-in fade-in duration-300 delay-150">{Math.round(progress)}% complete</span>
      </div>
      <Progress value={progress} className="h-3 transition-all duration-700 ease-out" />
      <div className="mt-2 text-xs text-center text-muted-foreground animate-in fade-in duration-500 delay-300">
        {progress === 100 ? "🎉 Calculating your results..." : "Take your time to answer thoughtfully"}
      </div>
    </div>
  );
}