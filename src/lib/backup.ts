import { validDate, isClosed } from "./dates";
import { validTemperature } from "./equipment";
import type { Data } from "./types";

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 2000;
}

function timestamp(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/.test(value) &&
    validDate(value.slice(0, 10)) &&
    Number.isFinite(Date.parse(value))
  );
}

function temperature(value: unknown): boolean {
  return typeof value === "number" && validTemperature(value);
}

function response(value: unknown): boolean {
  return (
    object(value) &&
    text(value.category) &&
    text(value.memo) &&
    temperature(value.temperature) &&
    timestamp(value.at)
  );
}

export function validateData(value: unknown): value is Data {
  if (
    !object(value) ||
    value.version !== 1 ||
    !text(value.shop) ||
    !Array.isArray(value.equipment) ||
    !Array.isArray(value.staff) ||
    !Array.isArray(value.readings)
  )
    return false;
  if (
    !value.equipment.length ||
    value.equipment.length > 30 ||
    !value.staff.length ||
    value.staff.length > 100 ||
    value.readings.length > 200000
  )
    return false;
  const equipmentIds = new Set<string>();
  for (const item of value.equipment) {
    if (
      !object(item) ||
      !text(item.id) ||
      equipmentIds.has(item.id) ||
      !text(item.name) ||
      !["fridge", "freezer"].includes(String(item.kind)) ||
      !temperature(item.limit) ||
      !validDate(item.since)
    )
      return false;
    equipmentIds.add(item.id);
  }
  const staffIds = new Set<string>();
  for (const item of value.staff) {
    if (
      !object(item) ||
      !text(item.id) ||
      staffIds.has(item.id) ||
      !text(item.name) ||
      typeof item.initials !== "string" ||
      !/^[A-Z]{1,4}$/.test(item.initials)
    )
      return false;
    staffIds.add(item.id);
  }
  const ids = new Set<string>();
  const keys = new Set<string>();
  for (const item of value.readings) {
    if (
      !object(item) ||
      !text(item.id) ||
      ids.has(item.id) ||
      !equipmentIds.has(String(item.equipmentId)) ||
      !staffIds.has(String(item.staffId)) ||
      !validDate(item.date) ||
      isClosed(item.date) ||
      !["open", "close"].includes(String(item.slot)) ||
      !temperature(item.temperature) ||
      !temperature(item.limit) ||
      !timestamp(item.at) ||
      !Array.isArray(item.revisions)
    )
      return false;
    const equipment = value.equipment.find((entry) => entry.id === item.equipmentId);
    if (item.date < equipment.since) return false;
    if (item.response !== undefined && !response(item.response)) return false;
    for (const revision of item.revisions)
      if (
        !object(revision) ||
        !timestamp(revision.at) ||
        !text(revision.reason) ||
        !temperature(revision.previous) ||
        !staffIds.has(String(revision.previousStaffId)) ||
        !temperature(revision.previousLimit) ||
        (revision.previousResponse !== undefined && !response(revision.previousResponse))
      )
        return false;
    const key = `${item.date}/${item.slot}/${item.equipmentId}`;
    if (keys.has(key)) return false;
    keys.add(key);
    ids.add(item.id);
  }
  return true;
}

export function parseBackup(json: string): Data {
  const value: unknown = JSON.parse(json);
  if (!validateData(value)) throw new Error("バックアップの形式・値・参照先が不正です。");
  return value;
}

export function exportBackup(data: Data): string {
  return JSON.stringify(data, null, 2);
}
