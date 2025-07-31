import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex justify-between text-sm text-muted-foreground mb-2">
        <span>Question {currentStep} of {totalSteps}</span>
        <span>{Math.round(progress)}% complete</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}