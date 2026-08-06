# React 学习笔记：理解 `useEffect`

学习文件：`src/pages/production/recipe/list/index.tsx`

## 代码

```tsx
useEffect(() => {
  if (isAll || !pendingEnumReady) return;
  instance.commitSearch?.();
}, [instance, isAll, pendingEnumReady]);
```

## 我的理解

`useEffect` 用来处理副作用。

这里的副作用是：

```tsx
instance.commitSearch?.();
```

也就是调用 `ProTable` 的查询方法，请求列表数据。

它的整体意思是：

> 待办页面依赖的枚举值准备好以后，再执行一次查询；全量页面不在这里查询。

## 逐行理解

### 1. 定义副作用

```tsx
useEffect(() => {
```

组件完成渲染后，React 会执行函数里面的代码。

### 2. 全量页面不执行

```tsx
if (isAll || !pendingEnumReady) return;
```

如果 `isAll` 是 `true`，说明当前是全量列表。

全量列表配置了：

```tsx
autoFetch={isAll}
```

所以全量列表会由 `ProTable` 自动查询，不需要这里再次查询。

### 3. 枚举没准备好时不执行

```tsx
!pendingEnumReady
```

待办页面的查询条件依赖异步加载的枚举值。如果枚举还没加载完成就查询，可能会出现：

```tsx
status: undefined
isActive: undefined
```

这样可能导致固定的状态条件没有传给后端，所以要先等待枚举准备好。

### 4. 执行查询

```tsx
instance.commitSearch?.();
```

`commitSearch` 可以理解成“点击搜索按钮”。它会读取表单条件，然后请求列表接口。

这里的 `?.` 是可选链，意思是：如果 `commitSearch` 存在，就调用它；不存在就什么都不做，避免报错。

## 依赖数组

```tsx
[instance, isAll, pendingEnumReady]
```

依赖数组表示：当这些值发生变化时，重新执行 `useEffect`。

这段代码最重要的变化是：

```text
第一次渲染
  ↓
枚举还没加载完成，pendingEnumReady = false
  ↓
useEffect 提前结束，不查询
  ↓
枚举加载完成，pendingEnumReady = true
  ↓
useEffect 再次执行
  ↓
调用 commitSearch 查询
```

## 为什么不能直接写在组件函数里？

不应该这样写：

```tsx
if (pendingEnumReady) {
  instance.commitSearch?.();
}
```

因为组件函数每次重新 render 都会执行，可能导致重复请求。

`useEffect` 的作用就是把请求这种副作用从 render 阶段分离出来，并通过依赖数组控制执行时机。

## 这段代码是不是只执行一次？

不是绝对只执行一次。

它会在依赖变化时重新执行，但正常情况下主要是从：

```text
pendingEnumReady = false
```

变成：

```text
pendingEnumReady = true
```

时触发一次查询。

## 需要继续确认的问题

这段代码只阻止了自动首查。如果用户在枚举加载完成前手动点击搜索，仍然可能触发查询。

所以后续需要确认 `ProTable` 是否会在枚举未准备好时自动禁用搜索按钮，或者是否需要在手动查询入口再次增加保护。

## 一句话总结

> 这段 `useEffect` 用来等待待办页面所需的枚举条件准备完成，然后在渲染完成后触发一次列表查询，同时避免全量列表重复请求。
