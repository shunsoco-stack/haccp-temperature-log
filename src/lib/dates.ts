import type { Slot } from "./types";

export function japanDate(now: Date): string {
  return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}

export function japanTime(now: Date): string {
  return new Date(now.getTime() + 9 * 3600000).toISOString().slice(11, 16);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date + "T00:00:00Z") + days * 86400000).toISOString().slice(0, 10);
}

export function businessDate(now: Date): string {
  return japanDate(new Date(now.getTime() - 4 * 3600000));
}

export function isClosed(date: string): boolean {
  return new Date(date + "T00:00:00Z").getUTCDay() === 3;
}

export function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

export function monthDays(month: string): string[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const days: string[] = [];
  let date = month + "-01";
  while (date.startsWith(month)) {
    days.push(date);
    date = addDays(date, 1);
  }
  return days;
}

export function deadline(date: string, slot: Slot): number {
  return Date.parse(
    slot === "open" ? `${date}T11:00:00+09:00` : `${addDays(date, 1)}T02:00:00+09:00`,
  );
}

export const slotLabel = { open: "開店前", close: "閉店時" };
