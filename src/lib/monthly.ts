import { monthDays, isClosed } from "./dates";
import { findReading } from "./readings";
import type { Data } from "./types";

export function monthlyPages(data: Data, month: string, pageSize = 3) {
  if (pageSize < 1) throw new Error("ページサイズが不正です。");
  const pages = [];
  for (let offset = 0; offset < data.equipment.length; offset += pageSize) {
    const equipment = data.equipment.slice(offset, offset + pageSize);
    const rows = monthDays(month).map((date) => ({
      date,
      closed: isClosed(date),
      cells: equipment.map((item) => ({
        equipment: item,
        open: findReading(data, date, item.id, "open"),
        close: findReading(data, date, item.id, "close"),
      })),
    }));
    pages.push({ equipment, rows });
  }
  return pages;
}
