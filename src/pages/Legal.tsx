import { ArrowLeft } from "lucide-react";

const CONTACT = "thecelestialteens@gmail.com";
const UPDATED = "29 October 2026";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <a href="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Lagomo</a>
      <h1 className="text-4xl leading-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated {UPDATED}</p>
      <div className="mt-6 space-y-5 leading-relaxed [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_a]:text-primary [&_a]:underline">{children}</div>
    </div>);
}

export function Privacy() {
  return (
    <Shell title="Privacy">
      <p>Lagomo is a companion for getting started on things, together. It is made by Cognitune. This page explains, in plain words, what it keeps and where.</p>
      <h2>What stays on your device</h2>
      <p>Your journal, plans, check-ins, rewards and calendar blocks are saved on your device only. We cannot see them. Clearing your browser data erases them, so use Save backup in Me.</p>
      <h2>What we store on our server</h2>
      <ul>
        <li>Your username, display name and avatar.</li>
        <li>If you sign in with Google: Google's private ID number for your account. We do not store your email address, and we only use your Google name and the start of your email to suggest a username and name. We never see your Google password.</li>
        <li>If you sign in with a password: a scrambled (hashed) version of it, never the password itself.</li>
        <li>Your friends list, friend requests and blocks.</li>
        <li>Your chat messages and files, locked on your device before they are sent (end-to-end encrypted). We store only the scrambled data, who sent it and when. We cannot read it. Files are deleted after 60 days.</li>
        <li>A copy of your private chat key, locked with your password or chat passcode, so you can read your chats on a new device. We cannot open it.</li>
        <li>If you turn it on: your planned time blocks, to publish a private calendar link for you. You can turn it off any time.</li>
        <li>Simple counts such as sign-ups and messages per day, and the time you were last active.</li>
      </ul>
      <h2>Who handles it</h2>
      <p>Lagomo runs on Vercel and stores data in Upstash Redis. We do not sell your data and we do not show ads. We do not send your messages or journal to any AI service.</p>
      <h2>Your choices</h2>
      <ul>
        <li>Delete your account any time in Me, then Profile. This removes your account, friends list and messages from our server.</li>
        <li>Log out any time. This removes your chat key from the device.</li>
        <li>Ask us a question or for help: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</li>
      </ul>
      <h2>Not medical advice</h2>
      <p>Lagomo is not therapy or medical advice. If you are struggling or in crisis, please reach out to someone you trust or a local helpline. findahelpline.com lists free lines by country.</p>
    </Shell>);
}

export function Terms() {
  return (
    <Shell title="Terms">
      <p>By using Lagomo you agree to these simple terms.</p>
      <h2>Using Lagomo</h2>
      <ul>
        <li>You must be 16 or older to create an account.</li>
        <li>Be kind. Do not use Lagomo to harass, scam or spam other people, or to share anything illegal.</li>
        <li>You are responsible for your account and your password or chat passcode. We cannot reset them, and if you lose your passcode, older private messages cannot be opened.</li>
        <li>We may pause or remove accounts that break these terms.</li>
      </ul>
      <h2>What Lagomo is and is not</h2>
      <p>Lagomo is a habit and focus helper. It is not therapy, medical advice or an emergency service. Its readiness scores are estimates, not facts about you.</p>
      <h2>No promises</h2>
      <p>Lagomo is offered as it is, without guarantees, and may change or stop. We do our best to keep your data safe, but cannot promise it will never be lost, so keep a backup of your journal.</p>
      <h2>Contact</h2>
      <p><a href={`mailto:${CONTACT}`}>{CONTACT}</a>. See also the <a href="/privacy">Privacy page</a>.</p>
    </Shell>);
}
