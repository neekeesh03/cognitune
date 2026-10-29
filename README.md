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
