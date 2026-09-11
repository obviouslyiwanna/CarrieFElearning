# mars-member 货品码 PDF：从需求到落地的完整学习档案

这次需求表面上只是给货品码列表增加一个“打印PDF”按钮，真正落地时却横跨了表单、异步任务、Canvas 绘图、PDF 合成、对象存储、下载和任务状态管理。

它最值得学习的地方，不是某一个库的 API，而是如何在一个已有业务系统里识别可以复用的主链路，再把真正变化的部分拆成边界清楚的模块：**后端继续生成业务码，前端新增一种输出方式，并把浏览器生成的临时文件变成可以长期下载的业务资产。**

---

## 一、项目背景：这是一个怎样的前端项目

`mars-member` 是会员中心后台应用，技术栈以 React 17、TypeScript、Ant Design、Mars 和 Mars Kit 为主，通过 Kone 完成本地开发与构建。

这类中后台项目通常不是从零搭页面，而是围绕已有的业务基础设施继续扩展：

- `ProTable` 负责列表、搜索和分页；
- `SharpForm` 负责表单字段、校验和组件适配；
- `ProModal` 负责业务弹窗及确认按钮的异步 loading；
- `Permissions` 负责页面操作入口的权限控制；
- `serviceHelper.define` 把接口路径、方法、请求参数和响应类型集中在 service 层；
- `@guming/goss-web` 负责 OSS 上传、签名地址获取和文件下载链路。

本次需求主要发生在两个业务页面：

| 页面 | 路径 | 职责 |
| --- | --- | --- |
| 货品码列表 | `src/pages/lotus/goods-code-list` | 创建打印任务、查看二维码、单条打印、新建 PDF 任务 |
| 打印任务列表 | `src/pages/lotus/print-task` | 查询历史任务、查看标签模板、下载已经持久化的 PDF |

理解这两个入口后，再看 PDF 代码就不会把它误解成一个孤立的“前端导出按钮”。它依附于已有的打印任务体系，只是在任务结果产生之后走向了新的输出端。

## 二、原有能力：货品码是怎样被打印出来的

改造前已经存在一条完整的本地打印链路：

```text
用户填写打印任务表单
  ↓
create/v1 创建任务，返回 taskNo
  ↓
taskResult/v1 轮询后端生成结果
  ↓
取得 taskItems：规格、货品码、取件码
  ↓
Canvas 绘制 40 × 30 mm 标签
  ↓
getImageData 转成黑白点阵
  ↓
拼装 TSPL BITMAP 指令
  ↓
POST http://127.0.0.1:8062/send
  ↓
本地打印工具把指令发送给实体打印机
```

这里有两个关键事实。

第一，后端并不返回二维码图片。它返回的是 `goodsCode`、`shortCode`、`specName` 等业务数据，二维码和整个标签都是浏览器画出来的。

第二，旧流程的最后一段强依赖用户电脑：页面要先检查 `127.0.0.1:8062/health`，取得本地打印机列表，再把 TSPL 数据发送给桌面打印工具。因此它适合“现在就在这台电脑打印”，却不适合“先生成文件，之后换设备或在任务列表里下载”。

## 三、整体需求：不是把打印改成 PDF，而是增加第二种输出能力

本次需求保留原本的实体打印，同时新增 PDF 输出。前端有效需求可以整理为：

1. 在货品码列表增加受权限控制的“打印PDF”入口。
2. PDF 表单复用物料选择、数量、任务名称和备注，但不选择发起仓库。
3. 单次最多生成 10,000 个标签。
4. 后端继续创建任务并生成货品码、取件码；前端在浏览器中生成 PDF。
5. 每个标签独占一个 40 × 30 mm PDF 页面。
6. 生成期间展示进度，并提醒用户不要关闭浏览器。
7. 完成后可以立即下载，也能稍后从打印任务列表再次下载。
8. PDF 不依赖本地打印工具，也不需要在入口处检查打印机。

因此，新旧流程不是互相替换，而是在共同的任务结果之后分叉：

```text
                    ┌─ Canvas → 黑白点阵 → TSPL → 本地打印服务 → 实体打印
创建任务 → 后端取码 ┤
                    └─ Canvas → PNG → jsPDF → Blob/File → OSS → 任务列表下载
```

共同部分是“创建任务并取得业务码”，变化部分是“如何消费这些业务码”。这个判断直接决定了代码组织：创建和轮询逻辑可以沿用业务接口，PDF 绘制、合成、存储和下载则作为新模块加入。

## 四、需求边界：前端、后端和浏览器分别负责什么

| 边界 | 负责的事情 | 不负责的事情 |
| --- | --- | --- |
| 后端任务服务 | 创建任务、生成货品码和取件码、返回任务结果、保存 PDF 地址和任务状态 | 不在本次前端方案中绘制 PDF 页面 |
| React 页面 | 收集输入、打开弹窗、启动轮询、展示进度和错误 | 不生成业务码，不把大文件塞进普通 JSON 接口 |
| Canvas 渲染器 | 把一条任务数据画成固定尺寸标签 | 不轮询、不上传、不控制弹窗 |
| jsPDF 生成器 | 把多张 Canvas 图片组织成一页一码的 PDF Blob | 不知道 OSS、任务状态或列表页面 |
| OSS | 保存真正的 PDF 文件并返回对象地址 | 不决定这个文件属于哪个打印任务 |
| 任务接口 | 保存 `taskNo + pdfOssUrl` 的业务关系 | 不保存浏览器内存里的 Blob |

这里最重要的架构判断是：**Blob 只是本次页面生命周期中的临时结果，`pdfOssUrl` 才是跨刷新、跨页面和跨时间下载的持久化凭据。**

如果只把 Blob 放进前端 `Map`，当前页面确实可以下载，但刷新后文件立即丢失，打印任务列表也无法恢复它。这也是需求从“能生成 PDF”继续演进到“可上传、可回看、可再次下载”的原因。

## 五、代码总览：按职责拆成一条可阅读的链路

| 文件 | 主要职责 | 为什么放在这里 |
| --- | --- | --- |
| `goods-code-list/index.tsx` | 展示“打印PDF”入口并打开表单 | 页面入口只负责启动流程 |
| `add-pdf-task.tsx` | 表单、校验、创建后端任务、把 `taskNo` 交给进度组件 | 把“用户输入”与“后台执行”分开 |
| `spec-picker.tsx` | 选择一个物料规格并适配 SharpForm | 本地打印与 PDF 可以复用同一选择能力 |
| `pdf-task-progress.tsx` | 轮询、生成、上传、保存地址、更新状态、成功和失败反馈 | 它是跨多个异步阶段的业务编排层 |
| `label-renderer.ts` | 绘制一张 40 × 30 mm 标签 | 隔离具体模板与像素布局 |
| `pdf-generator.ts` | 循环渲染、分页、合成 Blob、文件名与下载 | 隔离 PDF 技术细节 |
| `print-task/index.tsx` | 当任务存在 `pdfOssUrl` 时提供“导出PDF” | 历史下载属于任务列表能力 |
| `service/member/index.ts` | 集中定义任务相关接口 | 页面不直接拼 URL 和 HTTP 方法 |
| `print-task-types.ts` | 描述任务分页、详情和 PDF 地址保存契约 | 让接口字段在编译期可检查 |

这种拆分没有引入额外的 store、Context 或通用任务框架。因为当前只有一个 PDF 流程，先用几个职责明确的文件解决需求，比为“未来可能还有别的导出”提前设计抽象更简单。

## 六、第一步：入口只负责打开功能，不掺入执行逻辑

货品码列表通过 `Permissions` 控制入口：

```tsx
<Permissions code="goodsCodeList.order.list.action.printPDF">
  <Button
    type="primary"
    onClick={() => {
      ProModal.open(<AddPdfTask />);
    }}
  >
    打印PDF
  </Button>
</Permissions>
```

这段代码刻意没有调用 `checkPrinter()`。因为 PDF 在浏览器中生成，入口是否可用不应该再被本地打印软件和实体打印机状态阻塞。

它也没有直接调用 PDF 生成函数。此时还没有物料、数量、任务名称，更没有后端生成的货品码。页面入口只表达一件事：用户要开始创建 PDF 任务。

## 七、第二步：用表单建立业务输入边界

`AddPdfTask` 使用 `SharpForm` 收集四类信息：

- 一个物料规格：`specCode + specName`；
- 标签数量：`labelCount`，校验范围为 1～10,000；
- 任务名称：`taskName`；
- 可选备注：`remarks`。

PDF 表单与本地打印表单最大的区别是没有仓库字段。本地打印需要知道发起仓库，PDF 需求则明确移除了这个输入，所以没有为了“复用整个表单”而保留无意义字段。

### 复合字段的写法

物料字段名写成：

```tsx
"{specCode, specName}": {
  label: "物料规格名称",
  children: <SpecPicker />,
}
```

它表示一个选择动作同时写入 `specCode` 和 `specName`。`SpecPicker` 内部通过 `SharpForm.useAdapter(props)` 取得 `value` 和 `onChange`，把 Mars Kit 表单协议适配成一个普通受控组件：

```tsx
const { value, onChange } = SharpForm.useAdapter(props);

onChange(selectedRow);
```

这是很值得学习的组件边界：选择器负责“怎样选”，外层表单负责“选中的值如何进入提交数据”。

### 为什么复用 `SpecPicker`

最初实现曾单独增加 `PdfSpecPicker`，后续发现它和已有 `SpecPicker` 的行为相同，于是删除重复文件，直接复用现有选择器。

这不是为了追求形式上的 DRY，而是两条业务链在“单选一个物料规格”上确实拥有相同规则。相反，两个表单的仓库字段和数量上限不同，所以保留两个表单组件更清楚。

## 八、第三步：创建任务后，用 props 把流程交给下一阶段

点击保存时，表单先校验，再创建后端任务：

```tsx
await form.validateFields();
const values = form.getFieldsValue();
const res = await service.printSpecTaskCreate({ ...values });

modal.close();
ProModal.open(
  <PdfTaskProgress
    taskNo={res.taskNo}
    taskName={values.taskName}
  />,
  { footer: null, closable: false, maskClosable: false }
);
```

这里的 `taskNo` 是后续整条链路的关联键：轮询任务结果、保存 PDF 地址、更新任务状态都靠它关联同一次任务。`taskName` 则用于生成对用户友好的文件名。

表单组件不继续承担轮询和生成。它在创建成功后关闭自己，把执行所需的最小信息通过 props 交给 `PdfTaskProgress`。这种“阶段式组件”比在一个大组件里同时维护表单、轮询、生成、上传和下载状态更容易阅读。

## 九、第四步：用 Effect 启动轮询，用 Ref 保存过程变量

`PdfTaskProgress` 挂载时调用 `start()`，每 6 秒轮询一次任务结果；请求异常时每 4 秒重试，最多连续失败 5 次；正常轮询最多 100 次。

```tsx
useEffect(() => {
  window.addEventListener("beforeunload", handleBeforeUnload.current);
  start();

  return () => {
    mounted.current = false;
  };
}, []);
```

这个组件里同时使用了 state 和 ref，两者分工很典型：

| 数据 | 使用方式 | 原因 |
| --- | --- | --- |
| `progress` | `useState` | 它变化后需要重新渲染页面 |
| `retryCount`、`loopCount` | `useRef` | 需要跨轮询保存，但变化时不需要渲染 |
| `timer` | `useRef` | 保存定时器句柄，不属于 UI |
| `mounted` | `useRef` | 避免组件关闭后继续更新 state |
| `handleBeforeUnload` | `useRef` | 保持同一个函数引用，便于移除监听 |

当 `res.isFinished === "YES"` 时，轮询阶段结束，`taskItems` 被交给 `createPdf()`。这里说明 `useEffect` 不是用来“计算 PDF”的；它只是把组件生命周期与外部任务轮询同步起来。

### “我知道了”为什么只是关闭弹窗

当前设计允许用户点击“我知道了”关闭进度弹窗，但闭包中的轮询和生成仍继续执行；`mounted.current = false` 只阻止后续 `setProgress`。刷新或关闭整个页面才会真正中断浏览器中的工作，因此页面额外注册了 `beforeunload` 提醒。

这是一种明确的产品取舍：隐藏进度不等于取消任务。不过它也意味着定时器、事件监听和异步任务的生命周期比较特殊，后续如果产品加入“取消生成”，就需要真正的取消令牌、定时器清理和任务状态回传，而不能只关闭 Modal。

## 十、第五步：把一条业务数据画成一张固定标签

`label-renderer.ts` 只关心一条标签数据：

```ts
interface PrintTaskItem {
  specCode: string;
  specName: string;
  goodsCode: string;
  shortCode: string;
}
```

标签物理尺寸是 40 × 30 mm，目标打印精度是 203 DPI。代码先把毫米换算成像素点：

```ts
const DPI = 203;
const MM_TO_DOT = DPI / 25.4;

const width = Math.round(40 * MM_TO_DOT);  // 约 320
const height = Math.round(30 * MM_TO_DOT); // 约 240
```

随后在 Canvas 上完成这些绘制：

1. 填充白色背景并设置黑色文字；
2. 旋转坐标系 90°，继续沿用旧打印模板的排版方向；
3. 绘制取件码 `shortCode`；
4. 将规格名称按每 8 个字符换行；
5. 用 `qrcode.toCanvas` 把 `goodsCode` 生成 H 级纠错二维码；
6. 绘制固定提示语和底部货品码文本；
7. 返回已经完成绘制的 Canvas。

### 为什么单独抽出渲染器

PDF 生成器不应该知道字体坐标、二维码大小和换行规则。把这些细节集中在 `renderLabelCanvas()` 后，未来调整模板时只需要进入一个明确的文件，也可以单独用一条假数据检查标签画面。

当前代码虽然参考了旧 `printer.ts` 的模板，但两边仍各自保留一份绘制逻辑。这样改动范围小、不会影响已有实体打印；代价是未来修改模板时可能出现两个版本漂移。是否继续抽成真正共享的模板，应由“两个输出必须长期像素一致”这个业务要求决定，而不是为了抽象而抽象。

## 十一、第六步：生成器只负责把多张标签装进一个 PDF

`generateGoodsCodePdf()` 的输入是 `taskItems`，输出是一个 PDF `Blob`：

```ts
const pdf = await generateGoodsCodePdf(taskItems, (currentProgress) => {
  setProgress(Math.min(currentProgress, 99));
});
```

生成器内部动态导入 jsPDF：

```ts
const { jsPDF } = await import("jspdf");
```

动态导入让较重的 PDF 依赖只在用户真的使用该功能时加载，不进入列表页的初始执行路径。

PDF 使用毫米作为单位，页面就是标签的真实物理尺寸：

```ts
const pdf = new jsPDF({
  orientation: "landscape",
  unit: "mm",
  format: [40, 30],
  compress: true,
});
```

循环中每条数据都经过同一条转换链：

```text
taskItem
  ↓ renderLabelCanvas
Canvas
  ↓ toDataURL("image/png")
PNG data URL
  ↓ pdf.addImage(..., 0, 0, 40, 30)
一张铺满页面的 PDF 图片
```

jsPDF 构造函数已经创建了第一页，所以只有 `index > 0` 时才调用 `addPage()`。否则 PDF 开头会多出一张空白页。

### 为什么顺序执行

`renderLabelCanvas()` 内部要异步生成二维码，并且循环复用同一个 `canvas` 和 `qrCanvas`。因此代码使用 `await` 顺序处理每一条，确保上一张标签绘制完成并加入 PDF 后，才覆盖 Canvas 绘制下一张。

每处理 20 条会通过 `setTimeout(..., 0)` 暂时让出主线程，让浏览器有机会响应 UI 和刷新进度。但要准确理解它的能力边界：

- 它能改善页面响应性；
- 它不是并行计算；
- 它没有把 10,000 条拆成多个 PDF；
- 它不会释放 jsPDF 已经保留的页面和图片；
- 最后的 `output("blob")` 仍然要一次性序列化完整文档。

因此，“允许输入 10,000”只是表单规则，不等于浏览器已经在所有电脑上稳定生成 10,000 页。

## 十二、第七步：Blob 变成 File，再从临时结果变成持久资产

jsPDF 返回 `Blob` 后，外层用任务名称和任务号生成文件名，并包装成浏览器 `File`：

```ts
const fileName = getGoodsCodePdfFileName(taskName, taskNo);
const file = new File([pdfBlob], fileName, {
  type: "application/pdf",
});
```

文件名函数会把 Windows 不允许的 `\\ / : * ? " < > |` 替换成下划线。这个小细节避免了业务任务名称直接变成下载文件名时产生平台兼容问题。

当前实现以 100 MB 为阈值决定是否开启分片上传：

```ts
const useMultipartUpload = file.size >= 100 * 1024 * 1024;

const { url: pdfOssUrl } = await upload(file, {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": encodedFileName,
  },
  multipart: useMultipartUpload,
});
```

上传成功只说明 OSS 里已经有文件，还没有完成业务闭环。接下来必须把对象地址和任务绑定：

```ts
await service.savePrintSpecTaskPdfOssUrl({
  taskNo,
  pdfOssUrl,
});

await service.updatePrintSpecTask({
  taskNo,
  executionStatus: "PDF_CREATED",
});
```

这两步表达了不同职责：

- `savePdfOssUrl/v1` 保存“这个任务的 PDF 在哪里”；
- `update/v1` 保存“这个任务走到了什么状态”。

把地址和状态分开意味着中间可能出现部分成功，例如 OSS 已上传但地址保存失败。因此 `PdfTaskProgress` 用 `currentStage` 记录当前阶段，错误日志和提示可以区分“生成PDF”“上传OSS”“保存PDF地址”和“更新任务状态”。阶段信息属于诊断状态，不必全部展示给普通用户。

## 十三、第八步：签名下载完成即时与历史两个出口

OSS 返回的通常是对象地址，不一定是任何人都能直接访问的永久公网链接。下载前先调用 `getSignedUrl(url)` 获取当前可访问的签名地址：

```ts
const signedUrl = await getSignedUrl(url);
const link = document.createElement("a");
link.href = signedUrl;
link.download = fileName;
link.rel = "noreferrer";
document.body.appendChild(link);
link.click();
link.remove();
```

同一个下载函数被两个入口复用：

1. PDF 生成完成后，确认弹窗提供“下载PDF”；
2. 打印任务列表只要记录存在 `pdfOssUrl`，就展示“导出PDF”。

任务列表使用条件展开构造操作项：

```tsx
items={[
  templateAction,
  ...(record.pdfOssUrl ? [pdfDownloadAction] : []),
]}
```

这比先生成数组、再在 JSX 外多次 `push` 更接近最终 UI 结构；也比永远展示一个 disabled 按钮更直接，因为没有文件地址时，这个任务本来就没有可执行的 PDF 下载动作。

## 十四、完整时序：一次点击最终发生了什么

```text
1. 用户点击“打印PDF”
2. AddPdfTask 校验物料、数量、名称和备注
3. printSpecTaskCreate 创建任务并返回 taskNo
4. PdfTaskProgress 挂载，注册离开页面提醒
5. 每 6 秒查询 taskResult/v1
6. 后端完成取码，返回 taskItems
7. 状态更新为 EXECUTING
8. label-renderer 逐条绘制 Canvas
9. pdf-generator 把每张 PNG 放入独立 PDF 页面
10. jsPDF 输出 Blob，浏览器包装成 File
11. goss-web 上传文件，必要时使用 multipart
12. savePdfOssUrl/v1 保存 taskNo 与 pdfOssUrl
13. update/v1 把状态更新为 PDF_CREATED
14. 进度变为 100%，弹出即时下载入口
15. 用户以后也能在打印任务列表通过 pdfOssUrl 再次下载
```

这条时序里，`taskNo` 一直是业务主线，`taskItems` 是渲染输入，`Blob/File` 是浏览器临时文件，`pdfOssUrl` 是持久结果。区分这四种数据，就能快速判断每个函数应该接收什么、返回什么。

## 十五、这次改造经历了哪些演进

当前分支相对 `master` 有 4 个提交，最终涉及 11 个文件，约新增 718 行。演进过程也反映了真实需求从“先跑通”到“收紧边界”的变化。

### 1. 建立完整 PDF 主链路

首次提交增加 PDF 表单、标签渲染器、生成器、进度组件、任务类型、OSS 保存接口和列表下载入口，并引入 `jspdf@2.5.2`。

这一阶段先回答“从按钮到可下载文件能不能串起来”。

### 2. 收紧产品文案和状态展示

后续调整移除了把内部阶段直接写在页面上的做法，页面只保留稳定的用户提示；失败时用 `message.error` 并关闭旧进度弹窗。

这一阶段体现了一个重要原则：开发诊断信息和产品界面不是一回事。阶段仍保留在代码里用于日志，但不要求用户理解 OSS、序列化或状态更新。

### 3. 删除重复实现，重新对齐正式契约

独立的 `pdf-spec-picker.tsx` 被删除，改为复用 `spec-picker.tsx`；早期 Mock、10 万条压测入口和临时分支也没有进入当前正式代码；接口统一回到正式的 `/newton/admin/print/spec/task/...` 契约。

这一阶段不是“少几个文件”这么简单，而是把探索代码、重复代码和正式业务能力重新分开。

### 4. 补齐受控下载能力

最后升级 GOSS 依赖，为上传写入 PDF 类型和附件文件名，并在下载前取得签名 URL。需求由“有一个 OSS 地址”推进到“用户可以按业务文件名真正下载”。

## 十六、可以重点学习的 React 与 TypeScript 写法

### 1. 用组件边界表达流程阶段

`AddPdfTask` 负责输入，`PdfTaskProgress` 负责执行。创建成功时通过 `taskNo` 和 `taskName` 完成交接，没有引入全局状态。

适合 props 的判断标准是：下一阶段只需要少量、明确、由上一阶段已经确定的数据，而且不需要被多个远距离页面共同修改。

### 2. 区分 state 和 ref

进度需要显示，所以是 state；重试次数和定时器只是过程控制，所以是 ref。不要因为某个值会变化，就默认把它放进 `useState`。

### 3. Effect 负责同步外部系统

轮询、`beforeunload` 和定时器都属于 React 外部系统。Effect 的职责是启动这段同步，并说明组件离开后如何处理。它不是“所有异步代码统一放置的位置”。

### 4. 动态 import 控制功能成本

jsPDF 只在用户启动 PDF 任务后加载。对于低频但体积较大的功能，动态导入可以避免主页面初始加载承担全部成本。

### 5. 用 Adapter 接入表单协议

`SharpForm.useAdapter` 把自定义选择器接到表单的 `value/onChange` 协议上。这个思路也适用于日期范围、对象选择器、上传组件等非标准输入控件。

### 6. 用类型文件记录跨页面契约

`print-task-types.ts` 让任务分页返回值中的 `pdfOssUrl` 可以同时被 service 和任务列表识别。类型的意义不是让代码看起来更完整，而是让“接口新增字段影响哪些消费者”变得可搜索、可检查。

### 7. 顺序异步并不一定是性能问题

当所有步骤复用可变 Canvas，而且输出顺序必须和输入顺序一致时，顺序 `await` 是正确性约束。优化前应该先确认能否并行，而不是看到循环里的 `await` 就直接改成 `Promise.all`。

## 十七、当前实现中仍值得继续思考的问题

### 1. 1 万页是业务上限，不是浏览器性能证明

每个标签先变成 PNG，再保留在 jsPDF 文档中，最终整体序列化为 Blob。页面数越大，Canvas 编码、PDF 内存、序列化时间和上传时间都会上升。每 20 条让出主线程只能改善卡顿感，不能降低文档峰值内存。

验收时需要记录不同数量下的生成时间、Blob 大小、浏览器峰值内存、是否出现页面无响应，以及低配置办公电脑是否能完成。

### 2. PDF 中的文字是栅格图，不是矢量文字

Canvas 按约 203 DPI 绘制，再作为 PNG 铺满 40 × 30 mm PDF 页面。按目标物理尺寸打印时，它和旧标签拥有相近的源分辨率；但在 PDF 查看器中放大，文字边缘会像普通位图一样变软。

旧 TSPL 流程也不是直接打印字体：它把 Canvas 阈值化成黑白点阵。两者都来自约 320 × 240 的源图，但 PDF 保留灰度像素，TSPL 使用黑白点阵，因此观感和打印结果不会完全相同。

### 3. 模板仍然存在两份

`printer.ts` 和 `label-renderer.ts` 目前各维护一套相近坐标。短期这样最安全，因为新增 PDF 不会影响稳定的本地打印；长期如果模板频繁调整，应考虑抽取共同绘制函数，并分别接 TSPL 和 PDF 输出适配器。

### 4. 类型和运行时字段还要继续对齐

渲染器要求 `shortCode`，但 `fetchPrintSpecTaskTaskResult` 当前内联类型只声明了 `specCode`、`specName` 和 `goodsCode`。如果请求结果被宽类型或隐式类型放过，运行时仍可能得到 `undefined`。

这说明 TypeScript 只会检查你告诉它的契约。后端字段确认后，应让 task result 直接复用 `PrintTaskItem` 或补齐专用响应类型，避免“渲染层认为必填，接口层却没有声明”的边界裂缝。

### 5. 状态枚举需要以后端为准

当前源码完成时写入 `PDF_CREATED`。前端可以用它表达意图，但状态是否被后端接受、列表如何展示、失败后能否重试，都必须以正式接口契约和真实响应为准，不能由页面单方面定义。

### 6. 上传成功不等于业务成功

流程可能停在这些中间状态：文件已经上传，但 URL 没保存；URL 已保存，但状态更新失败；任务标记失败，但 OSS 中留下孤立文件。当前阶段化错误日志能帮助定位，但补偿、幂等和孤立文件清理由前后端共同决定。

### 7. 开发环境兼容代码要有退出条件

`src/index.tsx` 当前把不可用的 kit-dev OSS 授权地址临时改写为 kit-test。它帮助本地联调，但属于环境兼容，不是 PDF 业务本身。环境恢复后应确认是否移除，避免测试授权服务成为长期隐式依赖。
