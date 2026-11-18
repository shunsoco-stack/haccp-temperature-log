import { addDays, businessDate, isClosed } from "./dates";
import type { Data, Reading } from "./types";

function randomGenerator(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createSeed(now: Date): Data {
  const today = businessDate(now);
  const first = new Date(today + "T12:00:00Z");
  first.setUTCDate(1);
  first.setUTCMonth(first.getUTCMonth() - 2);
  const since = first.toISOString().slice(0, 10);
  const random = randomGenerator(Date.parse(since) / 86400000);
  const data: Data = {
    version: 1,
    shop: "食堂 こもれび（架空）",
    equipment: [
      { id: "kitchen", name: "厨房 冷蔵庫1", kind: "fridge", limit: 10, since },
      { id: "stock", name: "ストッカー", kind: "freezer", limit: -15, since },
      { id: "drinks", name: "ドリンクショーケース", kind: "fridge", limit: 10, since },
      { id: "freezer", name: "厨房 冷凍庫", kind: "freezer", limit: -15, since },
      { id: "prep", name: "仕込み用 冷蔵庫", kind: "fridge", limit: 10, since },
    ],
    staff: [
      { id: "s1", name: "水野 葵", initials: "AM" },
      { id: "s2", name: "小野寺 遼", initials: "RO" },
      { id: "s3", name: "相原 千夏", initials: "CA" },
      { id: "s4", name: "堀口 直樹", initials: "NH" },
      { id: "s5", name: "三枝 文", initials: "FS" },
    ],
    readings: [],
  };
  const averages = [4.1, -19.2, 7.2, -18.1, 3.8];
  const ranges = [1.5, 1.2, 2.1, 0.8, 1.8];
  const events = new Map<string, number>();
  const omissions = new Set<string>();
  const memos = [
    "瓶の先端が扉に接触して隙間ができていた。棚の奥に移し、パッキンの密着を確認。25分後に再測定。",
    "霜取り後の冷却途中だったため飲料を隣の冷蔵庫に移動。庫内が冷えてから戻した。",
    "夕食時の出し入れで庫内温度が上昇。補充作業を止めて扉を閉じ、冷却を待って確認。",
    "棚に挟まった包装フィルムを取り除いた。扉が自然に閉まることを確かめ、温度が下がった。",
    "閉店時に扉の浮きを確認。容器を整理し、再測定では基準内に戻った。",
    "扉を閉め直し、再確認。",
  ];
  for (let date = since; date <= today; date = addDays(date, 1)) {
    if (isClosed(date)) continue;
    for (const slot of ["open", "close"] as const) {
      const minutes =
        slot === "open" ? 570 + Math.floor(random() * 91) : 1290 + Math.floor(random() * 181);
      const instant = Date.parse(`${date}T00:00:00+09:00`) + minutes * 60000;
      if (instant >= now.getTime()) continue;
      const month = date.slice(0, 7);
      const staff = data.staff[Math.floor(random() * data.staff.length)];
      for (const [index, equipment] of data.equipment.entries()) {
        if (!omissions.has(month) && Number(date.slice(8)) > 10 && random() < 0.014) {
          omissions.add(month);
          continue;
        }
        let temperature =
          Math.round(
            (averages[index] +
              (random() - 0.5) * ranges[index] * 2 +
              (slot === "close" ? 0.4 : 0)) *
              10,
          ) / 10;
        const reading: Reading = {
          id: `${date}-${slot}-${equipment.id}`,
          equipmentId: equipment.id,
          date,
          slot,
          temperature,
          limit: equipment.limit,
          staffId: staff.id,
          at: new Date(instant).toISOString(),
          revisions: [],
        };
        const eventCount = events.get(month) ?? 0;
        if (
          slot === "close" &&
          equipment.id === "drinks" &&
          eventCount < 2 &&
          (random() < 0.13 || Number(date.slice(8)) > 24) &&
          instant + 25 * 60000 < now.getTime()
        ) {
          temperature = Math.round((10.5 + random() * 1.8) * 10) / 10;
          reading.temperature = temperature;
          const memo = memos.splice(Math.floor(random() * memos.length), 1)[0];
          reading.response = {
            category: memo.includes("霜取り") ? "霜取り" : "扉の閉め忘れ",
            memo,
            temperature: 7 + Math.round(random() * 10) / 10,
            at: new Date(instant + 25 * 60000).toISOString(),
          };
          events.set(month, eventCount + 1);
        }
        data.readings.push(reading);
      }
    }
  }
  return data;
}
