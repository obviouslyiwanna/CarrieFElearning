import type { Metadata } from "next";
import BackButton from "../../components/BackButton";
import MarkdownArticle from "../../components/MarkdownArticle";
import content from "./content.md?raw";

export const metadata: Metadata = {
  title: "从三个业务需求学习 React · CarrieFElearning",
  description: "从配方管理、采退订单和扣款单管理中提炼 React 学习重点。",
};

export default function ReactBusinessPracticeArticle() {
  return <main className="article-page">
    <header className="article-page-top"><BackButton className="back-link">← 返回上一页</BackButton><span>React 基础 · 12 min</span></header>
    <article className="article-reader">
      <p className="eyebrow"><span /> React learning journal · 05</p>
      <MarkdownArticle content={content} />
      <BackButton className="back-home">返回上一页 <span>→</span></BackButton>
    </article>
  </main>;
}
