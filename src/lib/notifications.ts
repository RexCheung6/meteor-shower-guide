import showersData from "../data/showers.json";
import type { Shower } from "../types";

const ENABLED_KEY = "mss.notificationsEnabled";
const LAST_NOTICE_KEY = "mss.lastMeteorNotice";

export function notificationsEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === "true";
}

export async function enableNotifications(): Promise<NotificationPermission | "unsupported"> {
  if (!("Notification" in window)) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission === "granted") localStorage.setItem(ENABLED_KEY, "true");
  return permission;
}

export function disableNotifications(): void {
  localStorage.removeItem(ENABLED_KEY);
}

export function maybeNotifyUpcomingShower(): void {
  if (!notificationsEnabled() || !("Notification" in window) || Notification.permission !== "granted") return;
  const now = Date.now();
  const next = (showersData as Shower[]).map((shower) => ({ shower, time: new Date(shower.peakUTC).getTime() }))
    .filter((item) => item.time > now && item.time - now <= 48 * 60 * 60 * 1000)
    .sort((a, b) => a.time - b.time)[0];
  if (!next) return;
  const noticeKey = `${next.shower.id}:${new Date(next.time).toISOString().slice(0, 10)}`;
  if (localStorage.getItem(LAST_NOTICE_KEY) === noticeKey) return;
  new Notification("Meteor Shower Guide", { body: `${next.shower.names.en} peaks within 48 hours. Check the cloud forecast before heading out.` });
  localStorage.setItem(LAST_NOTICE_KEY, noticeKey);
}

