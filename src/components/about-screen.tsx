"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "./app-provider";
import { PageHeading } from "./page-heading";
import { createSeed } from "@/lib/seed";

export function AboutScreen() {
  const { update, notify } = useStore();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="ABOUT THIS DEMO"
        title="このデモについて"
        description="日々の温度記録を、シンプルに、続けやすく。"
      />
      <section className="panel prose">
        <span className="demo-badge">デモ用の架空データです</span>
        <h2>おんど手帖について</h2>
        <p>
          小さな飲食店の冷蔵庫・冷凍庫を、開店前と閉店時の1日2回記録するアプリです。HACCPの考え方を取り入れた衛生管理のうち、温度記録に絞っています。
        </p>
        <h3>データと保存先</h3>
        <p>
          「食堂
          こもれび」、機器5台、スタッフ5名、過去約3か月の記録はすべて架空です。データはこのブラウザのlocalStorage（キー：htl:v1）に保存します。サーバーへの記録送信、アカウント登録、端末間の同期はありません。
        </p>
        <h3>営業日の考え方</h3>
        <p>
          日本時間の午前4時で営業日が切り替わります。午前0時〜3時59分は前日の営業日です。水曜は定休日。開店前は11時、閉店時は翌2時を過ぎた未記録を記録漏れとして扱います。
        </p>
        <h3>ご利用にあたって</h3>
        <p>
          本作は温度管理を体験するポートフォリオです。公的な様式の要件、保存期間、実際の管理基準は保健所・自治体に各自ご確認ください。衛生計画書・点検チェックリスト・在庫管理・IoT連携は含みません。
        </p>
        <Link className="secondary" href="/backup">
          バックアップを開く
        </Link>
      </section>
      <section className="panel">
        <h2>既定データに戻す</h2>
        <p>現在の記録を削除し、開いた時点の日本時間に合わせて架空の記録を生成します。</p>
        {confirm ? (
          <div className="alert-banner">
            <p>現在の変更は失われます。必要なバックアップを保存してから実行してください。</p>
            <button
              className="danger-button"
              onClick={() => {
                update(createSeed(new Date()));
                setConfirm(false);
                notify("既定の架空データに戻しました。");
              }}
            >
              現在のデータを置き換えて初期化
            </button>
            <button className="text-button" onClick={() => setConfirm(false)}>
              キャンセル
            </button>
          </div>
        ) : (
          <button className="danger-button" onClick={() => setConfirm(true)}>
            既定データに戻す
          </button>
        )}
      </section>
    </>
  );
}
