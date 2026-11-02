// Builds the training text for the Lagomo language model (the small GPT in tools/gpt).
// Everything here is original text written for Lagomo. No outside model, no scraped data, no user data.
// Each example is: conversation act (from the classifier) + what the person said -> what the rabbit says.
// Output: tools/gpt/out/corpus.jsonl  {act, user, reply, split}   split = train | val | hand
import fs from "fs";
import { build } from "../talk/data.mjs";
import { HAND } from "../talk/hand.mjs";
import { OOD } from "../talk/ood.mjs";
import { GEN_ACTS, FRAMES, MIRROR } from "./vocab.mjs";

let seed = 20261102; const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = a => a[Math.floor(R() * a.length)];
const clean = s => s.toLowerCase().replace(/[\u2019]/g, "'").replace(/[^a-z0-9 .,'?!:;\-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 110);
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

// ---- v2: more variety, previous-turn context, and "mirror" sentences that reuse the person's own words ----
const MORE_ACK = {
  vent: ["That is a lot to put up with.", "I'm sorry you had to deal with that.", "No wonder you're annoyed.", "That would get to me too."],
  share: ["Thanks for filling me in.", "That sounds like a real day.", "I appreciate you telling me."],
  good_mood: ["Good days are worth noticing.", "Nice, I'm happy for you."],
  win: ["Look at you go.", "That took effort, and you did it.", "I'm proud of you."],
  tired: ["You sound worn out.", "That's a heavy kind of tired."],
  scared: ["Nerves like that are normal.", "Being nervous means it matters to you."],
  overwhelm: ["That's too much for one head.", "It makes sense that you feel swamped."],
};
const MORE_Q = {
  vent: ["What happened right before that?", "How are you holding up?", "Did you get to say anything back?", "Do you want to keep going or take a breath?"],
  share: ["What was the highlight?", "Anything on your mind about it?", "How are you feeling about it now?"],
  good_mood: ["Who would you tell first?", "What would make today even better?"],
  win: ["Want to tell me how it went?", "What will you do to celebrate?"],
  tired: ["Is there anything that would help you wind down?", "Have you had water and something to eat?"],
  scared: ["What would help you feel a bit more ready?", "Is there one small thing you could do to prepare?"],
  overwhelm: ["What could wait until tomorrow?", "Want to name the top three, just to see them?"],
};
for (const k of Object.keys(MORE_ACK)) ACK[k].push(...MORE_ACK[k]); for (const k of Object.keys(MORE_Q)) Q[k].push(...MORE_Q[k]);
const CONT = { vent: ["Mm.", "I hear you.", "That's rough.", "Go on."], share: ["Okay.", "I see.", "Mm-hm."], good_mood: ["Love that.", "Nice."], win: ["Yes!", "Well done."], tired: ["Mm.", "I hear you."], scared: ["I hear you.", "That makes sense."], overwhelm: ["Mm.", "That's a lot."] };
const TOPICS = {
  work: { words: ["boss", "manager", "work", "job", "meeting", "coworker", "colleague", "office", "client", "shift"], line: ["It sounds like work took a lot out of you.", "Work can really drain you."] },
  school: { words: ["school", "class", "teacher", "exam", "homework", "professor", "college", "lecture", "classmate", "grades"], line: ["It sounds like school is weighing on you.", "School stress is real."] },
  family: { words: ["mum", "mom", "dad", "brother", "sister", "family", "parents", "grandma", "cousin"], line: ["Family stuff can be hard because it matters so much.", "It sounds like something at home is on your mind."] },
  friends: { words: ["friend", "friends", "roommate", "partner", "girlfriend", "boyfriend", "bestie", "group chat"], line: ["Friend stuff can really sting.", "It sounds like people you care about are on your mind."] },
  money: { words: ["money", "rent", "bills", "salary", "broke", "debt"], line: ["It sounds like money is on your mind.", "Money worries are heavy."] },
};
const topicOf = t => { const l = " " + t.toLowerCase().replace(/[^a-z ]/g, " ") + " "; for (const [k, v] of Object.entries(TOPICS)) if (v.words.some(w => l.includes(" " + w + " "))) return k; return null; };
const LISTEN = new Set(["vent", "share", "tired", "overwhelm", "scared", "good_mood", "win"]);

// ---- stories: (act, clause) built from many parts, so the model learns to copy the clause rather than memorise it ----
const SUBJ = ["my boss", "my manager", "my teacher", "my professor", "my friend", "my best friend", "my roommate", "my mum", "my dad", "my brother", "my sister", "my partner", "my coworker", "my classmate", "my landlord", "my client", "my coach", "my neighbour", "my cousin", "my grandma", "my tutor", "my supervisor", "the cashier", "the driver", "my team lead", "my study group", "my aunt", "my uncle", "my flatmate", "my colleague"];
const EVT = ["yelled at me", "ignored my message", "cancelled on me again", "didn't listen to me", "said something rude to me", "gave me too much work", "blamed me for something", "forgot about me", "changed the plan last minute", "criticised my work", "kept interrupting me", "was in a bad mood all day", "lied to me", "took my charger", "borrowed my notes and lost them", "laughed at my idea", "never replied to me", "made me wait for an hour", "shouted at the whole team", "talked over me in the meeting", "forgot my birthday", "didn't say thank you", "compared me to someone else", "left me out of the plan", "was late again", "promised to help and didn't", "took credit for my work", "messaged me at midnight", "told everyone my secret", "kept asking me for favours"];
const GOOD = ["i had a great day", "i got some good news today", "my day went really well", "i'm feeling pretty happy today", "i went for a walk and it was lovely", "i saw my friends and it was fun", "today was actually nice", "i slept well and feel good", "i passed my exam", "i got the job", "my team won today", "i cooked something tasty", "i finally relaxed this weekend", "my brother called me and we laughed", "the sun was out and i felt calm", "i got a compliment at work", "my results came out and i did well", "i found my lost keys", "i met an old friend", "i had a lovely dinner with my family"];
const VERB = ["finished", "finally did", "started", "sent", "booked", "cleaned", "submitted", "wrote", "tidied", "organised", "completed", "handed in", "called", "fixed", "paid"];
const OBJ = ["my homework", "that email i was avoiding", "my room", "the first page of my report", "my exam notes", "the appointment", "my workout", "the call i was dreading", "my application", "my laundry", "my budget", "my cv", "the form", "my assignment", "the kitchen", "my slides", "my presentation", "my taxes", "my bills", "my reading for class"];
const TIRED = ["i'm exhausted after work", "i barely slept last night", "i'm so tired from school", "my class wore me out", "i'm drained today", "i had a long day at the office", "i worked a double shift", "i was up all night with my baby brother", "i'm worn out from travelling", "i studied until 3am", "my commute was awful and i'm wiped", "i'm tired after the gym", "i had back to back meetings all day", "i'm so sleepy after lectures"];
const OVER = ["i have too much at work and i can't keep up", "school is piling up and i'm swamped", "everything at home and work is hitting at once", "my deadlines are all at the same time", "my family, my job and my bills are too much right now", "i have three exams this week", "i have so many emails to answer", "my to do list is out of control", "i'm juggling work and classes", "i have too many things due on friday", "i'm behind on everything"];
const SCARED = ["i'm nervous about my exam", "i'm scared my boss will hate my work", "i'm worried my presentation will go badly", "i'm afraid to talk to my teacher about it", "i'm anxious about my money situation", "i have a job interview on friday", "i'm nervous about meeting new people", "i'm worried i'll fail my course", "i'm scared to send that message", "i have a big presentation tomorrow", "i'm anxious about the results", "i'm worried about my dad's surgery"];
const SHARE = ["today was a normal day at work", "i had class and then went home", "i met my friend for lunch", "my brother visited today", "i watched a show after school", "nothing special happened at the office", "i went to the market with my grandma", "i took the bus home", "i made pasta for dinner", "i went for a run this morning", "i spent the afternoon at the library", "i helped my dad with the garden"];
const FRONT = ["", "", "", "", "honestly ", "so ", "ugh ", "like ", "today ", "and ", "well ", "ok so ", "just so you know "];
const stories = [];
for (let k = 0; k < 4200; k++) stories.push([R() < 0.75 ? "vent" : "share", pick(SUBJ) + " " + pick(EVT)]);
for (const g of GOOD) for (let k = 0; k < 8; k++) stories.push(["good_mood", g]);
for (let k = 0; k < 500; k++) stories.push(["win", "i " + pick(VERB) + " " + pick(OBJ)]);
for (const t of TIRED) for (let k = 0; k < 10; k++) stories.push(["tired", t]); for (const o of OVER) for (let k = 0; k < 12; k++) stories.push(["overwhelm", o]);
for (const s of SCARED) for (let k = 0; k < 12; k++) stories.push(["scared", s]); for (const s of SHARE) for (let k = 0; k < 12; k++) stories.push(["share", s]);
// held out for evaluation only: subjects/events/wins the model never saw in training
export const NOVEL = [["vent", "my teammate kept hogging the ball and then blamed me"], ["vent", "the bus driver shouted at me for no reason"], ["vent", "my sister read my diary and told mum"], ["vent", "my project partner never did their part"], ["vent", "my uncle made fun of my haircut"], ["win", "i finally unpacked my suitcase"], ["win", "i replied to all my messages"], ["win", "i ironed my shirts"], ["tired", "i'm shattered after the night shift"], ["scared", "i'm worried about my driving test"], ["good_mood", "i danced in the kitchen this morning"], ["share", "i watered the plants and read a book"], ["overwhelm", "i have a report and a quiz and a trip all this week"]];
const NOVEL_SET = new Set(NOVEL.map(n => n[1]));

const seen = new Set(); const rows = [];
function replyFor(act, user, prev, clause) {
  const same = prev === act && LISTEN.has(act); const parts = [];
  const mirror = clause && FRAMES[act] && R() < (same ? 0.5 : 0.7);
  if (mirror) { const fr = pick(FRAMES[act]); parts.push(fr + MIRROR + "."); if (R() < 0.8) parts.push(pick(Q[act])); return parts.join(" "); }
  if (same) { parts.push(pick(CONT[act] ?? ["Mm."])); parts.push(pick(Q[act])); return parts.join(" "); }
  parts.push(pick(ACK[act])); const tp = topicOf(user);
  if (tp && LISTEN.has(act) && R() < 0.4) parts.push(pick(TOPICS[tp].line));
  if (!(act === "thanks" && R() < 0.2) && !(act === "yes" && R() < 0.2)) parts.push(pick(Q[act]));
  return parts.join(" ");
}
const PREV_POOL = ["", "", "", "greet", "share", "vent", "tired", "ask_start", "task_say", "overwhelm", "low", "win", "joke", "other"];
const { train, test } = build();
const add = (act, user0, o = {}) => {
  const user = clean(user0); if (!user) return; const split = o.split ?? (hash(user) % 20 === 0 ? "val" : "train");
  const prev = o.prev ?? (R() < 0.35 && LISTEN.has(act) ? act : pick(PREV_POOL)); const key = act + "|" + user + "|" + prev;
  if (split === "train" && seen.has(key) && R() < 0.7) return; seen.add(key);
  rows.push({ act, prev, user, reply: replyFor(act, user, prev, o.clause), split });
};
const perAct = {}; for (const e of [...train, ...test]) { if (!GEN_ACTS.includes(e.y)) continue; (perAct[e.y] ??= new Set()).add(e.x); }
for (const act of GEN_ACTS) { const xs = [...(perAct[act] ?? [])]; for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; } for (const x of xs.slice(0, 520)) { add(act, x); if (R() < 0.4) add(act, x); } }
for (const [act, u] of stories) { const f = pick(FRONT); add(act, f + u, { clause: u, split: hash(clean(u)) % 25 === 0 ? "val" : "train" }); }
// hand-written + challenge messages: evaluation only
for (const [x, prev, act] of [...HAND, ...OOD]) if (GEN_ACTS.includes(act)) rows.push({ act, prev, user: clean(x), reply: "", split: "hand" });
for (const [act, u] of NOVEL) rows.push({ act, prev: "", user: clean(u), reply: "", split: "novel", clause: u });
fs.mkdirSync(new URL("./out/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("./out/corpus.jsonl", import.meta.url), rows.map(r => JSON.stringify(r)).join("\n"));
const cnt = rows.reduce((a, r) => (a[r.split] = (a[r.split] ?? 0) + 1, a), {}); const mir = rows.filter(r => r.split === "train" && /^(It sounds like|So|Got it,|Nice,) /.test(r.reply) && r.reply.length > 0).length;
console.log("rows", cnt, "train rows with a mirror sentence ~", mir, "chars", rows.reduce((a, r) => a + r.user.length + r.reply.length + 8, 0));
