# React 学习笔记：useMemo

## 1. useMemo 是做什么的？

`useMemo` 是 React 提供的一个 Hook，用来缓存一次计算的结果。

组件重新渲染时，组件函数里的代码通常会重新执行。如果某个计算结果依赖的数据没有变化，就可以使用 `useMemo` 复用之前的结果，避免重复计算。

可以先记住一句话：

> `useMemo` 用来缓存“计算出来的值”，不是用来保存会变化的状态。

官方文档：

[React useMemo 官方文档](https://react.dev/reference/react/useMemo)

## 2. 基本写法

```tsx
const cachedValue = useMemo(calculateValue, dependencies);
```

实际写法通常是：

```tsx
const visibleTodos = useMemo(
  () => filterTodos(todos, tab),
  [todos, tab]
);
```

它有两个参数。

### 第一个参数：计算函数

第一个参数是一个函数，负责计算要缓存的结果。

```tsx
() => filterTodos(todos, tab)
```

这个函数应该是纯函数：根据输入计算结果，不应该在里面修改外部数据、发送请求或执行其他副作用。

### 第二个参数：依赖数组

依赖数组要写出计算函数中使用到的外部变量：

```tsx
[todos, tab]
```

React 会比较这次依赖和上一次依赖。如果依赖没有变化，就返回上一次缓存的结果；如果依赖发生变化，就重新执行计算函数。

React 使用 `Object.is` 比较依赖值。对于字符串、数字等基础类型比较直观；对于对象、数组和函数，比较的是引用是否相同。

## 3. useMemo 的执行过程

例如：

```tsx
const total = useMemo(() => price * count, [price, count]);
```

执行过程可以理解为：

1. 第一次渲染时，计算 `price * count`。
2. 如果组件因为其他原因重新渲染，但 `price` 和 `count` 没变，直接使用上次的结果。
3. 如果 `price` 或 `count` 发生变化，重新计算。

需要注意，`useMemo` 不会让第一次渲染变快。它主要是为了跳过后续渲染中不必要的计算。

## 4. 一个简单例子

```tsx
import { useMemo, useState } from 'react';

function ProductPrice({ price, count }: { price: number; count: number }) {
  const [keyword, setKeyword] = useState('');

  const totalPrice = useMemo(() => {
    console.log('重新计算总价');
    return price * count;
  }, [price, count]);

  return (
    <div>
      <p>总价：{totalPrice}</p>
      <input value={keyword} onChange={(event) => setKeyword(event.target.value)} />
    </div>
  );
}
```

当输入框中的 `keyword` 发生变化时，组件会重新渲染，但因为 `price` 和 `count` 没有变化，所以不会重新计算 `totalPrice`。

不过这个例子中的乘法计算非常简单，实际不需要使用 `useMemo`。它只是帮助我们理解执行过程。

## 5. 经典应用：过滤列表

```tsx
const visibleTodos = useMemo(
  () => filterTodos(todos, tab),
  [todos, tab]
);
```

当 `todos` 或 `tab` 发生变化时，需要重新过滤；如果只是页面主题发生变化，就可以复用之前的 `visibleTodos`。

这种场景比较适合使用 `useMemo`，尤其是在列表很大、过滤或转换逻辑比较耗时时。

## 6. 项目中的实际应用

在配方物料配置页面中，先通过 `useGoblinEnum` 得到各种枚举字典，然后整理出当前页面需要的编码：

```tsx
const enumCodes = useMemo<MaterialConfigEnumCodes>(
  () => ({
    finishedProductType: productTypeDict['成品'],
    intermediateProductType: productTypeDict['中间过程品'],
    createdStatus: recipeStatusDict['已新建'],
    submittedStatus: recipeStatusDict['已提交'],
    materialConfiguredStatus: recipeStatusDict['已配置物料'],
    validStatus: validStatusDict['有效'],
    rawMaterialType: rawMaterialTypeDict['原料'],
    intermediateRawMaterialType: rawMaterialTypeDict['中间过程品'],
    linkedYes: linkedSystemDict['是'],
    linkedNo: linkedSystemDict['否'],
  }),
  [linkedSystemDict, productTypeDict, rawMaterialTypeDict, recipeStatusDict, validStatusDict]
);
```

接着再根据详情数据和枚举编码，生成表单字段配置：

```tsx
const fields = useMemo(
  () => getMaterialConfigFields(detail, enumCodes),
  [detail, enumCodes]
);
```

这里是两个 `useMemo` 串联使用：

```text
枚举字典
    ↓
enumCodes
    ↓
fields
    ↓
表单配置
```

当枚举字典和 `detail` 都没有变化时，`enumCodes` 和 `fields` 会继续复用之前的对象和数组。

这里除了避免重复生成配置，还有一个重要作用：保持引用稳定。

如果每次渲染都直接创建对象：

```tsx
const enumCodes = {
  finishedProductType: productTypeDict['成品'],
};
```

那么即使内容相同，每次也都是一个新的对象：

```tsx
{} !== {}
```

这可能导致接收 `enumCodes` 或 `fields` 的子组件认为 props 发生了变化，从而产生额外更新。

## 7. useMemo 和 useState 的区别

两者都可以得到一个值，但用途不同：

| Hook | 主要用途 | 值从哪里来 |
| --- | --- | --- |
| `useState` | 保存会变化的状态 | 通过 `setState` 更新 |
| `useMemo` | 缓存计算结果 | 根据依赖重新计算 |

例如：

```tsx
const [saving, setSaving] = useState(false);
```

`saving` 是页面状态，保存按钮点击后可以变成 `true`。

```tsx
const fields = useMemo(() => getFields(detail), [detail]);
```

`fields` 是根据 `detail` 计算出来的配置，不需要手动调用 setter 修改。

## 8. 常见注意事项

### 8.1 必须写完整依赖

计算函数中使用了哪些 props、state 或组件内变量，就应该放进依赖数组。

```tsx
const result = useMemo(
  () => calculate(price, count),
  [price, count]
);
```

如果漏写依赖，可能会拿到旧数据。

### 8.2 只能在组件顶层调用

正确：

```tsx
function Page({ detail }) {
  const fields = useMemo(() => getFields(detail), [detail]);
  return <Form fields={fields} />;
}
```

不要放在条件、循环或事件函数中：

```tsx
if (visible) {
  const value = useMemo(() => calculate(), []); // 不推荐
}
```

### 8.3 不要到处使用 useMemo

React 官方建议把 `useMemo` 当作性能优化工具，而不是保证程序正确运行的工具。

以下情况通常不需要使用：

- 简单的加减乘除
- 很短的字符串拼接
- 很小的数据转换
- 没有传给需要关注引用变化的子组件

如果直接计算也很快，就直接写更容易阅读：

```tsx
const total = price * count;
```

### 8.4 useMemo 不是永久缓存

`useMemo` 的缓存可能在组件卸载后消失，React 也可能在特殊情况下丢弃缓存。因此不能把它当作必须永久保存的数据。

需要持久保存的状态应该使用 `useState`，需要保存可变引用可以考虑 `useRef`。

## 9. 新人记忆版

```text
useMemo = 缓存计算结果

第一个参数：怎么算
第二个参数：依赖谁

依赖没变：复用旧结果
依赖变了：重新计算
```

在当前项目中，可以这样理解：

> `enumCodes` 和 `fields` 都不是用户直接输入的状态，而是由枚举和详情数据计算出来的配置，所以使用 `useMemo` 可以让这些配置在依赖不变时保持稳定。

## 参考资料

- [React 官方：useMemo](https://react.dev/reference/react/useMemo)
