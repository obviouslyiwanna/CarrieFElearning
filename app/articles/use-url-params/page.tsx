import type { Metadata } from "next";
import BackButton from "../../components/BackButton";
import MarkdownArticle from "../../components/MarkdownArticle";
import content from "./content.md?raw";

export const metadata: Metadata = { title: "useUrlParams 实战 · CarrieFElearning", description: "理解自定义 Hook 如何读取 URL query 参数。" };

export default function UseUrlParamsArticle() {
  return <main className="article-page">
    <header className="article-page-top"><BackButton className="back-link">← 返回上一页</BackButton><span>React 基础 · 5 min</span></header>
    <article className="article-reader">
      <p className="eyebrow"><span /> React learning journal · 02</p>
      <MarkdownArticle content={content} />
      <BackButton className="back-home">返回上一页 <span>→</span></BackButton>
    </article>
  </main>;
}
