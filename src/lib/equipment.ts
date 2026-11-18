import type { Equipment } from "./types";

export function defaultLimit(kind: Equipment["kind"]): number {
  return kind === "fridge" ? 10 : -15;
}

export function validTemperature(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= -30 &&
    value <= 30 &&
    Math.abs(value * 10 - Math.round(value * 10)) < 0.000001
  );
}

export function adjustTemperature(value: number, delta: number): number {
  return Math.max(-30, Math.min(30, Math.round((value + delta) * 10) / 10));
}
