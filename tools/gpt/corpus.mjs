// Builds the training text for the Lagomo language model (the small GPT in tools/gpt).
// Everything here is original text written for Lagomo. No outside model, no scraped data, no user data.
// Each example is: conversation act (from the classifier) + what the person said -> what the rabbit says.
// Output: tools/gpt/out/corpus.jsonl  {act, user, reply, split}   split = train | val | hand
import fs from "fs";
import { build } from "../talk/data.mjs";
import { HAND } from "../talk/hand.mjs";
import { OOD } from "../talk/ood.mjs";
import { GEN_ACTS } from "./vocab.mjs";

let seed = 20261102; const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = a => a[Math.floor(R() * a.length)];
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

// Acts the language model is allowed to speak for. Crisis, "low", actions (timers, plans) stay with the written engine.

const ACK = {
  greet: ["Hey, good to see you.", "Hi! I'm glad you're here.", "Hello again.", "Hey there.", "Hi, nice of you to stop by.", "Hey! Welcome back."],
  thanks: ["Any time.", "Happy to help.", "You're welcome.", "Glad it helped.", "Of course.", "That makes me happy to hear."],
  howru: ["I'm doing well, thanks for asking. I'm an AI, so my day is mostly waiting for you.", "Pretty good! I'm a rabbit made of maths, and I like it when you drop by.", "Calm and cheerful, thanks. I'm software, so I don't get tired.", "I'm good. Mostly I'm happy you're here."],
  chitchat: ["I like carrots, but I'm software and have never tried one.", "I'm a rabbit made of maths who lives on your device. It's a quiet life.", "Fun fact: rabbits can see almost all the way around them without turning their heads.", "I can't go outside, but I like hearing about it.", "That's a fun thing to wonder about."],
  want_to_talk: ["I'm here and I'm listening.", "Of course. Take your time.", "Yes, let's talk.", "Sure, I'm all ears.", "I'm listening."],
  share: ["Thanks for telling me.", "Okay, I'm following.", "I see.", "Got it, thanks for sharing that.", "Mm, that sounds like a full day.", "Good to know."],
  vent: ["That sounds really frustrating.", "Ugh, that sounds like a lot to deal with.", "I can hear how annoying that was.", "That doesn't sound fair.", "It makes sense that you're upset.", "I'm sorry, that sounds rough.", "That sounds exhausting."],
  good_mood: ["That's nice to hear.", "I'm glad.", "That sounds like a good day.", "That's lovely.", "Love that for you."],
  win: ["That's something to be proud of.", "Yes! That counts.", "Nice work, that one is yours.", "You did that. Well done.", "That's a real win."],
  tired: ["That sounds draining.", "Being tired makes everything harder.", "Rest counts too.", "That sounds like a long day."],
  overwhelm: ["That's a lot to carry.", "That's a lot at once.", "No wonder it feels heavy.", "That's plenty for anyone."],
  scared: ["That sounds scary. It makes sense to feel that way.", "That worry is really common.", "It's okay to feel nervous about it.", "I hear you. That's a lot of pressure."],
  boring: ["Boring is real.", "Tedious things are hard to face.", "Ugh, dull tasks are the worst."],
  big: ["That does sound like a lot.", "Big things feel impossible all at once.", "That's a big one."],
  distract: ["That happens to everyone.", "Phones are built to pull us in.", "It's easy to drift."],
  unclear: ["Not knowing where to start is really common.", "That fog is normal when something is vague.", "A vague task is hard to begin."],
  motivate: ["You don't need motivation to start.", "You've started before, and you can again.", "Motivation usually shows up after you begin."],
  ask_break: ["Yes, rest is allowed.", "Of course. A real break is part of the work.", "A break sounds right."],
  yes: ["Okay, good.", "Great.", "Alright."],
  no: ["Okay, no pressure.", "That's fine.", "No problem."],
  other: ["I'm not sure I followed, but I'm here.", "Hmm, tell me a bit more.", "I may be missing it."],
};
const Q = {
  greet: ["What's going on today?", "How is your day so far?", "What's on your mind?", "Want to talk, or start something small?"],
  thanks: ["Want to keep going, or take a breather?", "Anything small you'd like to get done next?", "How are you feeling now?"],
  howru: ["How are you?", "How about you?", "How is your day going?", "What kind of day is it for you?"],
  chitchat: ["What about you?", "What are you into lately?", "What's something you enjoyed this week?", "Tell me something about your day?"],
  want_to_talk: ["What's on your mind?", "What happened today?", "Where would you like to begin?", "What's going on?"],
  share: ["How's your energy right now?", "How did that leave you feeling?", "Is there anything you've been putting off?", "What was the best part?", "What part of it stayed with you the most?"],
  vent: ["What part of it stayed with you the most?", "How did that leave you feeling?", "What do you wish had gone differently?", "What would have made it a little better?", "Do you want to say more about it?", "Is there anything about it you're still thinking about?"],
  good_mood: ["What made it good?", "Want to use that energy on one small thing?", "What was the best part?", "Anything you'd like to do with it?"],
  win: ["How does it feel?", "What helped you get it done?", "Want to pick another small one, or enjoy this for a bit?", "What was the hardest part?"],
  tired: ["What took the most out of you today?", "Did you get some sleep?", "Is it more your body or your head that's tired?", "Would a short rest help?"],
  overwhelm: ["What's weighing on you the most?", "Which part is loudest right now?", "If you could drop one thing, which would it be?", "What's the one thing that can't wait?"],
  scared: ["What worries you the most about it?", "What's the scariest part?", "What do you think might happen?", "Would a very rough first try feel easier?"],
  boring: ["What if we made it two minutes long?", "Is there a treat you could pair with it?", "What's the most boring part?"],
  big: ["Which small piece could you do first?", "What's the very first part?", "What would a tiny version look like?"],
  distract: ["Where is your phone right now?", "What pulled you away?", "Could you put it in another room for two minutes?"],
  unclear: ["What is the thing you're avoiding?", "What's the first thing that comes to mind?", "Which task is it?"],
  motivate: ["What's one thing you could try for two minutes?", "What's a tiny first move?", "What has worked for you before?"],
  ask_break: ["How long do you want to rest?", "Want me to be here when you're back?", "What would feel restful?"],
  yes: ["Go on, I'm listening.", "What's next?", "Tell me more."],
  no: ["What would you like to do instead?", "I'm here if you change your mind.", "Want to just talk?"],
  other: ["Can you say that another way?", "What do you mean?", "What's on your mind?"],
};
const TOPICS = {
  work: { words: ["boss", "manager", "work", "job", "meeting", "coworker", "colleague", "office", "client", "shift"], line: ["It sounds like work took a lot out of you.", "Work can really drain you."] },
  school: { words: ["school", "class", "teacher", "exam", "homework", "professor", "college", "lecture", "classmate", "grades"], line: ["It sounds like school is weighing on you.", "School stress is real."] },
  family: { words: ["mum", "mom", "dad", "brother", "sister", "family", "parents", "grandma", "cousin"], line: ["Family stuff can be hard because it matters so much.", "It sounds like something at home is on your mind."] },
  friends: { words: ["friend", "friends", "roommate", "partner", "girlfriend", "boyfriend", "bestie", "group chat"], line: ["Friend stuff can really sting.", "It sounds like people you care about are on your mind."] },
  money: { words: ["money", "rent", "bills", "salary", "broke", "debt"], line: ["Money worries are heavy.", "It sounds like money is on your mind."] },
};
const SUBJ = ["my boss", "my manager", "my teacher", "my professor", "my friend", "my roommate", "my mum", "my dad", "my brother", "my sister", "my partner", "a coworker", "a classmate", "my group chat", "my landlord", "my client"];
const EVT = ["yelled at me", "ignored my message", "cancelled on me again", "didn't listen to me", "said something rude", "gave me too much work", "blamed me for something", "forgot about me", "changed the plan last minute", "criticised my work", "kept interrupting me", "was in a bad mood all day"];
const GOOD = ["I had a great day", "I got some good news today", "my day went really well", "I'm feeling pretty happy today", "I went for a walk and it was lovely", "I saw my friends and it was fun", "today was actually nice", "I slept well and feel good"];
const WINS = ["I finished my homework", "I sent that email I was avoiding", "I cleaned my room", "I did the first page of my report", "I started studying for my exam", "I finally booked the appointment", "I did my workout", "I made the call I was dreading"];
const TIRED = ["I'm exhausted after work", "I barely slept last night", "I'm so tired from school", "my class wore me out", "I'm drained today", "I had a long day at the office"];
const OVER = ["I have too much at work and I can't keep up", "school is piling up and I'm swamped", "everything at home and work is hitting at once", "my deadlines are all at the same time", "my family, my job and my bills are too much right now"];
const SCARED = ["I'm nervous about my exam", "I'm scared my boss will hate my work", "I'm worried my presentation will go badly", "I'm afraid to talk to my teacher about it", "I'm anxious about my money situation"];
const SHARE = ["today was a normal day at work", "I had class and then went home", "I met my friend for lunch", "my brother visited today", "I watched a show after school", "nothing special happened at the office"];
const clean = s => s.toLowerCase().replace(/[\u2019]/g, "'").replace(/[^a-z0-9 .,'?!:;\-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 110);
const topicOf = t => { const l = " " + t.toLowerCase().replace(/[^a-z ]/g, " ") + " "; for (const [k, v] of Object.entries(TOPICS)) if (v.words.some(w => l.includes(" " + w + " "))) return k; return null; };

const LISTEN = new Set(["vent", "share", "tired", "overwhelm", "scared", "good_mood", "win"]);
function replyFor(act, user) {
  const parts = [pick(ACK[act])]; const tp = topicOf(user);
  if (tp && LISTEN.has(act) && R() < 0.55) parts.push(pick(TOPICS[tp].line));
  if (!(act === "thanks" && R() < 0.2) && !(act === "yes" && R() < 0.2)) parts.push(pick(Q[act]));
  return parts.join(" ");
}
const stories = [];
for (const s of SUBJ) for (const e of EVT) stories.push([R() < 0.7 ? "vent" : "share", `${s} ${e}`]);
for (const g of GOOD) stories.push(["good_mood", g]); for (const w of WINS) stories.push(["win", w]); for (const t of TIRED) stories.push(["tired", t]);
for (const o of OVER) stories.push(["overwhelm", o]); for (const s of SCARED) stories.push(["scared", s]); for (const s of SHARE) stories.push(["share", s]);
const FRONT = ["", "", "", "honestly ", "so ", "ugh ", "like ", "today ", "i just feel like ", "and "];

const rows = []; const { train, test } = build();
const seen = new Set(); const add = (act, user0, forceSplit) => {
  const user = clean(user0); if (!user) return; const key = act + "|" + user; const split = forceSplit ?? (hash(user) % 20 === 0 ? "val" : "train");
  const reps = split === "train" ? 1 : 1; void reps;
  if (split === "train" && seen.has(key)) { /* allow a few different replies for the same message */ if (R() < 0.7) return; }
  seen.add(key); rows.push({ act, user, reply: replyFor(act, user), split });
};
const perAct = {}; for (const e of [...train, ...test]) { if (!GEN_ACTS.includes(e.y)) continue; (perAct[e.y] ??= new Set()).add(e.x); }
for (const act of GEN_ACTS) { const xs = [...(perAct[act] ?? [])]; for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; } const cap = LISTEN.has(act) ? 500 : 420; for (const x of xs.slice(0, cap)) add(act, x); }
for (let k = 0; k < 6000; k++) { const [act, u] = pick(stories); add(act, pick(FRONT) + u); }
// hand-written checks: real phrasing the generator was not shaped on. Reply is a reference only; used for act-fit and safety checks, never for training.
const handAll = [...HAND, ...OOD].filter(h => GEN_ACTS.includes(h[2]));
for (const [x, , act] of handAll) rows.push({ act, user: clean(x), reply: "", split: "hand" });
fs.mkdirSync(new URL("./out/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("./out/corpus.jsonl", import.meta.url), rows.map(r => JSON.stringify(r)).join("\n"));
const c = rows.reduce((a, r) => (a[r.split] = (a[r.split] ?? 0) + 1, a), {}); const ch = rows.reduce((a, r) => a + r.user.length + r.reply.length + 8, 0);
console.log("rows", c, "approx chars", ch);
