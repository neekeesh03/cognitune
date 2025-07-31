export interface QuestionData {
  text: string;
  options: Array<{
    key: string;
    label: string;
    value: number;
  }>;
}

export interface AssessmentQuestions {
  [key: string]: QuestionData;
}

export interface UserResponses {
  [key: string]: number;
}

export interface CalculationResults {
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