# React 学习笔记：useCallback

## 1. 官方定义

useCallback 是 React 提供的 Hook，用来缓存函数本身。

基本形式：

~~~tsx
const cachedFunction = useCallback(function, dependencies);
~~~

它不会立即执行函数。依赖没有变化时，React 可以复用之前缓存的函数。

官方文档：[React useCallback](https://react.dev/reference/react/useCallback)

## 2. 两个参数

第一个参数是要缓存的函数：

~~~tsx
const handleSave = useCallback(async () => {
  await saveData();
}, []);
~~~

只有以后调用下面的代码，才会真正执行保存逻辑：

~~~tsx
await handleSave();
~~~

第二个参数是依赖数组：

~~~tsx
const handleSelect = useCallback(() => {
  console.log(productId);
}, [productId]);
~~~

如果 productId 没有变化，就复用旧函数；如果变化，就创建新函数。依赖数组应该包含函数内部使用到的外部变量。React 会使用 Object.is 比较依赖值。

可以这样记：

~~~text
依赖没变 → 复用旧函数
依赖变化 → 使用新函数
~~~

## 3. useCallback 和 useMemo

~~~tsx
const total = useMemo(() => price * count, [price, count]);
const handleSubmit = useCallback(() => saveOrder(), []);
~~~

useMemo 缓存计算结果，useCallback 缓存函数本身。useCallback 可以近似理解为：

~~~tsx
const handleSubmit = useMemo(() => () => saveOrder(), []);
~~~

## 4. 第一个项目案例：初始化采退详情

文件：src/pages/purchase-return-order/detail/hooks.tsx

~~~tsx
const getInitialValues = useCallback(async () => {
  if (mode === RETURN_ORDER_PAGE_MODE.CREATE || (!bizNo && !orderNo)) {
    setDetail(null);
    return { itemList: [{}] };
  }

  try {
    const res = await service.getReturnOrderDetail({
      id: bizNo,
      ...(orderNo ? { orderNo } : {}),
    });
    const data = res ?? {};
    setDetail(data);

    return {
      ...data,
      originalOrderNo: data.orderNo,
      itemList: (data.itemList ?? []).map(withValuationRate),
    };
  } catch {
    setDetail(null);
    return { itemList: [] };
  }
}, [mode, bizNo]);
~~~

这里缓存的是 getInitialValues 函数，不是接口返回的数据。

~~~text
useCallback 创建 getInitialValues
        ↓
表单调用 getInitialValues()
        ↓
请求详情接口
        ↓
返回表单初始值
~~~

新建模式直接返回一条空物料行；编辑模式请求详情后，再把后端数据转换成表单结构。originalOrderNo 用来保留原始订单号。

## 5. 第一个案例的 Review 点

当前依赖数组是：

~~~tsx
}, [mode, bizNo]);
~~~

但是函数内部使用了 orderNo：

~~~tsx
...(orderNo ? { orderNo } : {})
~~~

因此更完整的写法应该是：

~~~tsx
}, [mode, bizNo, orderNo]);
~~~

否则可能出现：

~~~text
orderNo 变化
mode 没变
bizNo 没变
getInitialValues 没有更新
继续使用旧的 orderNo 请求
~~~

这属于依赖数组不完整导致的旧闭包问题。

新人记忆：

> 回调函数内部读取了哪些外部变量，这些变量一般都应该放进依赖数组。

## 6. 第二个项目案例：保存采退单

~~~tsx
const handleSave = useCallback(
  async (values: Record<string, any>) => {
    const isEdit = mode === RETURN_ORDER_PAGE_MODE.EDIT;
    const rows = values.itemList ?? [];
    const orderChanged =
      Boolean(values.originalOrderNo) &&
      values.orderNo !== values.originalOrderNo;

    try {
      if (isEdit) {
        await service.updateReturnOrder(payload);
      } else {
        await service.saveReturnOrder(payload);
      }

      message.success('保存成功');
      emitReturnOrderChanged();
      closeReturnOrderDetailPage(returnPath);
    } catch {
      // 统一错误处理
    }
  },
  [mode, returnPath]
);
~~~

这里缓存的是 handleSave 函数，页面提交时才调用：

~~~tsx
await handleSave(values);
~~~

mode 决定调用新建接口还是编辑接口，returnPath 决定保存成功后返回哪里。values 是调用时传入的参数，不需要放进依赖数组。

保存成功后的流程：

~~~text
保存成功 → 显示提示 → 通知列表刷新 → 返回列表
~~~

emitReturnOrderChanged 是普通广播函数，不是 Hook。

## 7. 第二个 useCallback 的依赖数组

~~~tsx
[mode, returnPath]
~~~

这是合理的，因为函数内部使用了 mode 和 returnPath。

values 不需要写入依赖数组，因为它是调用时传入的参数：

~~~tsx
async (values) => {
  // values 来自调用方
}
~~~

依赖数组关注的是函数从外部闭包中读取的变量，而不是调用时传入的参数。

## 8. useCallback 不是保存业务状态

~~~text
useCallback
  缓存函数引用

useState
  保存组件状态

form
  保存表单数据
~~~

当前项目可以这样记：

~~~text
useDetailInit
  缓存异步获取初始表单值的函数

useSaveReturnOrder
  缓存保存采退单的函数
~~~

## 9. 什么时候不需要 useCallback？

React 官方建议不要给每个函数都无条件加 useCallback。它主要适合：

- 函数作为 props 传给经过 memo 优化的子组件
- 函数作为另一个 Hook 的依赖
- 某个组件或框架需要稳定的函数引用

普通函数如果不缓存也没有问题，可以直接写：

~~~tsx
const handleClick = () => {
  console.log('点击');
};
~~~

useCallback 主要是性能优化工具，不是保存业务状态的工具。

## 10. 新人记忆版

~~~text
useCallback = 缓存函数本身

第一个参数：要缓存的函数
第二个参数：函数依赖的外部变量

依赖没变：复用旧函数
依赖变化：创建新函数
~~~

当前项目最值得记录的 Review 点：

~~~tsx
// 当前代码
}, [mode, bizNo]);

// 建议补充 orderNo
}, [mode, bizNo, orderNo]);
~~~

## 参考资料

- [React 官方：useCallback](https://react.dev/reference/react/useCallback)
- [React 官方：useMemo](https://react.dev/reference/react/useMemo)
