// Tune's conversation brain. A small dialogue manager: it remembers what you said, runs multi-step flows,
// offers quick replies, and can take actions (start a timer, add a task, book a time block).
// Rule-based and private. No AI service or API key.
import { analyze } from "./text";
import { crisisReply } from "./friend";
import { suggestSteps, fmtTime } from "./plan";

export interface Chip { label: string; value: string }
export type Action =
  | { type: "timer"; minutes: number; task: string }
  | { type: "task"; title: string }
  | { type: "tasks"; items: string[] }
  | { type: "block"; title: string; start: number; dur: number }
  | { type: "earn"; kind: "started" | "task" | "journal" }
  | { type: "goto"; tab: string };
export interface Turn { messages: string[]; chips?: Chip[]; actions?: Action[] }
export interface DState {
  flow: string | null; step: string | null; slots: { task?: string; items?: string[]; hard?: string; minutes?: number; energy?: number; fix?: string };
  asked: string[]; turns: number; vague: number; ts: number; listenTurns: number;
}
export const newState = (): DState => ({ flow: null, step: null, slots: {}, asked: [], turns: 0, vague: 0, ts: Date.now(), listenTurns: 0 });
export interface Ctx { name: string; hour: number }

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17);
const pick = <T,>(arr: T[], seed: string | number) => arr[hash(String(seed)) % arr.length];
const C = (label: string, value = label): Chip => ({ label, value });
export const MENU: Chip[] = [C("Help me start something", "I can't start something"), C("I feel overwhelmed", "I feel overwhelmed"), C("Low on energy", "I'm tired"), C("Plan my day", "plan my day"), C("Just talk", "I just want to talk")];

// ---------- understanding ----------
const RX = {
  greet: /^(hi|hey|hello|yo|hiya|good (morning|afternoon|evening))\b/, howare: /how are you|how'?s it going|how do you feel|what about you/,
  stuck: /can'?t (even )?(start|begin|get started|get going)|stuck|procrastinat|putting (it )?off|avoid|don'?t want to (start|do)|unmotivated|no motivation|lazy|keep delaying/,
  overwhelm: /overwhelm|too much|so much|drowning|swamped|everything at once|don'?t know where to (start|begin)|buried|too many things/,
  tired: /\btired\b|exhaust|drained|sleepy|no energy|low energy|burn(ed|t)? out|fatigue|worn out/,
  distract: /distract|can'?t (focus|concentrate)|scroll|my phone|mind (is )?(wander|all over)|unfocused|losing focus/,
  anxious: /anxi|stress|worried|worry|panic|nervous|dread|scared|afraid|tense|on edge/,
  sad: /\bsad\b|feel(?:ing)? (?:really |so |very |kind of )?(?:down|low|empty|numb|awful|terrible|hopeless)|feeling down|depress|hopeless|lonely|\bcry|empty|numb|worthless|miserable|low mood/,
  win: /did it|finished|completed|done with|i started|proud|got it done|managed to|nailed|accomplished|i won|made progress/,
  plan: /plan (my|the) day|schedule|time ?block|what should i do|where (do|should) i start|prioriti|organi[sz]e my/,
  help: /^help$|what can you do|how does this work|what do you do|^menu$|^options$/, fun: /joke|fun fact|something fun|cheer me up|make me laugh|\bbored\b|distract me/,
  who: /who are you|are you (a )?(real|human|ai|bot|robot)|your name|what are you/, timer: /timer|pomodoro|focus session|sprint/,
  yes: /^(yes|yeah|yep|yup|sure|ok|okay|please|let'?s|do it|go|sounds good|alright|fine|why not|i do|i will|ready)\b/, no: /^(no|nope|nah|not now|later|not really|skip|nothing|i don'?t)\b/,
  bye: /^(bye|goodbye|see you|gotta go|talk later|good ?night|that'?s all|that'?s enough|i'?m done|ttyl)\b/, thanks: /^(thanks|thank you|thx|ty|cheers|appreciate)\b/,
  dunno: /don'?t know|no idea|not sure|idk|unsure|dunno/,
};
type Intent = keyof typeof RX;
function detect(t: string): Intent[] { return (Object.keys(RX) as Intent[]).filter(k => RX[k].test(t)); }
const FIRST_PRIORITY: Intent[] = ["sad", "anxious", "overwhelm", "stuck", "tired", "distract", "win", "plan", "fun", "who", "help", "timer", "howare", "greet"];

function cleanTask(raw: string): string {
  let t = raw.trim().replace(/\s+/g, " ");
  const m = t.match(/(?:i (?:need|have|want|got|should|must|'?m trying|am trying|'?m supposed|am supposed|'?ve got) to|working on|trying to|supposed to|need to|have to)\s+(.+)/i); if (m) t = m[1];
  t = t.replace(/^(it'?s|its|the thing is|about|just|my|the)\s+/i, "").replace(/\s+(but|because|and i|so|though).*$/i, "").replace(/[.!?]+$/, "").trim();
  return t.length > 70 ? t.slice(0, 67) + "..." : t;
}
function taskFromText(t: string): string | null {
  const cs = t.match(/(?:can't|cannot|won't|don't) (?:even )?(?:start|begin|get started on|get going on|face|do|touch)\s+(?:on |with )?(.+)/i); if (cs && !/^(it|this|that|anything|something|working)\b/i.test(cs[1].trim())) return cleanTask(cs[1]);
  const m = t.match(/(?:i (?:need|have|want|got|should|must) to|working on|trying to|supposed to|need to|have to)\s+([^.!?;]+)/i); return m ? cleanTask(m[1]) : null;
}
const parseItems = (t: string) => t.split(/\n|,|;|•|\s+-\s+|\band\b|\balso\b|&/i).map(s => s.replace(/^[\s\d.)-]+/, "").replace(/[.!?]+$/, "").trim()).filter(s => s.length > 2).slice(0, 8);
const num = (t: string) => { const m = t.match(/\b([1-5])\b/); if (m) return +m[1]; if (/very low|exhausted|zero|dead/.test(t)) return 1; if (/low|tired/.test(t)) return 2; if (/ok|medium|average|fine|so-so/.test(t)) return 3; if (/good|decent/.test(t)) return 4; if (/great|high|full|energi/.test(t)) return 5; return null; };
const timeChoices = (hour: number): { label: string; start: number }[] => { const base = Math.min(21, Math.max(hour + 1, 7)); return [base, Math.min(21, base + 2), 18].filter((v, i, a) => a.indexOf(v) === i).map(h => ({ label: fmtTime(h * 60), start: h * 60 })); };

// ---------- flows ----------
const JOKES = ["Why did the to-do list go to therapy? It had too many unresolved issues.", "I tried to procrastinate yesterday, but I put it off.", "Fun fact: starting is the hard part for almost everyone. Even a two-minute start counts as progress.", "Fun fact: octopuses have three hearts. Your one heart is doing just fine.", "Why don't scientists trust stairs? They're always up to something.", "Fun fact: honey never spoils. Some things do get better with time, including your focus after a break."];
const OPEN_Q = ["What's taking up the most space in your head right now?", "What would make today feel okay, even if it isn't great?", "What's one thing you're looking forward to, even a little?", "When did you last feel properly rested?", "What's something small that went right today?", "Is there anything you've been avoiding thinking about?"];
const LISTEN_Q = ["What's the heaviest part of that?", "What do you need most right now: to be heard, to fix something, or a break?", "Has this been building for a while, or is it new today?", "Is there someone you trust you could tell? Your Circle tab is there for that."];

const out = (messages: string[], chips?: Chip[], actions?: Action[]): Turn => ({ messages, chips, actions });
function go(s: DState, flow: string | null, step: string | null) { s.flow = flow; s.step = step; }

function startStuck(s: DState, intro: string[] = []): Turn {
  if (!s.slots.task) { go(s, "stuck", "task"); return out([...intro, "Let's make it smaller. What's the thing you're trying to start?"]); }
  go(s, "stuck", "hard");
  return out([...intro, `Okay, "${s.slots.task}". When you picture starting it, what feels hardest?`], [C("Not sure where to begin"), C("It feels huge"), C("I'm tired"), C("I just don't want to"), C("Something else")]);
}
function offerStep(s: DState, shrink = false): Turn {
  const steps = suggestSteps(s.slots.task || "task"); const step = steps[shrink ? 0 : 1] ?? steps[0];
  go(s, "stuck", "offer");
  const line = shrink ? `Even smaller then. Just this, for 30 seconds: ${step.text.toLowerCase()}.` : `Here's a tiny first move: ${step.text.toLowerCase()}. Two minutes, no pressure to finish.`;
  return out([line, "Want to try it with a timer?"], [C("Start the 2-minute timer", "yes, start the timer"), C("Break it into steps", "break it into steps"), C("Still too big", "still too big")]);
}
function timerTurn(s: DState): Turn {
  go(s, "stuck", "after"); const task = s.slots.task || "your task";
  return out(["Timer's on. Only one job: begin. I'll be right here.", "When you're done (or when it ends), tell me how it went."], [C("I did it", "I did it"), C("I got stuck again", "I got stuck again")], [{ type: "timer", minutes: 2, task }, { type: "earn", kind: "started" }]);
}

function stepStuck(s: DState, raw: string, t: string): Turn | null {
  switch (s.step) {
    case "task": { const task = cleanTask(raw); if (task.length < 2) return out(["What would you call it? A few words is enough."]); s.slots.task = task; return startStuck(s, ["Got it."]); }
    case "ease": { if (/easy|go|yes/.test(t)) { go(s, "stuck", "after"); return out(["Nice. Then go. I'll start a timer so you stay with it."], [C("I did it"), C("I got stuck again")], [{ type: "timer", minutes: 10, task: s.slots.task || "your task" }, { type: "earn", kind: "started" }]); } return startStuck(s); }
    case "hard": {
      s.slots.hard = t;
      if (/not sure|begin|where|plan|know how|confus|unclear/.test(t) || RX.dunno.test(t)) return offerStep(s, false);
      if (/huge|big|too much|long|hard/.test(t)) return offerStep(s, true);
      if (/tired|energy|exhaust/.test(t)) { go(s, "tired", "level"); return out(["Then your energy is the real issue, not your willpower. What's your energy right now, 1 to 5?"], [C("1"), C("2"), C("3"), C("4"), C("5")]); }
      if (/don'?t want|hate|boring|dread|ugh/.test(t)) { go(s, "stuck", "easier"); return out(["That's honest, and common. Wanting to avoid something is normal.", "What would make it just 10% less awful?"], [C("A shorter time"), C("Music or a nicer spot"), C("Someone with me"), C("Nothing really")]); }
      const sg = analyze(raw); const ack = sg.hits.Grain?.hi ? "That sounds heavy." : sg.hits.Anchory?.lo ? "Focus sounds slippery today." : "Thanks for telling me.";
      return { ...offerStep(s, false), messages: [ack, ...offerStep(s, false).messages] };
    }
    case "part": { s.slots.fix = raw; go(s, "stuck", "offer"); return out([`Perfect. Today's whole job is: ${/not sure/.test(t) ? "just looking at it for 20 seconds" : raw.toLowerCase().replace(/[.!?]+$/, "")}. Nothing more.`, "Want a two-minute timer for it?"], [C("Start the 2-minute timer", "yes, start the timer"), C("Break it into steps", "break it into steps"), C("Still too big", "still too big")]); }
    case "easier": {
      s.slots.fix = t; go(s, "stuck", "offer");
      const fix = /short/.test(t) ? "Let's keep it to 10 minutes max." : /music|spot|nicer/.test(t) ? "Put on something you like and move to a spot that feels good." : /someone/.test(t) ? "Great idea. Try Focus together in your Circle." : "Fair. Then let's trick it: we'll only do the first tiny bit.";
      return { ...offerStep(s, true), messages: [fix, ...offerStep(s, true).messages] };
    }
    case "offer": {
      if (RX.yes.test(t) || RX.timer.test(t) || /start/.test(t)) return timerTurn(s);
      if (/steps|break/.test(t)) { go(s, "stuck", "scheduled"); return out(["Done. I added it to your Plan with tiny steps you can tick off.", "Want me to put it in your day?"], [C("Yes, schedule it", "yes, put it in my day"), C("Not now", "not now")], [{ type: "task", title: s.slots.task || "My task" }]); }
      if (/too big|still|no/.test(t)) { if (s.asked.includes("shrunk")) { go(s, "stuck", "break"); return out(["Okay. Then no task today, just a doorway: open it and look at it for 20 seconds. Nothing else.", "Ready for that?"], [C("Okay, timer", "yes, start the timer"), C("Not today", "not today")]); } s.asked.push("shrunk"); return offerStep(s, true); }
      return out(["Timer, steps, or something smaller?"], [C("Start the 2-minute timer", "yes, start the timer"), C("Break it into steps", "break it into steps"), C("Still too big", "still too big")]);
    }
    case "break": { if (RX.yes.test(t) || /timer/.test(t)) return timerTurn(s); go(s, null, null); return out(["That's okay. Rest is part of the plan. I'm here whenever you want to try again."], MENU); }
    case "scheduled": {
      if (RX.yes.test(t) || /put it|day/.test(t)) { go(s, "plan", "when"); s.slots.minutes = 25; return out([`Let's book "${s.slots.task}" for 25 minutes. When?`], timeChoices(new Date().getHours()).map(x => C(x.label, `at ${x.start}`))); }
      go(s, null, null); return out(["No problem. It's saved in Plan for when you're ready. Anything else on your mind?"], MENU);
    }
    case "after": {
      if (/did it|done|finished|yes|worked|good/.test(t)) {
        s.slots.minutes = (s.slots.minutes ?? 0) + 1;
        if (s.slots.minutes >= 2) { go(s, null, null); return out(["Two rounds done. That's a real chunk of work, and you started from stuck. Take a proper break: water, stretch, look away from the screen.", "Come back whenever you want to go again."], MENU, [{ type: "earn", kind: "task" }]); } go(s, "stuck", "more"); return out([pick(["That's the hard part, done. You started.", "Look at that. You went from stuck to started.", "Nice work. Starting is the real win."], s.turns), "Want to keep the momentum for 10 more minutes, or stop here?"], [C("10 more minutes", "10 more minutes"), C("That's enough for now", "that's enough")], [{ type: "earn", kind: "task" }]); }
      go(s, "stuck", "hard"); return out(["That happens. Let's find out why.", "What got in the way?"], [C("I lost focus"), C("It was harder than I thought"), C("I got interrupted"), C("I'm too tired")]);
    }
    case "more": {
      if (/10|more|yes|keep|go/.test(t)) { go(s, "stuck", "after"); return out(["Great. Ten more. Same rule: just keep going until it rings."], [C("I did it", "I did it"), C("I got stuck again", "I got stuck again")], [{ type: "timer", minutes: 10, task: s.slots.task || "your task" }]); }
      go(s, null, null); return out([`Good stopping point. "${s.slots.task ?? "That"}" is further along than it was an hour ago.`, "Come back any time you want a nudge."], MENU);
    }
  }
  return null;
}
function stepOverwhelm(s: DState, raw: string, t: string): Turn | null {
  if (s.step === "dump") {
    const items = parseItems(raw);
    if (items.length < 2) return out(["Keep going, I'm listening. Add a few more, separated by commas or new lines."]);
    s.slots.items = items; go(s, "overwhelm", "pick");
    return out([`That's ${items.length} things. Written down, they're smaller than they felt in your head.`, "Which one would be done in under five minutes, or matters most today?"], items.slice(0, 4).map(i => C(i.length > 28 ? i.slice(0, 26) + "..." : i, i)));
  }
  if (s.step === "pick") {
    const items = s.slots.items || []; const chosen = cleanTask(raw); s.slots.task = chosen; const rest = items.filter(i => i.toLowerCase() !== raw.toLowerCase() && !chosen.toLowerCase().includes(i.toLowerCase()));
    const turn = startStuck(s, ["Good choice. Everything else can wait. I saved the rest to your Plan so it stops circling in your head."]);
    turn.actions = rest.length ? [{ type: "tasks", items: rest }] : []; return turn;
  }
  return null;
}
function stepTired(s: DState, raw: string, t: string): Turn | null {
  if (s.step === "level") {
    const n = num(t); if (!n) return out(["Just a number from 1 (empty) to 5 (full)."], [C("1"), C("2"), C("3"), C("4"), C("5")]);
    s.slots.energy = n; go(s, "tired", "choose");
    if (n <= 2) return out(["Then let's be kind to you today. Low energy is information, not failure.", "Pick the lightest option:"], [C("A 5-minute easy task"), C("Water and a short reset"), C("Rest, I'll come back")]);
    if (n === 3) return out(["Medium day. One 10-minute chunk of something that matters is plenty."], [C("Pick my 10-minute task", "a 5-minute easy task"), C("Plan around it", "plan my day")]);
    return out(["Good energy. Spend it on the hardest thing first, before it fades."], [C("Help me start it", "I can't start something")]);
  }
  if (s.step === "choose") {
    if (/easy|5|10|task/.test(t)) { if (s.slots.task) return offerStep(s, false); go(s, "stuck", "task"); return out(["Okay. What's something small you could finish in about 5 minutes?"]); }
    if (/water|reset|walk/.test(t)) { go(s, "tired", "back"); return out(["Two minutes, away from the screen: stand up, drink some water, roll your shoulders, look out a window.", "Tell me when you're back."], [C("I'm back")]); }
    if (/rest|come back/.test(t)) { go(s, "plan", "title"); return out(["Rest counts. It's not slacking, it's refuelling.", "Want me to book a short block for later today so it doesn't slip away?"], [C("Yes, book one", "yes"), C("No, thanks", "no")]); }
    return out(["Which one feels most doable?"], [C("A 5-minute easy task"), C("Water and a short reset"), C("Rest, I'll come back")]);
  }
  if (s.step === "back") { go(s, "tired", "level"); return out(["Welcome back. Quick check: energy now, 1 to 5?"], [C("1"), C("2"), C("3"), C("4"), C("5")]); }
  return null;
}
function stepDistract(s: DState, raw: string, t: string): Turn | null {
  if (s.step === "what") {
    const fix = /phone|scroll/.test(t) ? "Put your phone in another room, or face down and out of reach. Distance beats willpower." : /nois|loud|sound/.test(t) ? "Try headphones with steady, lyric-free sound, or move to a quieter spot." : /thought|mind|head/.test(t) ? "Keep a scrap list beside you. When a thought pops up, jot it down and go back." : /tab|screen|window/.test(t) ? "Close everything except what you need. One window, full screen." : "Reduce one thing that pulls you: a sound, a screen, a notification.";
    go(s, "distract", "sprint"); return out([fix, "Then run a short sprint. Ten minutes, nothing else."], [C("Start a 10-minute sprint", "yes"), C("Not now", "no")]);
  }
  if (s.step === "sprint") { if (RX.yes.test(t) || /sprint|start/.test(t)) { go(s, "stuck", "after"); s.slots.task = s.slots.task || "your sprint"; return out(["Go. I'll be here when you're done."], [C("I did it", "I did it"), C("I got stuck again", "I got stuck again")], [{ type: "timer", minutes: 10, task: s.slots.task }, { type: "earn", kind: "started" }]); } go(s, null, null); return out(["Okay. Try the change anyway, it helps even without a timer."], MENU); }
  return null;
}
function stepAnxious(s: DState, raw: string, t: string): Turn | null {
  if (s.step === "choice") {
    if (/calm|breath|1.?minute/.test(t)) { go(s, "anxious", "breathe"); return out(["Let's slow your body down first.", "Breathe in through your nose for 4. Hold for 4. Out through your mouth for 6. Do three rounds, slowly."], [C("Done"), C("Again")]); }
    go(s, "anxious", "worry"); return out(["Okay. I'm listening. What's the worry, in one sentence?"]);
  }
  if (s.step === "breathe") { if (/again/.test(t)) return out(["Same again: in for 4, hold 4, out for 6. Three rounds."], [C("Done"), C("Again")]); go(s, "anxious", "worry"); return out(["Better? Often the body calms before the mind does.", "What's the one worry about this, in a sentence?"]); }
  if (s.step === "worry") { go(s, "stuck", "part"); s.slots.task = s.slots.task || "the thing worrying you"; return out(["That makes sense, and a lot of people feel that way before something that matters.", "What's the smallest part of it that doesn't feel scary?", "Whatever you pick, we'll only do that part."], [C("Just opening it", "open it"), C("Writing one line", "write one line"), C("Telling someone", "tell someone"), C("Not sure", "not sure")]); }
  return null;
}
function stepSad(s: DState, raw: string, t: string): Turn | null {
  if (s.step === "choice") {
    if (/tell|talk|listen/.test(t)) { go(s, "listen", "on"); s.listenTurns = 0; return out(["I'm here. Take your time. What's been going on?"]); }
    if (/distract|fun/.test(t)) return fun(s);
    go(s, "sad", "stay"); return out(["Okay. No tasks, no fixing. I'm just here with you."], [C("Tell you what happened", "tell you"), C("I'll go for now", "bye")]);
  }
  if (s.step === "stay") { if (/tell/.test(t)) { go(s, "listen", "on"); return out(["Go ahead. I'm listening."]); } go(s, null, null); return out(["That's okay. Be gentle with yourself today. Your Circle is there if you want company."]); }
  return null;
}
function listen(s: DState, raw: string): Turn {
  const sg = analyze(raw); s.listenTurns += 1; go(s, "listen", "on"); const heavy = s.asked.includes("sad-origin") || sg.sentiment < -0.2 || !!sg.hits.Grain?.hi;
  const words = raw.trim().split(/\s+/); const quote = words.length > 4 ? `"${words.slice(0, 9).join(" ")}${words.length > 9 ? "..." : ""}"` : null;
  const acks = heavy ? ["That sounds really hard.", quote ? `You said ${quote}. That's a lot to hold.` : "That's a lot to hold.", "I'm glad you're telling me this.", "Thank you for trusting me with that."] : sg.sentiment > 0.2 ? ["I'm glad to hear that.", "That sounds good.", "Nice."] : ["I hear you.", quote ? `So ${quote}. Okay.` : "Mm, okay.", "That makes sense.", "Thanks for explaining."];
  const ack = acks[(s.listenTurns - 1) % acks.length];
  if (s.listenTurns >= 3 && !s.asked.includes("offer-step")) {
    s.asked.push("offer-step");
    if (s.asked.includes("sad-origin")) return out([ack, "You don't have to carry this alone. Is there someone you could message today? Your Circle tab is right there, and if it ever feels like too much, a helpline or someone you trust can help."], [C("Open my Circle", "open circle"), C("Keep talking", "keep talking")]);
    return out([ack, "Would it help to turn any of this into one small step, or do you just want to keep talking?"], [C("One small step", "help me start something"), C("Keep talking", "keep talking")]);
  }
  const pool = heavy ? LISTEN_Q : OPEN_Q; const q = pool.find(x => !s.asked.includes(x)) ?? OPEN_Q.find(x => !s.asked.includes(x)) ?? "Tell me more?"; s.asked.push(q);
  return out([ack, q]);
}
function fun(s: DState): Turn { const j = JOKES.find(x => !s.asked.includes(x)) ?? JOKES[0]; s.asked.push(j); go(s, null, null); return out([j], [C("Another one", "another joke"), C("Okay, back to it", "I can't start something"), C("Just talk", "I just want to talk")]); }
function stepWin(s: DState, raw: string): Turn | null {
  if (s.step === "how") { go(s, "win", "next"); return out([pick(["Noted. That's worth repeating.", "Love that. Remember how you did it.", "That's a useful thing to know about yourself."], raw), "Want to line up the next tiny thing, or stop on a high?"], [C("Next tiny thing", "help me start something"), C("Stop here", "that's enough")]); }
  if (s.step === "next") { go(s, null, null); return out(["Nice. Enjoy it. You earned the pause."], MENU); }
  return null;
}
function stepPlan(s: DState, raw: string, t: string, ctx: Ctx): Turn | null {
  switch (s.step) {
    case "title": { if (RX.no.test(t)) { go(s, null, null); return out(["No problem. I'm here if you change your mind."], MENU); } if (RX.yes.test(t)) { if (s.slots.task) { go(s, "plan", "dur"); return out([`"${s.slots.task}". How much time can you honestly give it?`], [C("15 min", "15"), C("25 min", "25"), C("45 min", "45")]); } go(s, "plan", "priority"); return out(["What's the one thing you'd like to put in it?"]); } return null; }
    case "priority": { s.slots.task = cleanTask(raw); go(s, "plan", "dur"); return out([`"${s.slots.task}". How much time can you honestly give it?`], [C("15 min", "15"), C("25 min", "25"), C("45 min", "45"), C("60 min", "60")]); }
    case "dur": { const n = +(t.match(/\d+/)?.[0] ?? 25); s.slots.minutes = [15, 25, 45, 60, 90].includes(n) ? n : 25; go(s, "plan", "when"); return out(["And when would you like to do it?"], timeChoices(ctx.hour).map(x => C(x.label, `at ${x.start}`))); }
    case "when": {
      const m = t.match(/at (\d+)/); let start = m ? +m[1] : null;
      if (start == null) { const h = t.match(/(\d{1,2})(?::(\d\d))?\s*(am|pm)?/); if (h) { let hh = +h[1]; if (h[3] === "pm" && hh < 12) hh += 12; if (h[3] === "am" && hh === 12) hh = 0; start = hh * 60 + (h[2] ? +h[2] : 0); } }
      if (start == null) return out(["Tell me a time like 3pm or 15:30, or tap one."], timeChoices(ctx.hour).map(x => C(x.label, `at ${x.start}`)));
      if (start < 24) start *= 60; const dur = s.slots.minutes ?? 25; const title = s.slots.task || "Focus block"; go(s, "stuck", "after");
      return out([`Booked: "${title}" at ${fmtTime(start)} for ${dur} minutes. You'll find it in Plan.`, "That's a real plan, not a wish. Want to try a 2-minute start right now?"], [C("Start the 2-minute timer", "yes, start the timer"), C("I'll wait for then", "that's enough")], [{ type: "block", title, start, dur }]);
    }
  }
  return null;
}

// ---------- entry point ----------
export function respond(state: DState, raw: string, ctx: Ctx): { state: DState; turn: Turn } {
  const s: DState = JSON.parse(JSON.stringify(state)); s.turns += 1; s.ts = Date.now();
  const text = raw.trim(); const t = text.toLowerCase();
  const sg = analyze(text); if (sg.crisis) return { state: s, turn: out(crisisReply()) };
  const intents = detect(t); const strong = FIRST_PRIORITY.find(i => intents.includes(i));
  // 0. global commands work anywhere
  if (RX.bye.test(t)) { const task = s.slots.task; go(s, null, null); return { state: s, turn: out([task ? `Good talking. Next up: "${task}". Small steps. You've got this.` : "Good talking with you. I'm here whenever you want me."], [C("Start something else", "I can't start something"), C("Plan my day", "plan my day")]) }; }
  if (RX.thanks.test(t)) return { state: s, turn: out([pick(["Anytime.", "Glad to help.", "Of course."], s.turns), "Anything else on your mind?"], MENU) };
  if (RX.who.test(t)) return { state: s, turn: out(["I'm Tune, your companion in Cognitune. I'm not a person and not an AI service: I'm a set of simple rules that listens, remembers what you tell me, and helps you take tiny first steps.", "What we say here stays on your device."], MENU) };
  if (strong === "help" && !s.flow) return { state: s, turn: out(["I can help you start something, untangle an overwhelming day, plan a time block, or just listen. What do you need?"], MENU) };
  if (strong === "fun" && !/distract/.test(t)) return { state: s, turn: fun(s) };

  // 1. continue an active flow
  let turn: Turn | null = null;
  const inFreeText = ["task", "dump", "priority", "worry", "on", "how"].includes(s.step || "");
  const switchIntent = (strong === "sad" || strong === "anxious" || strong === "overwhelm") && s.flow !== strong && !(s.flow === "sad" || s.flow === "anxious" || s.flow === "listen");
  const sameFlow = false;
  const answeringStep = s.flow && s.step && !RX.bye.test(t) && (!switchIntent || sameFlow || /^(i did it|i got stuck)/.test(t));
  if (answeringStep) {
    if (s.flow === "stuck") turn = stepStuck(s, text, t);
    else if (s.flow === "overwhelm") turn = stepOverwhelm(s, text, t);
    else if (s.flow === "tired") turn = stepTired(s, text, t);
    else if (s.flow === "distract") turn = stepDistract(s, text, t);
    else if (s.flow === "anxious") turn = stepAnxious(s, text, t);
    else if (s.flow === "sad") turn = stepSad(s, text, t);
    else if (s.flow === "listen") turn = /open (my )?circle/.test(t) ? out(["Taking you there. I'll be here when you get back."], MENU, [{ type: "goto", tab: "circle" }]) : /keep talking/.test(t) ? out(["Okay. What's on your mind?"]) : /small step|help me start/.test(t) ? startStuck(s) : listen(s, text);
    else if (s.flow === "win") turn = stepWin(s, text);
    else if (s.flow === "plan") turn = stepPlan(s, text, t, ctx);
    if (turn) return { state: s, turn };
  }

  // 2. greetings
  if (strong === "greet" || strong === "howare") { const nm = ctx.name ? `, ${ctx.name}` : ""; go(s, null, null); return { state: s, turn: out([strong === "howare" ? "I'm doing well, thanks for asking. More importantly, how are you?" : `Hi${nm}. How are you arriving today?`], [C("Stuck", "I can't start something"), C("Overwhelmed", "I feel overwhelmed"), C("Low energy", "I'm tired"), C("Pretty good", "I'm doing well"), C("Plan my day", "plan my day")]) }; }
  if (/doing well|pretty good|feeling good|i'?m good|great|fine$/.test(t) && !strong) return { state: s, turn: out(["Love that. Let's use it: what's one thing you'd like to move forward today?"], [C("Help me start it", "I can't start something"), C("Plan my day", "plan my day")]) };

  // 3. start a flow from intent
  switch (strong) {
    case "sad": go(s, "sad", "choice"); s.asked.push("sad-origin"); return { state: s, turn: out(["I'm really sorry you're feeling like this. You don't have to do anything about it right now.", "Would you like to tell me what's going on, or would a little distraction help?"], [C("Tell you", "I want to tell you"), C("Distract me", "distract me"), C("Just stay with me", "just stay")]) };
    case "anxious": go(s, "anxious", "choice"); return { state: s, turn: out(["That sounds stressful. Your body is trying to protect you, even if it's uncomfortable.", "Want a one-minute calm-down, or would you rather talk it through?"], [C("Calm-down", "calm down"), C("Talk it through", "talk it through")]) };
    case "overwhelm": go(s, "overwhelm", "dump"); return { state: s, turn: out(["That's a lot to carry. Let's get it out of your head and onto the screen.", "List everything on your mind, separated by commas or new lines. Don't sort it."]) };
    case "stuck": { const task = taskFromText(text); if (task) s.slots.task = task; return { state: s, turn: startStuck(s, ["Starting is the hardest part for almost everyone. It isn't laziness."]) }; }
    case "tired": go(s, "tired", "level"); return { state: s, turn: out(["Low energy is real information, not a flaw. What's your energy right now, 1 to 5?"], [C("1"), C("2"), C("3"), C("4"), C("5")]) };
    case "distract": go(s, "distract", "what"); return { state: s, turn: out(["Focus can be slippery. What pulls you away the most?"], [C("My phone"), C("Noise around me"), C("My own thoughts"), C("Too many tabs")]) };
    case "win": go(s, "win", "how"); return { state: s, turn: out(["That's great. Truly. Take a second to enjoy it.", "What helped you get it done?"], undefined, [{ type: "earn", kind: "started" }]) };
    case "plan": go(s, "plan", "priority"); return { state: s, turn: out(["Let's make one real plan instead of a long list.", "What's the one thing that would make today a win?"]) };
    case "fun": return { state: s, turn: fun(s) };
    case "timer": { s.slots.task = s.slots.task || taskFromText(text) || "your task"; return { state: s, turn: timerTurn(s) }; }
  }
  const task = taskFromText(text);
  if (task) { s.slots.task = task; go(s, "stuck", "ease"); return { state: s, turn: out([`Okay: "${task}".`, "Is starting it easy or tricky right now?"], [C("Easy, I'll go", "easy"), C("Tricky", "tricky")]) }; }

  // 4. fallback: listen, vary questions, offer a menu if we're going around in circles
  const short = text.split(/\s+/).filter(Boolean).length <= 2;
  if (short) { s.vague += 1; if (s.vague >= 2) { s.vague = 0; return { state: s, turn: out(["No rush. Where would you like to go from here?"], MENU) }; } return { state: s, turn: out([pick(["Take your time.", "I'm here.", "Want to say a bit more?"], s.turns)], [C("Help me start something", "I can't start something"), C("Just talk", "I just want to talk")]) }; }
  s.vague += 1; if (s.vague >= 3 && !s.asked.includes("menu")) { s.asked.push("menu"); return { state: s, turn: out(["I want to be useful, not just chat. Where would you like to go?"], MENU) }; }
  go(s, "listen", "on"); return { state: s, turn: listen(s, text) };
}

