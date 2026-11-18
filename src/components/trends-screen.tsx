"use client";

import { useState } from "react";
import { useStore } from "./app-provider";
import { PageHeading } from "./page-heading";
import { businessDate, monthDays } from "@/lib/dates";
import { statistics, trend } from "@/lib/stats";
import { alertFilename, csvFilename, download, makeCsv } from "@/lib/csv";

export function TrendsScreen() {
  const { data, now } = useStore();
  const [month, setMonth] = useState(businessDate(now).slice(0, 7));
  const [equipmentId, setEquipmentId] = useState(data.equipment[0].id);
  const [from, setFrom] = useState(data.equipment[0].since);
  const [to, setTo] = useState(businessDate(now));
  const equipment = data.equipment.find((item) => item.id === equipmentId)!;
  const readings = trend(data, equipmentId, month);
  const stats = statistics(data, month, now);
  const minimum = Math.min(equipment.limit - 10, ...readings.map((item) => item.temperature)) - 2;
  const maximum = Math.max(equipment.limit + 3, ...readings.map((item) => item.temperature)) + 2;
  const y = (value: number) => 220 - ((value - minimum) / (maximum - minimum)) * 180;
  const x = (date: string, slot: string) =>
    50 +
    ((Number(date.slice(8)) - 1 + (slot === "close" ? 0.5 : 0)) /
      Math.max(1, monthDays(month).length - 0.5)) *
      690;
  return (
    <>
      <PageHeading
        eyebrow="INSIGHTS & TRENDS"
        title="推移と振り返り"
        description="温度の変化を見つめて、日々の管理をもっと確かに。"
      >
        <button
          className="secondary"
          onClick={() =>
            download(
              makeCsv(data, month + "-01", monthDays(month).at(-1) ?? ""),
              csvFilename(month),
              "text/csv;charset=utf-8",
            )
          }
        >
          ↓ 温度記録CSV
        </button>
      </PageHeading>
      <div className="filter-bar">
        <label>
          対象月
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
        <label>
          機器
          <select value={equipmentId} onChange={(event) => setEquipmentId(event.target.value)}>
            {data.equipment.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="summary-grid">
        <div className="metric">
          <span>月の基準外件数</span>
          <strong>
            {stats.outside}
            <small> 件</small>
          </strong>
        </div>
        <div className="metric">
          <span>記録率</span>
          <strong>
            {stats.rate}
            <small> %</small>
          </strong>
        </div>
        <div className="metric">
          <span>記録漏れ</span>
          <strong>
            {stats.missing}
            <small> 件</small>
          </strong>
        </div>
      </div>
      <p className="muted">
        記録率＝記録済み ÷（記録済み＋締切を過ぎた未記録）。定休日・登録前は除外します。
      </p>
      <section className="panel">
        <div className="section-title">
          <h2>{equipment.name}の温度推移</h2>
          <span>現在の基準 {equipment.limit}℃以下</span>
        </div>
        {readings.length ? (
          <svg
            className="trend-chart"
            viewBox="0 0 800 260"
            role="img"
            aria-label={`${month}の${equipment.name}の温度推移。基準線は${equipment.limit}℃。`}
          >
            <rect x="50" y="25" width="690" height="195" fill="#f7faf8" />
            {[minimum, (minimum + maximum) / 2, maximum].map((value) => (
              <g key={value}>
                <line x1="50" x2="740" y1={y(value)} y2={y(value)} stroke="#dfe8e3" />
                <text x="5" y={y(value) + 4} fontSize="12" fill="#68776f">
                  {value.toFixed(1)}℃
                </text>
              </g>
            ))}
            <line
              x1="50"
              x2="740"
              y1={y(equipment.limit)}
              y2={y(equipment.limit)}
              stroke="#ba583e"
              strokeDasharray="6 5"
            />
            <text x="610" y={y(equipment.limit) - 8} fontSize="12" fill="#a5442e">
              基準 {equipment.limit}℃
            </text>
            <polyline
              points={readings
                .map((item) => `${x(item.date, item.slot)},${y(item.temperature)}`)
                .join(" ")}
              fill="none"
              stroke="#25806a"
              strokeWidth="2.5"
            />
            {readings.map((item) => (
              <circle
                key={item.id}
                cx={x(item.date, item.slot)}
                cy={y(item.temperature)}
                r="3"
                fill={item.temperature > item.limit ? "#bc463c" : "#25806a"}
              >
                <title>
                  {item.date} {item.slot === "open" ? "開店前" : "閉店時"} {item.temperature}℃
                </title>
              </circle>
            ))}
            {[1, 10, 20, monthDays(month).length].map((day) => (
              <text
                key={day}
                x={x(`${month}-${String(day).padStart(2, "0")}`, "open")}
                y="245"
                fontSize="12"
                fill="#68776f"
              >
                {day}日
              </text>
            ))}
          </svg>
        ) : (
          <div className="empty-state">この月の記録はありません。</div>
        )}
        <p className="muted">● 緑：基準内　● 赤：記録時の基準外　破線：現在の基準温度</p>
      </section>
      <section className="panel">
        <h2>基準外と対応を書き出す</h2>
        <p>期間を指定して、対応メモ・再測定温度を含むCSVを保存します。</p>
        <form
          className="filter-bar"
          onSubmit={(event) => {
            event.preventDefault();
            download(
              makeCsv(data, from, to, true),
              alertFilename(from, to),
              "text/csv;charset=utf-8",
            );
          }}
        >
          <label>
            開始日
            <input
              required
              type="date"
              max={to}
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label>
            終了日
            <input
              required
              type="date"
              min={from}
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <button className="primary">↓ 基準外と対応CSV</button>
        </form>
      </section>
    </>
  );
}
