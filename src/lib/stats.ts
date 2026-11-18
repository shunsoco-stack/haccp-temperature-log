import { monthDays } from "./dates";
import { isMissing, isOutside } from "./alerts";
import { findReading } from "./readings";
import type { Data } from "./types";

export function trend(data: Data, equipmentId: string, month: string) {
  return data.readings
    .filter((item) => item.equipmentId === equipmentId && item.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.slot === "open" ? -1 : 1));
}

export function statistics(data: Data, month: string, now: Date) {
  const readings = data.readings.filter((item) => item.date.startsWith(month));
  let missing = 0;
  for (const date of monthDays(month))
    for (const equipment of data.equipment)
      for (const slot of ["open", "close"] as const)
        if (
          date >= equipment.since &&
          isMissing(date, slot, findReading(data, date, equipment.id, slot), now)
        )
          missing++;
  return {
    count: readings.length,
    missing,
    outside: readings.filter((item) => isOutside(item.temperature, item.limit)).length,
    rate:
      readings.length + missing
        ? Math.round((readings.length / (readings.length + missing)) * 1000) / 10
        : 0,
  };
}
