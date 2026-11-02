// Tokenizer: character level, with reserved tokens for the prompt format. Versioned with the model.
// Prompt:  <bos> <act:NAME> user text <sep> reply text <end>
// Acts the language model may speak for. Crisis, "low", and actions (timers, plans) stay with the written engine.
export const GEN_ACTS = ["greet", "thanks", "howru", "chitchat", "want_to_talk", "share", "vent", "good_mood", "win", "tired", "overwhelm", "scared", "boring", "big", "distract", "unclear", "motivate", "ask_break", "yes", "no", "other"];
export const CHARS = " abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,'?!:;-";
export const PREVS = [...GEN_ACTS, "none", "other"];
export const SPECIAL = ["<pad>", "<bos>", "<sep>", "<end>", ...GEN_ACTS.map(a => "<act:" + a + ">"), ...PREVS.map(a => "<prev:" + a + ">")];
export const VOCAB = [...SPECIAL, ...CHARS.split("")];
export const ID = Object.fromEntries(VOCAB.map((t, i) => [t, i]));
export const normUser = s => s.toLowerCase().replace(/[\u2019]/g, "'").replace(/[^a-z0-9 .,'?!:;\-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 110);
export const prevOf = p => (!p ? "none" : GEN_ACTS.includes(p) ? p : "other");
export const encPrompt = (act, user, prev = "none") => [ID["<bos>"], ID["<prev:" + prevOf(prev) + ">"], ID["<act:" + act + ">"], ...normUser(user).split("").map(c => ID[c]), ID["<sep>"]];
export const encReply = r => [...r.split("").filter(c => c in ID).map(c => ID[c]), ID["<end>"]];

// Person-swap used by the mirror sentences. MUST match youForm() in src/engine/gpt.ts (eval.mjs checks this).
export const youForm = s => s.toLowerCase().replace(/\u2019/g, "'").replace(/[^a-z0-9 ']/g, " ").replace(/\s+/g, " ").trim()
  .replace(/\bi'm\b/g, "you're").replace(/\bi've\b/g, "you've").replace(/\bi'll\b/g, "you'll").replace(/\bi'd\b/g, "you'd").replace(/\bi am\b/g, "you are").replace(/\bi was\b/g, "you were")
  .replace(/\bmyself\b/g, "yourself").replace(/\bmine\b/g, "yours").replace(/\bmy\b/g, "your").replace(/\bme\b/g, "you").replace(/\bi\b/g, "you");
export const FRAMES = { vent: ["It sounds like ", "So "], share: ["So ", "Got it, "], good_mood: ["It sounds like ", "So "], win: ["So ", "Nice, "], tired: ["It sounds like ", "So "], scared: ["It sounds like ", "So "], overwhelm: ["It sounds like ", "So "] };

// The model writes this placeholder where the person's own words go; the app fills it in (src/engine/gpt.ts, clauseOf).
export const MIRROR = ":::";
