"use client";

import { useMemo, useState } from "react";

type Article = { title: string; summary: string; category: string; date: string; readingTime: string; accent: string; status: "已发布" | "学习中"; href: string; visual: string };

const learningTracks = [
  { month: "01", title: "React 基础", subtitle: "Hook · class/function component", detail: "从三个真实需求出发，理解 Hook、class component 与 function component 的取舍。", status: "current" },
  { month: "02", title: "React 上层与组件化", subtitle: "MarsKit · Ant Design · 二次开发", detail: "从会用组件到能设计组件：分析为什么要二开，以及组件库额外解决了什么问题。", status: "planned" },
  { month: "03", title: "工程化与构建", subtitle: "CRA · lint · 发布 · Webpack", detail: "拆解 CRA 旧项目的编译链路，再动手配置 Webpack，串起开发、检查、构建和发布。", status: "planned" },
  { month: "04", title: "小程序与多端", subtitle: "Taro · 跨端原理 · 平台差异", detail: "从一个页面跑到多个端，记录 Taro 的使用方式、运行原理和真实踩坑。", status: "planned" },
  { month: "05", title: "补强与源码阅读", subtitle: "前四个月顺延 · 源码 · 可优化点", detail: "补齐前面没有吃透的知识，挑选感兴趣的三方库模块，尝试读源码和重写。", status: "planned" },
  { month: "06", title: "AI 工程化", subtitle: "AI 辅助研发 · 测试 · Agent", detail: "把旧的工程流程和 AI 结合起来，探索代码检索、自动 Review、测试、RAG 与 Agent 工作流。", status: "planned" },
];

const articles: Article[] = [
  { title: "useEffect 实战：等待依赖准备好再发起一次查询", summary: "从一个 ProTable 列表页的真实场景出发，拆开理解副作用、依赖数组与异步枚举之间的执行时机。", category: "React 基础", date: "2026.08.06", readingTime: "6 min", accent: "orange", status: "已发布", href: "/articles/use-effect", visual: "useEffect" },
  { title: "useUrlParams：从 URL 里读取页面参数", summary: "理解自定义 Hook 如何读取 URL query 参数，并按照传入顺序返回页面需要的值。", category: "React 基础", date: "2026.08.06", readingTime: "5 min", accent: "blue", status: "已发布", href: "/articles/use-url-params", visual: "Custom Hook" },
  { title: "React 学习笔记：useState", summary: "从 useState 的参数和返回值出发，理解状态更新、函数式更新，以及它在配方详情页中的实践。", category: "React 基础", date: "2026.08.06", readingTime: "8 min", accent: "green", status: "已发布", href: "/articles/use-state", visual: "useState" },
  { title: "从 React 上层进入组件化", summary: "MarsKit、Ant Design 和二次开发：从组件使用者走向组件设计者。", category: "React 上层与组件化", date: "第 2 个月", readingTime: "规划中", accent: "blue", status: "学习中", href: "#roadmap", visual: "组件化" },
  { title: "从 CRA 到 Webpack 的工程化链路", summary: "先看懂旧项目怎么编译，再补齐 lint、构建、发布和 Webpack 配置。", category: "工程化与构建", date: "第 3 个月", readingTime: "规划中", accent: "orange", status: "学习中", href: "#roadmap", visual: "Webpack" },
  { title: "Taro 小程序与多端实践", summary: "理解一套代码适配多端的边界，记录平台差异、运行原理和踩坑。", category: "小程序与多端", date: "第 4 个月", readingTime: "规划中", accent: "green", status: "学习中", href: "#roadmap", visual: "Taro" },
  { title: "源码阅读与前四个月补强", summary: "回收前面没来得及深入的主题，挑选三方库模块做源码阅读和重写练习。", category: "补强与源码阅读", date: "第 5 个月", readingTime: "规划中", accent: "blue", status: "学习中", href: "#roadmap", visual: "Source" },
  { title: "AI 工程化：让工具进入研发流程", summary: "探索 AI 辅助编码、代码检索、自动 Review、测试、RAG 和 Agent 工作流。", category: "AI 工程化", date: "第 6 个月", readingTime: "规划中", accent: "orange", status: "学习中", href: "#roadmap", visual: "AI × FE" },
];

const categories = ["全部", ...learningTracks.map((track) => track.title)];

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
        <div className="hero-copy"><p className="eyebrow"><span /> six-month learning journal</p><h1>把每一次<br /><em>前端实践</em>写下来。</h1><p className="hero-intro">CarrieFElearning 是一份六个月的新人前端学习记录：从 React 基础出发，逐步走到组件化、工程化、多端和 AI 工程化。</p><div className="hero-actions"><a className="button button-primary" href="#articles">开始阅读 <span>↓</span></a><a className="text-link" href="#roadmap">查看六个月路线 <span>→</span></a></div></div>
        <div className="hero-orbit" aria-label="当前学习主题"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-core"><span>React</span><small>practice<br />makes<br />clear</small></div><div className="orbit-note note-top">useEffect<br /><b>副作用</b></div><div className="orbit-note note-right">组件<br /><b>边界</b></div><div className="orbit-note note-bottom">业务<br /><b>抽象</b></div></div>
      </section>

      <section className="section articles-section" id="articles">
        <div className="section-heading"><div><p className="eyebrow"><span /> latest notes</p><h2>最近在学什么</h2></div><div className="article-tools"><label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索笔记" aria-label="搜索笔记" /></label></div></div>
        <div className="category-tabs" role="tablist" aria-label="笔记分类">{categories.map((category) => <button key={category} className={activeCategory === category ? "selected" : ""} onClick={() => setActiveCategory(category)} role="tab" aria-selected={activeCategory === category}>{category}</button>)}</div>
        <div className="article-grid">{visibleArticles.map((article, index) => <article className={`article-card ${index === 0 ? "featured" : ""}`} key={article.title}><div className={`article-art ${article.accent}`}><span>{String(index + 1).padStart(2, "0")}</span><strong className="article-topic">{article.visual}</strong></div><div className="article-content"><div className="article-meta"><span className="tag">{article.category}</span><span>{article.status}</span></div><h3><a href={article.href}>{article.title}</a></h3><p>{article.summary}</p><div className="article-footer"><span>{article.date}</span><span>{article.readingTime} <b>→</b></span></div></div></article>)}</div>
        {visibleArticles.length === 0 && <p className="empty-state">没有找到匹配的笔记，换个关键词试试。</p>}
      </section>

      <section className="section roadmap" id="roadmap"><div className="roadmap-intro"><p className="eyebrow"><span /> the six-month path</p><h2>先把地图分开，再逐个走进去。</h2><p>每个月只保留一个主线专项，文章先记录问题和实践，后续再逐步补充源码、案例和复盘。</p></div><div className="roadmap-steps">{learningTracks.map((track) => <div className={`roadmap-step ${track.status}`} key={track.month}><span>{track.month}</span><div><b>{track.title}</b><small>{track.subtitle}</small><p>{track.detail}</p></div></div>)}</div></section>

      <footer className="footer" id="about"><div><strong>CarrieFElearning</strong><span>learn in public, one note at a time.</span></div><span>© 2026 Carrie · Built with curiosity</span></footer>
    </main>
  );
}
