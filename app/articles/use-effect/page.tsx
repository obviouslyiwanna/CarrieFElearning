import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "useEffect 实战 · CarrieFElearning", description: "理解 useEffect 如何等待异步依赖准备完成后再触发一次查询。" };

export default function UseEffectArticle() {
  return <main className="article-page">
    <header className="article-page-top"><Link href="/" className="back-link">← CarrieFElearning</Link><span>React 基础 · 6 min</span></header>
    <article className="article-reader">
      <p className="eyebrow"><span /> React learning journal · 01</p>
      <h1>useEffect 实战：等待依赖准备好再发起一次查询</h1>
      <p className="article-lead">这篇笔记来自一个真实的 ProTable 列表页：等待待办页面依赖的枚举值准备好，再触发一次列表查询。</p>
      <div className="article-divider" />
      <h2>先看代码</h2>
      <pre><code>{`useEffect(() => {
  if (isAll || !pendingEnumReady) return;
  instance.commitSearch?.();
}, [instance, isAll, pendingEnumReady]);`}</code></pre>
      <h2>这段代码在做什么</h2>
      <p><code>useEffect</code> 用来处理副作用。这里的副作用是调用 <code>instance.commitSearch?.()</code>，也就是触发 ProTable 的查询方法，请求列表数据。</p>
      <h3>1. 等待条件准备完成</h3>
      <p>当 <code>pendingEnumReady</code> 还是 <code>false</code> 时，查询会提前结束。这样可以避免把 <code>status: undefined</code>、<code>isActive: undefined</code> 这样的未完成条件传给后端。</p>
      <h3>2. 避免全量列表重复查询</h3>
      <p>全量列表已经通过 <code>autoFetch={"{isAll}"}</code> 自动查询，所以 <code>isAll</code> 为 <code>true</code> 时，这个 effect 不再重复发起请求。</p>
      <h3>3. 依赖数组决定时机</h3>
      <p>第一次渲染时枚举可能还没准备好；当 <code>pendingEnumReady</code> 变成 <code>true</code>，effect 会再次执行，并触发一次查询。这就是“先准备依赖，再执行副作用”。</p>
      <blockquote>一句话总结：等待待办页面所需的枚举条件准备完成，再在渲染后触发一次列表查询，同时避开全量列表的重复请求。</blockquote>
      <Link href="/" className="back-home">返回全部笔记 <span>→</span></Link>
    </article>
  </main>;
}
