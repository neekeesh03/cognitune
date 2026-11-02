# Lagomo GPT v2 (the rabbit's own language model)

Follows the hybrid plan in funnel.md: classifier reads the message -> written dialogue engine decides what may happen -> a small GPT trained from scratch writes the wording for chatty replies -> a validator checks it -> any failure falls back to the written reply.

## v2 (2 Nov) - what changed from v1
- **Context in the prompt** (funnel 4.3): `<bos> <prev:LAST_ACT> <act:ACT> user text <sep> reply <end>`. After the same kind of message twice, the reply changes shape (short "Mm." or "I hear you." plus a different question) instead of repeating an opener.
- **Mirror sentences:** the model decides when to reflect what you said and which opening to use ("It sounds like ...", "So ...", "Nice, ..."). It writes the placeholder `:::`, and the app fills it with your own words, person-swapped ("my sister lied to me" -> "your sister lied to you"), with filler trimmed, 3 to 14 words, never a question, never when you addressed the rabbit as "you". This works for words never seen in training. A first attempt, where the model copied the words itself, memorised the training stories instead (it wrote "your coach laughed at your idea" for "the bus driver shouted at me"), so it was replaced by this slot design. The validator rejects any mirror that is not exactly opening + your words.
- Bigger and more varied: 645,120 parameters (4 layers, 4 heads, width 112, context 256, 119 tokens), 19,089 training pairs with about 3x the reply variety. Trained 2,054 steps from scratch (46 min), then 700 fine-tune steps (about 11 min) after the slot change. File 0.68 MB int8.
- The classifier was retrained with story-style examples (tools/talk/v5.mjs). Before, "my roommate ate my leftovers and lied" was read as task_say and "I got the job and I feel amazing" as boring (reply: "That sounds heavy"). Now vent 0.96 and good_mood 0.96.

## Funnel
message -> safety check (crisis goes to fixed safety text, never to the GPT) -> classifier -> dialogue engine (actions, chips, task memory, listening mode) -> if the act is chatty (greet, thanks, howru, chitchat, want_to_talk, share, vent, good_mood, win, tired, overwhelm, scared) and the user setting is on, the GPT writes up to 3 candidates -> validator -> first valid one replaces the text. Chips and actions always come from the engine. "low" and crisis never use the GPT.

Validator rejects: wrong length, no ending punctuation, digits, banned words (medical, self-harm, links, claiming to be human), repeated sentences or a repeat of the last reply, any sentence not taught for that act (unless it is a valid mirror), and topic lines ("work", "school", "family", "friends", "money") the person did not mention ("Nice work" is not a topic).

## Results (`node tools/gpt/eval.mjs` -> report.json)
See report.json for the exact numbers of the shipped file. Gates: parity with training code (float32), held-out pass rate >= 85%, hand-written >= 70%, off-act sentences <= 10%, speed <= 800 ms, validator rejects unsafe strings, novel stories >= 60%, replies vary with context, person-swap parity browser vs training. One stretch gate is NOT met: on stories with never-seen wording the model mirrors in 38.5% of replies against a 40% bar. This is a quality nicety, not a safety gate.

Limits: the model chooses and arranges taught sentences; only the mirror is new text, and it is the person's own words. The 10M classifier is paused (retrained version scored 79.5% vs 86.3% for the new small one on the hand-written checks).

## Reproduce
```
node tools/gpt/corpus.mjs
STEPS=2200 TMAX_MIN=46 C=112 L=4 H=4 node tools/gpt/train.mjs
INIT=./out/ckpt-v2a.json STEPS=700 TMAX_MIN=17 LR=1e-3 C=112 L=4 H=4 node tools/gpt/train.mjs   # after the slot change
node tools/gpt/export.mjs --f32 && node tools/gpt/export.mjs
node tools/gpt/eval.mjs
```
Off switch: Me > rabbit settings > "Let Lago write in its own words" (localStorage `lagomo.gpt.v1`).
