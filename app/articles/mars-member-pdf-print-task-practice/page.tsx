import type { Metadata } from "next";
import BackButton from "../../components/BackButton";
import MarkdownArticle from "../../components/MarkdownArticle";
import content from "./content.md?raw";

export const metadata: Metadata = {
  title: "mars-member 货品码 PDF 需求回顾与学习档案 · CarrieFElearning",
  description:
    "从 mars-member 的真实需求出发，复盘货品码标签从本地打印扩展到浏览器生成 PDF、OSS 持久化和任务列表下载的完整实现。",
};

export default function MarsMemberPdfPrintTaskPracticeArticle() {
  return (
    <main className="article-page">
      <header className="article-page-top">
        <BackButton className="back-link">← 返回上一页</BackButton>
        <span>React 实战 · 22 min</span>
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
