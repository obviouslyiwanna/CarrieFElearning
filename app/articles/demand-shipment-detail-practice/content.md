# 从要货单与发货单详情，学习复杂 React 页面的组织方式

要货单详情和发货单详情乍看很像：都有状态、物料、流程记录、底部操作和多个弹窗。最直接的实现方式，似乎是复制一个页面再改字段。

但当两个页面真正串起来之后，问题会立刻变复杂：

- 要货单里可以查看关联发货单；
- 发货单里又可以回看关联要货单；
- 独立页面从 URL 取单号，嵌入弹窗时则从 props 取单号；
- 页面展示不仅依赖详情接口，还依赖流程记录、字典、调整单和关联单据；
- 不同状态决定不同按钮，按钮提交成功后还要重新加载详情；
- 后端尚未准备好时，又需要可切换状态的 mock 来检查页面。

这次需求值得学习的地方，不是某一个 Hook 的写法，而是：**如何把一个复杂详情页拆成输入、请求编排、数据适配、页面状态、展示组件和业务动作，并让两个页面可以互相复用而不互相污染。**

> 文中的代码根据 `purchase-app` 当前实现做了裁剪，只保留与主题相关的部分。mock 用于页面状态和视觉检查，不代表真实接口已经验证。

---

## 一、先画清页面的数据流，再开始拆组件

这两个页面可以先抽象成同一条链路：

```text
URL 参数 / 嵌入 props
  ↓
页面决定本次加载的单号和运行模式
  ↓
service 编排多个接口
  ↓
adapter 把 DTO 转成页面模型
  ↓
页面保存业务数据与交互状态
  ↓
展示组件按模型渲染
  ↓
用户触发审核、取消、异议或差异处理
  ↓
提交成功后重新加载详情
```

沿着这条链路看，两个需求中的职责并不相同：

| 层次 | 负责什么 | 不应该负责什么 |
| --- | --- | --- |
| 页面入口 | 读取参数、选择独立或嵌入模式 | 猜测后端字段含义 |
| service | 组织请求顺序、组装提交参数 | 拼展示文案和 JSX |
| adapter | DTO 转页面模型、容错和格式化 | 发请求、控制弹窗 |
| 页面组件 | 保存详情、loading、错误和当前弹窗 | 重复实现字段映射 |
| 展示组件 | 根据明确的 props 渲染 | 私自修改页面级业务数据 |
| 操作组件 | 根据状态生成按钮并提交动作 | 自己复制一份详情状态 |

先分清这些职责，后面选择 `useState`、`useEffect` 或 `useCallback` 才有依据。

## 二、一个详情页通常不是一个请求

发货单详情需要同时读取详情、流程记录和调整单。三者互不依赖，因此可以并行：

```ts
const [detailRes, streamLogs, adjustmentDetails] = await Promise.all([
  service.getShipmentOrderDetailApi(requestParams),
  service.getShipmentStreamLogApi(requestParams),
  service.getShipmentAdjustmentDetailApi(requestParams),
]);
```

关联要货单则不同：只有拿到发货单详情里的 `fulfillmentNo` 后，才知道要查询哪一张要货单，所以它位于第二阶段：

```ts
const demandDetailRes = detailRes.fulfillmentNo
  ? await service.getDemandOrderDetailApi({
      demandNo: detailRes.fulfillmentNo,
      supplierCode: detailRes.supplierCode,
    })
  : undefined;
```

这里可以学到一个很实用的判断：

- **互不依赖的请求并行**，减少等待时间；
- **依赖前一个结果的请求串行**，不要为了全部塞进 `Promise.all` 而制造空参数或重复请求；
- 页面只调用一个 `getShipmentDetail`，不需要知道背后有几个接口。

要货单详情也采用相同思路，将详情和操作日志并行获取：

```ts
const [detailRes, operateLogs] = await Promise.all([
  service.getDemandOrderDetailApi(requestParams),
  service.getDemandOperateLog(requestParams),
]);

return adaptDemandOrderDetail(
  detailRes,
  adaptDemandProcessRecords(operateLogs),
);
```

这让页面面对的是一个完整的 `DemandOrderDetail`，而不是先渲染半份详情，再等待日志回来补第二份状态。

## 三、adapter 是接口世界与 UI 世界的边界

接口 DTO 的目标是表达后端数据，页面模型的目标是让组件容易、安全地渲染。两者不应该被当成同一个东西。

例如要货单 adapter 会完成这些工作：

```ts
return {
  status: res.displayStatusCode,
  statusText: res.displayStatusDesc,
  statusDescription:
    res.displayStatusCode === "WAIT_DOUBT"
      ? res.latestDoubtDesc
      : undefined,
  requiredArrivalDate: formatDate(res.expectArrivalDate) || "-",
  cancelReasonName: res.cancelReasonName,
  cancelRemark: res.cancelRemark,
  shipmentRecords: mapShipments(res),
};
```

这里有三个值得记住的原则。

### 1. 后端给展示值，前端优先展示它

`displayStatusDesc` 已经是后端给出的展示文案，前端不应该再根据 code 重新发明一套文案。否则后端调整含义时，页面会悄悄显示旧内容。

### 2. 独立字段保持独立

取消原因和取消备注是两个字段。adapter 原样保留，组件只在展示时决定是否添加分隔符。不要为了少传一个字段，把它们提前拼成带特殊字符的字符串。

### 3. 数组顺序和记录数量也是数据

要货单中的发货记录来自 `items[].shipments[]`。adapter 依次 `push` 到数组，保留接口顺序和重复记录；它只跳过没有 `shipmentNo`、无法满足页面模型主键要求的项。没有产品规则时，不应擅自排序或去重。

### 在边界处消化不稳定数据

发货流程记录的接口数据可能既包含对象，也包含 JSON 字符串。最合适的处理位置不是 JSX，而是 adapter：

```ts
const parseShipmentStreamLog = (record: Log | string) => {
  if (typeof record !== "string") return record;

  try {
    const parsed = JSON.parse(record);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed as Log;
  } catch {
    return undefined;
  }
};
```

组件最终只处理统一的 `ShipmentProcessRecord[]`。这种“在边界处收敛复杂度”的方式，比每个组件都写一次 `typeof` 和 `JSON.parse` 更可靠。

## 四、复用完整页面，而不是复制业务逻辑

要货单需要在弹窗里打开发货单详情，发货单也需要在弹窗里打开要货单详情。如果重新复制一套“弹窗版详情”，以后任何字段、状态或交互调整都要改两次。

当前实现让同一个页面支持两种输入：

```tsx
interface ShipmentOrderInfoPageProps {
  embedded?: boolean;
  shipOrderNo?: string;
}

const ShipmentOrderInfoPage = ({
  embedded = false,
  shipOrderNo: shipOrderNoProp,
}: ShipmentOrderInfoPageProps) => {
  const { params } = useRouter();
  const shipOrderNo = shipOrderNoProp || params.shipOrderNo || params.id;
};
```

输入优先级很明确：

```text
显式 props > 路由参数 > 可选的 mock 默认值
```

弹窗只负责提供单号和嵌入模式：

```tsx
<ShipmentOrderInfoPage
  embedded
  shipOrderNo={record.shipmentNo}
/>
```

页面自身再根据 `embedded` 收缩能力：

- 独立页面设置导航栏标题，展示底部操作；
- 嵌入页面不重复设置标题，不展示会改变主单据的操作；
- 两种模式共用详情请求、adapter 和全部展示组件。

这是一种比“抽几个卡片组件”更完整的复用。真正被复用的是整条业务链，而不是几块外观相同的 JSX。

## 五、生命周期要服从运行场景

在 Taro 页面中，用户从其他页面返回时也可能需要刷新，因此独立页面使用 `useDidShow` 加载：

```tsx
useDidShow(() => {
  if (!embedded) {
    Taro.setNavigationBarTitle({ title: "发货单详情" });
    loadDetail();
  }
});
```

嵌入弹窗中的组件不是独立页面，不应该依赖页面重新显示事件，因此使用 React effect 响应 props：

```tsx
useEffect(() => {
  if (embedded) loadDetail();
}, [embedded, loadDetail]);
```

这说明 `useEffect` 不是“组件加载时请求接口”的固定模板。先问外部系统是什么：

- Taro 页面显示事件发生时同步，用 `useDidShow`；
- 嵌入组件的输入变化时同步，用 `useEffect`；
- `loadDetail` 读取了单号、供应商和 mock 状态，因此这些值必须进入 `useCallback` 的依赖。

## 六、把业务状态当成状态机，而不是一组布尔值

要货单和发货单的按钮都由状态决定。如果在 JSX 中散落大量判断，很容易出现“按钮显示了，但提交函数又不允许”的冲突。

发货单把状态与动作集中到一个纯函数中：

```ts
switch (detail.status) {
  case ShipmentOrderStatus.PENDING_AUDIT:
    return {
      primaryActions: [
        { key: "reject-ship", text: "拒绝发货" },
        { key: "approve-ship", text: "准许发货" },
      ],
    };

  case ShipmentOrderStatus.PENDING_DISCREPANCY:
    return {
      primaryActions: [
        { key: "handle-discrepancy", text: "差异处理" },
      ],
    };

  default:
    return { primaryActions: [] };
}
```

这比维护 `canApprove`、`canReject`、`canHandleDiscrepancy` 三份状态更安全，因为这些能力本来就是详情状态的派生值，不需要再放进 `useState`。

同时，提交函数仍然保留状态校验：

```ts
if (!CANCELLABLE_STATUSES.includes(detail.status)) {
  Toast.fail({ message: "当前状态不可取消要货" });
  return;
}
```

两层判断不是重复：

- 动作映射负责正常路径中的 UI 展示；
- 提交前校验负责防止旧页面、重复点击或状态已变化时继续提交。

UI 权限只能改善交互，真正的业务约束还必须由提交前校验和后端共同保证。

## 七、异步操作要形成闭环

一个可靠的业务动作不是“点击后调接口”，而是一个完整闭环：

```text
检查当前状态
  ↓
进入 submitting，阻止重复提交
  ↓
组装后端需要的 payload
  ↓
请求成功：关闭弹窗、提示成功、重新加载详情
  ↓
请求失败：保留弹窗和用户输入，允许重试
  ↓
finally 恢复 submitting
```

发货审核中的关键结构如下：

```ts
if (auditSubmitting) return false;

setAuditSubmitting(true);
try {
  await service.auditShipmentOrderApi(payload);
  Toast.success({ message: "已准许发货" });
  onRefresh?.();
  return true;
} catch {
  return false;
} finally {
  setAuditSubmitting(false);
}
```

这里的 `onRefresh` 很重要。提交接口只表示动作成功，页面最终展示什么状态仍应重新向详情接口获取。前端不需要自己推演“审核通过后一定进入哪个状态”，后端才是状态流转的权威来源。

弹窗关闭也依赖提交结果：拒绝发货成功才关闭，失败时保留原因文本。这比在点击按钮时立即关闭弹窗更利于重试。

## 八、页面状态、弹窗状态和派生值要分开

要货单页面维护的状态大致可以分为三类：

```tsx
// 服务端业务数据
const [detail, setDetail] = useState<DemandOrderDetail>();
const [doubtDetail, setDoubtDetail] = useState<DemandDoubtDetail>();

// 页面交互状态
const [popup, setPopup] = useState<PopupType>(null);
const [selectedShipment, setSelectedShipment] = useState<ShipmentRecord>();

// 异步过程状态
const [loading, setLoading] = useState(true);
const [doubtLoading, setDoubtLoading] = useState(false);
```

`PopupType` 使用联合类型：

```ts
type PopupType = "related" | "cancel" | "dispute" | "complete" | null;
```

它表达了这些弹窗在同一时间只会打开一个，比维护四个可能互相冲突的 boolean 更贴近真实业务状态。

弹窗内部的输入则由弹窗自己管理。例如取消原因和取消说明只是尚未提交的临时状态，关闭弹窗时清空：

```tsx
useEffect(() => {
  if (!visible) {
    setReasonId("");
    setDescription("");
  }
}, [visible]);
```

另一方面，按钮列表、是否有底栏、日期差值、数量差值都能从现有数据直接得到，它们是派生值，不应该再建立一份 state 去同步。

## 九、场景 mock 也要走真实数据链

复杂状态页只准备一份静态 mock，很难检查待审核、运输中、待处理差异、已完成等分支。当前实现把 mock 状态做成受类型约束的场景输入：

```ts
export const DEMAND_MOCK_STATUSES = [
  "CREATED",
  "WAIT_DOUBT",
  "SHIPPING",
  "COMPLETED",
  "CANCELLED",
] as const;

export type DemandMockStatus =
  (typeof DEMAND_MOCK_STATUSES)[number];
```

页面可以从 props 或路由参数读取场景，service 在最外层选择数据源：

```ts
if (params.mockStatus) {
  return getMockDemandOrderDetail(params.mockStatus, params.demandNo);
}
```

更关键的是，mock 先构造接口形状的 DTO，再调用真实 adapter：

```ts
return adaptDemandOrderDetail(
  getMockDemandOrderDetailRes(status, demandNo),
  adaptDemandProcessRecords(getMockDemandOperateLogs(status)),
);
```

这样做有三个好处：

1. mock 和真实接口共用字段转换规则；
2. adapter 改动后，mock 页面能暴露不兼容问题；
3. 组件始终只认识同一种页面模型。

同时要避免“半 mock”：页面走本地详情，却仍然请求远程字典或真的提交审核。当前发货单通过 `enabled = !mock` 关闭字典请求，并在 mock 模式跳过写接口。

但也要明确边界：这种 mock 主要验证状态分支、布局和弹窗，不会真的推进后端状态。点击成功后重新加载，仍然会回到路由指定的同一个 mock 场景。它不是端到端联调的替代品。

## 十、字段存在与业务成立不是一回事

异议弹窗中有一个很典型的问题：

- `arrivalDateDoubtFlag` 决定是否存在“到货日期异议”这个业务区块；
- `doubtExpectArrivalDate` 决定区块里是否有供应商建议日期；
- 建议日期缺失，不代表整个异议区块应该消失。

adapter 先把接口语义翻译成清晰模型：

```ts
{
  requiredArrivalDate: formatDate(res.expectArrivalDate),
  expectedArrivalDate: formatDate(res.doubtExpectArrivalDate),
  hasArrivalDateDoubt: res.arrivalDateDoubtFlag === 1,
  hasQuantityDoubt: res.quantityDoubtFlag === 1,
}
```

组件再按“业务标志控制区块、可选值控制局部内容”的方式渲染。这比简单写成 `expectedArrivalDate && <Section />` 更符合接口含义。

这类问题提醒我们：TypeScript 只能告诉你一个字段是否可选，不能替你决定它在业务中的控制关系。字段语义仍然需要对照 DTO、接口说明和调用方确认。

## 十一、可以复用到其他详情页的检查清单

以后再做复杂详情页，可以按下面的顺序检查：

1. 页面输入来自 URL、父组件，还是两者都支持？优先级是否明确？
2. 哪些请求互不依赖可以并行，哪些必须等待前一个结果？
3. DTO 是否在 adapter 层统一转换成页面模型？
4. 后端提供的展示字段、数组顺序和独立字段是否被原样保留？
5. 页面 state 中是否混入了可以直接计算的派生值？
6. 状态与按钮的关系是否集中表达，而不是散落在 JSX 中？
7. 提交动作是否具备防重、失败保留现场和成功回源刷新？
8. 弹窗临时输入是否由弹窗拥有，并在关闭时正确重置？
9. 嵌入模式是否真正复用完整页面，并关闭不适合的页面级能力？
10. mock 是否复用真实 adapter，且不会误请求真实字典或写接口？

## 总结

要货单与发货单详情真正值得学习的，不是“用了多少个 Hook”，而是建立了一条可以解释、可以复用、也可以验证的数据流：

> 输入决定加载目标，service 编排请求，adapter 收敛接口差异，页面拥有业务与交互状态，组件根据模型展示，动作成功后再回到后端详情。

当这条链路清楚以后，`useState` 只保存需要记住的值，`useEffect` 只同步外部输入，`useCallback` 维护异步动作边界，页面复用和场景 mock 也会自然很多。

## 对照源码

- `purchase-app/src/pages/package/demand-order/info/index.tsx`
- `purchase-app/src/pages/package/demand-order/info/adapt/service.ts`
- `purchase-app/src/pages/package/demand-order/info/adapt/adapt-demand-order.ts`
- `purchase-app/src/pages/package/demand-order/info/components/detail-popups/index.tsx`
- `purchase-app/src/pages/package/shipment-order/info/index.tsx`
- `purchase-app/src/pages/package/shipment-order/info/adapt/service.ts`
- `purchase-app/src/pages/package/shipment-order/info/adapt/adapt-detail.ts`
- `purchase-app/src/pages/package/shipment-order/info/components/hooks/use-shipment-actions.ts`
- `purchase-app/src/pages/package/shipment-order/info/components/bottom-action/index.tsx`

