# React 学习笔记：useState

这篇笔记来自生产配方详情页，主要学习 React 的 `useState`：它是什么、怎么传参数、怎么更新状态，以及真实项目里如何用它控制页面状态。

官方文档：[useState – React](https://react.dev/reference/react/useState)

## 一、useState 是什么？

`useState` 是 React 内置的 Hook，用来给函数组件保存状态。

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      点击了 {count} 次
    </button>
  );
}
```

可以先把它类比成 Vue 的：

```ts
const count = ref(0);
```

但 React 更新状态必须调用 setter：

```tsx
setCount(1);
```

## 二、useState 的参数和返回值

### 参数：initialState

```tsx
const [count, setCount] = useState(0);
```

`useState` 的第一个参数是初始状态，可以是任意类型：

```tsx
useState(false);          // boolean
useState('');             // string
useState(0);              // number
useState<string | undefined>(undefined);
useState<string[]>([]);   // array
useState({ name: '' });   // object
```

这个初始值只在组件第一次挂载时使用。之后组件重新渲染时，不会重新把状态初始化成这个值。

```tsx
const [saving, setSaving] = useState(false);

setSaving(true);
```

执行 `setSaving(true)` 后，下一次渲染中的 `saving` 就是 `true`。普通重新渲染不会把它变回 `false`，除非：

- 调用 `setSaving(false)`；
- 组件卸载后重新挂载；
- 通过改变组件的 `key` 让 React 重新创建组件。

### 返回值：一个长度为 2 的数组

```tsx
const [state, setState] = useState(initialState);
```

返回值的两个位置固定表示：

1. 当前状态值 `state`
2. 更新状态的 setter `setState`

这就是为什么通常使用数组解构：

```tsx
const [saving, setSaving] = useState(false);
```

## 三、调用 setter 会发生什么？

```tsx
setSaving(true);
```

大致过程是：

```text
调用 setter
  ↓
React 保存新的状态
  ↓
组件重新执行 render
  ↓
React 对比新旧 JSX
  ↓
页面更新真正变化的部分
```

注意：setter 不会直接修改当前这一次函数执行中的变量。

```tsx
function handleClick() {
  setCount(count + 1);
  console.log(count); // 这里仍然是旧值
}
```

新的值会从下一次 `render` 开始生效。

## 四、基于上一次状态更新

如果新状态依赖旧状态，推荐使用函数形式：

```tsx
setCount((currentCount) => currentCount + 1);
```

例如连续增加三次：

```tsx
function addThree() {
  setCount((value) => value + 1);
  setCount((value) => value + 1);
  setCount((value) => value + 1);
}
```

这里每一次都会拿到 React 队列中的最新值。

如果直接写成：

```tsx
setCount(count + 1);
setCount(count + 1);
setCount(count + 1);
```

三次可能都基于同一个旧的 `count` 计算，结果不一定是预期的加三。

## 五、数组和对象不能直接修改

React 中应该把 state 当成只读值，更新时创建新的数组或对象。

### 数组

不推荐：

```tsx
attachments.push(newFile);
setAttachments(attachments);
```

推荐：

```tsx
setAttachments((currentAttachments) => [
  ...currentAttachments,
  newFile,
]);
```

### 对象

不推荐：

```tsx
form.name = '新名称';
setForm(form);
```

推荐：

```tsx
setForm((currentForm) => ({
  ...currentForm,
  name: '新名称',
}));
```

原因是 React 通常通过新旧引用是否变化来判断是否需要更新。直接修改原数组或原对象，可能导致 React 无法正确识别变化。

## 六、项目实践

文件：`src/pages/production/recipe/detail/index.tsx`

```tsx
const [readonlySteps, setReadonlySteps] = useState<RecipeStepView[]>([]);
const [supplierRows, setSupplierRows] = useState<SupplierTableRow[]>([]);
const [attachments, setAttachments] = useState<any[]>([]);
const [currentRecipeStatus, setCurrentRecipeStatus] =
  useState<string | number | undefined>();
const [detailValidateTick, setDetailValidateTick] = useState(0);
const [saving, setSaving] = useState(false);
const [submitting, setSubmitting] = useState(false);
```

这些 state 分别保存：

| state | 用途 |
| --- | --- |
| `readonlySteps` | 详情页只读展示的配方步骤 |
| `supplierRows` | 供应商关系表格数据 |
| `attachments` | 配方附件 |
| `currentRecipeStatus` | 当前配方状态 |
| `detailValidateTick` | 触发详情步骤校验的信号 |
| `saving` | 是否正在保存 |
| `submitting` | 是否正在提交 |

### 1. 异步请求后更新页面数据

详情数据请求完成后：

```tsx
setReadonlySteps(readOnly ? toRecipeSteps(detail) : []);
setSupplierRows(readOnly ? toSupplierRows(supplierRelations) : []);
setAttachments(normalizedAttachments);
```

这些 setter 会触发组件重新渲染，页面随后展示最新的步骤、供应商和附件。

### 2. 用 boolean state 表示操作状态

保存按钮使用了：

```tsx
<Button
  loading={saving}
  disabled={submitting}
  onClick={handleSave}
>
  保存
</Button>
```

保存开始时：

```tsx
setSaving(true);
```

保存结束时：

```tsx
setSaving(false);
```

所以用户可以看到 loading，也不能在提交过程中重复保存。

提交按钮同理：

```tsx
<Button
  loading={submitting}
  disabled={saving}
  onClick={handleSubmit}
>
  提交
</Button>
```

这种写法可以把异步流程同步到 UI：

```text
点击保存
  ↓
saving = true
  ↓
按钮 loading
  ↓
请求完成
  ↓
saving = false
```

### 3. 用数字 state 触发校验

```tsx
setDetailValidateTick((value) => value + 1);
```

这里的数字不一定是业务数据，它更像一个“通知信号”。每次递增，依赖 `detailValidateTick` 的子组件就能知道：

> 父组件要求我重新执行一次校验。

这是一种可以使用，但要看清用途的写法：它管理的是“触发次数”，而不是“当前页面展示的数字”。

## 七、useState 的 Hook 规则

### 必须在组件顶层调用

正确：

```tsx
function RecipeDetail() {
  const [saving, setSaving] = useState(false);
  // ...
}
```

不正确：

```tsx
if (isCreate) {
  const [saving, setSaving] = useState(false);
}
```

React 依赖 Hook 的调用顺序来对应每个 state。条件调用会让顺序发生变化，导致状态错乱。

### 不要把派生值都保存成 state

如果一个值可以从现有 props 或 state 直接计算，就不一定需要再建一个 state：

```tsx
const isSavingOrSubmitting = saving || submitting;
```

不需要额外写：

```tsx
const [isBusy, setIsBusy] = useState(false);
```

否则就会出现多个状态之间需要手动同步的问题。

## 八、初始值比较复杂时使用 initializer function

如果初始值计算比较耗时，可以传函数本身：

```tsx
const [todos, setTodos] = useState(createInitialTodos);
```

不要写成：

```tsx
const [todos, setTodos] = useState(createInitialTodos());
```

前者让 React 在初始化时调用，后者会在组件函数每次执行时先调用 `createInitialTodos()`，即使后续结果不会被重新使用。

## 九、结合当前项目的 Review 记录

当前代码整体使用方式是合理的：

- Hook 都在组件顶层调用；
- 加载详情后通过 setter 更新页面数据；
- `saving` 和 `submitting` 控制按钮 loading 和互斥操作；
- `detailValidateTick` 用函数式更新，正确依赖了上一次值。

可以继续关注一个类型问题：

```tsx
const [attachments, setAttachments] = useState<any[]>([]);
```

如果附件已经有明确的数据结构，最好替换成具体类型，避免 `any` 让错误漏过去。

## 十、和 Vue ref 的简单对照

| React | Vue | 含义 |
| --- | --- | --- |
| `useState(false)` | `ref(false)` | 创建响应式状态 |
| `saving` | `saving.value` | 读取状态 |
| `setSaving(true)` | `saving.value = true` | 更新状态 |
| setter 触发重新渲染 | 修改 ref 触发更新 | 让页面同步最新状态 |

React 的特别之处是：不能直接修改 state，应该通过 setter 传入新的值。

## 一句话总结

> `useState` 用来保存函数组件需要记住的状态；初始值只在首次挂载时使用，setter 会让下一次 render 使用新状态，并让 React 更新页面中真正发生变化的部分。

## 官方资料

- [useState API Reference](https://react.dev/reference/react/useState)
- [React Hooks 总览](https://react.dev/reference/react/hooks)
- [Updating Objects in State](https://react.dev/learn/updating-objects-in-state)
- [Updating Arrays in State](https://react.dev/learn/updating-arrays-in-state)
