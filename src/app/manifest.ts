import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "おんど手帖｜飲食店の衛生・温度記録",
    short_name: "おんど手帖",
    lang: "ja",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8f7",
    theme_color: "#267963",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
