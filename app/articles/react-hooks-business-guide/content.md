# 从 React Hooks 到业务实践：我在真实项目中是怎么使用 Hook 的

刚开始学习 React Hook 时，我最先接触的是 `useState` 和 `useEffect`。当时很容易把它们记成两条规则：页面数据用 `useState`，页面加载后执行代码用 `useEffect`。

但真正进入业务项目后，我发现 Hook 并不是一组需要背下来的 API。面对列表查询、详情初始化、表单配置、保存提交和页面参数等需求，需要先判断当前问题属于哪一类：

- 组件需要记住一份会变化的数据；
- React 需要和接口、浏览器或第三方组件保持同步；
- 页面需要根据已有数据计算一个结果；
- 一个函数需要保持相对稳定的引用；
- 多个组件需要复用同一段带状态的逻辑。

这篇文章会先整体认识 React Hook，再介绍我在配方管理、采退订单等需求中用到的 `useState`、`useEffect`、`useMemo` 和 `useCallback`，然后继续延伸到项目自定义 Hook `useUrlParams`，最后了解 ahooks 的 `useRequest` 可以怎样简化异步请求。

> 文中的业务代码做了适当简化，重点是说明 Hook 在实际需求中解决了什么问题。

---

## 一、Hook 是什么？

Hook 是 React 提供的一类特殊函数，让函数组件可以使用状态、副作用、引用、上下文等 React 能力。

常见的内置 Hook 包括：

| Hook | 主要作用 |
| --- | --- |
| `useState` | 保存组件需要记住的状态 |
| `useEffect` | 让组件和 React 外部的系统保持同步 |
| `useMemo` | 缓存一次计算的结果 |
| `useCallback` | 缓存一个函数引用 |
| `useRef` | 保存一个可变引用，修改时不会触发重新渲染 |
| `useContext` | 读取上层组件提供的 Context |

除了 React 提供的内置 Hook，我们还可以组合多个 Hook，封装成项目自己的自定义 Hook，例如：

```tsx
const [id, mode] = useUrlParams("id", "mode");
```

社区也提供了通用 Hook 库，例如 ahooks。其中的 `useRequest` 可以帮助我们管理请求的 `data`、`loading` 和 `error` 等状态。

可以先这样理解它们之间的关系：

```text
React 内置 Hook
  ↓ 组合
项目自定义 Hook
  ↓ 沉淀通用场景
第三方 Hook 库，例如 ahooks
```

## 二、使用 Hook 的基本规则

Hook 虽然表现为 JavaScript 函数，但不能在任意位置调用。

### 1. 在组件顶层调用

正确写法：

```tsx
function RecipeDetail() {
  const [saving, setSaving] = useState(false);

  // ...
}
```

不要放在条件判断、循环或普通嵌套函数中：

```tsx
function RecipeDetail({ editable }: Props) {
  if (editable) {
    // 不推荐：条件变化后，Hook 的调用顺序也可能变化
    const [saving, setSaving] = useState(false);
  }
}
```

React 会依赖 Hook 在每次渲染中的调用顺序，将当前的 `useState`、`useEffect` 和之前保存的状态对应起来。

### 2. 只在 React 函数中调用

通常只能在下面两类函数中调用 Hook：

- React 函数组件；
- 其他自定义 Hook。

普通工具函数如果不调用任何 Hook，就不需要为了形式统一以 `use` 开头。

### 3. 自定义 Hook 以 `use` 开头

例如：

```tsx
useUrlParams();
useReturnOrderChanged();
```

这个命名不只是习惯，也是在告诉开发者和检查工具：这个函数内部遵守 Hook 的调用规则。

## 三、先看项目中的 Hook 分工

在当前几个业务需求里，这些 Hook 并不是孤立出现的：

| Hook | 参数 | 返回值 | 项目中的作用 |
| --- | --- | --- | --- |
| `useState` | 初始状态 | 当前状态、setter | 保存附件、供应商行、保存状态 |
| `useEffect` | setup、依赖数组 | setup 可以返回清理函数 | 枚举准备完成后触发列表查询 |
| `useMemo` | 计算函数、依赖数组 | 缓存后的计算结果 | 根据详情和枚举生成表单配置 |
| `useCallback` | 函数、依赖数组 | 缓存后的函数 | 保存详情初始化函数和提交函数的引用 |
| `useUrlParams` | URL 参数名称 | 按顺序返回参数值 | 读取详情 ID 和页面模式 |

它们可以串成一条完整的页面链路：

```text
读取 URL 参数
  ↓
准备枚举和详情数据
  ↓
生成表单配置
  ↓
用户修改页面状态
  ↓
保存或提交
  ↓
通知列表刷新
```

接下来分别看每个 Hook 解决了什么问题。

## 四、useState：让组件记住业务状态

### 1. 参数和返回值

基本写法：

```tsx
const [state, setState] = useState(initialState);
```

`useState` 接收一个初始状态，返回一个长度为 2 的数组：

1. 当前渲染中的状态；
2. 更新状态的 setter 函数。

例如：

```tsx
const [saving, setSaving] = useState(false);
```

这里的 `false` 是第一次挂载时的初始值。调用 `setSaving(true)` 后，React 会安排一次新的渲染，下一次渲染中的 `saving` 才会变成 `true`。

### 2. 项目里的状态不只有字符串和数字

生产配方详情页中有多种类型的状态：

```tsx
const [readonlySteps, setReadonlySteps] = useState<RecipeStepView[]>([]);
const [supplierRows, setSupplierRows] = useState<SupplierTableRow[]>([]);
const [attachments, setAttachments] = useState<Attachment[]>([]);
const [currentRecipeStatus, setCurrentRecipeStatus] =
  useState<string | number>();
const [detailValidateTick, setDetailValidateTick] = useState(0);
const [saving, setSaving] = useState(false);
const [submitting, setSubmitting] = useState(false);
```

可以按用途把它们分成三类：

| 类型 | 示例 |
| --- | --- |
| 业务数据 | 配方步骤、供应商行、附件、配方状态 |
| 页面交互状态 | 当前编辑项、弹窗是否打开、校验触发次数 |
| 异步操作状态 | 加载中、保存中、提交中 |

这让我意识到，`useState` 不是只能保存计数器，而是在保存当前页面需要“记住”的状态。

### 3. setter 更新的是下一次渲染

下面的代码不会立刻打印出 `true`：

```tsx
function handleSave() {
  setSaving(true);
  console.log(saving); // 当前函数仍然看到本次渲染中的旧值
}
```

可以把每次渲染理解成一张快照。事件处理函数读取的是创建它的那次渲染中的状态，setter 会请求 React 使用新状态再渲染一次组件。

### 4. 依赖旧状态时使用函数式更新

配方详情页使用一个数字通知子组件重新校验：

```tsx
setDetailValidateTick((value) => value + 1);
```

这里的新值依赖上一次状态，因此使用 updater function 更合适。React 会把队列中最新的状态传给 `value`，避免连续更新时一直使用同一份旧快照。

### 5. 数组和对象不能直接修改

错误示例：

```tsx
attachments.push(newFile);
setAttachments(attachments);
```

推荐创建一个新数组：

```tsx
setAttachments((currentAttachments) => [
  ...currentAttachments,
  newFile,
]);
```

更新表格中的某一行时也是一样：

```tsx
setSupplierRows((currentRows) =>
  currentRows.map((row) =>
    row.id === editingId
      ? { ...row, supplierName: nextSupplierName }
      : row,
  ),
);
```

React 中应该把 state 当作只读快照。创建新数组或新对象，既能保留其他数据，也能让新旧引用发生变化。

### 6. 保存和提交状态如何控制按钮

```tsx
<Button
  loading={saving}
  disabled={submitting}
  onClick={handleSave}
>
  保存
</Button>

<Button
  loading={submitting}
  disabled={saving}
  onClick={handleSubmit}
>
  提交
</Button>
```

对应的异步过程是：

```text
点击保存
  ↓
saving = true
  ↓
按钮显示 loading，并阻止重复操作
  ↓
请求完成
  ↓
saving = false
```

### 7. 不要把所有值都保存成 state

下面这个值可以直接计算：

```tsx
const isBusy = saving || submitting;
```

不需要再额外维护：

```tsx
const [isBusy, setIsBusy] = useState(false);
```

如果一份数据可以根据现有 props 或 state 在渲染时算出来，它通常就是派生值。重复保存会增加同步成本，也可能出现 `saving` 已经变化、`isBusy` 却忘记更新的问题。

## 五、useEffect：让组件和外部系统保持同步

### 1. 参数是什么

基本写法：

```tsx
useEffect(setup, dependencies?);
```

- `setup`：需要执行的同步逻辑，可以返回一个清理函数；
- `dependencies`：setup 中读取的响应式依赖。

例如监听浏览器事件：

```tsx
useEffect(() => {
  function handleResize() {
    console.log(window.innerWidth);
  }

  window.addEventListener("resize", handleResize);

  return () => {
    window.removeEventListener("resize", handleResize);
  };
}, []);
```

这里的 setup 建立监听，cleanup 在组件卸载时移除监听。

### 2. 项目案例：等待枚举准备好再查询

配方列表的待办页面不能在条件尚未准备好时直接查询，因此使用了下面的 Effect：

```tsx
useEffect(() => {
  if (isAll || !pendingEnumReady) return;
  instance.commitSearch?.();
}, [instance, isAll, pendingEnumReady]);
```

它的执行过程是：

```text
页面第一次渲染
  ↓
pendingEnumReady = false
  ↓
Effect 提前结束，不查询
  ↓
异步枚举加载完成
  ↓
pendingEnumReady = true
  ↓
Effect 重新执行
  ↓
待办列表调用 commitSearch
```

这里值得学习的不是“请求接口就要用 `useEffect`”，而是 React 正在根据枚举准备状态，同步一个第三方表格组件的查询动作。

`isAll` 则用于区分全量列表和待办列表，避免全量列表的自动查询和当前手动查询重复发生。

### 3. 依赖数组不是执行次数开关

常见的三种写法：

```tsx
// 每次提交渲染后都执行
useEffect(() => {});

// 挂载后执行；卸载时执行 cleanup
useEffect(() => {}, []);

// 挂载后执行，依赖变化后重新同步
useEffect(() => {}, [dependency]);
```

不应该只把 `[]` 记成“执行一次”。更重要的问题是：setup 读取了哪些 props、state 和组件内变量？这些响应式值是否已经写进依赖数组？

在开发环境开启 Strict Mode 时，React 还可能额外执行一次 setup 和 cleanup，用来检查清理逻辑是否完整；这不是生产环境中重复执行了一套业务流程。

### 4. 哪些情况不需要 useEffect

如果只是计算总金额：

```tsx
const totalAmount = price * quantity;
```

通常直接计算即可。为了计算一个普通值再建立 state 和 Effect，反而会让两份数据需要手动同步。

## 六、useMemo：缓存计算结果

### 1. 参数和返回值

```tsx
const cachedValue = useMemo(calculateValue, dependencies);
```

`useMemo` 接收：

1. 一个返回计算结果的函数；
2. 这个计算使用的依赖数组。

依赖不变时，React 可以复用上一次的结果；依赖变化后重新执行计算函数。

### 2. 项目案例：生成物料表单配置

物料配置页面先从枚举数据整理出 `enumCodes`，再结合详情生成表单字段：

```tsx
const enumCodes = useMemo(
  () => getMaterialEnumCodes(enumData),
  [enumData],
);

const fields = useMemo(
  () => getMaterialConfigFields(detail, enumCodes),
  [detail, enumCodes],
);
```

数据关系是：

```text
异步枚举
  ↓
enumCodes
  ↓ 与 detail 一起参与计算
fields
  ↓
表单组件
```

这里缓存的不只是一个数字，而是一组下游表单会使用的配置对象。依赖没有变化时保持引用稳定，可以减少不必要的重新计算，也避免下游组件误认为配置发生了变化。

### 3. 不要为了优化而到处使用

下面的计算非常简单：

```tsx
const total = price * count;
```

没有必要改成：

```tsx
const total = useMemo(() => price * count, [price, count]);
```

`useMemo` 是性能优化手段，不应该成为程序正确运行的前提。只有当计算确实比较复杂，或者结果需要保持稳定引用时，再考虑使用。

## 七、useCallback：缓存函数引用

### 1. 参数和返回值

```tsx
const cachedFunction = useCallback(fn, dependencies);
```

`useCallback` 接收需要缓存的函数和依赖数组，返回一个函数引用。

它不会自动执行传入的函数，也不会缓存接口请求结果。

### 2. 项目案例：初始化采退详情

```tsx
const getInitialValues = useCallback(async () => {
  if (mode === "edit" && orderNo) {
    return returnOrderService.getDetail(orderNo);
  }

  return createInitialValues(bizNo);
}, [mode, bizNo, orderNo]);
```

`useCallback` 在这里保存的是 `getInitialValues` 的函数引用。表单后续调用这个函数时，才会真正执行详情请求。

依赖数组需要包含函数从外部闭包读取的响应式值。上面的函数使用了 `mode`、`bizNo` 和 `orderNo`，因此都应该检查并放入依赖数组。

### 3. 项目案例：保存采退订单

```tsx
const handleSave = useCallback(
  async (values: ReturnOrderFormValues) => {
    if (mode === "create") {
      await returnOrderService.create(values);
    } else {
      await returnOrderService.update(values);
    }

    emitReturnOrderChanged();
    closeReturnOrderDetailPage(returnPath);
  },
  [mode, returnPath],
);
```

这里的 `values` 是调用函数时传入的参数，不是闭包依赖，所以不需要写进依赖数组。

`mode` 和 `returnPath` 来自函数外部，并且会影响函数行为，所以需要作为依赖。

### 4. useCallback 和 useMemo 的区别

```tsx
const fields = useMemo(
  () => getFields(detail),
  [detail],
);

const handleSave = useCallback(
  () => saveOrder(orderNo),
  [orderNo],
);
```

可以简单记成：

```text
useMemo     缓存函数执行后的结果
useCallback 缓存函数本身
```

`useCallback` 主要适合函数作为其他 Hook 的依赖，或者作为 props 传给需要稳定引用的子组件等情况。普通点击函数如果没有这些需要，可以直接声明，不必全部包一层 `useCallback`。

## 八、把几个 Hook 放回同一条业务链路

分别学习之后，再回到业务页面观察：

```text
useUrlParams
读取 id 和 mode
  ↓
useEffect
等待外部条件或同步查询时机
  ↓
useState
保存详情、附件和操作状态
  ↓
useMemo
根据详情和枚举生成页面配置
  ↓
useCallback
提供相对稳定的初始化和保存函数
```

这几个 Hook 不是互相替代的工具，而是在处理不同类型的问题：

| 当前问题 | 优先考虑 |
| --- | --- |
| 组件是否需要记住这个值 | `useState` |
| 是否在同步 React 之外的系统 | `useEffect` |
| 是否由已有数据计算出一个结果 | 直接计算，必要时 `useMemo` |
| 是否需要稳定的函数引用 | 必要时 `useCallback` |
| 是否有带状态的逻辑需要复用 | 自定义 Hook |

## 九、从内置 Hook 到自定义 Hook：useUrlParams

详情页经常需要从 URL 中读取 `id` 和 `mode`：

```text
/production/recipe/detail?id=123&mode=edit
```

项目中把这段逻辑封装成了自定义 Hook：

```tsx
import { useLocation } from "@guming/mars";
import { useMemo } from "react";

export function useUrlParams(
  ...keys: string[]
): Array<string | undefined> {
  const location = useLocation();

  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return keys.map((key) => params.get(key) ?? undefined);
  }, [location.search, ...keys]);
}
```

使用时只需要：

```tsx
const [id, mode] = useUrlParams("id", "mode");
```

### 1. 它封装了哪些步骤

```text
useLocation 读取当前路由
  ↓
URLSearchParams 解析 query
  ↓
按照 keys 的顺序取值
  ↓
把 null 统一转换成 undefined
```

`...keys` 是剩余参数。调用 `useUrlParams("id", "mode")` 后，函数内部得到的 `keys` 是 `['id', 'mode']`。

返回值也保持相同顺序，因此解构顺序必须和传入顺序一致。

### 2. 为什么它是自定义 Hook

因为它：

- 以 `use` 开头；
- 内部调用了 `useLocation` 和 `useMemo`；
- 复用的是一段带有 React 响应能力的逻辑。

如果函数只是接收一个字符串并用 `URLSearchParams` 解析，没有调用任何 Hook，就可以写成普通工具函数。

### 3. 自定义 Hook 也要保持职责清晰

`useUrlParams` 只负责读取 URL 参数，不应该同时负责：

- 请求详情；
- 判断页面权限；
- 保存表单；
- 控制业务跳转。

另外，URL 中的参数首先都是字符串。需要数字 ID 时，调用方仍然要转换并校验：

```tsx
const [rawId] = useUrlParams("id");
const id = rawId ? Number(rawId) : undefined;
```

当前 Hook 中的 `useMemo` 主要用于复用解析结果和保持返回数组引用；URL 参数解析本身并不复杂，即使不使用 `useMemo`，基本功能仍然可以实现。

## 十、继续延伸：ahooks 的 useRequest

前面的内容来自当前项目中的实际 Hook 用法。接下来是基于相同业务场景的延伸学习：如果项目引入 ahooks，可以使用 `useRequest` 简化部分请求状态。下面的 API 以当前 ahooks 3.x 官方文档为准。

### 1. 普通请求需要管理哪些内容

不使用请求 Hook 时，一个请求经常需要自己维护：

```tsx
const [detail, setDetail] = useState<RecipeDetail>();
const [loading, setLoading] = useState(false);
const [error, setError] = useState<Error>();

async function loadDetail(id: number) {
  setLoading(true);
  setError(undefined);

  try {
    const result = await recipeService.getDetail(id);
    setDetail(result);
  } catch (requestError) {
    setError(requestError as Error);
  } finally {
    setLoading(false);
  }
}
```

这段代码并没有错，但 `data`、`loading`、`error` 和请求生命周期在很多页面都会重复出现。

### 2. useRequest 的基本用法

```tsx
const { data, error, loading } = useRequest(service);
```

`useRequest` 的第一个参数是一个返回 Promise 的 service。默认情况下，组件初始化时会执行这个 service，并管理请求结果、加载状态和错误。

需要手动触发时，可以配置 `manual: true`：

```tsx
const {
  loading,
  run,
  runAsync,
} = useRequest(service, {
  manual: true,
});
```

- `run`：触发请求，错误可以通过配置中的 `onError` 处理；
- `runAsync`：返回 Promise，适合在调用处继续 `await` 和处理异常；
- `loading`：当前请求是否正在执行。

### 3. 延伸到配方保存场景

原本页面自己维护：

```tsx
const [saving, setSaving] = useState(false);
```

如果使用 `useRequest`，可以把保存请求改写成：

```tsx
const {
  runAsync: saveRecipe,
  loading: saving,
} = useRequest(
  (values: RecipeFormValues) => recipeService.save(values),
  {
    manual: true,
  },
);
```

提交时：

```tsx
async function handleSave(values: RecipeFormValues) {
  try {
    await saveRecipe(values);
    message.success("保存成功");
  } catch {
    // 根据项目的统一错误处理方式决定是否需要额外提示
  }
}
```

按钮仍然使用同一个业务状态：

```tsx
<Button loading={saving} onClick={handleSave}>
  保存
</Button>
```

区别是 `saving` 不再由页面手动在 `try/finally` 中切换，而是由 `useRequest` 根据请求生命周期维护。

### 4. useRequest 不等于 useEffect 的替代品

`useRequest` 适合处理异步请求，例如：

- 自动请求和手动请求；
- loading、data、error；
- 请求成功和失败回调；
- 刷新、取消、轮询等请求能力。

但下面这些仍然是 `useEffect` 更常见的职责：

- 添加和清理浏览器事件；
- 建立和关闭订阅；
- 同步第三方组件；
- 操作浏览器提供的外部 API。

也就是说，`useRequest` 是对“异步请求”这一类场景的封装，不是为了取代所有 Effect。

### 5. 为什么最后才学习 ahooks

如果一开始只记住 `useRequest` 的配置，却不理解 `useState` 和 `useEffect`，遇到请求重复、参数变化、组件卸载或闭包旧值时，仍然很难判断问题出在哪里。

更适合我的学习顺序是：

```text
先理解 React 内置 Hook
  ↓
在业务中观察重复逻辑
  ↓
尝试写一个职责清晰的自定义 Hook
  ↓
再学习 ahooks 如何沉淀通用场景
```

## 十一、我现在如何选择 Hook

写代码之前，可以先问下面几个问题：

### 1. 这个值需要被组件记住吗？

需要，并且改变后要更新页面，可以考虑 `useState`。

### 2. 这个值能不能从已有数据直接算出来？

可以就先直接计算。计算较复杂或者结果需要稳定引用时，再考虑 `useMemo`。

### 3. 这段代码是否在同步外部系统？

如果在处理请求时机、浏览器事件、订阅或第三方组件，可以考虑 `useEffect`，同时检查依赖和清理逻辑。

### 4. 我真的需要缓存这个函数吗？

如果函数要作为其他 Hook 的依赖，或者传给依赖稳定引用的子组件，可以考虑 `useCallback`。普通函数不需要默认缓存。

### 5. 这段带状态的逻辑是否重复出现？

如果多个组件都需要相同逻辑，可以考虑自定义 Hook；如果属于常见请求、节流、防抖等通用场景，也可以先了解 ahooks 是否已经提供了成熟实现。

## 十二、总结

通过真实业务重新观察后，我对这些 Hook 的理解可以归纳成：

```text
useState
保存组件需要记住的状态

useEffect
让组件和 React 外部的系统保持同步

useMemo
缓存由依赖计算出来的结果

useCallback
缓存函数引用

自定义 Hook
组合内置 Hook，复用项目中的状态逻辑

ahooks/useRequest
封装常见的异步请求状态和生命周期
```

学习 Hook 的重点不是记住更多 `useXxx`，而是先看清当前业务问题属于状态、计算、副作用、函数引用还是逻辑复用。问题分类清楚之后，Hook 的选择才会变得自然。

## 参考资料

- [React Hooks 总览](https://react.dev/reference/react/hooks)
- [React useState](https://react.dev/reference/react/useState)
- [React useEffect](https://react.dev/reference/react/useEffect)
- [React useMemo](https://react.dev/reference/react/useMemo)
- [React useCallback](https://react.dev/reference/react/useCallback)
- [React：使用自定义 Hook 复用逻辑](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [ahooks useRequest](https://ahooks.js.org/hooks/use-request/)
