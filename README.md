# Cognitune

A friendly companion for getting started on things. Check how ready you are, break tasks into tiny steps, plan your day in time blocks, build gentle streaks, earn rewards, and keep friends in your corner.

Live: https://cognitune-nikesh.vercel.app/

## What is inside
- **Today, Plan, Tune, Check-in, Circle, Me** tabs.
- **Tune**, a rule-based companion for journaling and chat. No AI service or API key is used.
- **Accounts and friends**: sign up with a username and password, pick a one-of-a-kind cute avatar, add friends by username, chat and send files.
- **Privacy**: journal, plans, rewards and check-ins stay in the browser. Only account details, friend lists, messages and attachments are stored on the server.

## Tech
Vite, React, TypeScript, Tailwind, shadcn/ui. Backend is a single Vercel serverless function (`api/[...path].js`) using Upstash Redis through the Vercel Storage integration.

## Run locally
```sh
npm i
npm run dev
```
Without Redis variables the API falls back to an in-memory store, which is fine for local testing and is disabled on Vercel.

## Deploy
Connect the repo to Vercel, add an Upstash Redis database from Vercel Storage (it sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`), and optionally set `SESSION_SECRET` to a long random string.

## Brand
Colours: Amazon (green) and Zest (amber) scales plus Sage, Grey and Lavender. Typeface: Inter Tight.

## Private messages (end-to-end encryption)

Friend messages and files are encrypted on the device with the browser's Web Crypto (ECDH P-256 to agree a secret between two friends, AES-256-GCM for each message and file). The server stores only scrambled data plus who sent it and when. Each account's private key is locked with a key derived from the password (PBKDF2, 310,000 rounds) before a copy is stored on the server, so chats can be opened on a new device after signing in. Each chat shows a safety code that two friends can compare to rule out a man in the middle.

Limits: the server still sees who talks to whom, when, message type and size. A weak password weakens the key lock. If an admin resets a password, old private messages can no longer be opened. Messages sent before encryption was added remain readable on the server. The code is `src/lib/e2ee.ts`.
