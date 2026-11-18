import { parseBackup } from "./backup";
import { createSeed } from "./seed";

export const storageKey = "htl:v1";

export function loadData(raw: string | null, now: Date) {
  if (!raw) return { data: createSeed(now), recovered: false };
  try {
    return { data: parseBackup(raw), recovered: false };
  } catch {
    return { data: createSeed(now), recovered: true };
  }
}
