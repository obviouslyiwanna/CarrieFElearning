# H5 要货单与发货单详情：需求回顾与 React 工程档案

项目使用 React 18、Taro 3 和 TypeScript，页面组件来自 Taro、GuDesign 与项目内的 `cp-purchase-ui`。因此它既是一个 React 业务页面，也是一个移动端跨端页面：React 负责状态和组件组合，Taro 提供路由与页面生命周期，组件库解决 H5 上的弹窗、底栏、复制、长文本、下拉刷新等交互。

---

## 一、业务背景：两张单据，其实是一条履约链

从页面字段和接口关系看，这两个需求位于同一条采购履约链上：

```text
采购订单 / 要货计划
        ↓
      要货单
        ↓ 允许一次或多次发货
      发货单
        ↓
运输、到货、入库
        ↓
入库差异处理 / 完成
```

要货单回答的是“需要什么、送到哪里、什么时候到、已经发了多少”；发货单回答的是“这一次实际发了什么、怎么运输、实际收了多少、是否有差异”。

所以两个详情不能各自成为信息孤岛：

- 要货详情需要看到发货次数和每一张关联发货单；
- 发货详情需要回看关联要货单，补齐要求到货日期、可发货次数和物料要货单位；
- 单据状态不只是展示文案，还决定取消、处理异议、完成、审核和差异处理等操作；
- H5 页面既可能作为独立路由打开，也可能嵌入另一个详情页的底部弹窗。

真正的难点因此不是“把字段摆出来”，而是让**单据关系、接口数据、页面状态和业务操作始终使用同一套可信数据流。**

## 二、整体需求：两个详情各自承担什么

### 要货单详情

| 模块 | 主要内容 | 交互 |
| --- | --- | --- |
| 单据头 | 要货单号、创建人、供应商、关联订单、来源单据、要货计划 | 复制单号、查看关联订单 |
| 要货信息 | 要货仓、要求到货日期、发货方式 | 完整展示仓库名 |
| 要货需求 | 物料、箱规、要货单位、要货量、入库量、入库比例 | 超额入库提示 |
| 提货信息 | 提货点与地址 | 信息展示 |
| 发货记录 | 可发货次数、已发次数、发货单状态和到货日期 | 打开关联发货详情 |
| 流程记录 | 操作名称、时间、操作人、备注 | 底部弹窗、长文本展开 |
| 底部动作 | 取消要货、处理异议、完成要货 | 表单校验、提交、成功后刷新 |

### 发货单详情

| 模块 | 主要内容 | 交互 |
| --- | --- | --- |
| 单据头 | 发货单号、创建信息、承运方式、供应商、关联要货单 | 复制单号、查看关联要货单 |
| 到货信息 | 要货仓、预计到货、实际到货、状态与原因 | 流程记录、风险提示 |
| 发货物料 | 计划发货量、实际发货量、实际入库量、赠品、批次 | 展开批次明细 |
| 差异记录 | 原始入库量、调整后入库量、调整差值、赠品数量 | 已处理结果展示 |
| 运输信息 | 发货地址、收货地址、车辆、司机或物流单号 | 按运输方式展示 |
| 底部动作 | 准许/拒绝发货、处理入库差异 | 动态字典、数量校验、提交后刷新 |

两个页面还有三个共同约束：

1. 独立页面可操作、可下拉刷新；嵌入模式只读，避免在关联弹窗里继续打开新弹窗或修改单据。
2. 页面展示以真实接口 DTO 为来源，写操作使用真实业务编号，不能把 `-`、数组下标或展示兜底值提交给后端。
3. 操作成功后重新读取详情，不在前端自行猜测下一状态。

## 三、我们做了什么：从占位代码走到真实业务页

从 Git 演进看，这个需求不是一次性写完的，而是经历了几个阶段。

| 阶段 | 发生的事情 | 得到的经验 |
| --- | --- | --- |
| 占位阶段 | 最初为了快速建立路由，从既有合同详情结构复制出占位页面 | 复制可以解决“先有入口”，但复制来的字段、状态和组件不能直接代表新业务 |
| 要货详情成型 | 建立要货模型、详情适配、取消原因、异议处理、发货记录和流程记录 | 先把业务模型与接口模型分开，再拆展示组件 |
| 发货详情成型 | 重写发货模型，加入物料批次、运输、审核、差异处理和动态字典 | 操作复杂度高时，让底栏组件拥有自己的弹窗与提交状态 |
| 双向关联 | 要货里嵌入发货详情，发货里嵌入要货详情，并增加 `embedded/readOnly` | 复用整条详情链，避免维护“页面版”和“弹窗版”两套代码 |
| 接口对齐 | 调整字段、状态、供应商参数、操作日志、调整单与差异数量计算 | DTO 必须以接口契约为准，展示模型只在 adapter 中生成 |
| 去除 mock | 删除两套 `adapt/mock.ts` 和所有 mock 操作分支 | mock 完成视觉验证使命后应退出生产链路，避免真假请求混用 |
| H5 收尾 | 接入 `PullRefresh`，统一三行长文本、完整仓库名、状态原因和细节样式 | 移动端详情还要处理刷新、底栏安全区、长文案与真实数据长度 |

这段演进很值得保留：**原型不是错误，长期让原型结构冒充业务结构才是问题。** 我们没有继续在合同详情的变量名和组件上打补丁，而是逐步替换成要货/发货自己的领域模型和组件。

## 四、最终代码是怎样分层的

两个模块虽然业务不同，但都遵循相似的目录边界：

```text
src/service/
  demand-order/
    index.ts                 # 原始接口定义
    type.ts                  # 接口请求/响应 DTO
  shipment-order/
    index.ts
    type.ts

src/pages/package/demand-order/
  model.ts                   # 要货页面模型与状态元数据
  info/
    index.tsx                # 页面编排与交互状态
    adapt/
      service.ts             # 页面需要的请求编排
      adapt-demand-order.ts  # DTO → 页面模型
    components/              # 业务区块与弹窗

src/pages/package/shipment-order/info/
  index.tsx
  constants.ts               # 稳定业务 code
  model.ts                   # 发货页面模型
  adapt/
    service.ts
    adapt-detail.ts
  components/
    bottom-action/
    discrepancy-popup/
    hooks/
    ...
```

每一层回答不同问题：

| 层 | 回答的问题 | 不应该做的事 |
| --- | --- | --- |
| `service/*` | 请求哪个 URL，参数和响应 DTO 是什么 | 拼页面文案、控制弹窗 |
| `info/adapt/service.ts` | 页面完成一次加载需要调哪些接口，先后顺序是什么 | 渲染 JSX |
| `adapter` | 后端字段怎样转换为稳定的页面模型 | 发请求、保存 React state |
| `model/constants` | 页面内部使用哪些业务概念和稳定 code | 依赖具体组件实例 |
| `info/index.tsx` | 当前加载哪张单、怎样组合区块、打开哪个弹窗 | 重复每个字段的清洗规则 |
| `components` | 一个业务区块怎样展示或交互 | 私自复制整份详情数据 |

这不是为了“目录看起来整齐”。它最重要的价值是：接口变动时主要检查 service 和 adapter，UI 变动时主要检查组件，页面流程变动时主要检查入口和动作层。

## 五、先看数据流：页面只接收可渲染的详情模型

### 要货详情数据流

要货详情和操作日志互不依赖，可以并行：

```ts
const requestParams = {
  demandNo: params.demandNo,
  requestSupplierCode: params.supplierCode,
};

const [detailRes, operateLogs] = await Promise.all([
  service.getDemandOrderDetailApi(requestParams),
  service.getDemandOperateLog(requestParams),
]);

return adaptDemandOrderDetail(
  detailRes,
  adaptDemandProcessRecords(operateLogs),
);
```

页面最终只拿到一份 `DemandOrderDetail`。组件不需要知道流程记录来自另一个接口，也不需要在 JSX 中等待两份数据自行拼接。

### 发货详情数据流

发货详情、流程日志和调整单互不依赖，先并行读取；关联要货单依赖发货详情中的 `fulfillmentNo`，所以放在第二阶段：

```ts
const [detailRes, streamLogs, adjustmentDetails] = await Promise.all([
  service.getShipmentOrderDetailApi(requestParams),
  service.getShipmentStreamLogApi(requestParams),
  service.getShipmentAdjustmentDetailApi(requestParams),
]);

const demandDetailRes = detailRes.fulfillmentNo
  ? await service.getDemandOrderDetailApi({
      demandNo: detailRes.fulfillmentNo,
      requestSupplierCode: detailRes.supplierCode,
    })
  : undefined;

return adaptShipmentDetail(
  detailRes,
  adaptShipmentProcessRecords(streamLogs),
  demandDetailRes,
  adjustmentDetails,
);
```

关联要货详情不是只为了弹窗。发货 adapter 还用它补充：

- 物料的要货单位；
- 要求到货日期与预计到货日期的对比；
- 可发货次数与当前有效发货单数量的对比。

这就是为什么请求不能全部硬塞进一个 `Promise.all`：**并行取决于数据依赖，不取决于接口数量。**

## 六、adapter：隔开接口世界与组件世界

DTO 面向接口，页面模型面向 UI。二者直接共用会产生几个问题：字段可选性遍布所有组件、展示格式重复、接口历史兼容逻辑泄漏到 JSX、写操作容易误用展示兜底值。

### 保留后端权威字段

要货详情直接使用后端提供的展示状态：

```ts
return {
  status: res.displayStatusCode,
  statusText: res.displayStatusDesc,
  statusDescription:
    res.displayStatusCode === "WAIT_DOUBT"
      ? res.latestDoubtDesc
      : undefined,
};
```

`status` 用于稳定业务分支，`statusText` 用于展示。这样后端调整展示文案时，前端不会继续显示本地旧文案。

取消原因和取消备注也保持为两个字段，只在头部展示时用 `；` 连接。adapter 不应该为了少传一个字段，过早把两个业务信息压成一个字符串。

### 只在边界处兼容不稳定格式

发货流程记录可能是对象，也可能是 JSON 字符串。兼容逻辑集中在 adapter：

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

因此 `ProcessRecords` 永远只接收统一的页面模型，不需要每渲染一条记录就判断一次类型。

### 业务匹配使用真实标识

发货物料需要从关联要货单中找到单位，使用的是 `materialSpecCode === specCode` 精确匹配。批次入库数据则按“批次号 + 生产日期”匹配对应出库批次。

这里有一条非常重要的边界：

- `material-${index}` 可以作为没有后端 id 时的 React 渲染 key；
- 它不能作为差异处理接口的 `specCode`；
- 真正提交前如果 `specCode` 缺失，页面应阻止操作并提示，而不是伪造一个编号。

### 计算型展示也集中在 adapter

发货页的审核原因不是一个简单字段，而是若干业务规则的组合：

- 预计到货日期晚于要货要求日期，计算晚到天数；
- 非取消发货单数量超过允许发货次数，生成超次提醒；
- 待审核风险存在时，统一追加“请确认是否准许发货”；
- 有差异类型时，再组合差异字典文案和差异数量。

这些计算放在 adapter，让头部组件只负责“如何展示原因”，不负责“原因是否成立”。

## 七、同一个详情支持两种运行方式

两个入口都支持独立页和嵌入页：

```tsx
interface DemandOrderInfoPageProps {
  embedded?: boolean;
  demandNo?: string;
  supplierCode?: string;
}

const demandNo = demandNoProp || params.demandNo;
```

```tsx
interface ShipmentOrderInfoPageProps {
  embedded?: boolean;
  shipOrderNo?: string;
}

const shipOrderNo =
  shipOrderNoProp || params.shipOrderNo || params.id || "";
```

输入优先级是：**显式 props 优先，路由参数兜底。** 父页面嵌入详情时明确传业务单号，独立页面才读取 URL。

### 独立页面为什么用 `useDidShow`

Taro 页面从其他页面返回时仍可能需要刷新。独立页使用 `useDidShow`，页面重新显示时重新加载：

```tsx
useDidShow(() => {
  if (!embedded) loadDetail();
});
```

### 嵌入页面为什么用 `useEffect`

弹窗里的详情不是一个独立 Taro 页面，不会依赖页面显示事件。它需要在 props 指向的单号变化时加载：

```tsx
useEffect(() => {
  if (embedded) loadDetail();
}, [embedded, loadDetail]);
```

这说明 `useEffect` 不是固定的“页面初始化模板”。应该先判断我们在同步哪个外部系统：Taro 页面生命周期，还是 React 组件输入。

### `embedded` 不只是少一个外壳

嵌入模式会一起关闭页面级能力：

- 不展示固定底部操作栏；
- 不允许再次打开关联单据，避免弹窗无限套娃；
- 单号不再触发复制；
- 流程记录入口只读；
- 不启用独立页的下拉刷新容器。

因此我们复用的不是几块相似卡片，而是**同一套请求、adapter、页面模型和展示链路，再通过运行模式收缩能力。**

## 八、状态不是几个 boolean，而是一张动作表

### 要货单状态与操作

| 状态 | 底部动作 |
| --- | --- |
| `CREATED` / `WAIT_SUPPLIER` / `WAIT_SHIP` | 取消要货 |
| `WAIT_DOUBT` | 取消要货、处理异议 |
| `SHIPPING` / `PARTIAL_ARRIVAL` / `ALL_ARRIVAL` | 完成要货 |
| `COMPLETED` / `CANCELLED` / 其他 | 无操作 |

### 发货单状态与操作

| 状态 | 底部动作 |
| --- | --- |
| `PENDING_AUDIT` | 拒绝发货、准许发货 |
| `PENDING_DISCREPANCY` | 差异处理 |
| 其他 | 无操作 |

这两张表在代码中分别由 `resolveDemandOrderActions` 和 `resolveShipmentActions` 表达。它们是纯函数：输入详情状态和 handlers，输出 `BottomBarAction[]`。

```ts
switch (detail.status) {
  case ShipmentOrderStatus.PENDING_AUDIT:
    return {
      primaryActions: [rejectAction, approveAction],
    };
  case ShipmentOrderStatus.PENDING_DISCREPANCY:
    return {
      primaryActions: [handleDiscrepancyAction],
    };
  default:
    return { primaryActions: [] };
}
```

它比 `canCancel`、`canApprove`、`canReject` 等多份 state 更可靠，因为按钮是详情状态的派生值，不需要额外同步。

同时，要货和发货没有被强行抽成一个“万能动作 Hook”：

- 要货动作较直，页面入口负责打开弹窗并调用 page-facing service；
- 发货审核、拒绝和差异处理有多组提交状态、动态表单和 payload 分支，因此封装在 `ShipmentBottomAction` 内；
- 两者只复用 `BottomBarAction` 这个组件契约，不假装业务完全相同。

这是“相似不等于相同”的一个好例子。抽象应发生在稳定重复处，而不是看到两个底栏就创建一个巨型配置系统。

## 九、异步操作必须形成完整闭环

以发货审核为例，完整流程是：

```text
检查是否正在提交
  ↓
设置 submitting，禁用所有相关按钮
  ↓
使用真实 shipOrderNo / supplierCode 组装参数
  ↓
调用写接口
  ↓
成功：提示、关闭弹窗、重新读取详情
失败：保留弹窗和用户输入，允许重试
  ↓
finally 恢复 submitting
```

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

这里有三个关键点：

1. `submitting` 防止重复点击，也统一禁用同组动作。
2. 失败时不先关闭弹窗，拒绝原因或差异数量仍保留，用户可以重试。
3. 成功后重新请求详情，不在前端手工把状态改成“已完成”或“已审核”。

要货的取消、接收/拒绝异议、完成要货也采用“成功关闭 + Toast + 回源刷新，失败保留现场”的思路。

## 十、复杂表单状态放在哪里

页面入口只保存跨区块状态：详情、加载状态、当前弹窗、当前选择的发货记录。多个互斥弹窗使用联合类型：

```ts
type PopupType =
  | "related"
  | "cancel"
  | "dispute"
  | "complete"
  | null;
```

这比四个可能同时为 `true` 的 boolean 更接近真实状态。

弹窗内部则保存未提交的草稿：

- 取消弹窗拥有取消原因和说明；
- 拒绝发货弹窗拥有审核意见；
- 差异弹窗拥有处理方式、调整方向、调整数量和赠品数量；
- 弹窗重新打开时清空旧草稿；
- `loading` 由提交动作传入，弹窗不重复发业务请求。

差异处理还有一层派生计算：

- 原始入库少于实发时，必须调整入库数量；
- 原始入库多于实发时，才允许选择赠品调整；
- 调整数量必须大于 0，调整后数量不能小于 0；
- 赠品数量必须大于 0，且不能超过原始入库量；
- 只有所有条件满足，确认按钮才可用。

这些值都能由当前表单输入计算，因此没有再保存一份 `canConfirm` state。**能推导的值就推导，只有需要跨渲染记住的值才进入 state。**

## 十一、几个很值得学习的 H5 写法

### 1. 下拉刷新与首次加载分开表达

独立页用受控 `PullRefresh`：

```tsx
<PullRefresh
  loading={refreshing}
  onRefresh={handleRefresh}
  scrollViewProps={{
    id: DEMAND_ORDER_SCROLL_ID,
    scrollY: true,
    scrollWithAnimation: true,
  }}
>
  {renderMainContent()}
</PullRefresh>
```

首次加载显示整页 Loading；下拉刷新保留旧内容，只显示刷新状态；嵌入模式不再套一层独立滚动容器。三种体验虽然都调用详情接口，但 UI 语义不同，所以保留不同的 loading state 是合理的。

### 2. 长文案交给通用组件，业务页只定规则

审核原因、取消说明、流程备注都可能很长。页面统一使用：

```tsx
<LongText text={remark} rows={3} mode="inline" />
```

`LongText` 负责测量、展开和收起，业务组件只决定“三行后折叠”和当前视觉语境。这样不会在每个卡片里重新实现溢出判断。

### 3. 复制区域与只读模式明确绑定

独立详情用 `CopyText` 包住单号，点击文字或复制入口都走统一剪贴板能力；嵌入详情直接渲染 `Text`。这同时解决了两个问题：独立页方便操作，关联弹窗不会出现看似可继续操作的入口。

### 4. 动态枚举写成小型数据 Hook

发货状态、差异类型和处理方式来自 Goblin 字典。`useShipmentGoblinEnum` 负责请求、卸载保护和 `code → codeName` 映射：

```ts
useEffect(() => {
  if (!enabled) return;
  let active = true;

  service.getShipmentGoblinEnumApi(...).then((items) => {
    if (active) setItems(items);
  });

  return () => {
    active = false;
  };
}, [dictType, enabled]);
```

它没有发展成通用缓存框架，只解决当前页面反复需要的字典读取问题，符合“最小可用抽象”。

### 5. 组件按业务区块拆，不按标签数量拆

`HeaderCard`、`DemandRequirement`、`ShipmentRecords`、`PurchaseDesc`、`TransportSection`、`DiscrepancySection` 都是用户能理解的业务区块。`FieldRow` 才是更小的通用展示单元。

如果把每个 `Text` 和 `Flex` 都封装，阅读代码时反而看不到业务；如果所有 JSX 都留在 `index.tsx`，页面流程又会被样式细节淹没。当前粒度让入口文件保留“页面目录”，组件文件负责“区块细节”。

## 十二、几个容易写错、但这次很有价值的细节

### 要货入库比例

物料存在 `exceedRate` 时展示超额比例，否则展示普通 `inboundRate`；已完成状态的文案改为“实际已入库”。字段存在性不能写成真假判断，因为 `0` 也是合法数值，所以代码使用 `!= null`。

### 发货次数风险

审核时统计关联要货单的有效发货单号，排除已取消记录，并用 `Set` 避免同一单号重复计数；如果当前发货单尚未出现在集合中，再把本次计入。

### 批次匹配

发货批次和入库批次不能只按数组下标拼接，而是用“批次号 + 生产日期”匹配。数组顺序可能变化，业务主键组合比位置更可靠。

### 数量与单位

发货接口提供数量，要货接口提供要货单位，两者通过物料规格编码关联。当前页面展示的是单一要货单位文案，并没有实现“库存单位换算后余数继续按库存单位展示”的混合单位算法；这部分不能从现有格式化函数中推断出来。

### 运输信息按状态和方式出现

待审核、待发货阶段不展示运输区块；进入后续状态且存在运输数据时，再根据车辆运输或快递字段展示车牌、司机、电话或物流单号。条件放在页面组合层，具体字段排列留在 `TransportSection`。

### 后端展示值与稳定 code 分工

状态标题和差异类型优先使用字典或接口展示值，业务分支和提交参数使用稳定 code。展示文案可以变化，业务 code 必须与接口契约对齐，两者不要混成同一概念。

## 十三、为什么删除 mock 是需求完成的一部分

开发中曾加入多状态 mock，用于快速检查待审核、运输中、待差异、完成和取消等页面分支。它在设计还原阶段有价值，但最终被完整删除，包括：

- 要货和发货的 `adapt/mock.ts`；
- 路由中的 `mockStatus` / `mockScenario`；
- mock 字典分支；
- 跳过真实写接口的假操作分支。

原因不是“mock 不好”，而是生产详情已经进入真实接口阶段。继续保留会制造三种风险：

1. URL 参数误触发假数据；
2. 页面一半用本地详情、一半请求真实字典；
3. 操作显示成功但没有真正改变后端状态。

因此最终边界很清楚：静态样例适合视觉开发，接口联调验证数据契约，真实 H5 操作验证路由、权限、请求、回调和 Toast。三者不能互相代替。

## 十四、这套组织方式的取舍

### 做得好的地方

- page-facing service 隐藏多接口编排，页面只加载一个详情模型；
- adapter 隔离 DTO 与 UI，复杂兼容和计算不进入 JSX；
- 独立/嵌入模式复用整页数据链，并通过只读能力防止递归操作；
- 状态到动作使用纯函数，避免多份 boolean state 漂移；
- 复杂发货操作收进底栏组件，简单要货流程留在页面，抽象程度与复杂度匹配；
- 提交成功后回源刷新，后端继续作为状态流转权威；
- `PullRefresh`、`LongText`、`CopyText`、`Popup`、`BottomBar` 等组件让业务页只声明交互规则。

### 仍需保持清醒的边界

- 当前源码未发现这两个详情模块的专用测试；adapter、状态动作和差异表单都适合补纯函数测试；
- `ShipmentDiscrepancy` 明确记录“当前页面仅支持单物料”，差异提交也只组装一个物料项，多物料扩展必须重新设计，不能默认循环一下就完成；
- 未知状态目前会回退为默认样式且无底部动作，这很安全，但新增后端状态仍要产品、后端和前端共同确认；
- 流程记录的 Step 当前统一标记为 `finish`，它表达的是已发生记录，不是完整流程状态机；
- 要货来源类型仍有本地 label 映射，应继续核对是否应完全采用后端 `sourceTypeDesc`；
- 真实权限、异常响应、剪贴板、滚动容器和底部安全区仍需要在目标 H5 环境验证；
- 当前没有混合单位换算展示，不应把“数量后拼接要货单位”描述成换算能力。

一份学习档案不仅要记录成功写法，也要标出实现边界。知道代码没有承诺什么，与知道它已经完成什么同样重要。

## 十五、推荐的源码阅读顺序

如果想用这两个需求练习阅读真实项目，建议每轮只看两到三个相邻层次。

1. 先看 `src/service/demand-order/type.ts` 与 `src/service/shipment-order/type.ts`，认识接口世界有哪些字段。
2. 再看两个 `model.ts` / `constants.ts`，比较页面真正保留了哪些概念。
3. 看 `info/adapt/service.ts`，画出并行请求和依赖请求。
4. 看 `adapt-demand-order.ts` 与 `adapt-detail.ts`，逐项追踪 DTO 怎样变成 UI 模型。
5. 看两个 `info/index.tsx`，理解路由输入、生命周期、加载状态、页面组合和嵌入模式。
6. 看 `bottom-action` 与 `use-shipment-actions.ts`，把状态表和真实写接口对应起来。
7. 最后看 `detail-popups`、`discrepancy-popup`、`header-card` 和 `process-records`，观察局部 state、派生值与组件库契约。

可以给自己做一个练习：选择一个字段，例如 `fulfillmentNo`、`inboundQtyResult` 或 `cancelRemark`，从 DTO 开始一路追到最终 JSX，再反向检查它是否参与提交。这个方法比从页面顶部逐行读到底更容易建立全局认识。

## 十六、以后做复杂详情页的检查清单

1. 页面输入来自路由、父组件，还是两者？优先级是否明确？
2. 哪些请求可以并行，哪些请求依赖前一个结果？
3. 原始 DTO 是否先经过 adapter，再进入组件？
4. 展示文案、业务 code 和提交参数是否各自使用正确来源？
5. 数组是否需要保序、保留重复，还是有明确的去重规则？
6. React key 的兜底值是否被误用为业务参数？
7. 状态与动作是否集中成表，而不是散落在 JSX 中？
8. 可计算值是否误存进 state，造成同步问题？
9. 提交是否防重复、失败保留现场、成功回源刷新？
10. 弹窗临时输入是否由弹窗拥有，并在重新打开时重置？
11. 嵌入模式是否真正只读，是否可能继续打开关联弹窗？
12. 首次加载、返回页面刷新、手动下拉刷新是否有不同反馈？
13. mock、静态检查、接口联调和真机验证的结论是否明确分开？
14. 长文案、空数据、未知状态和底部安全区是否经过真实数据验证？

## 总结

要货单与发货单详情最值得学习的，不是用了多少 Hook，而是把一条复杂业务链拆成了可以解释的边界：

```text
路由或 props 决定目标单据
  ↓
page-facing service 编排请求
  ↓
adapter 收敛接口差异并建立页面模型
  ↓
页面组合业务区块并保存交互状态
  ↓
纯函数根据状态生成动作
  ↓
弹窗拥有草稿，动作层负责提交闭环
  ↓
成功后重新读取后端详情
```

当这条链路清楚后，`useState` 只保存真正需要记住的值，`useEffect` 与 `useDidShow` 各自同步正确的外部生命周期，`useCallback` 稳定异步边界，组件复用也不再等于复制 JSX。

更重要的是，我们从“复制占位页”走到了“真实领域模型”，从“场景 mock”走到了“真实接口链路”，并在双向关联中选择复用完整详情而不是复制第二套业务逻辑。这个过程本身，就是这两个需求最有价值的 React 工程实践。


