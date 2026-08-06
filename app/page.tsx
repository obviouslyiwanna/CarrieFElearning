"use client";

import { useMemo, useState } from "react";

type Article = { title: string; summary: string; category: string; date: string; readingTime: string; accent: string; status: "已发布" | "学习中"; href: string };

const articles: Article[] = [
  { title: "useEffect 实战：等待依赖准备好再发起一次查询", summary: "从一个 ProTable 列表页的真实场景出发，拆开理解副作用、依赖数组与异步枚举之间的执行时机。", category: "React 基础", date: "2026.08.06", readingTime: "6 min", accent: "orange", status: "已发布", href: "/articles/use-effect" },
  { title: "useUrlParams：从 URL 里读取页面参数", summary: "理解自定义 Hook 如何读取 URL query 参数，并按照传入顺序返回页面需要的值。", category: "React 基础", date: "2026.08.06", readingTime: "5 min", accent: "blue", status: "已发布", href: "/articles/use-url-params" },
  { title: "把复杂需求拆成可维护的 React 页面", summary: "配方管理、扣款单、采退订单：从业务流程到组件边界，记录我如何把一次交付变成可复用的解题路径。", category: "工程实践", date: "即将开始", readingTime: "—", accent: "green", status: "学习中", href: "#roadmap" },
  { title: "React 学习路线：从渲染到状态管理", summary: "一张正在迭代的学习地图：先建立 mental model，再逐步补齐组件、Hooks、数据流和性能优化。", category: "学习路线", date: "即将开始", readingTime: "—", accent: "green", status: "学习中", href: "#roadmap" },
];

const categories = ["全部", "React 基础", "工程实践", "学习路线"];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("全部");
  const [query, setQuery] = useState("");
  const visibleArticles = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesCategory = activeCategory === "全部" || article.category === activeCategory;
      const matchesQuery = !keyword || `${article.title} ${article.summary} ${article.category}`.toLowerCase().includes(keyword);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="主导航">
        <a className="brand" href="#top" aria-label="CarrieFElearning 首页"><span className="brand-mark">C</span><span><strong>CarrieFElearning</strong><small>frontend notes</small></span></a>
        <div className="topnav-links"><a className="active" href="#articles">学习笔记</a><a href="#roadmap">学习路线</a><a href="#about">关于我</a></div>
        <a className="github-link" href="https://github.com/obviouslyiwanna/CarrieFElearning" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy"><p className="eyebrow"><span /> React learning journal · 01</p><h1>把每一次<br /><em>前端实践</em>写下来。</h1><p className="hero-intro">CarrieFElearning 是 Carrie 的前端学习博客。这里记录 React、业务抽象与那些终于想明白的细节。</p><div className="hero-actions"><a className="button button-primary" href="#articles">开始阅读 <span>↓</span></a><a className="text-link" href="#roadmap">查看学习路线 <span>→</span></a></div></div>
        <div className="hero-orbit" aria-label="当前学习主题"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-core"><span>React</span><small>practice<br />makes<br />clear</small></div><div className="orbit-note note-top">useEffect<br /><b>副作用</b></div><div className="orbit-note note-right">组件<br /><b>边界</b></div><div className="orbit-note note-bottom">业务<br /><b>抽象</b></div></div>
      </section>

      <section className="section articles-section" id="articles">
        <div className="section-heading"><div><p className="eyebrow"><span /> latest notes</p><h2>最近在学什么</h2></div><div className="article-tools"><label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索笔记" aria-label="搜索笔记" /></label></div></div>
        <div className="category-tabs" role="tablist" aria-label="笔记分类">{categories.map((category) => <button key={category} className={activeCategory === category ? "selected" : ""} onClick={() => setActiveCategory(category)} role="tab" aria-selected={activeCategory === category}>{category}</button>)}</div>
        <div className="article-grid">{visibleArticles.map((article, index) => <article className={`article-card ${index === 0 ? "featured" : ""}`} key={article.title}><div className={`article-art ${article.accent}`}><span>{String(index + 1).padStart(2, "0")}</span><i /></div><div className="article-content"><div className="article-meta"><span className="tag">{article.category}</span><span>{article.status}</span></div><h3><a href={article.href}>{article.title}</a></h3><p>{article.summary}</p><div className="article-footer"><span>{article.date}</span><span>{article.readingTime} <b>→</b></span></div></div></article>)}</div>
        {visibleArticles.length === 0 && <p className="empty-state">没有找到匹配的笔记，换个关键词试试。</p>}
      </section>

      <section className="section roadmap" id="roadmap"><div className="roadmap-intro"><p className="eyebrow"><span /> the path</p><h2>边学，边搭一张自己的地图。</h2><p>博客会随着学习持续生长。每一个模块都是一个可以回看的问题，而不是一份需要背下来的目录。</p></div><div className="roadmap-steps"><div className="roadmap-line" /><div className="roadmap-step complete"><span>01</span><div><b>React 基础</b><small>渲染 · 组件 · Hooks</small></div></div><div className="roadmap-step current"><span>02</span><div><b>业务工程化</b><small>状态 · 表单 · 复用</small></div></div><div className="roadmap-step"><span>03</span><div><b>性能与架构</b><small>数据流 · 性能 · 边界</small></div></div></div></section>

      <footer className="footer" id="about"><div><strong>CarrieFElearning</strong><span>learn in public, one note at a time.</span></div><span>© 2026 Carrie · Built with curiosity</span></footer>
    </main>
  );
}
