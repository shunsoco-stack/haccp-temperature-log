const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(result.outputText, filename);
};

const dates = require("../src/lib/dates.ts");
const equipment = require("../src/lib/equipment.ts");
const alerts = require("../src/lib/alerts.ts");
const { createSeed } = require("../src/lib/seed.ts");
const { monthlyPages } = require("../src/lib/monthly.ts");
const { statistics, trend } = require("../src/lib/stats.ts");
const { validateData, parseBackup, exportBackup } = require("../src/lib/backup.ts");
const { loadData } = require("../src/lib/storage.ts");
const { saveReading } = require("../src/lib/readings.ts");
const csv = require("../src/lib/csv.ts");

const now = new Date("2026-11-18T17:00:00+09:00");
const seed = createSeed(now);

for (const [time, expected] of [
  ["00:20", "2026-11-16"],
  ["03:59", "2026-11-16"],
  ["04:00", "2026-11-17"],
  ["09:45", "2026-11-17"],
  ["12:30", "2026-11-17"],
  ["23:55", "2026-11-17"],
]) {
  test(`営業日：${time}`, () =>
    assert.equal(dates.businessDate(new Date(`2026-11-17T${time}:00+09:00`)), expected));
}

for (const date of ["2026-11-18", "2026-11-25", "2026-12-02"])
  test(`水曜定休 ${date}`, () => assert.equal(dates.isClosed(date), true));

for (const [temperature, limit, expected] of [
  [10, 10, false],
  [10.1, 10, true],
  [9.9, 10, false],
  [-15, -15, false],
  [-14.9, -15, true],
  [-15.1, -15, false],
])
  test(`基準境界 ${temperature}/${limit}`, () =>
    assert.equal(alerts.isOutside(temperature, limit), expected));

for (const [value, expected] of [
  [-30, true],
  [30, true],
  [0.1, true],
  [-30.1, false],
  [30.1, false],
  [1.01, false],
  [NaN, false],
  [Infinity, false],
])
  test(`温度入力 ${value}`, () => assert.equal(equipment.validTemperature(value), expected));

for (const [time, slot, expected] of [
  ["2026-11-17T11:00:00+09:00", "open", false],
  ["2026-11-17T11:00:01+09:00", "open", true],
  ["2026-11-18T00:20:00+09:00", "close", false],
  ["2026-11-18T02:00:00+09:00", "close", false],
  ["2026-11-18T02:00:01+09:00", "close", true],
])
  test(`記録漏れ ${time}`, () =>
    assert.equal(alerts.isMissing("2026-11-17", slot, undefined, new Date(time)), expected));

for (const [month, count] of [
  ["2026-02", 28],
  ["2028-02", 29],
  ["2026-04", 30],
  ["2026-12", 31],
])
  test(`月の日数 ${month}`, () => assert.equal(monthlyPages(seed, month)[0].rows.length, count));

for (const count of [1, 3, 4, 5, 6, 7])
  test(`機器${count}台のページ分割`, () => {
    const data = {
      ...seed,
      equipment: Array.from({ length: count }, (_, index) => ({
        ...seed.equipment[0],
        id: String(index),
      })),
    };
    assert.equal(monthlyPages(data, "2026-11").length, Math.ceil(count / 3));
  });

for (const instant of [
  "2026-11-17T00:20:00+09:00",
  "2026-11-17T03:59:00+09:00",
  "2026-11-17T04:00:00+09:00",
  "2026-11-17T09:40:00+09:00",
  "2026-11-17T12:20:00+09:00",
  "2026-11-17T23:50:00+09:00",
  "2026-12-01T00:20:00+09:00",
  "2026-11-30T23:50:00+09:00",
  "2026-11-18T17:00:00+09:00",
]) {
  test(`シードの時刻・営業日・定休 ${instant}`, () => {
    const current = new Date(instant);
    const data = createSeed(current);
    assert.equal(validateData(data), true);
    for (const item of data.readings) {
      assert.ok(Date.parse(item.at) < current.getTime());
      assert.equal(dates.businessDate(new Date(item.at)), item.date);
      assert.equal(dates.isClosed(item.date), false);
      const time = dates.japanTime(new Date(item.at));
      assert.ok(
        item.slot === "open"
          ? time >= "09:30" && time <= "11:00"
          : time >= "21:30" || time <= "00:30",
      );
      if (item.response) assert.ok(Date.parse(item.response.at) < current.getTime());
    }
  });
}

const corruptions = {
  version: (data) => {
    data.version = 2;
  },
  equipmentReference: (data) => {
    data.readings[0].equipmentId = "missing";
  },
  staffReference: (data) => {
    data.readings[0].staffId = "missing";
  },
  duplicateId: (data) => {
    data.readings[1].id = data.readings[0].id;
  },
  duplicateCell: (data) => {
    data.readings.push({ ...data.readings[0], id: "duplicate" });
  },
  temperature: (data) => {
    data.readings[0].temperature = 100;
  },
  precision: (data) => {
    data.readings[0].temperature = 1.234;
  },
  date: (data) => {
    data.readings[0].date = "2026-02-30";
  },
  time: (data) => {
    data.readings[0].at = "invalid";
  },
  slot: (data) => {
    data.readings[0].slot = "noon";
  },
  response: (data) => {
    data.readings[0].response = { memo: "" };
  },
  history: (data) => {
    data.readings[0].revisions = [{ reason: "" }];
  },
  emptyEquipment: (data) => {
    data.equipment = [];
  },
  initials: (data) => {
    data.staff[0].initials = "日本語";
  },
  limit: (data) => {
    data.equipment[0].limit = -100;
  },
};

for (const [name, corrupt] of Object.entries(corruptions))
  test(`バックアップ拒否 ${name}`, () => {
    const data = structuredClone(seed);
    corrupt(data);
    assert.equal(validateData(data), false);
    assert.throws(() => parseBackup(JSON.stringify(data)));
  });

test("バックアップ往復", () => assert.deepEqual(parseBackup(exportBackup(seed)), seed));
test("破損保存データの復旧通知", () => assert.equal(loadData("broken", now).recovered, true));
test("新規保存は復旧扱いにしない", () => assert.equal(loadData(null, now).recovered, false));
test("対応のない基準外", () =>
  assert.equal(
    alerts.needsResponse({ ...seed.readings[0], temperature: 12, limit: 10, response: undefined }),
    true,
  ));
test("再測定が境界なら対応済み", () =>
  assert.equal(
    alerts.needsResponse({
      ...seed.readings[0],
      temperature: 12,
      limit: 10,
      response: { temperature: 10 },
    }),
    false,
  ));
test("再測定も基準外なら継続", () =>
  assert.equal(
    alerts.needsResponse({
      ...seed.readings[0],
      temperature: 12,
      limit: 10,
      response: { temperature: 10.1 },
    }),
    true,
  ));
test("定休日は記録漏れなし", () =>
  assert.equal(alerts.isMissing("2026-11-18", "open", undefined, new Date("2026-11-19")), false));
test("記録済みは記録漏れなし", () =>
  assert.equal(alerts.isMissing("2026-11-17", "open", seed.readings[0], now), false));
test("月末から翌月", () => assert.equal(dates.addDays("2026-12-31", 1), "2027-01-01"));
test("日付形式を拒否", () => assert.equal(dates.validDate("2026-1-1"), false));
test("温度増分の丸め", () => assert.equal(equipment.adjustTemperature(0.2, 0.1), 0.3));
test("温度上限のクランプ", () => assert.equal(equipment.adjustTemperature(30, 0.1), 30));
test("冷蔵初期値", () => assert.equal(equipment.defaultLimit("fridge"), 10));
test("冷凍初期値", () => assert.equal(equipment.defaultLimit("freezer"), -15));
test("推移の機器と月を絞り込み", () =>
  assert.ok(
    trend(seed, "drinks", "2026-10").every(
      (item) => item.equipmentId === "drinks" && item.date.startsWith("2026-10"),
    ),
  ));
test("推移は日付順", () => {
  const values = trend(seed, "drinks", "2026-10");
  assert.deepEqual(
    values.map((item) => item.date),
    values.map((item) => item.date).sort(),
  );
});
test("完了月の件数と記録率", () => {
  const value = statistics(seed, "2026-10", now);
  assert.equal(value.outside, 2);
  assert.ok(value.rate >= 99 && value.rate <= 100);
  assert.ok(value.missing <= 2);
});
test("CSV BOM", () =>
  assert.equal(csv.makeCsv(seed, "2026-10-01", "2026-10-31").charCodeAt(0), 0xfeff));
test("CSV引用符と改行", () => assert.equal(csv.csvCell('a,"b\nc'), '"a,""b\nc"'));
test("CSV数式の無効化", () => assert.equal(csv.csvCell("=SUM(A1)"), '"\'=SUM(A1)"'));
test("CSV負の温度を保持", () => assert.equal(csv.csvCell(-18.2), '"-18.2"'));
test("温度CSVファイル名", () => assert.equal(csv.csvFilename("2026-11"), "温度記録_2026-11.csv"));
test("対応CSVファイル名", () =>
  assert.equal(
    csv.alertFilename("2026-10-01", "2026-11-18"),
    "基準外と対応_2026-10-01_2026-11-18.csv",
  ));
test("対応CSVは期間の基準外のみ", () =>
  assert.equal(csv.makeCsv(seed, "2026-10-01", "2026-10-31", true).split("\r\n").length, 3));
test("シードメモは重複せず具体的", () => {
  const memos = seed.readings.flatMap((item) => (item.response ? [item.response.memo] : []));
  assert.equal(new Set(memos).size, memos.length);
  assert.ok(memos.every((memo) => !memo.includes("さん：") && memo.length > 8));
});
test("シードの時刻が多様", () =>
  assert.ok(new Set(seed.readings.map((item) => dates.japanTime(new Date(item.at)))).size > 50));
test("機器別の平均が異なる", () => {
  const average = (id) => {
    const values = seed.readings.filter((item) => item.equipmentId === id);
    return values.reduce((sum, item) => sum + item.temperature, 0) / values.length;
  };
  assert.ok(average("drinks") > average("kitchen") + 2);
  assert.ok(average("freezer") < -17);
});
test("シードに配列の循環を使わない", () =>
  assert.doesNotMatch(
    fs.readFileSync(require.resolve("../src/lib/seed.ts"), "utf8"),
    /%\s*(?:\w+|\d+)/,
  ));
test("担当者が全員登場し循環しない", () => {
  const values = [
    ...new Map(seed.readings.map((item) => [`${item.date}-${item.slot}`, item.staffId])).values(),
  ];
  assert.equal(new Set(values).size, 5);
  assert.ok(values.some((value, index) => index > 0 && value === values[index - 1]));
});
test("過去の修正は理由必須", () =>
  assert.throws(() => saveReading(seed, { ...seed.readings[0], temperature: 4 }, now, "")));
test("修正履歴に旧値を保存", () => {
  const original = seed.readings[0];
  const result = saveReading(seed, { ...original, temperature: 4.8 }, now, "転記を確認");
  const updated = result.readings.find((item) => item.id === original.id);
  assert.equal(updated.revisions[0].previous, original.temperature);
  assert.equal(updated.revisions[0].reason, "転記を確認");
  assert.equal(seed.readings[0].revisions.length, 0);
});

test("対応保存は空白メモを拒否", () => {
  assert.throws(() =>
    alerts.recordResponse(
      { ...seed.readings[0], temperature: 12, limit: 10 },
      { category: "その他", memo: "   ", temperature: 5, at: now.toISOString() },
    ),
  );
});

test("対応保存は基準外の再測定を保持", () => {
  const result = alerts.recordResponse(
    { ...seed.readings[0], temperature: 12, limit: 10 },
    { category: "その他", memo: "冷却を継続", temperature: 11, at: now.toISOString() },
  );
  assert.equal(alerts.needsResponse(result), true);
});

test("定休日のバックアップ記録は拒否", () => {
  const data = structuredClone(seed);
  data.readings[0].date = "2026-11-18";
  assert.equal(validateData(data), false);
});

test("登録前のバックアップ記録は拒否", () => {
  const data = structuredClone(seed);
  data.readings[0].date = "2020-01-02";
  assert.equal(validateData(data), false);
});
