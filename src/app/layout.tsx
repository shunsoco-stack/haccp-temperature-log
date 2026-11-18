import type { Metadata } from "next";
import { AppProvider } from "@/components/app-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "飲食店の衛生・温度記録（HACCP）",
  description:
    "冷蔵庫・冷凍庫の温度を1日2回記録。基準外への対応と月次記録表の印刷を、小さな飲食店の毎日に。架空データのデモです。",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
