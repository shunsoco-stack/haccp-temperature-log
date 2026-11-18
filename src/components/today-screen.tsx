"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "./app-provider";
import { PageHeading } from "./page-heading";
import { ReadingCard } from "./reading-card";
import { businessDate, isClosed, japanTime, slotLabel } from "@/lib/dates";
import { isMissing, needsResponse } from "@/lib/alerts";
import { findReading } from "@/lib/readings";
import type { Slot } from "@/lib/types";

export function TodayScreen({ history = false }: { history?: boolean }) {
  const { data, now } = useStore();
  const today = businessDate(now);
  const [selectedDate, setSelectedDate] = useState(today);
  const [slot, setSlot] = useState<Slot>(
    japanTime(now) >= "17:00" || japanTime(now) < "04:00" ? "close" : "open",
  );
  const date = history ? selectedDate : today;
  const activeEquipment = data.equipment.filter((item) => item.since <= date);
  const readings = data.readings.filter((item) => item.date === date);
  const unresolved = data.readings.filter(needsResponse);
  const missing = activeEquipment.flatMap((equipment) =>
    (["open", "close"] as const)
      .filter((period) =>
        isMissing(date, period, findReading(data, date, equipment.id, period), now),
      )
      .map((period) => `${equipment.name}（${slotLabel[period]}）`),
  );
  const closed = isClosed(date);
  return (
    <>
      <PageHeading
        eyebrow={history ? "DAILY RECORDS" : "DAILY TEMPERATURE LOG"}
        title={history ? "日別の記録" : "今日の温度記録"}
        description={
          history
            ? "過去の記録を確認。修正・追記には理由を残します。"
            : "いつもの温度を、いつもの安心に。開店前と閉店時に記録しましょう。"
        }
      >
        <Link className="secondary" href="/monthly">
          ▦ 月次記録表を見る
        </Link>
      </PageHeading>
      <div className="date-line">
        <div className="date-title">
          {history ? (
            <input
              aria-label="記録の営業日"
              type="date"
              value={date}
              max={today}
              onChange={(event) => event.target.value && setSelectedDate(event.target.value)}
            />
          ) : (
            <>
              <span className="calendar-symbol">▦</span>
              {new Date(date + "T12:00:00+09:00").toLocaleDateString("ja-JP", {
                month: "long",
                day: "numeric",
                weekday: "long",
                timeZone: "Asia/Tokyo",
              })}
              <span className="today-pill">{closed ? "定休日" : "今日"}</span>
            </>
          )}
        </div>
        <span className="muted">
          営業日 {date} <span className="desktop-only">· 午前4時切り替え</span>
        </span>
      </div>
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-icon mint">✓</div>
          <div>
            <span>本日の記録</span>
            <strong>
              {readings.length}
              <small> / {closed ? 0 : activeEquipment.length * 2} 件</small>
            </strong>
          </div>
          <div className="mini-progress">
            <i
              style={{
                width: `${closed ? 0 : (readings.length / Math.max(1, activeEquipment.length * 2)) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon peach">!</div>
          <div>
            <span>対応待ち</span>
            <strong>
              {unresolved.length}
              <small> 件</small>
            </strong>
          </div>
          <span className="summary-note">
            {unresolved.length ? "対応を確認しましょう" : "すべての機器が安心"}
          </span>
        </div>
        <div className="summary-card">
          <div className="summary-icon blue">◷</div>
          <div>
            <span>記録漏れ</span>
            <strong>
              {missing.length}
              <small> 件</small>
            </strong>
          </div>
          <span className="summary-note">締切を過ぎた未記録</span>
        </div>
      </div>
      {unresolved.length > 0 && (
        <section className="alert-banner">
          <strong>⚠ 基準外の対応が残っています</strong>
          {unresolved.map((item) => (
            <Link
              key={item.id}
              href="/records"
              onClick={() => {
                if (history) {
                  setSelectedDate(item.date);
                  setSlot(item.slot);
                }
              }}
            >
              {item.date}{" "}
              {data.equipment.find((equipment) => equipment.id === item.equipmentId)?.name}：
              {item.temperature}℃（{slotLabel[item.slot]}）
            </Link>
          ))}
          <p>日別の記録で該当日・時間帯を選び、対応を記録してください。</p>
        </section>
      )}
      {missing.length > 0 && (
        <div className="missing-banner">
          <strong>◷ 記録漏れがあります</strong>
          <p>{missing.join("、")}</p>
        </div>
      )}
      <section className="record-section">
        <div className="section-toolbar">
          <div className="segmented" aria-label="記録する時間帯">
            {(["open", "close"] as const).map((period) => (
              <button
                key={period}
                aria-pressed={slot === period}
                className={slot === period ? "selected" : ""}
                onClick={() => setSlot(period)}
              >
                <span>{period === "open" ? "☀" : "☾"}</span>
                {slotLabel[period]}
                <span className="slot-count">
                  {readings.filter((item) => item.slot === period).length}/
                  {closed ? 0 : activeEquipment.length}
                </span>
              </button>
            ))}
          </div>
          <span className="muted">{slot === "open" ? "11:00までに記録" : "翌2:00までに記録"}</span>
        </div>
        <div className="section-title">
          <h2>{slotLabel[slot]}の温度確認</h2>
          <span>温度の単位：℃</span>
        </div>
        {closed ? (
          <div className="empty-state">
            <span>☕</span>
            <h2>水曜日は定休日です</h2>
            <p>今日は記録の必要がありません。過去の記録や月次記録表を確認できます。</p>
            <Link className="secondary" href="/records">
              日別の記録を見る
            </Link>
          </div>
        ) : (
          <div className="equipment-grid">
            {activeEquipment.map((equipment) => (
              <ReadingCard
                key={`${date}-${slot}-${equipment.id}-${findReading(data, date, equipment.id, slot)?.id ?? "new"}`}
                equipment={equipment}
                date={date}
                slot={slot}
              />
            ))}
          </div>
        )}
      </section>
      <div className="help-strip">
        <span>ⓘ</span>
        <p>
          <strong>温度が基準を超えたら</strong>
          <br />
          扉の状態や庫内を確認し、対応内容と再測定した温度を記録しましょう。
        </p>
        <Link href="/about">このデモについて →</Link>
      </div>
    </>
  );
}
