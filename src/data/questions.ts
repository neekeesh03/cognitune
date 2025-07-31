import { AssessmentQuestions } from "@/types/assessment";

export const assessmentQuestions: AssessmentQuestions = {
  Primode: {
    text: "Do you feel like you could begin the task right now if nothing stood in your way?",
    options: [
      { key: "definitely", label: "Definitely", value: 1.0 },
      { key: "probably", label: "Probably", value: 0.7 },
      { key: "unsure", label: "Unsure", value: 0.4 },
      { key: "no-way", label: "No way", value: 0.0 }
    ]
  },
  CAP: {
    text: "How emotionally urgent or meaningful does this task feel?",
    options: [
      { key: "not-at-all", label: "Not at all", value: 0.1 },
      { key: "somewhat", label: "Somewhat", value: 0.4 },
      { key: "strong", label: "Strong", value: 0.7 },
      { key: "overwhelming", label: "Overwhelming", value: 1.0 }
    ]
  },
  Flexion: {
    text: "Does this task feel like a good match for your current ability or mindset?",
    options: [
      { key: "no-fit", label: "No fit", value: 0.2 },
      { key: "partly-fits", label: "Partly fits", value: 0.5 },
      { key: "mostly-fits", label: "Mostly fits", value: 0.8 },
      { key: "perfect-fit", label: "Perfect fit", value: 1.0 }
    ]
  },
  Anchory: {
    text: "How easy is it for you to stay focused on a single thing right now?",
    options: [
      { key: "cant-focus", label: "Can't focus", value: 0.1 },
      { key: "scattered", label: "Scattered", value: 0.4 },
      { key: "mostly-focused", label: "Mostly focused", value: 0.7 },
      { key: "very-focused", label: "Very focused", value: 1.0 }
    ]
  },
  Grain: {
    text: "How heavy or emotionally sticky does this task feel?",
    options: [
      { key: "light", label: "Light", value: 0.2 },
      { key: "moderate", label: "Moderate", value: 0.5 },
      { key: "heavy", label: "Heavy", value: 0.75 },
      { key: "paralyzing", label: "Paralyzing", value: 1.0 }
    ]
  },
  Slip: {
    text: "How often are you drifting, losing focus, or mentally bouncing around?",
    options: [
      { key: "rarely", label: "Rarely", value: 0.2 },
      { key: "sometimes", label: "Sometimes", value: 0.5 },
      { key: "often", label: "Often", value: 0.75 },
      { key: "constantly", label: "Constantly", value: 1.0 }
    ]
  }
};