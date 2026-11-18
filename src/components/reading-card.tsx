"use client";

import { useState } from "react";
import { useStore } from "./app-provider";
import { categories, isOutside, needsResponse, recordResponse } from "@/lib/alerts";
import { businessDate, japanTime } from "@/lib/dates";
import { adjustTemperature } from "@/lib/equipment";
import { findReading, saveReading } from "@/lib/readings";
import type { Equipment, Slot } from "@/lib/types";

export function ReadingCard({
  equipment,
  date,
  slot,
}: {
  equipment: Equipment;
  date: string;
  slot: Slot;
}) {
  const { data, now, update, notify } = useStore();
  const reading = findReading(data, date, equipment.id, slot);
  const [value, setValue] = useState(reading ? String(reading.temperature) : "");
  const [staffId, setStaffId] = useState(reading?.staffId ?? data.staff[0].id);
  const [editing, setEditing] = useState(!reading);
  const [responding, setResponding] = useState(false);
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [memo, setMemo] = useState("");
  const [recheck, setRecheck] = useState("");
  const limit = reading?.limit ?? equipment.limit;
  const outside = value !== "" && isOutside(Number(value), limit);
  function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      update(
        saveReading(
          data,
          {
            id: reading?.id ?? crypto.randomUUID(),
            equipmentId: equipment.id,
            date,
            slot,
            temperature: Number(value),
            limit,
            staffId,
            at: new Date().toISOString(),
            revisions: reading?.revisions ?? [],
            response: undefined,
          },
          new Date(),
          reason,
        ),
      );
      setEditing(false);
      setReason("");
      notify(
        outside
          ? "⚠ 基準外の温度です。対応と再測定結果を記録してください。"
          : "温度を記録しました。",
      );
    } catch (error) {
      notify((error as Error).message);
    }
  }
  function saveResponse(event: React.FormEvent) {
    event.preventDefault();
    if (!reading) return;
    const response = {
      category,
      memo: memo.trim(),
      temperature: Number(recheck),
      at: new Date().toISOString(),
    };
    try {
      update({
        ...data,
        readings: data.readings.map((item) =>
          item.id === reading.id ? recordResponse(item, response) : item,
        ),
      });
    } catch (error) {
      notify((error as Error).message);
      return;
    }
    setResponding(false);
    notify(
      isOutside(response.temperature, limit)
        ? "⚠ 再測定も基準外です。引き続き対応してください。"
        : "対応と再測定結果を保存しました。",
    );
  }
  return (
    <article
      className={`reading-card ${reading ? "recorded" : ""} ${reading && needsResponse(reading) ? "alert-card" : ""}`}
    >
      <div className="card-top">
        <span className={`equipment-icon ${equipment.kind}`}>
          {equipment.kind === "freezer" ? "❄" : "▣"}
        </span>
        <span className={`status ${reading ? "done" : "pending"}`}>
          {reading ? "✓ 記録済み" : "未記録"}
        </span>
      </div>
      <h3>{equipment.name}</h3>
      <p className="card-caption">
        {equipment.kind === "fridge" ? "冷蔵" : "冷凍"} <span>基準 {limit}℃以下</span>
      </p>
      {editing ? (
        <form onSubmit={save}>
          <label className="field-label">
            温度
            <div className="temperature-control">
              <button
                type="button"
                aria-label={`${equipment.name}の温度を下げる`}
                onClick={() => setValue(String(adjustTemperature(Number(value), -0.1)))}
              >
                −
              </button>
              <div>
                <input
                  aria-label={`${equipment.name}の温度`}
                  type="number"
                  inputMode="decimal"
                  min="-30"
                  max="30"
                  step="0.1"
                  required
                  value={value}
                  placeholder="--.-"
                  onChange={(event) => setValue(event.target.value)}
                />
                <span>℃</span>
              </div>
              <button
                type="button"
                aria-label={`${equipment.name}の温度を上げる`}
                onClick={() => setValue(String(adjustTemperature(Number(value), 0.1)))}
              >
                ＋
              </button>
            </div>
          </label>
          {outside && (
            <p className="warning-text" role="alert">
              ⚠ 基準を超えています。保存後、対応を記録してください。
            </p>
          )}
          <label className="field-label">
            記録者
            <select value={staffId} onChange={(event) => setStaffId(event.target.value)}>
              {data.staff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
          </label>
          {(reading || date < businessDate(now)) && (
            <label className="field-label">
              修正・追記の理由
              <textarea
                required
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          )}
          <button className="primary full" type="submit">
            ✓ 温度を記録する
          </button>
          {reading && (
            <button type="button" className="text-button full" onClick={() => setEditing(false)}>
              キャンセル
            </button>
          )}
        </form>
      ) : (
        reading && (
          <>
            <div
              className={`temperature-display ${isOutside(reading.temperature, limit) ? "outside" : ""}`}
            >
              {reading.temperature.toFixed(1)}
              <small>℃</small>
            </div>
            <p className="record-meta">
              {japanTime(new Date(reading.at))} 記録 ·{" "}
              {data.staff.find((staff) => staff.id === reading.staffId)?.name}
            </p>
            <button
              className="secondary full"
              onClick={() => {
                setValue(String(reading.temperature));
                setEditing(true);
              }}
            >
              記録を修正
            </button>
          </>
        )
      )}
      {reading && isOutside(reading.temperature, reading.limit) && (
        <div className="response-summary">
          <p className={needsResponse(reading) ? "warning-text" : "success-text"}>
            {needsResponse(reading) ? "⚠ 基準外・対応が必要です" : "✓ 対応済み・再測定は基準内"}
          </p>
          {reading.response && (
            <p>
              {reading.response.category} / {reading.response.memo}
              <br />
              再測定 {reading.response.temperature.toFixed(1)}℃
            </p>
          )}
          <button className="danger-button full" onClick={() => setResponding(!responding)}>
            対応を記録
          </button>
        </div>
      )}
      {responding && (
        <form className="response-form" onSubmit={saveResponse}>
          <label>
            対応内容
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            具体的な対応メモ
            <textarea
              required
              maxLength={1000}
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
          </label>
          <label>
            再測定温度（℃）
            <input
              type="number"
              inputMode="decimal"
              required
              min="-30"
              max="30"
              step="0.1"
              value={recheck}
              onChange={(event) => setRecheck(event.target.value)}
            />
          </label>
          <button className="primary full">対応を保存</button>
        </form>
      )}
      {!!reading?.revisions.length && (
        <details className="history">
          <summary>修正履歴（{reading.revisions.length}件）</summary>
          {reading.revisions.map((revision, index) => (
            <p key={index}>
              {new Date(revision.at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
              <br />
              変更前 {revision.previous}℃ · {revision.reason}
              {revision.previousResponse && ` / 以前の対応：${revision.previousResponse.memo}`}
            </p>
          ))}
        </details>
      )}
    </article>
  );
}
