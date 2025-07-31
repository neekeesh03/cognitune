import { UserResponses, CalculationResults } from "@/types/assessment";

export function calculateLTAResults(responses: UserResponses): CalculationResults {
  const primode = responses.Primode;
  const cap = responses.CAP;
  const flexion = responses.Flexion;
  const anchory = responses.Anchory;
  const grain_base = responses.Grain;
  const slip = responses.Slip;

  // Calculate Latent Load (LL)
  const latent_load = (grain_base + (1 - anchory) + slip) / 3;

  // Adjust values based on Latent Load
  const grain = grain_base + 0.6 * latent_load;
  const anchory_mod = anchory * Math.exp(-0.4 * latent_load);
  const cap_adj = cap + (0.3 * latent_load);

  // Calculate Drive
  const numerator = cap_adj * flexion;
  const denominator = anchory_mod + grain;
  const drive = (primode * numerator / denominator) + slip;

  // Determine verdict
  let verdict: string;
  let verdictType: 'ready' | 'borderline' | 'not-ready';

  if (drive > 1.2) {
    verdict = "✅ You're cognitively ready. Start the task.";
    verdictType = 'ready';
  } else if (drive > 0.8) {
    verdict = "⚠️ Borderline. You may start but risk instability or false start.";
    verdictType = 'borderline';
  } else {
    verdict = "🚫 You're not ready. Reduce mental load or stabilize first.";
    verdictType = 'not-ready';
  }

  return {
    primode,
    cap_adj,
    flexion,
    grain,
    anchory_mod,
    slip,
    latent_load,
    drive,
    verdict,
    verdictType
  };
}