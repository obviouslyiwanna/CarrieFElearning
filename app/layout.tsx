import type { Metadata } from "next";
import ThemePicker from "./components/ThemePicker";
import "./globals.css";

const deploymentHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const metadataBase = new URL(deploymentHost ? `https://${deploymentHost}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
  title: "CarrieFElearning · 前端实践学习日志",
  description: "从真实业务代码出发，记录 React、组件化、工程化、多端与 AI 工程实践。",
  keywords: ["React", "前端开发", "学习笔记", "工程化", "CarrieFElearning"],
  authors: [{ name: "Carrie" }],
  creator: "Carrie",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "CarrieFElearning · 前端实践学习日志",
    description: "把复杂的前端知识，写成能复用的经验。",
    locale: "zh_CN",
    type: "website",
    siteName: "CarrieFElearning",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "CarrieFElearning 前端实践学习日志" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CarrieFElearning · 前端实践学习日志",
    description: "把复杂的前端知识，写成能复用的经验。",
    images: ["/og.png"],
  },
};

const themeInitScript = `
(() => {
  try {
    const savedTheme = window.localStorage.getItem("carriefelearning-theme");
    const validThemes = ["paper", "lavender", "mint", "ocean"];
    document.documentElement.dataset.theme = validThemes.includes(savedTheme) ? savedTheme : "ocean";
  } catch {
    document.documentElement.dataset.theme = "ocean";
  }
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head><body><ThemePicker />{children}</body></html>;
}
