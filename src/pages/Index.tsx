import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestionCard } from "@/components/QuestionCard";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { assessmentQuestions } from "@/data/questions";
import { calculateLTAResults } from "@/utils/assessmentCalculations";
import { UserResponses } from "@/types/assessment";
import { Brain, RotateCcw } from "lucide-react";

type AppState = 'welcome' | 'assessment' | 'loading' | 'results';

const Index = () => {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<UserResponses>({});
  const [isAnimating, setIsAnimating] = useState(false);
  
  const questionKeys = Object.keys(assessmentQuestions);
  const currentQuestionKey = questionKeys[currentQuestionIndex];
  const currentQuestion = assessmentQuestions[currentQuestionKey];

  const handleStartAssessment = () => {
    setAppState('assessment');
    setCurrentQuestionIndex(0);
    setResponses({});
  };

  const handleAnswerSelect = (value: number) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    const newResponses = { ...responses, [currentQuestionKey]: value };
    setResponses(newResponses);

    // Show selection feedback, then advance
    setTimeout(() => {
      if (currentQuestionIndex < questionKeys.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setIsAnimating(false);
      } else {
        // Show loading state before results
        setAppState('loading');
        setTimeout(() => {
          setAppState('results');
          setIsAnimating(false);
        }, 2000);
      }
    }, 600);
  };

  const handleRestart = () => {
    setAppState('welcome');
    setCurrentQuestionIndex(0);
    setResponses({});
  };

  const results = appState === 'results' ? calculateLTAResults(responses) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-8">
        {appState === 'welcome' && (
          <div className="min-h-screen flex items-center justify-center">
            <Card className="w-full max-w-2xl mx-auto shadow-soft border-border/50">
              <CardHeader className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Brain className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  COGNITUNE
                </CardTitle>
                <p className="text-xl text-muted-foreground">
                  LTA Assessment with Live Questions
                </p>
                <p className="text-base text-foreground leading-relaxed">
                  Assess your cognitive readiness to begin tasks. This scientific assessment evaluates your current mental state across six key dimensions to determine if you're ready to start productive work.
                </p>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-center space-x-4 text-sm text-muted-foreground">
                    <span>🧠 6 Questions</span>
                    <span>⏱️ 2 minutes</span>
                    <span>📊 Instant Results</span>
                  </div>
                  <Button 
                    onClick={handleStartAssessment} 
                    variant="hero"
                    size="lg" 
                    className="text-lg px-12 py-6 rounded-xl animate-pulse hover:animate-none"
                  >
                    Begin Assessment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {appState === 'assessment' && (
          <div className="min-h-screen flex flex-col items-center justify-center space-y-8">
            <ProgressIndicator 
              currentStep={currentQuestionIndex + 1} 
              totalSteps={questionKeys.length} 
            />
            <QuestionCard
              title={currentQuestionKey}
              question={currentQuestion.text}
              options={currentQuestion.options}
              selectedValue={responses[currentQuestionKey]}
              onSelect={handleAnswerSelect}
            />
          </div>
        )}

        {appState === 'loading' && (
          <div className="min-h-screen flex items-center justify-center">
            <Card className="w-full max-w-2xl mx-auto shadow-soft border-border/50 animate-pulse">
              <CardContent className="text-center py-16 space-y-6">
                <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center animate-spin">
                  <Brain className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-primary">Analyzing Your Cognitive State</h2>
                  <p className="text-muted-foreground">Processing your responses using advanced LTA algorithms...</p>
                </div>
                <div className="flex justify-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {appState === 'results' && results && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-primary mb-4">Assessment Complete</h1>
              <Button 
                onClick={handleRestart} 
                variant="outline" 
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Take Again
              </Button>
            </div>
            <ResultsDisplay results={results} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
