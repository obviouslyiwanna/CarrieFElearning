import type { Metadata } from "next";
import BackButton from "../../components/BackButton";
import MarkdownArticle from "../../components/MarkdownArticle";
import content from "./content.md?raw";

export const metadata: Metadata = {
  title: "H5 要货单与发货单详情：需求回顾与 React 工程档案 · CarrieFElearning",
  description:
    "基于采购工作台的真实实现，回顾 H5 要货单与发货单详情需求、代码组织、数据流、状态动作、整页复用与工程取舍。",
};

export default function DemandShipmentDetailPracticeArticle() {
  return (
    <main className="article-page">
      <header className="article-page-top">
        <BackButton className="back-link">← 返回上一页</BackButton>
        <span>React / Taro 实战 · 25 min</span>
      </header>
      <article className="article-reader">
        <p className="eyebrow">
          <span /> React learning journal · 07
        </p>
        <MarkdownArticle content={content} />
        <BackButton className="back-home">
          返回上一页 <span>→</span>
        </BackButton>
      </article>
    </main>
  );
}
