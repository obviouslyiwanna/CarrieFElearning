# useEffect：从参数理解到项目实践

这篇笔记按照三个层次理解 `useEffect`：先看 React 官网的定义和参数，再用一个最小案例观察依赖数组，最后回到项目里的 ProTable 列表查询场景。

---

## 一、官网里的 useEffect 是什么

React 官方把 `useEffect` 定义为：用于让组件和外部系统保持同步的 Hook。

外部系统可以是网络请求、浏览器 API、订阅、定时器，也可以是一个非 React 的第三方组件。它的基本写法是：

```tsx
useEffect(setup, dependencies?)
```

这里的重点不是“组件加载后执行一段代码”，而是：当组件中的某些响应式值发生变化时，重新同步外部系统。

官方文档：[`useEffect` Reference](https://react.dev/reference/react/useEffect)

> 如果一段逻辑并不是在同步外部系统，而只是根据已有数据计算另一个值，通常不需要使用 `useEffect`。

## 二、两个参数分别做什么

### 1. `setup`：Effect 的主体逻辑

第一个参数是一个函数，用来放置需要同步的逻辑。它可以返回一个清理函数：

```tsx
useEffect(() => {
  // setup：建立连接、绑定事件或发起同步

  return () => {
    // cleanup：断开连接、取消订阅或清理资源
  };
}, [dependency]);
```

React 会按照这样的顺序执行：

### 初次提交之后

组件完成渲染并提交到页面后，执行 `setup`。

### 依赖发生变化之后

先用旧值执行上一次的 `cleanup`，再用新值执行 `setup`。

### 组件卸载之后

最后执行一次 `cleanup`。

如果 Effect 只是调用一次查询方法，没有需要持续占用的连接、事件或定时器，就不一定需要返回清理函数。

### 2. `dependencies`：Effect 依赖的响应式值

第二个参数是依赖数组，应该写入 `setup` 中使用到的响应式值。响应式值包括：

- 组件的 props
- `useState` 得到的 state
- 组件函数体内声明的变量和函数

React 会使用 `Object.is` 比较依赖的新旧值。依赖数组的长度应该固定，并且直接写在代码里，例如 `[roomId, serverUrl]`。

不同写法代表不同的触发时机：

### 不传依赖数组

```tsx
useEffect(() => {
  // 每次组件提交后都执行
});
```

### 传空数组 `[]`

```tsx
useEffect(() => {
  // 初次提交后执行
}, []);
```

它表示这个 Effect 没有依赖组件中的响应式值。不过开发环境开启 Strict Mode 时，React 可能额外执行一次“setup → cleanup → setup”，用来检查清理逻辑是否完整。

### 传入具体依赖

```tsx
useEffect(() => {
  // count 变化后重新执行
  document.title = `Count: ${count}`;
}, [count]);
```

这里 `setup` 使用了 `count`，所以 `count` 必须出现在依赖数组中。依赖数组不是用来“挑选想监听的变量”，而是要准确描述 Effect 读取了哪些响应式值。

## 三、一个简单案例：同步页面标题

下面的组件把计数器的值同步到浏览器标签页标题：

```tsx
import { useEffect, useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `当前数量：${count}`;
  }, [count]);

  return (
    <button onClick={() => setCount((value) => value + 1)}>
      点击次数：{count}
    </button>
  );
}
```

### 这个案例的执行过程

### 第一次渲染

`count` 是 `0`。组件提交到页面后，Effect 把标题设置为“当前数量：0”。

### 点击按钮

`setCount` 让 `count` 变成 `1`。组件重新渲染并提交后，React 发现 `[count]` 中的值发生变化，于是再次执行 Effect，把标题更新为“当前数量：1”。

### 点击其他不相关的按钮

如果组件重新渲染，但 `count` 的值没有变化，React 不会因为这次渲染重新执行这个 Effect。

这个案例可以帮助我们建立一个简单的判断方式：

> `setup` 里读了谁，就把谁写进依赖数组；依赖变了，就重新同步外部系统。

## 四、回到项目：等待枚举准备好再查询

项目里的实际场景是一个 ProTable 列表页。页面查询依赖一些枚举值，例如状态和启用状态。第一次渲染时，这些枚举可能还没有准备完成，因此不能立即把未完成的查询条件提交给后端。

核心代码是：

```tsx
useEffect(() => {
  if (isAll || !pendingEnumReady) return;
  instance.commitSearch?.();
}, [instance, isAll, pendingEnumReady]);
```

### 1. `setup` 做了什么

这里的 `setup` 逻辑很简单：调用 `instance.commitSearch?.()`，触发 ProTable 提交查询并请求列表数据。

它没有建立长连接、绑定事件或启动定时器，所以不需要额外的 cleanup。

### 2. `pendingEnumReady` 为什么是依赖

第一次渲染时，如果 `pendingEnumReady` 是 `false`，代码直接返回，不发起查询。

当枚举加载完成，`pendingEnumReady` 变成 `true`，React 发现依赖发生变化，再执行一次 Effect。这时查询条件已经完整，才触发 `commitSearch`。

这就是“先准备依赖，再执行副作用”的实际应用。

### 3. `isAll` 为什么要提前返回

全量列表已经通过 `autoFetch={isAll}` 自动查询。当 `isAll` 为 `true` 时，如果 Effect 再调用一次 `commitSearch`，就可能造成重复请求。

所以这句代码：

```tsx
if (isAll || !pendingEnumReady) return;
```

表达了两个业务保护条件：

- 全量列表已经自动请求时，不重复请求。
- 枚举条件没有准备好时，不提交不完整的参数。

### 4. 依赖数组如何和项目逻辑对应

Effect 的代码读取了三个外部值：

- `instance`：调用查询方法的 ProTable 实例。
- `isAll`：判断是否为全量列表。
- `pendingEnumReady`：判断枚举是否准备完成。

因此依赖数组写成 `[instance, isAll, pendingEnumReady]`。这不是为了让 Effect“只在某个变量变化时执行”，而是如实声明这段逻辑依赖了哪些响应式值。

### 5. 完整的执行时序

可以把这段代码想成四步：

### 页面第一次渲染

枚举还没加载完成，`pendingEnumReady` 为 `false`，Effect 提前结束，不发送错误查询。

### 枚举加载完成

`pendingEnumReady` 变成 `true`，Effect 重新执行。

### 判断列表类型

如果 `isAll` 为 `true`，交给 `autoFetch` 处理；否则继续执行手动查询逻辑。

### 提交查询

调用 `instance.commitSearch?.()`，让 ProTable 使用完整条件请求列表。

> 一句话总结：这个 Effect 不是为了“页面打开后强行请求一次”，而是为了在查询依赖准备完成之后，把列表状态同步给 ProTable，并通过条件判断避免重复请求和不完整参数。

## 五、Review 这类 Effect 时看什么

### 先确认它是否真的需要 Effect

如果只是计算一个值，可以直接在渲染阶段计算，或者使用 `useMemo`；如果是同步网络、浏览器 API、订阅或第三方组件，才考虑 Effect。

### 检查依赖是否完整

不要为了让 Effect 少执行而随意删除依赖，也不要用 eslint 注释压制 `exhaustive-deps`。如果依赖不完整，Effect 可能读到旧的 props 或 state。

### 检查是否会重复请求

看自动请求和手动 `commitSearch` 是否同时存在，确认是否需要像 `isAll` 这样的保护条件。

### 检查条件是否准备完成

如果请求参数来自异步枚举、用户信息或路由参数，要确认 Effect 不会在这些值尚未准备好时提前执行。

### 如果建立了资源，必须清理

订阅、事件监听、定时器、连接和可取消请求，都应该在 cleanup 中撤销或关闭，让 setup 和 cleanup 成对出现。

> 判断一个 Effect 是否可靠，可以问自己：如果 React 先执行一次 setup，再立即 cleanup，最后再次 setup，页面和外部系统是否仍然正确？
