import type { Metadata } from "next";
import BackButton from "../../components/BackButton";
import MarkdownArticle from "../../components/MarkdownArticle";
import content from "./content.md?raw";

export const metadata: Metadata = { title: "useEffect 实战 · CarrieFElearning", description: "理解 useEffect 如何等待异步依赖准备完成后再触发一次查询。" };

export default function UseEffectArticle() {
  return <main className="article-page">
    <header className="article-page-top"><BackButton className="back-link">← 返回上一页</BackButton><span>React 基础 · 6 min</span></header>
    <article className="article-reader">
      <p className="eyebrow"><span /> React learning journal · 01</p>
      <MarkdownArticle content={content} />
      <BackButton className="back-home">返回上一页 <span>→</span></BackButton>
    </article>
  </main>;
}
