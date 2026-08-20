# React hook

第一次在真实项目里看到下面这段代码时，我的感觉不是“这些 Hook 我都会”，而是：一个页面为什么需要记住这么多东西？

```tsx
const [readonlySteps, setReadonlySteps] = useState<RecipeStepView[]>([]);
const [supplierRows, setSupplierRows] = useState<SupplierTableRow[]>([]);
const [attachments, setAttachments] = useState<Attachment[]>([]);
const [detailValidateTick, setDetailValidateTick] = useState(0);
const [saving, setSaving] = useState(false);
const [submitting, setSubmitting] = useState(false);
```

这是一个生产配方详情页。它要展示配方步骤和供应商，支持附件上传，还要区分保存、提交和校验状态。页面继续往下读，还能看到 `useEffect`、`useMemo`、`useCallback`，以及我们自己封装的 `useUrlParams`。

如果只按 API 去记，它们似乎很好区分：

```text
useState    保存状态
useEffect   执行副作用
useMemo     缓存计算结果
useCallback 缓存函数
```

可真正困难的部分并不是背出这四句话，而是面对一个业务需求时判断：

- 哪些值真的需要成为状态？
- 一次查询为什么要等到某个时机才能发生？
- 哪些数据应该直接计算，哪些值得缓存？
- 一个函数为什么需要稳定，依赖又该怎么写？
- 什么时候应该把一段逻辑抽成自定义 Hook？
- 请求逻辑重复到什么程度，才值得交给 `useRequest`？

这篇文章不准备把所有 Hook 罗列一遍，而是从我接触过的配方管理和采退订单需求出发，沿着一个页面真正运行的顺序，重新理解 Hook 在业务代码中的分工。

> 示例保留了真实业务关系，但省略了与主题无关的接口字段、权限判断和组件库配置。

---

## 一、先别选 Hook，先看页面发生了什么

一个详情页从打开到保存，大致会经历下面这条链路：

```text
从 URL 读取 id 和 mode
  ↓
请求详情、枚举和关联数据
  ↓
把接口数据转换为表单和表格需要的结构
  ↓
用户编辑步骤、供应商和附件
  ↓
触发校验
  ↓
保存或提交
  ↓
返回列表，并通知列表刷新
```

如果把这条链路里的问题重新分类，会得到六种完全不同的职责：

| 业务问题 | React 中要处理的事情 |
| --- | --- |
| 页面要记住附件、行数据和操作状态 | 状态 |
| 枚举准备好后才能触发表格查询 | 外部同步 |
| 详情和枚举共同决定表单字段 | 派生计算 |
| 初始化、保存函数要被其他组件或 Hook 使用 | 函数引用 |
| 多个详情页都要读取 URL 参数 | 逻辑复用 |
| 每个请求都在重复维护 loading、data、error | 通用请求能力 |

这才是选择 Hook 的起点。

Hook 不是按照页面模块划分的，也不是“一个需求对应一个 Hook”。它更像一组组织组件逻辑的工具：状态归状态，同步归同步，计算归计算。页面复杂并不可怕，可怕的是这些职责混在一起之后互相驱动。

## 二、useState 的难点不是更新，而是决定什么值得保存

### 1. 先从最容易出错的写法开始

假设页面同时维护保存和提交状态：

```tsx
const [saving, setSaving] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [isBusy, setIsBusy] = useState(false);
```

看起来三个变量都很合理，但 `isBusy` 其实能由前两个状态直接得到：

```tsx
const isBusy = saving || submitting;
```

如果把它也存进 state，每次保存和提交都必须同步更新两份数据：

```tsx
setSaving(true);
setIsBusy(true);
```

只要某一个分支漏掉 `setIsBusy(false)`，页面就可能出现请求已经结束、按钮却仍然禁用的情况。

所以，`useState` 的第一个问题不是“初始值传什么”，而是：**这个值是否需要由组件独立记住？**

在配方详情页中，可以把状态大致分成三类：

```tsx
// 接口返回后，页面需要继续使用的业务数据
const [attachments, setAttachments] = useState<Attachment[]>([]);
const [supplierRows, setSupplierRows] = useState<SupplierTableRow[]>([]);

// 用户操作产生的页面状态
const [detailValidateTick, setDetailValidateTick] = useState(0);

// 异步操作的过程状态
const [saving, setSaving] = useState(false);
const [submitting, setSubmitting] = useState(false);
```

而 `isBusy`、总金额、按钮文案这一类能从现有数据计算出来的值，通常不需要再保存。

### 2. useState 的参数和返回值，放到业务里看

`useState` 的基本形式是：

```tsx
const [state, setState] = useState(initialState);
```

- `initialState` 只负责组件第一次挂载时的初始状态；
- `state` 是当前这次渲染看到的快照；
- `setState` 请求 React 使用新状态再渲染一次。

这也解释了一个初学时很容易困惑的现象：

```tsx
function handleSave() {
  setSaving(true);
  console.log(saving); // 这里仍然是当前渲染中的旧值
}
```

setter 并不会把当前函数里的变量原地改掉。组件重新执行之后，下一次渲染才会读到新的 `saving`。

与其把它笼统地记成“异步更新”，不如记住：**每次渲染拿到的是一份状态快照。**

### 3. 为什么校验次数要用函数式更新

配方详情页中有一个比较特别的状态：

```tsx
const [detailValidateTick, setDetailValidateTick] = useState(0);
```

它不是给用户展示的业务数字，而是一种“又触发了一次校验”的信号：

```tsx
setDetailValidateTick((value) => value + 1);
```

这里的新状态依赖上一次状态，因此使用 updater function。React 会把更新队列中最新的值传给 `value`，避免连续调用时一直基于同一张旧快照计算。

这段代码也值得进一步思考：数字信号可以工作，但它实际上在表达一个动作。如果未来校验关系继续变复杂，就应该重新检查父子组件之间是否有更清晰的调用或数据边界，而不是不断增加类似的 tick。

### 4. 表格行和附件为什么不能直接 push

下面的写法修改了原数组：

```tsx
attachments.push(newFile);
setAttachments(attachments);
```

更适合 React 状态的写法是创建新数组：

```tsx
setAttachments((currentAttachments) => [
  ...currentAttachments,
  newFile,
]);
```

编辑供应商行也是相同思路：

```tsx
setSupplierRows((currentRows) =>
  currentRows.map((row) =>
    row.id === editingId
      ? { ...row, supplierName: nextSupplierName }
      : row,
  ),
);
```

state 应该被当作当前渲染的只读快照。创建新数组和新对象，不只是为了让 React 看到引用变化，也能避免旧状态在其他逻辑中被悄悄修改。

到这里，`useState` 可以总结成一个比“保存状态”更具体的判断：

> 保存页面必须独立记住的最小信息，其余内容尽量由这些信息计算出来。

## 三、useEffect 不是“页面加载后执行”，而是一次同步约定

在配方列表需求里，待办列表查询有一个前置条件：业务枚举必须先准备完成。

如果第一次渲染就查询，固定条件还没有生成；如果枚举变化后随意查询，又可能和全量列表的自动请求重复。

项目中的处理方式是：

```tsx
useEffect(() => {
  if (isAll || !pendingEnumReady) return;
  instance.commitSearch?.();
}, [instance, isAll, pendingEnumReady]);
```

这段代码真正描述的是一条同步规则：

```text
当 pendingEnumReady 变为 true
并且当前不是全量列表时
让 ProTable 按最新条件发起查询
```

### 1. 两个参数分别承担什么

```tsx
useEffect(setup, dependencies);
```

- `setup` 描述如何与外部系统建立或重新建立同步；
- `dependencies` 描述这次同步依赖了哪些当前渲染中的响应式值；
- 如果 setup 建立了订阅、监听或连接，可以返回 cleanup 清理旧同步关系。

回到项目代码：

```tsx
useEffect(() => {
  if (isAll || !pendingEnumReady) return;
  instance.commitSearch?.();
}, [instance, isAll, pendingEnumReady]);
```

setup 读取了 `instance`、`isAll` 和 `pendingEnumReady`，所以依赖数组也对应这三个值。这不是为了控制“执行几次”，而是确保其中任意一个参与同步的条件变化后，Effect 都能用最新值重新判断。

### 2. 为什么不能把查询直接写在 render 中

如果在组件函数执行时直接调用：

```tsx
if (!isAll && pendingEnumReady) {
  instance.commitSearch?.();
}
```

查询可能引起状态变化，状态变化又触发渲染，渲染再次发起查询，最终形成不可控的循环。

渲染阶段应该负责根据输入计算 JSX；让第三方表格执行查询属于 React 之外的动作，应放在提交渲染后的同步阶段处理。

### 3. 不是所有数据变化都需要 Effect

下面这种写法经常让页面多维护一次无意义的同步：

```tsx
const [totalAmount, setTotalAmount] = useState(0);

useEffect(() => {
  setTotalAmount(price * quantity);
}, [price, quantity]);
```

`totalAmount` 完全可以在渲染时得到：

```tsx
const totalAmount = price * quantity;
```

一个很实用的判断是：

- 请求、订阅、定时器、浏览器 API、第三方组件，通常属于外部同步；
- 根据 props 和 state 计算一个值，通常不需要 Effect。

开发环境开启 Strict Mode 时，React 还可能额外执行一次 setup 和 cleanup，用来检查清理是否完整。因此 Effect 必须能够被安全地重新建立，而不能依赖“它绝对只运行一次”的侥幸。

## 四、useMemo 和 useCallback：先证明有必要，再缓存

`useMemo` 和 `useCallback` 很容易给人一种“加上就能优化”的感觉。实际项目里，它们更值得回答的问题是：**这里为什么需要稳定？**

### 1. useMemo：缓存的是一段派生关系

物料配置页面需要先整理枚举，再生成表单字段：

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

它们的关系是：

```text
enumData ──→ enumCodes ──┐
                         ├─→ fields ──→ 表单组件
detail ──────────────────┘
```

`useMemo(calculateValue, dependencies)` 返回计算结果。依赖不变时，React 可以复用上一次结果；依赖变化时重新计算。

在这个例子中，`fields` 是一组表单配置对象。生成过程有一定转换逻辑，下游组件也可能关注配置引用是否变化，所以缓存有明确理由。

但下面这种简单计算不值得为了“看起来性能更好”而增加 Hook：

```tsx
const total = useMemo(() => price * quantity, [price, quantity]);
```

直接写反而更清楚：

```tsx
const total = price * quantity;
```

`useMemo` 是优化手段，不应该成为业务正确性的基础。

### 2. useCallback：缓存的是函数身份，不是执行结果

采退订单初始化详情时，项目会把异步函数交给表单后续调用：

```tsx
const getInitialValues = useCallback(async () => {
  if (mode === "edit" && orderNo) {
    return returnOrderService.getDetail(orderNo);
  }

  return createInitialValues(bizNo);
}, [mode, bizNo, orderNo]);
```

`useCallback(fn, dependencies)` 返回的是函数本身。它不会在声明时自动请求，也不会缓存接口返回的数据。

依赖数组要关注函数从外部闭包读取了什么。这里读取了 `mode`、`bizNo` 和 `orderNo`，漏掉其中一个，就可能让函数继续使用旧渲染中的值。

保存采退单时也是一样：

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

`values` 是调用时传入的函数参数，不属于闭包依赖；`mode` 和 `returnPath` 来自函数外部，会影响下一次调用的行为，因此需要进入依赖数组。

### 3. 两个 Hook 的边界

```text
useMemo
缓存“执行函数得到的值”

useCallback
缓存“函数引用本身”
```

但并不是每个对象都要 `useMemo`，每个事件函数都要 `useCallback`。只有计算确实昂贵、引用稳定影响下游渲染，或者函数需要作为其他 Hook 的依赖时，缓存才有实际意义。

## 五、自定义 Hook 不是换个文件，而是给一段行为命名

多个详情页都要从 URL 读取 `id` 和 `mode`。如果每个页面都重复解析，可以把这段行为封装起来：

```tsx
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

调用方只需要描述自己要什么：

```tsx
const [id, mode] = useUrlParams("id", "mode");
```

这段封装的价值不是少写几行 `URLSearchParams`，而是把一个项目概念命名出来：**当前页面需要读取哪些 URL 输入。**

### 1. 为什么它是 Hook，而不是普通函数

`useUrlParams` 内部调用了 `useLocation` 和 `useMemo`，会响应路由变化，也必须遵守 Hook 的调用规则。

如果一个函数只是接收 `location.search` 字符串并完成解析，没有调用任何 Hook，它就应该是普通工具函数，而不是为了看起来统一而使用 `use` 前缀。

### 2. 自定义 Hook 应该停在哪里

`useUrlParams` 负责：

- 读取当前地址；
- 解析 query；
- 按传入顺序返回参数。

它不负责：

- 根据 ID 请求详情；
- 判断用户有没有编辑权限；
- 保存表单；
- 决定保存后跳到哪里。

自定义 Hook 如果一次封装了路由、请求、权限和跳转，看起来调用方便，实际上会让多个变化原因被绑在一起。好的抽象不是能力越多越好，而是边界足够清楚。

还要注意，URL 参数首先都是字符串：

```tsx
const [rawId] = useUrlParams("id");
const id = rawId ? Number(rawId) : undefined;
```

参数转换和业务合法性校验，仍然应该由了解业务语义的调用方处理。

## 六、从自定义 Hook 再往前一步：为什么会需要 useRequest

前面的案例来自当前项目已有实现。下面这一部分是延伸思考：当多个页面都在重复处理请求生命周期时，可以怎样使用 ahooks 的 `useRequest`。

先看一段很常见的请求代码：

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

这段代码本身没有问题。但当第十个页面又出现相同的 `data`、`loading`、`error`、取消和刷新逻辑时，项目其实已经在重复描述同一种请求状态机。

### 1. useRequest 帮我们接管了什么

按照 ahooks 3.x 的用法，`useRequest` 接收一个返回 Promise 的 service：

```tsx
const { data, error, loading } = useRequest(service);
```

默认情况下会在初始化时执行；如果请求必须由用户操作触发，可以使用手动模式：

```tsx
const {
  run,
  runAsync,
  loading,
} = useRequest(service, {
  manual: true,
});
```

- `run` 触发请求，错误交给配置中的生命周期处理；
- `runAsync` 返回 Promise，适合在调用处继续 `await`；
- `loading` 跟随请求过程变化。

### 2. 放进保存配方的场景

原本页面手动维护：

```tsx
const [saving, setSaving] = useState(false);
```

如果项目决定使用 `useRequest`，可以把请求和 loading 绑定在一起：

```tsx
const {
  runAsync: saveRecipe,
  loading: saving,
} = useRequest(
  (values: RecipeFormValues) => recipeService.save(values),
  { manual: true },
);

async function handleSave(values: RecipeFormValues) {
  await saveRecipe(values);
  message.success("保存成功");
}
```

按钮仍然只关心业务状态：

```tsx
<Button loading={saving} onClick={handleSave}>
  保存
</Button>
```

变化在于，页面不再自己维护 `try/finally` 中的 loading 切换。

### 3. useRequest 不是 useEffect 的升级版

`useRequest` 主要抽象异步请求：

- 请求数据和加载状态；
- 手动执行与重新执行；
- 成功、失败和取消；
- 轮询、依赖刷新等请求策略。

而浏览器事件、定时器、BroadcastChannel 订阅、第三方组件同步，仍然是 Effect 处理的外部系统问题。

工具的层级不同：

```text
useEffect
React 提供的通用外部同步机制

useRequest
建立在 Hook 之上的请求场景封装
```

先理解前者，才能在后者出现重复请求、参数变化或闭包旧值时知道应该检查哪里。

## 七、回头看：一页业务代码其实在表达六种关系

现在重新看最开始的详情页，它不再只是“用了很多 Hook”：

```text
useState
页面必须独立记住什么

useEffect
页面要和哪个外部系统、在什么条件下同步

useMemo
哪些结果由现有数据推导，并且值得缓存

useCallback
哪个函数的身份需要稳定，它捕获了哪些外部值

自定义 Hook
项目中哪段带有 React 状态的行为值得命名和复用

useRequest
哪些重复的请求状态可以交给更高层的通用抽象
```

我现在 Review 一段 Hook 代码时，会依次问下面几个问题：

1. 这个 state 是源数据，还是能直接计算出来的派生值？
2. 这个 Effect 到底在同步哪个外部系统？如果没有外部系统，它是否根本不需要存在？
3. Effect、Memo、Callback 中读取的响应式值是否都进入了依赖数组？
4. 这里缓存对象或函数，是有实际下游需求，还是出于习惯？
5. 自定义 Hook 封装的是一个清晰概念，还是把几个无关步骤藏进了一个函数？
6. 引入第三方 Hook 后，代码是否真的更清楚，团队是否仍然理解它隐藏的生命周期？

## 结语

学习 Hook 最容易走进的误区，是把目标变成“认识更多 `useXxx`”。真实项目让我逐渐意识到，Hook 的价值不在数量，而在于帮助我们把页面中的不同关系分开：

- 状态负责记忆；
- 渲染负责计算；
- Effect 负责同步；
- Memo 和 Callback 只在有理由时缓存；
- 自定义 Hook 给可复用行为建立边界；
- `useRequest` 这类社区 Hook 再把成熟的通用场景向上抽象一层。

当这些关系被分清楚，一个页面即使同时出现多个 Hook，也不再是一串零散 API，而是一条可以追踪、可以解释的业务数据流。

## 参考资料

- [React Hooks 总览](https://react.dev/reference/react/hooks)
- [React：选择 State 结构](https://react.dev/learn/choosing-the-state-structure)
- [React：State 如同一张快照](https://react.dev/learn/state-as-a-snapshot)
- [React useEffect](https://react.dev/reference/react/useEffect)
- [React useMemo](https://react.dev/reference/react/useMemo)
- [React useCallback](https://react.dev/reference/react/useCallback)
- [React：使用自定义 Hook 复用逻辑](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [ahooks useRequest](https://ahooks.js.org/hooks/use-request/)
