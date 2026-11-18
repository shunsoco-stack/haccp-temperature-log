"use client";

import { useRef, useState } from "react";
import { useStore } from "./app-provider";
import { PageHeading } from "./page-heading";
import { exportBackup, parseBackup } from "@/lib/backup";
import { download } from "@/lib/csv";
import { businessDate } from "@/lib/dates";
import type { Data } from "@/lib/types";

export function BackupScreen() {
  const { data, now, update, notify } = useStore();
  const [pending, setPending] = useState<Data | null>(null);
  const [filename, setFilename] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function readFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPending(null);
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("ファイルは20MB以下にしてください。");
      const imported = parseBackup(await file.text());
      setPending(imported);
      setFilename(file.name);
    } catch {
      notify(
        "読み込めませんでした。正しい温度記録のJSONバックアップを選んでください。現在のデータは変更していません。",
      );
    }
    event.target.value = "";
  }
  return (
    <>
      <PageHeading
        eyebrow="BACKUP & RESTORE"
        title="バックアップ"
        description="このブラウザの記録を、手元のファイルにも残しましょう。"
      />
      <div className="settings-grid">
        <section className="panel">
          <div className="large-symbol">↓</div>
          <h2>記録を保存する</h2>
          <p>機器・スタッフ・温度記録・対応・修正履歴を、ひとつのJSONにまとめます。</p>
          <p className="muted">現在 {data.readings.length.toLocaleString()} 件の記録</p>
          <button
            className="primary"
            onClick={() =>
              download(
                exportBackup(data),
                `温度記録バックアップ_${businessDate(now)}.json`,
                "application/json",
              )
            }
          >
            バックアップを保存（JSON）
          </button>
        </section>
        <section className="panel">
          <div className="large-symbol">↑</div>
          <h2>記録を読み込む</h2>
          <p>読み込み前に内容を検証します。確認後、現在の記録全体を置き換えます。</p>
          <div className="file-control">
            <input
              ref={input}
              className="visually-hidden"
              id="backup-file"
              type="file"
              accept=".json,application/json"
              onChange={readFile}
            />
            <label className="secondary" htmlFor="backup-file">
              バックアップを読み込む（JSON）
            </label>
          </div>
          {pending && (
            <div className="import-preview">
              <h3>読み込み内容を確認</h3>
              <p>{filename}</p>
              <p>
                {pending.shop}
                <br />
                機器 {pending.equipment.length}台・スタッフ {pending.staff.length}名・記録{" "}
                {pending.readings.length}件
              </p>
              <button
                className="danger-button"
                onClick={() => {
                  update(pending);
                  setPending(null);
                  notify("バックアップを読み込みました。");
                }}
              >
                この内容で現在のデータを置き換える
              </button>
              <button className="text-button" onClick={() => setPending(null)}>
                キャンセル
              </button>
            </div>
          )}
        </section>
      </div>
      <div className="help-strip">
        <span>ⓘ</span>
        <p>
          データはこの端末・ブラウザに保存されます。ブラウザのデータを削除する前に、バックアップを保存してください。
        </p>
      </div>
    </>
  );
}
