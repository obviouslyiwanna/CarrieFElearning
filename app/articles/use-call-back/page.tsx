import type { Metadata } from "next";
import BackButton from "../../components/BackButton";
import MarkdownArticle from "../../components/MarkdownArticle";
import content from "./content.md?raw";

export const metadata: Metadata = {
  title: "useCallback 学习笔记 · CarrieFElearning",
  description: "理解 useCallback 如何缓存函数、依赖数组如何工作，以及它在 React 组件性能优化中的实际应用。",
};

export default function UseCallbackArticle() {
  return <main className="article-page">
    <header className="article-page-top"><BackButton className="back-link">← 返回上一页</BackButton><span>React 基础 · 8 min</span></header>
    <article className="article-reader">
      <p className="eyebrow"><span /> React learning journal · 06</p>
      <MarkdownArticle content={content} />
      <BackButton className="back-home">返回上一页 <span>→</span></BackButton>
    </article>
  </main>;
}
