import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuestionOption {
  key: string;
  label: string;
  value: number;
}

interface QuestionCardProps {
  title: string;
  question: string;
  options: QuestionOption[];
  selectedValue?: number;
  onSelect: (value: number) => void;
}

export function QuestionCard({ title, question, options, selectedValue, onSelect }: QuestionCardProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto shadow-soft border-border/50">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-semibold text-primary">{title}</CardTitle>
        <p className="text-lg text-foreground leading-relaxed">{question}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {options.map((option) => (
          <Button
            key={option.key}
            variant="outline"
            size="lg"
            className={cn(
              "w-full justify-start text-left h-auto py-4 px-6 transition-all duration-200",
              "hover:bg-accent hover:border-primary/30",
              selectedValue === option.value && "bg-primary text-primary-foreground border-primary hover:bg-primary hover:text-primary-foreground"
            )}
            onClick={() => onSelect(option.value)}
          >
            <span className="text-base">{option.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}