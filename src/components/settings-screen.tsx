"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "./app-provider";
import { PageHeading } from "./page-heading";
import { businessDate } from "@/lib/dates";
import { defaultLimit } from "@/lib/equipment";
import type { Equipment, Staff } from "@/lib/types";

export function SettingsScreen({ staffMode = false }: { staffMode?: boolean }) {
  const { data, now, update, notify } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [initials, setInitials] = useState("");
  const [kind, setKind] = useState<Equipment["kind"]>("fridge");
  const [limit, setLimit] = useState("10");
  function edit(item: Equipment | Staff) {
    setEditingId(item.id);
    setName(item.name);
    if ("kind" in item) {
      setKind(item.kind);
      setLimit(String(item.limit));
    } else setInitials(item.initials);
  }
  function reset() {
    setEditingId(null);
    setName("");
    setInitials("");
    setKind("fridge");
    setLimit("10");
  }
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    if (staffMode) {
      if (!editingId && data.staff.length >= 100) {
        notify("スタッフは100名まで登録できます。");
        return;
      }
      if (data.staff.some((item) => item.initials === initials && item.id !== editingId)) {
        notify("イニシャルが重複しています。別の表記を指定してください。");
        return;
      }
      const item: Staff = { id: editingId ?? crypto.randomUUID(), name: name.trim(), initials };
      update({
        ...data,
        staff: editingId
          ? data.staff.map((staff) => (staff.id === editingId ? item : staff))
          : [...data.staff, item],
      });
    } else {
      if (!editingId && data.equipment.length >= 30) {
        notify("機器は30台まで登録できます。");
        return;
      }
      const item: Equipment = {
        id: editingId ?? crypto.randomUUID(),
        name: name.trim(),
        kind,
        limit: Number(limit),
        since:
          data.equipment.find((equipment) => equipment.id === editingId)?.since ??
          businessDate(now),
      };
      update({
        ...data,
        equipment: editingId
          ? data.equipment.map((equipment) => (equipment.id === editingId ? item : equipment))
          : [...data.equipment, item],
      });
    }
    reset();
    notify("設定を保存しました。");
  }
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE SETTINGS"
        title={staffMode ? "スタッフ" : "機器と基準温度"}
        description={
          staffMode
            ? "記録するスタッフと、月次記録表に使うイニシャルを登録します。"
            : "厨房に合わせた温度管理。機器ごとに基準を設定できます。"
        }
      />
      <nav className="settings-links" aria-label="設定メニュー">
        <Link href="/equipment">機器</Link>
        <Link href="/staff">スタッフ</Link>
        <Link href="/backup">バックアップ</Link>
        <Link href="/about">このデモについて</Link>
      </nav>
      <div className="settings-grid">
        <section className="panel">
          <h2>
            {staffMode ? "登録スタッフ" : "登録機器"}{" "}
            <span className="muted">
              {staffMode ? data.staff.length : data.equipment.length}
              {staffMode ? "名" : "台"}
            </span>
          </h2>
          <div className="settings-list">
            {(staffMode ? data.staff : data.equipment).map((item) => (
              <div key={item.id}>
                <span className="list-icon">
                  {"kind" in item ? (item.kind === "freezer" ? "❄" : "▣") : item.initials}
                </span>
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {"kind" in item
                      ? `${item.kind === "fridge" ? "冷蔵" : "冷凍"} · 基準 ${item.limit}℃以下 · ${item.since}から`
                      : `${item.initials} · 架空のスタッフ`}
                  </small>
                </div>
                <button className="secondary" onClick={() => edit(item)}>
                  編集
                </button>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>{editingId ? "登録内容を編集" : staffMode ? "スタッフを追加" : "機器を追加"}</h2>
          <form className="stack-form" onSubmit={save}>
            <label>
              {staffMode ? "氏名" : "機器名"}
              <input
                required
                maxLength={40}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={staffMode ? "例：水野 葵" : "例：厨房 冷蔵庫2"}
              />
            </label>
            {staffMode ? (
              <label>
                イニシャル（英大文字1〜4文字）
                <input
                  required
                  pattern="[A-Z]{1,4}"
                  maxLength={4}
                  value={initials}
                  onChange={(event) => setInitials(event.target.value.toUpperCase())}
                  placeholder="例：AM"
                />
              </label>
            ) : (
              <>
                <label>
                  種類
                  <select
                    value={kind}
                    onChange={(event) => {
                      const value = event.target.value as Equipment["kind"];
                      setKind(value);
                      setLimit(String(defaultLimit(value)));
                    }}
                  >
                    <option value="fridge">冷蔵</option>
                    <option value="freezer">冷凍</option>
                  </select>
                </label>
                <label>
                  基準温度（℃以下）
                  <input
                    required
                    type="number"
                    inputMode="decimal"
                    min="-30"
                    max="30"
                    step="0.1"
                    value={limit}
                    onChange={(event) => setLimit(event.target.value)}
                  />
                </label>
                <p className="muted">
                  初期値は冷蔵10℃以下、冷凍−15℃以下。変更後も過去の判定基準は保持します。
                </p>
              </>
            )}
            <button className="primary">{editingId ? "変更を保存" : "＋ 登録する"}</button>
            {editingId && (
              <button type="button" className="secondary" onClick={reset}>
                編集をキャンセル
              </button>
            )}
          </form>
        </section>
      </div>
    </>
  );
}
