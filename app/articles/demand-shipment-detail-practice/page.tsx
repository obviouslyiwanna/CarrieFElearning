import type { Metadata } from "next";
import BackButton from "../../components/BackButton";
import MarkdownArticle from "../../components/MarkdownArticle";
import content from "./content.md?raw";

export const metadata: Metadata = {
  title: "从要货单与发货单详情学习复杂 React 页面 · CarrieFElearning",
  description:
    "从要货单与发货单详情的真实代码出发，理解请求编排、DTO 适配、整页复用、状态动作和场景 mock。",
};

export default function DemandShipmentDetailPracticeArticle() {
  return (
    <main className="article-page">
      <header className="article-page-top">
        <BackButton className="back-link">← 返回上一页</BackButton>
        <span>React 实战 · 15 min</span>
      </header>
      <article className="article-reader">
        <p className="eyebrow">
          <span /> React learning journal · 06
        </p>
        <MarkdownArticle content={content} />
        <BackButton className="back-home">
          返回上一页 <span>→</span>
        </BackButton>
      </article>
    </main>
  );
}
