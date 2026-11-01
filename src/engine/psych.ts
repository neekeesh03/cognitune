// Psychology lens. Each lens ties one published idea to this person's own start log.
// Rules: runs on this device, says "not enough yet" instead of guessing, labels how solid the science is,
// and never makes a medical or diagnostic claim.
import { dayKeyOf, type Log } from "@/engine/pattern";

export type Strength = "Strong" | "Moderate" | "Early";
export interface Theory { id: string; name: string; who: string; idea: string; use: string; strength: Strength; fact: string }

/** The ideas behind Lagomo. Facts were checked against the original papers or meta-analyses (Nov 2026). */
export const THEORIES: Theory[] = [
  { id: "ii", name: "If-then plans", who: "Gollwitzer, 1999; Gollwitzer & Sheeran, 2006; Sheeran et al., 2025", idea: "Deciding in advance \"when X happens, I will do Y\" hands the start to a cue.", use: "Your if-then plan below, and the tiny first step in Get unstuck.", strength: "Strong", fact: "94 tests gave a medium-to-large effect on reaching goals (d = .65). A 2025 review of 642 tests found effects from d = .27 to .66, bigger for if-then plans and for motivated people." },
  { id: "habit", name: "Habits take time", who: "Lally et al., 2010; Singh et al., 2024", idea: "Repeating an action in the same setting makes it more automatic, slowly and unevenly.", use: "Habit clock: day count, active days, and your most steady start window.", strength: "Strong", fact: "Median 66 days to reach a steady habit, but anywhere from 18 to 254. A missed day did not break the curve." },
  { id: "tmt", name: "Deadlines pull you in", who: "Steel & Konig, 2006; Steel, 2007", idea: "The closer and bigger the payoff, and the less unpleasant the task, the sooner you start.", use: "Deadline lift in the drive guess, and making the first step less unpleasant.", strength: "Strong", fact: "A meta-analysis of 691 correlations found task unpleasantness, delay, self-belief and impulsiveness are strong predictors of putting things off." },
  { id: "sc", name: "Kindness helps you restart", who: "Sirois, 2014; Neff", idea: "Harsh self-blame after a slip makes starting harder. Self-compassion lowers the stress that feeds delay.", use: "No guilt streak losses, no scolding rabbit, and a kind restart message after a gap.", strength: "Moderate", fact: "Across four samples, more procrastination went with less self-compassion (r = -.31) and more stress. Mostly correlational, so it suggests rather than proves." },
  { id: "fresh", name: "Fresh starts", who: "Dai, Milkman & Riis, 2014, 2015", idea: "New weeks, months and birthdays feel like a clean page, which lifts the urge to begin.", use: "Monday and first-of-month nudges, and Fresh Start cards.", strength: "Moderate", fact: "Search and gym visits rise after temporal landmarks. Lab studies show it works when the date signals a new beginning." },
  { id: "social", name: "Others nearby", who: "Zajonc, 1965; Bond & Titus, 1983; 2024 movement review", idea: "Another person present changes effort. It helps on simple, well-practised tasks.", use: "Start together, the Corner, and the quiet rabbit beside your timer.", strength: "Moderate", fact: "A 2024 review of 82 studies found simple tasks are usually helped, while precise tasks under pressure are mixed. Whether it helps study starts is not settled." },
  { id: "own", name: "Ownership of what you shape", who: "Pierce et al., 2003; Norton et al., 2012", idea: "Naming and customising makes something feel yours, so you value and use it more.", use: "Naming your rabbit and picking its coat.", strength: "Moderate", fact: "The IKEA effect holds when you finish what you made. Virtual pets fade after a couple of weeks, so the rabbit has to earn its keep." },
  { id: "sdt", name: "Choice and autonomy", who: "Deci & Ryan, 2000", idea: "People keep going when they choose, feel capable and feel connected.", use: "Everything is optional, small wins show progress, and friends are one tap away.", strength: "Strong", fact: "A large body of work links autonomy, competence and relatedness to lasting motivation. Gamified apps help when they support these three, not when they only add points." },
  { id: "goal", name: "Closer feels faster", who: "Hull, 1932; Kivetz et al., 2006", idea: "Effort rises as the finish line looks near, and a head start helps.", use: "The weekly 3-starts bar, which begins with credit for today.", strength: "Moderate", fact: "Shown in loyalty-card and lab studies. It works best when progress is visible and the goal is small." },
  { id: "fogg", name: "Make it tiny", who: "Fogg, 2009", idea: "Behaviour happens when motivation, ability and a prompt line up. Shrinking the task is the easiest lever.", use: "Two-minute starts, micro steps, Get unstuck.", strength: "Early", fact: "Popular and useful, but mostly a design model with limited direct tests. Treated here as a practical rule, not a proven law." },
  { id: "tem", name: "Mood before task", who: "Sirois & Pychyl, 2013", idea: "Putting things off is partly a way to dodge a bad feeling right now.", use: "Check-ins ask how heavy it feels and the rabbit offers a gentler first step.", strength: "Moderate", fact: "Delay is better explained as short-term mood repair than as poor time management." },
  { id: "ll", name: "Lagun's Law", who: "Lagun (this project)", idea: "A published model of the drive to start, built on ideas from the theories above.", use: "Experimental Drive guess, always scored against a plain guess.", strength: "Early", fact: "Not yet independently tested. Lagomo shows it only next to your own results and says when it is behind." },
];

export interface Finding { id: string; title: string; theory: string; strength: Strength; body: string | null; need?: string; tip?: string; tone?: "good" | "info" | "care" }

const DAY = 864e5;
const dayNum = (k: string) => Math.round(new Date(k + "T12:00").getTime() / DAY);
const pct = (a: number, b: number) => Math.round((100 * a) / Math.max(1, b));

export interface Plan { hour: number; cue: string; act: string }
export const WEEK_GOAL = 3;

/** Run every lens on the log. `now` is passed in so results are testable. */
export function lenses(log: Log, now: number, plan: Plan | null): Finding[] {
  const S = log.starts.filter(s => s.ts <= now + 36e5); const out: Finding[] = [];
  const days = [...new Set(S.map(s => dayKeyOf(s.ts)))].sort(); const dn = days.map(dayNum); const today = dayNum(dayKeyOf(now));

  // 1. Habit clock (Lally): where you are on the road, steady window, current run.
  {
    const first = dn[0]; const since = first === undefined ? 0 : today - first + 1; const active28 = dn.filter(d => today - d < 28).length;
    let run = 0; for (let d = dn.includes(today) ? today : today - 1; dn.includes(d); d--) run++;
    const blocks = [0, 3, 6, 9, 12, 15, 18, 21].map(h => ({ h, k: S.filter(s => ((new Date(s.ts).getHours() - h + 24) % 24) < 3).length })).sort((a, b) => b.k - a.k)[0];
    const share = S.length ? pct(blocks.k, S.length) : 0;
    out.push(S.length < 3 ? { id: "habit", title: "Your habit clock", theory: "Lally et al., 2010", strength: "Strong", body: null, need: `${3 - S.length} more starts to draw it.` }
      : { id: "habit", title: "Your habit clock", theory: "Lally et al., 2010", strength: "Strong", tone: "info",
        body: `Day ${since} since your first start. You started on ${active28} of the last 28 days${run > 1 ? ` and you are on a ${run}-day run` : ""}. ${share >= 40 && S.length >= 6 ? `${share}% of starts fall in one 3-hour window (from ${String(blocks.h).padStart(2, "0")}:00), a steady cue.` : "No steady window yet, which is normal early on."}`,
        tip: `People in the habit study took a median of 66 days (18 to 254). Missing a day did not reset the curve, so ${since < 66 ? "keep it light" : "you are past the median"}.` });
  }

  // 2. If-then plan (Gollwitzer): do starts land after your chosen cue?
  {
    if (!plan) out.push({ id: "ii", title: "Your if-then plan", theory: "Gollwitzer, 1999", strength: "Strong", body: null, need: "Set a plan below: when ___, I will start ___.", tip: "Plans in if-then form beat plain intentions in 94 tests (d = .65)." });
    else {
      const hit = (s: { ts: number }) => ((new Date(s.ts).getHours() - plan.hour + 24) % 24) < 3; const after = S.filter(hit).length;
      const dd = days.length ? new Set(S.filter(hit).map(s => dayKeyOf(s.ts))).size : 0; const since = Math.max(1, Math.min(28, days.length ? today - dn[0] + 1 : 1));
      out.push({ id: "ii", title: "Your if-then plan", theory: "Gollwitzer, 1999", strength: "Strong", tone: "info",
        body: `"When ${plan.cue}, I will ${plan.act}." ${S.length < 3 ? "Start a few times and I will check how often it fires." : `You started within 3 hours of ${String(plan.hour).padStart(2, "0")}:00 on ${dd} of ${since} days (${pct(after, S.length)}% of all your starts).`}`,
        tip: dd >= 3 && dd / since >= 0.4 ? "The cue is working for you. Keep it exactly the same." : "If it misses, move the cue to a moment you already do every day." });
    }
  }

  // 3. Other people (social facilitation / body doubling): only from outcomes you reported.
  {
    const tg = S.filter(s => s.together), so = S.filter(s => !s.together);
    if (tg.length < 3 || so.length < 3) out.push({ id: "social", title: "Starting with someone", theory: "Zajonc, 1965; Bond & Titus, 1983", strength: "Moderate", body: null, need: "Needs 3 starts together and 3 alone." });
    else {
      const wk = (a: typeof S) => new Set(a.map(s => dayKeyOf(s.ts))).size; const rt = (a: typeof S) => Math.round(100 * a.filter(s => s.o === "did").length / Math.max(1, a.filter(s => s.o).length));
      const rep = S.filter(s => s.o).length;
      out.push({ id: "social", title: "Starting with someone", theory: "Zajonc, 1965; Bond & Titus, 1983", strength: "Moderate", tone: "info",
        body: `You started ${tg.length} times together and ${so.length} alone, on ${wk(tg)} and ${wk(so)} different days.${rep >= 6 ? ` You said you finished ${rt(tg)}% of shared starts and ${rt(so)}% of solo ones.` : ""}`,
        tip: "A real person nearby usually helps with simple tasks. With only your own data this is a hint, not proof." });
    }
  }

  // 4. Fresh starts (Dai & Milkman): Mondays and early month vs chance.
  {
    if (S.length < 8) out.push({ id: "fresh", title: "Fresh starts", theory: "Dai, Milkman & Riis, 2014", strength: "Moderate", body: null, need: `${8 - S.length} more starts to compare Mondays with other days.` });
    else {
      const mon = S.filter(s => new Date(s.ts).getDay() === 1).length, early = S.filter(s => new Date(s.ts).getDate() <= 3).length;
      const mshare = pct(mon, S.length); const lift = mshare / (100 / 7);
      out.push({ id: "fresh", title: "Fresh starts", theory: "Dai, Milkman & Riis, 2014", strength: "Moderate", tone: lift >= 1.4 ? "good" : "info",
        body: `${mshare}% of your starts are on a Monday (chance would be about 14%)${early ? ` and ${early} fell in the first three days of a month` : ""}. ${lift >= 1.4 ? "You respond to new beginnings." : lift <= 0.6 ? "Mondays are not your thing, so don't wait for them." : "No clear fresh-start pull in your data."}`,
        tip: lift >= 1.4 ? "Save one tiny plan for Sunday evening so Monday starts itself." : "Pick your own landmarks: a coffee, a lesson ending, getting home." });
    }
  }

  // 5. Lapses and kindness (Sirois): how fast you come back.
  {
    const gaps: number[] = []; for (let i = 1; i < dn.length; i++) { const g = dn[i] - dn[i - 1] - 1; if (g >= 2) gaps.push(g); }
    const since = dn.length ? today - dn[dn.length - 1] : 0;
    if (dn.length < 4) out.push({ id: "lapse", title: "Coming back after a gap", theory: "Sirois, 2014", strength: "Moderate", body: null, need: "Needs a few active days first." });
    else {
      const med = gaps.length ? [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 0;
      out.push({ id: "lapse", title: "Coming back after a gap", theory: "Sirois, 2014", strength: "Moderate", tone: "care",
        body: gaps.length === 0 ? "You haven't had a gap of 2 or more days yet. When you do, a restart counts the same as any start." : `You've had ${gaps.length} gap${gaps.length > 1 ? "s" : ""} of 2+ days and you came back after a median of ${med} day${med === 1 ? "" : "s"}. That is a skill. ${since >= 2 ? `It's been ${since} days now, and today's start is the whole job.` : ""}`,
        tip: "Blaming yourself makes the next start harder. Try: \"That's a day. What's the two-minute version?\"" });
    }
  }

  // 6. Body and mood before the task (Sirois & Pychyl): sleep and dread vs starts.
  {
    const ck = log.checks; const hasStart = (d: string) => days.includes(d);
    const ok = ck.filter(c => c.sleep >= 3), bad = ck.filter(c => c.sleep <= 1);
    const heavy = ck.filter(c => c.dread >= 3), light = ck.filter(c => c.dread <= 1);
    const r = (a: typeof ck) => pct(a.filter(c => hasStart(c.day)).length, a.length);
    if ((ok.length < 3 || bad.length < 3) && (heavy.length < 3 || light.length < 3)) out.push({ id: "mood", title: "How you feel and when you start", theory: "Sirois & Pychyl, 2013", strength: "Moderate", body: null, need: "Needs a few daily check-ins on both good and rough days." });
    else {
      const parts: string[] = [];
      if (ok.length >= 3 && bad.length >= 3) parts.push(`After good sleep you started on ${r(ok)}% of days, after poor sleep ${r(bad)}%.`);
      if (heavy.length >= 3 && light.length >= 3) parts.push(`When it felt heavy you started on ${r(heavy)}% of days, when it felt light ${r(light)}%.`);
      out.push({ id: "mood", title: "How you feel and when you start", theory: "Sirois & Pychyl, 2013", strength: "Moderate", tone: "info", body: parts.join(" "), tip: "Delay is often about dodging a bad feeling. On heavy days shrink the first step instead of pushing harder." });
    }
  }

  // 7. Weekly goal gradient (Kivetz): 3 starts on 3 days this week, with endowed credit for today.
  {
    const wk = new Set(S.filter(s => now - s.ts < 7 * DAY).map(s => dayKeyOf(s.ts))).size; const left = Math.max(0, WEEK_GOAL - wk);
    out.push({ id: "goal", title: "This week", theory: "Kivetz et al., 2006", strength: "Moderate", tone: left === 0 ? "good" : "info",
      body: left === 0 ? `You started on ${wk} days in the last 7. Goal reached, anything more is a bonus.` : `${wk} of ${WEEK_GOAL} start days in the last 7. ${left === 1 ? "One more and the week is done." : `${left} to go.`}`, tip: "Progress feels faster the closer it looks, so the bar is small on purpose." });
  }

  // 8. Deadline pull (Steel): from dated tasks only.
  {
    const w = S.filter(s => s.dueIn !== null);
    if (w.length < 4) out.push({ id: "tmt", title: "Deadline pull", theory: "Steel & Konig, 2006", strength: "Strong", body: null, need: `${4 - w.length} more starts on tasks with a due date.` });
    else {
      const late = w.filter(s => (s.dueIn as number) <= 2).length, early = w.filter(s => (s.dueIn as number) >= 5).length;
      out.push({ id: "tmt", title: "Deadline pull", theory: "Steel & Konig, 2006", strength: "Strong", tone: "info",
        body: `${pct(late, w.length)}% of your dated starts happened in the last 2 days and ${pct(early, w.length)}% a week or more ahead.`,
        tip: late / w.length >= 0.6 ? "The clock is your fuel. Fake it: set an earlier personal deadline and tell a friend." : "You start early often. Protect that with a tiny plan the day before." });
    }
  }
  return out;
}

const KEY = "lagomo.ifthen.v1";
export const loadPlan = (): Plan | null => { try { const p = JSON.parse(localStorage.getItem(KEY) || "null"); return p && typeof p.hour === "number" && p.cue && p.act ? p : null; } catch { return null; } };
export const savePlan = (p: Plan | null) => { if (p) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY); window.dispatchEvent(new Event("lagomo:ifthen")); };
