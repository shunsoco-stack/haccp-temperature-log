"use client";

import { useState } from "react";
import { useStore } from "./app-provider";
import { PageHeading } from "./page-heading";
import { businessDate } from "@/lib/dates";
import { monthlyPages } from "@/lib/monthly";
import { isOutside, needsResponse } from "@/lib/alerts";
import type { Reading } from "@/lib/types";

export function MonthlyScreen() {
  const { data, now } = useStore();
  const [month, setMonth] = useState(businessDate(now).slice(0, 7));
  function cell(reading: Reading | undefined, date: string, since: string, closed: boolean) {
    if (closed) return "定休";
    if (date < since) return "登録前";
    if (!reading) return date > businessDate(now) ? "予定" : "未記録";
    const outside = isOutside(reading.temperature, reading.limit);
    return (
      <>
        <span className={outside ? "circled" : ""}>
          {reading.temperature.toFixed(1)}
          {outside && "※"}
        </span>
        <small>
          {" "}
          {data.staff.find((staff) => staff.id === reading.staffId)?.initials}
          {outside && (needsResponse(reading) ? "・要対応" : "・対応済")}
        </small>
      </>
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="MONTHLY REPORT"
        title="月次記録表"
        description="毎日の記録を、一枚の安心に。A4横向きで印刷できます。"
      >
        <button className="primary" onClick={() => window.print()}>
          ▤ 記録表を印刷
        </button>
      </PageHeading>
      <div className="filter-bar no-print">
        <label>
          対象月
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
        <p>1ページに機器3台まで。5台の場合は2ページです。</p>
      </div>
      {monthlyPages(data, month).map((page, index) => (
        <section key={index} className="print-sheet">
          <div className="print-heading">
            <h2>{month.replace("-", "年")}月 温度管理記録表</h2>
            <span>
              {data.shop} / {index + 1}ページ
            </span>
          </div>
          <div className="table-scroll">
            <table className="monthly-table">
              <thead>
                <tr>
                  <th rowSpan={2}>日付</th>
                  {page.equipment.map((item) => (
                    <th colSpan={2} key={item.id}>
                      {item.name}
                    </th>
                  ))}
                </tr>
                <tr>
                  {page.equipment.map((item) => (
                    <FragmentColumns key={item.id} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.rows.map((row) => (
                  <tr key={row.date} className={row.closed ? "closed-row" : ""}>
                    <th>
                      {Number(row.date.slice(8))}（
                      {new Date(row.date + "T12:00:00Z").toLocaleDateString("ja-JP", {
                        weekday: "short",
                        timeZone: "Asia/Tokyo",
                      })}
                      ）
                    </th>
                    {row.cells.flatMap((item) =>
                      (["open", "close"] as const).map((slot) => (
                        <td key={`${item.equipment.id}-${slot}`}>
                          {cell(item[slot], row.date, item.equipment.since, row.closed)}
                        </td>
                      )),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="print-notes">
            <div>
              <p>
                基準温度：
                {page.equipment.map((item) => `${item.name} ${item.limit}℃以下`).join(" / ")}
              </p>
              <p>
                ○・※：記録時の基準外 / 対応済：再測定が基準内 / 要対応：未対応または再測定も基準外
              </p>
              <p>
                記録者：{data.staff.map((staff) => `${staff.initials} ${staff.name}`).join(" / ")}
              </p>
            </div>
            <div className="stamp">
              確認者
              <br />
              <span>印</span>
            </div>
          </div>
          <p className="print-disclaimer">
            デモ用の架空データです。公的な様式の要件は自治体にご確認ください。基準変更前の判定には記録時の基準を使用します。
          </p>
        </section>
      ))}
    </>
  );
}

function FragmentColumns() {
  return (
    <>
      <th>開店前</th>
      <th>閉店時</th>
    </>
  );
}
