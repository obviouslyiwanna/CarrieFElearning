# useUrlParams：从 URL 里读取页面参数

这篇笔记来自生产配方详情页：通过一个自定义 Hook，读取 URL 中的 `id`、`mode` 等参数，让页面知道当前要展示哪条数据、处于什么模式。

---

## 先看代码

```tsx
import { useLocation } from "@guming/mars";
import { useMemo } from "react";

export function useUrlParams(...keys: string[]): Array<string | undefined> {
  const location = useLocation();

  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return keys.map((key) => params.get(key) ?? undefined);
  }, [location.search, ...keys]);
}
```

## 它解决了什么问题

假设当前地址是 `/production/recipe/detail?id=123&mode=edit`，我们可以这样读取：

```tsx
const [id, mode] = useUrlParams("id", "mode");

// id === "123"
// mode === "edit"
```

这样页面就可以根据 `id` 请求详情，根据 `mode` 判断当前是新增、编辑还是详情。

## 逐步理解这个 Hook

### 1. 为什么它叫自定义 Hook

函数名以 `use` 开头，并且内部调用了 `useLocation` 和 `useMemo`，所以它遵守 React Hook 的规则：必须在组件或其他 Hook 的顶层调用，不能写在条件判断或循环里。

### 2. `...keys` 是什么

`...keys` 是剩余参数。调用 `useUrlParams("id", "mode")` 时，函数内部拿到的是 `["id", "mode"]`。

### 3. `useLocation` 负责什么

`useLocation` 读取当前路由信息，其中 `location.search` 就是问号后面的 query 字符串，例如 `?id=123&mode=edit`。URL 变化时，Hook 会得到新的路由信息。

### 4. `URLSearchParams` 负责解析

`new URLSearchParams(location.search)` 是浏览器原生 API。调用 `params.get("id")` 就可以取到对应参数。

### 5. 返回值顺序和传入顺序一致

`keys.map` 会按照参数顺序返回结果，所以 `useUrlParams("mode", "id")` 得到的就是 `["edit", "123"]`。解构时顺序一定要对应。

### 6. 为什么使用 `?? undefined`

`params.get` 找不到参数时返回 `null`。这里把 `null` 统一转换成 `undefined`，让调用方处理缺失参数时保持一致。

## useMemo 在这里做什么

`useMemo` 会缓存解析结果。当 `location.search` 或参数名发生变化时重新解析；依赖没有变化时复用上一次结果。

不过 URL 参数解析本身很轻量，所以这里的 `useMemo` 主要是优化，不是功能必须。即使去掉它，代码仍然可以正常工作。

## Review 时要注意什么

这个 Hook 只负责读取 URL，不负责修改 URL。它返回的是字符串，因为 URL query 参数本身都是字符串。如果后续需要数字，要在使用处转换，例如 `Number(id)`。

另外，`params.get("id")` 只取一个值。如果 URL 中有多个同名参数，需要使用 `params.getAll("id")`。

> 一句话总结：useUrlParams 是一个读取 URL query 参数的自定义 Hook，先通过 useLocation 拿到当前地址，再用 URLSearchParams 解析，并按照传入顺序返回参数值。
