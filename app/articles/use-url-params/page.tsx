import type { Metadata } from "next";
import BackButton from "../../components/BackButton";

export const metadata: Metadata = { title: "useUrlParams 实战 · CarrieFElearning", description: "理解自定义 Hook 如何读取 URL query 参数。" };

export default function UseUrlParamsArticle() {
  return <main className="article-page">
    <header className="article-page-top"><BackButton className="back-link">← 返回上一页</BackButton><span>React 基础 · 5 min</span></header>
    <article className="article-reader">
      <p className="eyebrow"><span /> React learning journal · 02</p>
      <h1>useUrlParams：从 URL 里读取页面参数</h1>
      <p className="article-lead">这篇笔记来自生产配方详情页：通过一个自定义 Hook，读取 URL 中的 id、mode 等参数，让页面知道当前要展示哪条数据、处于什么模式。</p>
      <div className="article-divider" />
      <h2>先看代码</h2>
      <pre><code>{`import { useLocation } from '@guming/mars';
import { useMemo } from 'react';

export function useUrlParams(...keys: string[]): Array<string | undefined> {
  const location = useLocation();

  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return keys.map((key) => params.get(key) ?? undefined);
  }, [location.search, ...keys]);
}`}</code></pre>
      <h2>它解决了什么问题</h2>
      <p>假设当前地址是 <code>/production/recipe/detail?id=123&amp;mode=edit</code>，我们可以这样读取：</p>
      <pre><code>{`const [id, mode] = useUrlParams('id', 'mode');

// id === '123'
// mode === 'edit'`}</code></pre>
      <p>这样页面就可以根据 <code>id</code> 请求详情，根据 <code>mode</code> 判断当前是新增、编辑还是详情。</p>
      <h2>逐步理解这个 Hook</h2>
      <h3>1. 为什么它叫自定义 Hook</h3>
      <p>函数名以 <code>use</code> 开头，并且内部调用了 <code>useLocation</code> 和 <code>useMemo</code>，所以它遵守 React Hook 的规则：必须在组件或其他 Hook 的顶层调用，不能写在条件判断或循环里。</p>
      <h3>2. <code>...keys</code> 是什么</h3>
      <p><code>...keys</code> 是剩余参数。调用 <code>useUrlParams('id', 'mode')</code> 时，函数内部拿到的是 <code>['id', 'mode']</code>。</p>
      <h3>3. <code>useLocation</code> 负责什么</h3>
      <p><code>useLocation</code> 读取当前路由信息，其中 <code>location.search</code> 就是问号后面的 query 字符串，例如 <code>?id=123&amp;mode=edit</code>。URL 变化时，Hook 会得到新的路由信息。</p>
      <h3>4. <code>URLSearchParams</code> 负责解析</h3>
      <p><code>new URLSearchParams(location.search)</code> 是浏览器原生 API。调用 <code>params.get('id')</code> 就可以取到对应参数。</p>
      <h3>5. 返回值顺序和传入顺序一致</h3>
      <p><code>keys.map</code> 会按照参数顺序返回结果，所以 <code>useUrlParams('mode', 'id')</code> 得到的就是 <code>['edit', '123']</code>。解构时顺序一定要对应。</p>
      <h3>6. 为什么使用 <code>?? undefined</code></h3>
      <p><code>params.get</code> 找不到参数时返回 <code>null</code>。这里把 <code>null</code> 统一转换成 <code>undefined</code>，让调用方处理缺失参数时保持一致。</p>
      <h2>useMemo 在这里做什么</h2>
      <p><code>useMemo</code> 会缓存解析结果。当 <code>location.search</code> 或参数名发生变化时重新解析；依赖没有变化时复用上一次结果。</p>
      <p>不过 URL 参数解析本身很轻量，所以这里的 <code>useMemo</code> 主要是优化，不是功能必须。即使去掉它，代码仍然可以正常工作。</p>
      <h2>Review 时要注意什么</h2>
      <p>这个 Hook 只负责读取 URL，不负责修改 URL。它返回的是字符串，因为 URL query 参数本身都是字符串。如果后续需要数字，要在使用处转换，例如 <code>Number(id)</code>。</p>
      <p>另外，<code>params.get('id')</code> 只取一个值。如果 URL 中有多个同名参数，需要使用 <code>params.getAll('id')</code>。</p>
      <blockquote>一句话总结：useUrlParams 是一个读取 URL query 参数的自定义 Hook，先通过 useLocation 拿到当前地址，再用 URLSearchParams 解析，并按照传入顺序返回参数值。</blockquote>
      <BackButton className="back-home">返回上一页 <span>→</span></BackButton>
    </article>
  </main>;
}
