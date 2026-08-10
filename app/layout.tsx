import type { Metadata } from "next";
import ThemePicker from "./components/ThemePicker";
import "./globals.css";

export const metadata: Metadata = { title: "CarrieFElearning · 六个月前端学习博客", description: "记录 Carrie 从 React 基础走向组件化、工程化、多端和 AI 工程化的学习实践。", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };

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
