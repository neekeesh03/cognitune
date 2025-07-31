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
    <Card className="w-full max-w-2xl mx-auto shadow-soft border-border/50 animate-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-semibold text-primary animate-in fade-in duration-700">{title}</CardTitle>
        <p className="text-lg text-foreground leading-relaxed animate-in slide-in-from-top-2 duration-700 delay-150">{question}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {options.map((option, index) => (
          <Button
            key={option.key}
            variant="outline"
            size="lg"
            className={cn(
              "w-full justify-start text-left h-auto py-4 px-6 transition-all duration-300",
              "hover:bg-accent hover:border-primary/30 hover:scale-105 hover:shadow-md",
              "animate-in slide-in-from-left duration-500",
              selectedValue === option.value && "bg-primary text-primary-foreground border-primary hover:bg-primary hover:text-primary-foreground scale-105 shadow-lg"
            )}
            style={{ animationDelay: `${index * 100 + 300}ms` }}
            onClick={() => onSelect(option.value)}
          >
            <span className="text-base">{option.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}