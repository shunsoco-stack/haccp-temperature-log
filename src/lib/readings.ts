import { validTemperature } from "./equipment";
import { businessDate, isClosed, validDate } from "./dates";
import type { Data, Reading } from "./types";

export function findReading(
  data: Data,
  date: string,
  equipmentId: string,
  slot: Reading["slot"],
): Reading | undefined {
  return data.readings.find(
    (item) => item.date === date && item.equipmentId === equipmentId && item.slot === slot,
  );
}

export function saveReading(data: Data, input: Reading, now: Date, reason: string): Data {
  const equipment = data.equipment.find((item) => item.id === input.equipmentId);
  if (
    !equipment ||
    !validTemperature(input.temperature) ||
    !data.staff.some((item) => item.id === input.staffId) ||
    !validDate(input.date) ||
    isClosed(input.date) ||
    input.date > businessDate(now) ||
    input.date < equipment.since
  )
    throw new Error("入力内容・営業日を確認してください。");
  const previous = findReading(data, input.date, input.equipmentId, input.slot);
  if ((previous || input.date < businessDate(now)) && !reason.trim())
    throw new Error("修正・追記の理由を入力してください。");
  const reading: Reading = {
    ...input,
    id: previous?.id ?? input.id,
    at: previous?.at ?? now.toISOString(),
    revisions: previous?.revisions ?? [],
  };
  if (previous)
    reading.revisions = [
      ...previous.revisions,
      {
        at: now.toISOString(),
        reason: reason.trim(),
        previous: previous.temperature,
        previousStaffId: previous.staffId,
        previousLimit: previous.limit,
        previousResponse: previous.response,
      },
    ];
  else if (input.date < businessDate(now))
    reading.revisions = [
      {
        at: now.toISOString(),
        reason: `過去日の追記：${reason.trim()}`,
        previous: input.temperature,
        previousStaffId: input.staffId,
        previousLimit: input.limit,
      },
    ];
  return {
    ...data,
    readings: [...data.readings.filter((item) => item.id !== reading.id), reading],
  };
}
