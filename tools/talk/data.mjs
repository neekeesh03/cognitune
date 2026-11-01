// Synthetic practice conversations for the 10k-parameter talk model. Written by hand and expanded with templates.
// Every act has base phrasings ("cores"). A quarter of the cores per act are held out for testing, so the test
// score measures wording the model never saw, not just noise on wording it did.
import { MORE } from "./more.mjs";
import { ACTS2, CORES2, GRAM2, MORE2 } from "./v2.mjs";
import { ACTS3, CORES3, GRAM3, MORE3, FILLERS, CONTENT, JOIN } from "./v3.mjs";
import { CORES4, GRAM4 } from "./v4.mjs";
import fs from "fs";
export const ACTS = ["greet","thanks","bye","howru","who_help","unclear","big","boring","scared","tired","distract","overwhelm","low","win","ask_start","ask_plan","ask_break","motivate","joke","chitchat","yes","no","task_say","progress","deadline","other",...ACTS2,...ACTS3];
export const TASKS = ["essay","report","assignment","homework","thesis","project","presentation","revision","coding task","cv","application","taxes","lab report","reading","chemistry notes","maths problems","email","portfolio","exam prep","dissertation","slides","budget","cover letter","research paper","history essay","visa form","design brief","study plan"];

export const CORES = {
  greet: ["hi","hello","hey","hey there","yo","good morning","good evening","morning","hiya","sup","hello pip","hi there","heyy","namaste","hey rabbit","hi again","gm","hello again","hey you","afternoon","hi friend","howdy","hey buddy","hii"],
  thanks: ["thanks","thank you","thx","ty","that helped","that was helpful","appreciate it","thanks a lot","you're sweet","cheers","that really helped me","this is nice, thanks","thank u so much","thanks so much","much appreciated","you're kind","that was exactly what i needed","wow thanks","thank you so much for that","i appreciate you"],
  bye: ["bye","goodbye","see you later","gotta go","talk later","i have to go now","good night","cya","ttyl","signing off","going to sleep now","that's all for now","leaving now","see ya","catch you tomorrow","i'm off now","time for bed","heading out","later","night night"],
  howru: ["how are you","how r u","how are you doing","how's it going","what's up with you","are you ok","how is your day","how are you today","hows life rabbit","you good?","how have you been","how do you feel","and how are you","how's your day going","how is everything with you"],
  who_help: ["who are you","what are you","what can you do","how do you work","are you a real person","are you a robot","are you an ai","what is this app","how can you help me","what do you do","explain what you do","what should i use you for","help","what can i ask you","are you human","what's your name","is this a bot","what is lagomo","tell me what you're for","how does this work"],
  unclear: ["i dont know where to start","no idea how to begin","i'm not sure what to do first","where do i even start","i don't know what the first step is","it's all vague","i dont get what i'm supposed to do","unclear what to do first","what do i do first with the {T}","don't know how to start my {T}","i'm lost with my {T}","no clue where to begin on the {T}","i can't figure out how to approach the {T}","i don't know what the {T} even needs","there's no clear first move for my {T}","i'm confused about where to begin","the {T} has no obvious starting point","not sure how to tackle the {T}"],
  big: ["it's too big","this feels huge","my {T} is massive","it's too much work","the {T} is so big i can't even","it feels like a mountain","there is so much to do for the {T}","too many parts","it's overwhelming how large this is","so much to do on the {T}","the {T} is enormous","this is a giant task","it's a huge job and i can't face it","the whole {T} is too much at once","it's way too large to start","this {T} will take forever","it's just so big","the size of the {T} scares me off"],
  boring: ["it's boring","so boring","i hate doing this","this is tedious","my {T} is so dull","can't stand this","nothing about the {T} interests me","it's pointless and dull","boring boring boring","i find this really dull","the {T} is so uninteresting","this is mind numbing","i have zero interest in the {T}","it's the most boring thing ever","ugh this is such a drag","i just don't care about the {T}","dull dull dull","so tedious i could cry"],
  scared: ["i'm scared i'll mess up","afraid it won't be good enough","what if i fail","i'm afraid of doing it badly","i'm scared of the {T}","worried it'll be terrible","i don't want to be judged","perfectionism is killing me","it has to be perfect and it can't be","i'm nervous about my {T}","what if it's bad","i'm afraid the {T} will be awful","scared of getting it wrong","i'm terrified my {T} won't be good","i don't want to look stupid","what if people think my {T} is bad","fear of failing at the {T}","i keep worrying it won't be good enough"],
  tired: ["i'm so tired","exhausted","no energy","i barely slept","can't keep my eyes open","i'm drained","too sleepy to work","running on empty","my brain is fried","so sleepy today","no energy for the {T}","i'm wiped out","i slept like 3 hours","feeling really fatigued","i have no strength today","so worn out","i'm beat","completely exhausted and the {T} is waiting"],
  distract: ["i keep checking my phone","can't focus","i get distracted","scrolling instead of working","my mind wanders","i keep opening youtube","phone keeps pulling me away","i can't concentrate","distracted again","i opened insta again instead of doing the {T}","focus is gone","i keep getting pulled into reels","i sit down and then end up on my phone","every few minutes i check notifications","can't stay on the {T} for more than a minute","my attention is everywhere","i lose focus constantly","i start the {T} then drift to social media"],
  overwhelm: ["i'm overwhelmed","too many things to do","everything is piling up","i can't handle all this","so much on my plate","stressed about everything","i have a million things","drowning in tasks","too many deadlines","my to do list is out of control","panicking about everything","i have so many things due","everything is due at once","there's too much and i freeze","i'm swamped","can't keep up with all of it","the pile of work is crushing me","so many tasks i don't know where to look"],
  low: ["i feel sad","i'm feeling down","today is rough","i feel like a failure","i'm not doing well","feeling low","i feel empty","bad day","i'm so unmotivated and sad","i feel lonely","i feel useless","everything feels heavy","i feel anxious","i'm having a hard time","i feel really down today","i'm not okay","i feel like nothing i do matters","i'm in a bad mood and it won't lift","feeling pretty miserable","i just feel stuck and sad"],
  win: ["i did it","i finished","finished my {T}","i started!","i got it done","completed my {T} today","i did two minutes","i managed to start","done!","i actually did the thing","made progress today","guess what i finished","i just submitted my {T}","i did a bit of the {T}","i worked on it for ten minutes","i finally started the {T}","yay i did my {T}","good news i got going"],
  ask_start: ["what should i do now","what should i start","give me something to do","help me start","what's my first step","tell me what to do next","i want to start something","what do i do right now","pick something for me","suggest a first step","let's begin","i'm ready to start","can we start","i want to begin","give me a tiny task","what's a good thing to start with","let's get going","i'm ready, what's first"],
  ask_plan: ["help me plan my day","plan my week","can you plan my day","make me a schedule","how should i organise today","what's my plan","help me organize my tasks","i need a plan for tomorrow","schedule my study time","plan something for me","can you help me schedule my work","map out my day","build me a routine","when should i study","i need a timetable for the week","set up my day"],
  ask_break: ["can i take a break","i need a break","should i rest","is it ok to rest","i need a breather","can i stop for now","time for a break?","i want to rest a bit","let me rest","should i take a break now","can i pause for a while","i need a few minutes off","is a break ok right now","i'd like to stop and rest"],
  motivate: ["motivate me","i need motivation","cheer me up","say something encouraging","give me a pep talk","i need a push","convince me to start","why should i bother","encourage me","tell me i can do it","i need a kick","inspire me","i need a little nudge","say something to get me going","give me a reason to start","i need some courage"],
  joke: ["tell me a joke","say something funny","make me laugh","got any jokes","joke please","something funny?","a bunny joke","make me smile","tell me something silly","do you know any jokes","i want a laugh","say a pun","lighten the mood with a joke"],
  chitchat: ["what's your favorite food","do you like carrots","tell me about yourself","what do you do for fun","i'm bored","let's talk","just chatting","do you sleep","what's the weather like","can we just talk","tell me something interesting","random question","do you have friends","what's your favorite color","where do you live","do you get lonely","i just want to chat","tell me a fun fact"],
  yes: ["yes","yeah","yep","sure","ok","okay","alright","sounds good","let's do it","yes please","ya","i guess so","ok do it","go ahead","definitely","fine","why not","yup","absolutely","do it","sounds great","please","of course"],
  no: ["no","nope","not really","nah","no thanks","not now","maybe later","i don't want to","skip","not today","no i'm good","don't think so","never mind","pass","i'd rather not","no way","not interested","let's not","nothing","not yet"],
  task_say: ["i need to write my {T}","i have to finish the {T}","i should start my {T}","my {T}","working on my {T} today","i want to do my {T}","the {T} is what i'm avoiding","i've been putting off my {T}","gotta do the {T}","need to study for the exam","i'm avoiding emailing my boss","i keep postponing the {T}","the thing i'm avoiding is my {T}","i must get the {T} done","i'd like to work on my {T}","i haven't touched my {T}","my {T} is waiting for me"],
  progress: ["how am i doing","show my progress","how many starts did i do","what's my streak","how's my week going","am i improving","how did i do this week","my stats?","have i been consistent","how many days did i show up","what have i done lately","tell me how my week looks","give me my numbers","how many times did i start","am i making progress"],
  deadline: ["my {T} is due tomorrow","i have an exam on friday","deadline in 2 days","the {T} is due tonight","exam next week and i haven't started","assignment due in 3 days","due soon!","test tomorrow morning","presentation on monday","submission closes tonight","the {T} deadline is close","i have a quiz in two days","my {T} is due next week","exam in 4 days","midterm on thursday and i'm behind","the deadline for my {T} is this weekend"],
  other: ["asdfgh","what is the capital of france","banana","blue","the quick brown fox","can you order pizza","what's 2+2","play some music","hmm","...","i like turtles","translate hello to french","who won the match","random words here","qwerty","how tall is mount everest","book me a flight","what time is it in tokyo","bitcoin price","sing a song","write me a poem about the sea","what's the news","tell me about dinosaurs","call my mom"],
};

for (const k of Object.keys(MORE)) CORES[k] = [...CORES[k], ...MORE[k]];

for (const k of Object.keys(CORES2)) CORES[k] = [...CORES2[k], ...(MORE2[k] || [])];

for (const k of Object.keys(CORES3)) CORES[k] = [...CORES3[k], ...(MORE3[k] || [])];

for (const k of Object.keys(CORES4)) CORES[k] = [...CORES[k], ...CORES4[k]];

// Short replies whose meaning depends on what was just said. [text, previous acts -> label, default]
export const AMBIG = [
  { t: ["lol","haha","hahaha","lmao","that's funny","good one"], map: { joke: "thanks", chitchat: "chitchat" }, def: "other" },
  { t: ["ok","okay","alright","k","fine"], map: { bye: "bye", thanks: "thanks", joke: "thanks" }, def: "yes" },
  { t: ["more","tell me more","another one","again","one more"], map: { joke: "joke", chitchat: "chitchat", motivate: "motivate", ask_start: "ask_start" }, def: "other" },
  { t: ["thanks","ok thanks","got it"], map: { bye: "bye" }, def: "thanks" },
];


// Compositional grammar: many more wordings per act from small parts. For testing, every 4th second part is held out.
export const GRAM = {
  deadline: { a: ["my {T} is due","the {T} is due","i have an exam","i have a test","i have a quiz","the {T} deadline is","my {T} closes","there is a midterm","my presentation is","the submission is","i have finals","my {T} has to be in"], b: ["tomorrow","tonight","on friday","on monday","next week","in two days","in 3 days","this weekend","on thursday morning","in a few days","by midnight","at the end of the week","on wednesday","next tuesday","soon","in 5 days"] },
  unclear: { a: ["i dont know","i have no idea","i am not sure","i cant tell","i am lost on","no clue","i am confused about","it is unclear"], b: ["where to start","how to begin","what to do first","what the first step is","how to approach the {T}","what the {T} needs","where i should begin","which part comes first","what step one is","how to even start the {T}","what to do with the {T}","where to begin with the {T}"] },
  big: { a: ["it is","this is","the {T} is","my {T} feels","everything about this is","honestly the {T} is","the whole thing is"], b: ["too big","way too much","huge","massive","enormous","a mountain","too large to start","so much work","gigantic","endless","overwhelming in size","too heavy to lift","just too much at once","a giant task"] },
  motivate: { a: ["i need","give me","can you give me","please give me","could i get","i want","i could really use"], b: ["motivation","a push","a pep talk","some encouragement","a nudge","some inspiration","a reason to start","a kick","courage","some energy","a little cheering up","a boost"] },
  ask_break: { a: ["can i","may i","should i","i want to","i need to","is it okay if i","would it be ok to","i think i should"], b: ["take a break","rest","pause for a bit","stop for now","have a breather","take five","step away for a while","rest a little","take a short pause","stop and rest","take ten minutes off","lie down for a bit"] },
  chitchat: { a: ["tell me","can you tell me","i wonder","do you","what is","so,","random question:"], b: ["something interesting","about yourself","your favorite animal","a fun fact","what you do all day","if you like music","your favorite season","if you ever get tired","where you came from","a story","something about rabbits","what makes you happy"] },
  task_say: { a: ["i need to","i have to","i should","i want to","i keep avoiding","i am putting off","the thing i must do is","today i am working on","i am going to","i owe myself the"], b: ["do my {T}","finish the {T}","write my {T}","start the {T}","work on the {T}","get the {T} done","sort out my {T}","handle the {T}","tackle the {T}","submit my {T}","study for the exam","reply to that email"] },
  low: { a: ["i feel","i am feeling","today i feel","lately i feel","i have been feeling","honestly i feel","i just feel"], b: ["sad","down","low","hopeless","really empty","lonely","like a failure","worthless today","so heavy","miserable","unmotivated and sad","numb","anxious and low","like nothing matters"] },
  scared: { a: ["i am afraid","i am scared","i worry","i am nervous","i fear","i am terrified","what if"], b: ["it will be bad","i will fail","it is not good enough","people will judge it","i will mess up the {T}","the {T} will be awful","i get it wrong","it is not perfect","i look stupid","they hate my {T}","i embarrass myself","i can not do it well"] },
  tired: { a: ["i am","i feel","i am so","today i am","honestly i am","i am just","right now i am"], b: ["tired","exhausted","sleepy","drained","wiped out","worn out","fatigued","shattered","half asleep","running on empty","too sleepy to think","burnt out","without any energy","so low on energy"] },
  distract: { a: ["i keep","i always end up","i cannot stop","every minute i","i get pulled to","my mind keeps","i start the {T} then"], b: ["checking my phone","scrolling","opening youtube","going on instagram","watching reels","drifting away","getting distracted","looking at notifications","switching tabs","wandering off","messaging friends","losing focus"] },
  overwhelm: { a: ["i am","i feel","there is","i have","honestly i am","right now i am"], b: ["overwhelmed","swamped","drowning in work","buried in tasks","way too much to do","a million things due","stressed about everything","panicking about my list","too many deadlines","unable to keep up","crushed by my to do list","freaking out about all of it"] },
  boring: { a: ["this is","the {T} is","i find the {T}","everything about this is","honestly it is","studying is"], b: ["so boring","incredibly dull","tedious","mind numbing","pointless and dull","a total drag","unbelievably uninteresting","soooo boring","painfully slow and dull","not interesting at all","just dull","lifeless"] },
  win: { a: ["i just","i finally","guess what, i","good news, i","yay i","i actually"], b: ["finished the {T}","did it","started","submitted my {T}","got going","completed it","did ten minutes","made progress","wrapped up the {T}","handed in the {T}","got something done","started the {T} at last"] },
  ask_start: { a: ["what should i","tell me what to","help me","i want to","i am ready to","can we","let us"], b: ["start","begin","do first","do right now","get going","start with","work on first","do next","begin now","pick a first step","kick off","dive in"] },
  ask_plan: { a: ["help me","can you","please","i need you to","could you"], b: ["plan my day","plan my week","make a schedule","organise my tasks","map out tomorrow","build a study timetable","schedule my work","arrange my day","set up my week","plan my study time","sort out my schedule","create a routine"] },
  progress: { a: ["how","show me how","tell me how","let me see how","check how"], b: ["i am doing","my week is going","consistent i have been","many starts i did","my streak looks","i did this week","my progress is","often i showed up","i have improved","my numbers look"] },
  joke: { a: ["tell me","say","do you know","give me","got"], b: ["a joke","something funny","a pun","a silly joke","a bunny joke","a good joke","a funny one","a riddle","something to make me laugh","a joke about studying"] },
};
const SYN = { tired: ["exhausted","sleepy","drained","wiped","beat"], big: ["huge","massive","giant","enormous"], start: ["begin","get going","kick off"], need: ["have to","must","gotta"], plan: ["schedule","organise","map out"], break: ["rest","breather","pause"], due: ["deadline","closes","is on"], exam: ["test","quiz","midterm","finals"], hate: ["cant stand","dislike","loathe"], scared: ["afraid","nervous","worried","terrified"], phone: ["mobile","instagram","tiktok","youtube"], sad: ["down","low","blue","miserable"], boring: ["dull","tedious","pointless"], really: ["so","very","super","genuinely"], help: ["assist","support","give me a hand with"], today: ["now","this morning","this evening"] };
export const swap = s => s.split(" ").map(w => (SYN[w] && R() < 0.35 ? pick(SYN[w]) : w)).join(" ");

for (const k of Object.keys(GRAM2)) GRAM[k] = GRAM2[k];
for (const k of Object.keys(GRAM3)) GRAM[k] = GRAM3[k];
for (const k of Object.keys(GRAM4)) GRAM[k] = GRAM4[k];
export const OPEN = ["", "", "", "", "hey ", "um ", "honestly ", "ok so ", "hmm ", "idk but ", "ngl ", "so ", "well ", "pip ", "hey pip ", "uh "];
export const TAIL = ["", "", "", "", " lol", " right now", " today", " tbh", " :(", " ugh", ".", "!", "...", " please", " honestly", " again"];

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const R = rng(1234);
const pick = a => a[Math.floor(R() * a.length)];
const typo = s => { if (s.length < 5 || R() > 0.22) return s; const i = 1 + Math.floor(R() * (s.length - 2)); const m = R(); if (m < 0.35) return s.slice(0, i) + s.slice(i + 1); if (m < 0.6) return s.slice(0, i) + s[i] + s[i] + s.slice(i + 1); if (m < 0.85) return s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2); return s.replace(/ing\b/g, "in").replace(/you\b/g, "u"); };
const GREETISH = new Set(["hey ", "hey pip ", "pip ", "hi "]);
export const render = (core, syn = true, plain = false) => { const base0 = core.replace(/\{T\}/g, () => pick(TASKS)); const base = syn ? swap(base0) : base0; let op = plain ? "" : pick(OPEN); if (GREETISH.has(op) && R() < 0.85) op = ""; let s = op + base + pick(TAIL); if (R() < 0.3) s = s.toLowerCase(); s = typo(s); return s.trim(); };

export function build() {
  const train = [], test = [];
  const prevs = ["", ...ACTS];
  const stuck = ["ask_start", "task_say", "deadline", "overwhelm", "low", "unclear", "big", "scared", "tired", "ask_plan"];
  for (const act of ACTS) {
    const cores = [...CORES[act]]; for (let i = cores.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [cores[i], cores[j]] = [cores[j], cores[i]]; }
    const nt = Math.max(3, Math.round(cores.length * 0.25)); const te = cores.slice(0, nt), tr = cores.slice(nt);
    for (let k = 0; k < 900; k++) train.push({ x: render(pick(tr), true, act === "other"), prev: pick(prevs), y: act });
    for (let k = 0; k < 50; k++) test.push({ x: render(pick(te)), prev: pick(prevs), y: act });
    const g = GRAM[act]; if (g) { const bTrain = g.b.filter((_, i) => i % 4 !== 0), bTest = g.b.filter((_, i) => i % 4 === 0); for (let k = 0; k < 800; k++) train.push({ x: render(pick(g.a) + " " + pick(bTrain)), prev: pick(prevs), y: act }); for (let k = 0; k < 30; k++) test.push({ x: render(pick(g.a) + " " + pick(bTest)), prev: pick(prevs), y: act }); }
  }
  for (const a of AMBIG) {
    const heldOut = a.t.slice(-1);
    for (let k = 0; k < 300; k++) { const prev = pick(prevs); const tx = pick(a.t.slice(0, -1)); train.push({ x: render(tx), prev, y: a.map[prev] ?? a.def }); }
    for (let k = 0; k < 20; k++) { const prev = pick(prevs); test.push({ x: render(heldOut[0]), prev, y: a.map[prev] ?? a.def }); }
  }
  // compound messages: filler + content, labelled with the content
  const contentCores = a => { const c = CORES[a]; return c.slice(Math.max(3, Math.round(c.length * 0.25))); };
  for (const a of CONTENT) { const pool = contentCores(a); const g = GRAM[a]; for (let k = 0; k < 450; k++) { const [f, fa] = pick(FILLERS); const core = g && R() < 0.5 ? pick(g.a) + " " + pick(g.b.filter((_, i) => i % 4 !== 0)) : pick(pool); void fa; train.push({ x: render(f + pick(JOIN) + core), prev: pick(prevs), y: a }); } for (let k = 0; k < 40; k++) { const [f] = pick(FILLERS); const te = CORES[a].slice(0, Math.max(3, Math.round(CORES[a].length * 0.25))); test.push({ x: render(f + pick(JOIN) + pick(te)), prev: pick(prevs), y: a }); } }
  for (const e of [...train, ...test]) e.prev2 = pick(prevs);
  void stuck;
  try { const f = new URL("./real.jsonl", import.meta.url); if (fs.existsSync(f)) for (const l of fs.readFileSync(f, "utf8").split("\n")) { if (!l.trim()) continue; const e = JSON.parse(l); if (ACTS.includes(e.y)) for (let k = 0; k < 6; k++) train.push({ x: e.x, prev: e.prev || "", y: e.y }); } } catch { /* no real data yet */ }
  return { train, test };
}
