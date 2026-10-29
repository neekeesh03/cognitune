import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const rows = [
  ["Drive equation, six variables, Latent Load", "Formal model (LTA, CTT, Lagun's Law)", "Implemented as published. The equation is a theory target; this app does not claim it is validated."],
  ["Readiness cut-offs", "App tuning", "The published 1.2 / 0.8 cut-offs are strict: only about 5% of random states exceed 1.2. The app defaults to 0.9 / 0.6 until your own follow-ups let it learn your threshold. Neither set is validated."],
  ["Self-report uncertainty band", "Computational", "Monte Carlo with 0.10 error per item. The error size is an assumption."],
  ["Failure-mode labels", "Theory-derived rules", "Rule cut-offs are heuristics from the CTT failure table."],
  ["Lever ranking", "Model what-if", "Shows model sensitivity. Not a tested effect on you."],
  ["Deadline lift on CAP", "Exploratory assumption", "Motivated by threshold-like deadline initiation findings. Decay constant 36h is illustrative."],
  ["History features (level, variability, drift)", "Inspired by actigraphy findings", "Behavioral history helped predict inactivity transitions in actigraphy. Here it is applied to self-report, which is untested."],
  ["Personal calibration", "Empirical, your data", "Logistic fit on your own follow-ups. In-sample, small n, so treat as a hint."],
];
export function EvidenceTab() {
  return (
    <div className="space-y-6">
      <Card className="glass border-0 rounded-3xl"><CardHeader><CardTitle>How much to trust each part</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">Cognitune is a helper, not a medical tool. Some parts come from established ideas, others are experiments. Here is which is which.</p>
          {rows.map(r => <div key={r[0]} className="rounded-md border p-3"><div className="font-semibold">{r[0]}</div><div className="text-xs uppercase tracking-wide text-muted-foreground">{r[1]}</div><div>{r[2]}</div></div>)}
        </CardContent></Card>
      <Card className="glass border-0 rounded-3xl"><CardHeader><CardTitle>Privacy and ethics</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>All data stays in your browser. Export or delete at any time.</p>
          <p>Latent-state sensing raises cognitive-privacy concerns, so Cognitune only uses what you type in and never infers hidden states from other sources.</p>
          <p>Not a medical device. If low drive is persistent and affects daily life, talk to a clinician.</p>
        </CardContent></Card>
    </div>
  );
}
