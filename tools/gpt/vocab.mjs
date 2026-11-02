// Tokenizer: character level, with reserved tokens for the prompt format. Versioned with the model.
// Prompt:  <bos> <act:NAME> user text <sep> reply text <end>
// Acts the language model may speak for. Crisis, "low", and actions (timers, plans) stay with the written engine.
export const GEN_ACTS = ["greet", "thanks", "howru", "chitchat", "want_to_talk", "share", "vent", "good_mood", "win", "tired", "overwhelm", "scared", "boring", "big", "distract", "unclear", "motivate", "ask_break", "yes", "no", "other"];
export const CHARS = " abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,'?!:;-";
export const SPECIAL = ["<pad>", "<bos>", "<sep>", "<end>", ...GEN_ACTS.map(a => "<act:" + a + ">")];
export const VOCAB = [...SPECIAL, ...CHARS.split("")];
export const ID = Object.fromEntries(VOCAB.map((t, i) => [t, i]));
export const normUser = s => s.toLowerCase().replace(/[\u2019]/g, "'").replace(/[^a-z0-9 .,'?!:;\-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 110);
export const encPrompt = (act, user) => [ID["<bos>"], ID["<act:" + act + ">"], ...normUser(user).split("").map(c => ID[c]), ID["<sep>"]];
export const encReply = r => [...r.split("").filter(c => c in ID).map(c => ID[c]), ID["<end>"]];
