import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "CarrieFElearning · 前端学习博客", description: "记录 Carrie 的 React 学习、业务工程实践与前端思考。", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
