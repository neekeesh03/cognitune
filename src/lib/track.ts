// Privacy-light product counters. Only a fixed list of event names is ever sent, never any text you write.
import { api, getToken } from "@/lib/api";
export type EventName = "app_open" | "checkin" | "timer_start" | "timer_done" | "together_start" | "invite" | "tab_circle" | "tab_plan" | "tab_checkin" | "plus_open" | "plus_price" | "name_story_seen" | "name_say_right" | "name_say_other" | "name_recall_ok" | "name_recall_miss" | "hop_cheer" | "invite_share" | "invite_join" | "alerts_prime_yes" | "alerts_prime_no" | "keep_going" | "nexthop_set" | "install_tap" | "reminder_set";
const seen = new Set<string>();
export function track(name: EventName, props?: Record<string, unknown>, oncePerSession = false) {
  if (!getToken()) return;
  if (oncePerSession) { if (seen.has(name)) return; seen.add(name); }
  api("ev", { body: { name, props } }).catch(() => {});
}
