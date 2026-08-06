import type { Metadata } from "next";
import BackButton from "../../components/BackButton";
import MarkdownArticle from "../../components/MarkdownArticle";
import content from "./content.md?raw";

export const metadata: Metadata = { title: "useState 学习笔记 · CarrieFElearning", description: "理解 useState 的参数、返回值、状态更新方式，以及它在配方详情页中的实践。" };

export default function UseStateArticle() {
  return <main className="article-page">
    <header className="article-page-top"><BackButton className="back-link">← 返回上一页</BackButton><span>React 基础 · 8 min</span></header>
    <article className="article-reader">
      <p className="eyebrow"><span /> React learning journal · 03</p>
      <MarkdownArticle content={content} />
      <BackButton className="back-home">返回上一页 <span>→</span></BackButton>
    </article>
  </main>;
}
