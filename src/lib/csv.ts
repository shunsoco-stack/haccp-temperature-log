import { isOutside } from "./alerts";
import { japanTime, slotLabel } from "./dates";
import type { Data } from "./types";

export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[=+@\-]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}

export function csvFilename(month: string): string {
  return `温度記録_${month}.csv`;
}

export function alertFilename(from: string, to: string): string {
  return `基準外と対応_${from}_${to}.csv`;
}

export function makeCsv(data: Data, from: string, to: string, alertsOnly = false): string {
  const rows: unknown[][] = [
    [
      "営業日",
      "時間帯",
      "機器",
      "温度℃",
      "基準℃以下",
      "記録者",
      "時刻（日本時間）",
      "対応",
      "メモ",
      "再測定℃",
      "修正履歴",
    ],
  ];
  for (const item of [...data.readings].sort((a, b) => a.date.localeCompare(b.date))) {
    if (
      item.date < from ||
      item.date > to ||
      (alertsOnly && !isOutside(item.temperature, item.limit))
    )
      continue;
    rows.push([
      item.date,
      slotLabel[item.slot],
      data.equipment.find((equipment) => equipment.id === item.equipmentId)?.name,
      item.temperature,
      item.limit,
      data.staff.find((staff) => staff.id === item.staffId)?.name,
      japanTime(new Date(item.at)),
      item.response?.category,
      item.response?.memo,
      item.response?.temperature,
      item.revisions
        .map((revision) => `${revision.at} ${revision.previous}℃ → 修正：${revision.reason}`)
        .join(" / "),
    ]);
  }
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function download(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
