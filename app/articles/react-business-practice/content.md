# 从三个业务需求学习 React：配方管理、采退订单与扣款单

这篇不是业务流程说明，而是一篇 React 学习总结。

我把生产底下的**配方管理**、**采退订单**、**扣款单管理**放在一起观察，是因为它们虽然业务名词不同，但前端通常都要面对相似的问题：列表查询、条件筛选、详情和编辑、异步枚举、动态表格、金额或数量计算、状态流转、附件与提交反馈。

> 当前仓库里可以直接核对的材料，主要是配方列表和详情页的真实 React 片段，以及围绕 `useEffect`、`useState`、`useMemo`、`useUrlParams` 的学习笔记。采退订单和扣款单的完整需求原文不在当前工作区，因此本文把共同模式写成学习抽象，不把未提供的业务细节当成事实。

---

## 一、先学会拆页面，而不是先堆组件

面对一个业务需求，第一反应不应该是“我要写几个组件”，而应该先把页面拆成几个状态和动作。

| 页面部分 | 需要先想清楚的问题 |
| --- | --- |
| 列表区 | 查询条件是什么？谁负责发请求？空数据和加载中怎么展示？ |
| 详情区 | 当前是新增、编辑还是只读？数据从 URL 还是父组件来？ |
| 明细表格 | 行数据由谁维护？新增、删除、批量修改如何更新？ |
| 操作区 | 保存、提交、撤回是否互斥？按钮权限和状态如何判断？ |
| 异步依赖 | 枚举、详情、供应商或物料数据谁先准备好？ |

这三个需求可以先抽象成一条相似的页面链路：

```text
页面参数
  ↓
读取查询条件 / 详情 ID
  ↓
准备枚举和基础数据
  ↓
请求列表或详情
  ↓
转换成页面需要的结构
  ↓
用户编辑、校验、保存或提交
  ↓
刷新数据并反馈结果
```

如果还没有想清楚这条链路，就直接把所有逻辑写进一个大组件，后面很容易出现“表格改了一行，整个页面都重新请求”的问题。

## 二、`useState`：只保存真正需要记住的状态

配方详情页的实际代码里，已经可以看到多种状态：步骤、供应商行、附件、当前状态、保存中、提交中，以及用于触发子组件校验的 `detailValidateTick`。

采退订单和扣款单也会遇到类似状态，但需要注意：**不是页面上出现的每个值都应该建一个 state**。

```tsx
const [saving, setSaving] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [rows, setRows] = useState<OrderRow[]>([]);

// 这是派生值，不需要再用一个 setIsBusy 维护
const isBusy = saving || submitting;
```

建议把状态分成三类：

1. **服务端数据**：详情、明细行、附件、关联对象。
2. **页面交互状态**：当前编辑行、弹窗是否打开、当前 Tab。
3. **异步操作状态**：加载中、保存中、提交中、错误信息。

不要把第三类状态和业务数据混在一起，也不要同时维护互相容易冲突的 `isBusy`、`saving`、`submitting`。状态越多，越要问一句：这个值是源数据，还是可以从已有状态直接算出来？

### 数组和对象要用不可变方式更新

明细表格是最容易犯错的地方。

```tsx
// 不要直接修改原数组
rows.push(newRow);
setRows(rows);

// 创建新数组，让 React 能识别引用变化
setRows((currentRows) => [...currentRows, newRow]);
```

编辑行对象时也一样：

```tsx
setRows((currentRows) =>
  currentRows.map((row) =>
    row.id === editingId ? { ...row, amount: nextAmount } : row,
  ),
);
```

### 异步按钮必须有清晰的状态边界

保存和提交通常不能同时进行。按钮状态应该从请求开始到结束完整覆盖：

```text
点击保存 → saving = true → 禁止重复操作 → 请求结束 → saving = false
```

这不是单纯的视觉 loading，而是页面状态机的一部分。扣款金额、采退数量这种重要数据尤其不能允许用户在重复点击后产生两次提交。

## 三、`useEffect`：用来同步外部系统，不是计算普通值

当前项目中最典型的例子来自配方列表：待办页面依赖的枚举准备好以后，才触发一次查询。

```tsx
useEffect(() => {
  if (isAll || !pendingEnumReady) return;
  instance.commitSearch?.();
}, [instance, isAll, pendingEnumReady]);
```

这段代码值得学习的不是“看到请求就用 `useEffect`”，而是它解决了一个明确的同步问题：

- `pendingEnumReady` 是异步外部数据是否准备好的信号；
- `commitSearch` 是 ProTable 暴露出的查询动作；
- `isAll` 用来避免全量列表的自动查询和手动查询重复发生。

执行时机可以理解成：

```text
第一次渲染
  ↓ pendingEnumReady = false
Effect 提前结束
  ↓ 枚举加载完成
pendingEnumReady = true
  ↓
重新执行 Effect，发起一次查询
```

### 使用 `useEffect` 前先问三个问题

1. 这段代码是不是在和请求、浏览器 API、定时器或第三方组件同步？
2. Effect 里读取了哪些 props、state 和函数？依赖数组是否完整？
3. 依赖改变后会不会重复请求？组件卸载或请求过期时要不要清理？

如果只是根据已有数据计算总金额、按钮文案或是否禁用，通常直接在 render 中计算即可，不要为了“数据变化后更新另一个 state”再套一层 Effect。

## 四、`useMemo`：缓存有理由缓存的计算结果

物料配置页面的实践里，先从枚举字典整理出 `enumCodes`，再根据详情和编码生成 `fields`：

```text
枚举字典 → enumCodes → fields → 表单配置
```

这类配置对象除了可能有计算成本，还可能需要保持引用稳定，避免下游表单组件误以为配置每次都变了。

```tsx
const fields = useMemo(
  () => getMaterialConfigFields(detail, enumCodes),
  [detail, enumCodes],
);
```

但 `useMemo` 不是“性能保险”。扣款单里计算一个简单的 `price * quantity`，直接写反而更清楚：

```tsx
const total = price * quantity;
```

学习重点是区分：

- `useState` 保存用户或请求改变的状态；
- `useMemo` 缓存由依赖计算出来的值；
- `useEffect` 同步 React 之外的系统。

如果把这三者混用，页面会出现更多同步关系，反而更难维护。

## 五、`useUrlParams`：把 URL 当成页面输入

详情页通常需要从 URL 获得 `id` 和 `mode`。当前项目的自定义 Hook 通过 `useLocation` 读取 `location.search`，再用 `URLSearchParams` 解析：

```tsx
const [id, mode] = useUrlParams("id", "mode");
```

这让页面知道“加载哪条数据”和“当前处于哪种模式”，但 URL 参数本质上都是外部输入，不能直接当成可信业务数据使用。

```tsx
const rawId = useUrlParams("id")[0];
const id = rawId ? Number(rawId) : undefined;

if (!id) {
  // 展示参数缺失或无效的页面状态
}
```

需要注意三件事：参数可能缺失、参数永远先以字符串存在、编辑和只读模式的权限仍然要由后端或页面权限规则确认。Hook 负责读取参数，不应该顺便承担请求、权限和业务跳转。

## 六、组件边界：按“谁拥有状态”来拆

这三个需求都很容易形成一个几百行的详情页。可以先按职责划分：

```text
业务页面
├─ SearchPanel / FilterForm
├─ DataTable
├─ DetailForm
├─ DetailItemsEditor
├─ AttachmentPanel
└─ ActionBar
```

拆分时最重要的不是组件数量，而是回答：

- 这份状态应该由父组件拥有，还是子组件自己拥有？
- 子组件需要的是完整对象，还是几个明确的字段和回调？
- 子组件是在展示数据，还是负责修改数据？
- 校验结果如何向上汇总？

例如，明细编辑器可以接收 `rows` 和 `onChange`，成为受控组件；弹窗内部临时输入则可以先由弹窗自己管理。边界清楚后，配方步骤、采退商品行、扣款明细行才有机会复用，而不是复制三份相似逻辑。

## 七、为什么旧项目里还会有 class component？

学习 React 时不要把 class component 简单理解成“错误代码”。它常见于旧项目和旧版组件库，生命周期方法也能完成请求、订阅和清理。

但新代码通常优先使用 function component + Hook，因为逻辑可以按关注点组合，状态和副作用也更容易抽成自定义 Hook。学习 class 的意义，是能读懂旧代码并完成迁移，而不是为了把所有旧页面一次性重写。

可以先建立这组对应关系：

| class component | function component |
| --- | --- |
| `this.state` | `useState` |
| `setState` | setter 函数 |
| `componentDidMount` | 依赖为空的 `useEffect`（但要先确认确实是副作用） |
| `componentDidUpdate` | 带依赖的 `useEffect` |
| `componentWillUnmount` | Effect 返回的清理函数 |

迁移时不要只做语法替换，要重新检查请求重复、闭包旧值、清理逻辑和依赖数组。

## 八、业务表单最容易漏掉的 React 细节

学习这三个需求时，可以把下面的检查清单带进每次 Review：

1. 列表首次查询是否会因为枚举或默认条件未准备好而发出错误请求？
2. 详情页的 `id` 缺失、非法或过期时，页面会怎么反馈？
3. 明细数组是否通过新引用更新，是否存在直接 `push` 或修改原对象？
4. 金额、数量、状态这些派生值是否被错误地复制成多个 state？
5. 保存和提交是否会重复点击，两个请求是否可能同时进行？
6. 请求返回顺序变化时，旧响应会不会覆盖新数据？
7. loading、error、empty、无权限和只读状态是否都有明确 UI？
8. 一个组件是否同时负责路由、请求、表单、表格、弹窗和权限？

这些问题比“用了几个 Hook”更能判断 React 是否真正学会了。

## 九、适合新人的学习顺序

可以按下面的顺序回看这三个需求：

1. 先用组件、props 和 state 画出列表页与详情页的状态图。
2. 用 `useState` 管理明细数组、编辑状态和异步操作状态。
3. 用 `useUrlParams` 处理详情 ID 和页面模式。
4. 用 `useEffect` 处理枚举、详情请求和第三方表格的同步边界。
5. 用 `useMemo` 优化复杂配置和需要稳定引用的值。
6. 最后再拆分组件，比较哪些逻辑可以沉淀成自定义 Hook。

## 一句话总结

> 从配方管理、采退订单和扣款单管理学习 React，重点不是记住更多 Hook，而是学会把业务页面拆成清晰的状态、数据流、副作用和组件边界：什么是源数据，什么是派生值，什么时候请求，谁拥有状态，以及一次用户操作最终如何安全地完成。

## 官方资料

- [React Hooks 总览](https://react.dev/reference/react/hooks)
- [useState](https://react.dev/reference/react/useState)
- [useEffect](https://react.dev/reference/react/useEffect)
- [useMemo](https://react.dev/reference/react/useMemo)
- [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
