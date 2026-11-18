import { deadline, isClosed } from "./dates";
import { validTemperature } from "./equipment";
import type { Reading, Slot, Response } from "./types";

export function isOutside(temperature: number, limit: number): boolean {
  return temperature > limit;
}

export function needsResponse(reading: Reading): boolean {
  return (
    isOutside(reading.temperature, reading.limit) &&
    (!reading.response || isOutside(reading.response.temperature, reading.limit))
  );
}

export function isMissing(
  date: string,
  slot: Slot,
  reading: Reading | undefined,
  now: Date,
): boolean {
  return !isClosed(date) && !reading && now.getTime() > deadline(date, slot);
}

export const categories = ["扉の閉め忘れ", "霜取り", "食材の移動・廃棄", "業者連絡", "その他"];

export function recordResponse(reading: Reading, response: Response): Reading {
  if (
    !isOutside(reading.temperature, reading.limit) ||
    !categories.includes(response.category) ||
    !response.memo.trim() ||
    response.memo.length > 1000 ||
    !validTemperature(response.temperature) ||
    !Number.isFinite(Date.parse(response.at))
  ) {
    throw new Error("対応内容・メモ・再測定温度を確認してください。");
  }
  return {
    ...reading,
    response: { ...response, memo: response.memo.trim() },
    revisions: reading.response
      ? [
          ...reading.revisions,
          {
            at: response.at,
            reason: "対応の再記録",
            previous: reading.temperature,
            previousStaffId: reading.staffId,
            previousLimit: reading.limit,
            previousResponse: reading.response,
          },
        ]
      : reading.revisions,
  };
}
