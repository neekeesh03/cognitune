# Lagomo GPT v1 (the rabbit's own language model)

Follows the hybrid plan in funnel.md: the classifier reads the message, the written dialogue engine decides what may happen, and a small GPT trained from scratch writes the wording for chatty replies. A validator checks every reply, and any failure falls back to the written reply.

## What it is
- Architecture: nanoGPT design (token and position embeddings, pre-LayerNorm blocks without bias, causal self-attention, 4x GELU MLP, final LayerNorm, output tied to the token embedding).
- Size: 4 layers, 4 heads, width 96, context 256, 96 tokens (characters plus special tokens `<bos> <sep> <end> <act:NAME>`). **477,024 parameters.**
- Training: from scratch, no pretrained weights, no outside AI. PyTorch is blocked on this Mac by the code-signing policy, so `gpt.mjs` is a plain-JavaScript implementation with hand-written backpropagation (gradient check: worst relative error 0.006). It ran on 8 CPU threads for 1,600 steps (36 min, AdamW, cosine decay).
- Data: `corpus.mjs`, 11,774 train and 750 val pairs (act + message -> reply). Messages come from the classifier's synthetic set, plus 6,000 story messages. Replies are original text written for Lagomo. No user data. Hand-written and challenge messages (117) are evaluation only.
- Browser: `src/engine/gpt.ts` (int8 per-row weights, 0.50 MB file `public/talk/lagomo-gpt-v1.bin`, KV cache, top-k 20, temperature 0.7, 1.2 s deadline).

## Funnel
message -> safety check (crisis goes to the fixed safety text and never reaches the GPT) -> classifier (small or 10M) -> dialogue engine (actions, chips, task memory, listening mode) -> if the act is chatty (greet, thanks, howru, chitchat, want_to_talk, share, vent, good_mood, win, tired, overwhelm, scared) and the user setting is on, the GPT writes up to 3 candidates -> validator -> first valid one replaces the text. Chips and actions always come from the engine. "low" and crisis never use the GPT.

The validator rejects a reply that has any of: wrong length, no ending punctuation, digits, banned words (medical, self-harm, links, claiming to be human), repeated sentences, a repeat of the last reply, words the model was never taught, or a sentence not taught for that act. It also rejects a topic line ("work", "school", "family", "friends", "money") unless the person's message mentions that topic.

## Results (`node tools/gpt/eval.mjs` -> report.json)
| Gate | Result |
|---|---|
| Parity: JS runtime vs training code (float32) | max relative loss diff 5.4e-7, pass |
| Val loss / perplexity | 0.062 / 1.06 |
| Held-out val pass rate, one try (>= 85%) | 86.7%, pass |
| Hand-written pass rate, one try (>= 70%) | 91.5%, pass |
| Off-act sentences in passed replies (<= 10%) | 0%, pass |
| Speed (<= 800 ms, Node) | about 55 ms per reply, pass |
| Validator rejects unsafe strings | pass |

Honest limits: the replies are mostly new combinations of taught sentences. Fully new wording is only about 1% of passed replies, and the strict validator drops any untaught sentence anyway. That is deliberate for v1 (safety first). Next steps are more varied reply data, and a curated dataset built from opt-in rated chats and admin "better reply" labels. After that, a bigger model (about 8.5M, as in funnel.md 3.2) and loosening the validator once human review passes.

## Reproduce
```
node tools/gpt/corpus.mjs
STEPS=1600 TMAX_MIN=38 node tools/gpt/train.mjs
node tools/gpt/export.mjs --f32 && node tools/gpt/export.mjs
node tools/gpt/eval.mjs
```
Off switch: Me > rabbit settings > "Let Lago write in its own words" (localStorage `lagomo.gpt.v1`).
