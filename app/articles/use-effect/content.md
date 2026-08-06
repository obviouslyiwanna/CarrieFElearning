# useEffect 实战：等待依赖准备好再发起一次查询

这篇笔记来自一个真实的 ProTable 列表页：等待待办页面依赖的枚举值准备好，再触发一次列表查询。

---

## 先看代码

```tsx
useEffect(() => {
  if (isAll || !pendingEnumReady) return;
  instance.commitSearch?.();
}, [instance, isAll, pendingEnumReady]);
```

## 这段代码在做什么

`useEffect` 用来处理副作用。这里的副作用是调用 `instance.commitSearch?.()`，也就是触发 ProTable 的查询方法，请求列表数据。

### 1. 等待条件准备完成

当 `pendingEnumReady` 还是 `false` 时，查询会提前结束。这样可以避免把 `status: undefined`、`isActive: undefined` 这样的未完成条件传给后端。

### 2. 避免全量列表重复查询

全量列表已经通过 `autoFetch={isAll}` 自动查询，所以 `isAll` 为 `true` 时，这个 effect 不再重复发起请求。

### 3. 依赖数组决定时机

第一次渲染时枚举可能还没准备好；当 `pendingEnumReady` 变成 `true`，effect 会再次执行，并触发一次查询。这就是“先准备依赖，再执行副作用”。

> 一句话总结：等待待办页面所需的枚举条件准备完成，再在渲染后触发一次列表查询，同时避开全量列表的重复请求。
