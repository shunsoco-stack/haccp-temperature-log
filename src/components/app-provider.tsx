"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { loadData, storageKey } from "@/lib/storage";
import type { Data } from "@/lib/types";

type Store = {
  data: Data;
  now: Date;
  update: (data: Data) => void;
  notify: (message: string) => void;
};

const Context = createContext<Store | null>(null);

export function useStore(): Store {
  const context = useContext(Context);
  if (!context) throw new Error("データを読み込めません。");
  return context;
}

const links = [
  ["/", "今日の記録", "▦"],
  ["/records", "日別の記録", "▤"],
  ["/monthly", "月次記録表", "▦"],
  ["/trends", "推移と振り返り", "↗"],
  ["/equipment", "機器と基準温度", "▣"],
  ["/staff", "スタッフ", "♙"],
  ["/backup", "バックアップ", "↓"],
  ["/about", "このデモについて", "ⓘ"],
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [message, setMessage] = useState("");
  const path = usePathname();
  useEffect(() => {
    const timer = setTimeout(() => {
      const current = new Date();
      try {
        const result = loadData(localStorage.getItem(storageKey), current);
        setData(result.data);
        if (result.recovered) setMessage("保存データが壊れていたため、既定データに戻しました。");
      } catch {
        setData(loadData(null, current).data);
        setMessage("端末への保存を利用できません。バックアップを保存してください。");
      }
      setNow(current);
    }, 0);
    const clock = setInterval(() => setNow(new Date()), 30000);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => setMessage("オフライン機能を登録できませんでした。"));
    return () => {
      clearTimeout(timer);
      clearInterval(clock);
    };
  }, []);
  useEffect(() => {
    if (data) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch {
        const timer = setTimeout(
          () =>
            setMessage(
              "保存できませんでした。容量・ブラウザの設定を確認し、JSONを保存してください。",
            ),
          0,
        );
        return () => clearTimeout(timer);
      }
    }
  }, [data]);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon">♧</span>
          <span>
            おんど手帖<small>厨房の安心を、毎日の記録に。</small>
          </span>
        </Link>
        <div className="shop">
          <span className="shop-avatar">こ</span>
          <div>
            食堂 こもれび<small>温度管理ノート</small>
          </div>
          <span className="green-dot" />
        </div>
        <div className="nav-caption">ワークスペース</div>
        <nav aria-label="メインナビゲーション">
          {links.map(([href, label, icon], index) => (
            <Link
              key={href}
              href={href}
              className={`${path === href ? "active" : ""} ${index === 4 ? "nav-divider" : ""}`}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>✓ 毎日の小さな記録が、安心に。</span>
          <p>
            開店前と閉店時、1日2回の
            <br />
            温度確認を続けましょう。
          </p>
        </div>
        <small className="sidebar-footer">おんど手帖 / HACCP 温度記録</small>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            食堂 こもれび <span className="muted">/ 温度管理</span>
          </span>
          <span className="demo-badge">デモ用の架空データです</span>
        </header>
        <main>
          {message && (
            <div className="notice" role="status">
              {message}
              <button aria-label="通知を閉じる" onClick={() => setMessage("")}>
                ×
              </button>
            </div>
          )}
          {data && now ? (
            <Context.Provider value={{ data, now, update: setData, notify: setMessage }}>
              {children}
            </Context.Provider>
          ) : (
            <div className="loading">温度記録を読み込んでいます…</div>
          )}
        </main>
        <footer className="page-footer">
          HACCPの考え方を取り入れた、温度管理のためのデモアプリ。
        </footer>
      </div>
      <nav className="mobile-tabs" aria-label="モバイルナビゲーション">
        {links.slice(0, 4).map(([href, label, icon]) => (
          <Link key={href} href={href} className={path === href ? "active" : ""}>
            <span>{icon}</span>
            {label}
          </Link>
        ))}
        <Link href="/equipment" className={path === "/equipment" ? "active" : ""}>
          <span>⚙</span>設定
        </Link>
      </nav>
    </div>
  );
}
