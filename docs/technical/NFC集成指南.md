# NFC 如何在小程序中集成？从 API 选择到实战落地，一次讲清楚

大家好，我最近做了一个基于微信小程序的 `NFC` 写入工具，项目名叫 `NFC Scan`。它的核心目标很简单：把应用包名、音乐直达链接、网页地址写进 `NFC` 标签里，让用户用手机碰一碰就能快速跳转到目标内容。

这篇文章我不讲空泛概念，重点聊 3 件事：

- 小程序里能不能做 `NFC`
- 真正集成时要用哪些 API
- 一个可落地的 `NFC` 写入小程序应该怎么设计

如果你也准备把自己的 `NFC` 小程序开源到 `GitHub`，这篇内容也可以直接作为你的项目技术文章基础稿。

## 一、先说结论：小程序可以做 NFC，但有边界

很多人第一反应是：`NFC` 这种偏底层的能力，小程序真的能接吗？

答案是：**可以，但能力主要集中在 Android 设备，并且重点是基于 NDEF 标签进行发现、连接和写入。**

在我这个项目里，当前主要支持的是这几类写入场景：

- 写入 Android 应用包名
- 写入网页 URL
- 写入音乐直达链接

对应的用户体验就是：

1. 用户在小程序里填写目标内容
2. 点击开始写入
3. 小程序开启 `NFC` 标签发现
4. 用户把手机贴近标签
5. 小程序识别到标签后写入 `NDEF` 记录
6. 返回成功或失败结果

也就是说，小程序并不是"无限制操作所有 NFC 标签"，而是在微信提供的能力边界里，对 `NDEF` 标签做标准化写入。

## 二、做小程序 NFC 前，你要先知道的几个限制

正式写代码前，我建议先把下面几个现实约束讲清楚，不然后面很容易踩坑。

### 1. 设备限制

- 需要 Android 真机，并且设备本身支持 `NFC`
- 微信版本和基础库需要支持对应 `NFC` 能力
- iOS 侧能力通常不能按 Android 的方式完整落地

所以在产品设计上，最好一开始就把平台边界写清楚。比如我当前项目里，`iOS` 侧保留了入口说明，但不开放实际写入能力，避免用户误解。

### 2. 标签限制

- 不是所有标签都能写
- 最稳妥的是使用标准 `NDEF` 标签
- 标签容量不足、损坏、加密、协议不兼容时，都会导致失败

这也是为什么小程序里一定要做好错误态文案，比如：

- 当前设备不支持 NFC
- 不支持的标签技术
- 写入失败，请重试
- 无写入数据

### 3. 能力限制

小程序更适合做：

- 标签发现
- `NDEF` 连接
- 标准记录写入
- 写入流程的交互引导

不适合期待它做：

- 全协议全格式兼容
- 任意底层扇区级操作
- 脱离微信能力边界的系统级 NFC 控制

## 三、小程序集成 NFC，需要用到哪些 API

下面这部分是实战重点。

如果你要做一个小程序 `NFC` 写入工具，核心 API 基本就是下面这组。

### 1. `wx.getNFCAdapter()`

这是入口 API，用来获取 `NFC` 适配器实例。

```javascript
const nfcAdapter = wx.getNFCAdapter();
```

你可以把它理解成：后续所有发现、监听、连接、写入操作，都从这里开始。

### 2. `startDiscovery()`

开始监听附近的 `NFC` 标签。

```javascript
nfcAdapter.startDiscovery({
  success() {
    console.log('开始监听 NFC 标签');
  },
  fail() {
    console.log('监听失败');
  }
});
```

通常用户点击"开始写入"后，就该调用它了。

### 3. `onDiscovered()`

监听标签被发现的事件。

```javascript
nfcAdapter.onDiscovered((res) => {
  console.log('发现标签', res);
});
```

当用户把手机贴近标签时，这个回调会被触发。这里一般要做两件事：

- 判断标签技术类型
- 决定是否进入写入流程

我当前项目里就做了一个判断，如果标签 `techs` 中包含 `NDEF`，才继续写入，否则直接提示"不支持的标签技术"。

### 4. `getNdef()`

拿到 `NDEF` 读写实例。

```javascript
const ndef = nfcAdapter.getNdef();
```

如果你的业务目标是写入网页、应用、音乐直达这类标准跳转信息，基本都离不开这个实例。

### 5. `connect()`

在写入前先建立连接。

```javascript
ndef.connect({
  success() {
    console.log('连接成功');
  },
  fail(error) {
    console.log('连接失败', error);
  }
});
```

这一层很重要。很多项目写不进去，不一定是 `writeNdefMessage()` 本身有问题，而是连接状态没处理好。

### 6. `writeNdefMessage()`

真正执行写入的核心 API。

```javascript
ndef.writeNdefMessage({
  records: [
    {
      tnf: 1,
      id: new ArrayBuffer(0),
      type: new ArrayBuffer(0),
      payload: new ArrayBuffer(0)
    }
  ],
  success() {
    console.log('写入成功');
  },
  fail() {
    console.log('写入失败');
  }
});
```

注意这里最关键的不是"调用了这个 API"，而是你传进去的 `records` 是否符合 `NDEF` 规范。

### 7. `offDiscovered()`、`stopDiscovery()`、`close()`

这 3 个 API 用来做资源清理。

```javascript
nfcAdapter.offDiscovered(handler);
nfcAdapter.stopDiscovery();
ndef.close();
```

很多人容易忽略这一层，结果就是：

- 弹窗关了还在监听
- 同一个标签被重复触发多次
- 再次打开页面时状态混乱

所以只要写入结束、用户取消、组件销毁，都建议把监听和连接清掉。

## 四、NDEF 记录怎么设计

如果你第一次接触 `NFC` 开发，最容易卡住的点通常不是 API，而是：**我要往标签里写什么格式的数据？**

在我的项目里，主要用了两类记录：

### 1. URI 记录

适合写入：

- 网页链接
- 音乐深链
- 自定义协议链接

例如网页写入，可以使用 URI 类型记录：

```javascript
{
  tnf: 1,
  id: 'web',
  type: 'U',
  payload: 'https://example.com'
}
```

这里的 `type: 'U'` 本质上就是 URI Record。

### 2. Android Application Record

适合做 Android 应用直达。

例如：

```javascript
{
  tnf: 4,
  id: 'pkg',
  type: 'android.com:pkg',
  payload: 'com.tencent.mobileqq'
}
```

这类记录的意义是告诉系统：扫描标签后，优先尝试用指定应用处理内容。

如果你要做"碰一碰打开某个 App"，这类记录非常常见。

## 五、一个实际可用的小程序 NFC 写入流程应该怎么写

下面我结合自己的项目，把完整流程拆一遍。

### 第一步：准备写入数据

在真正贴标签前，先把业务内容整理成标准 `records`。

比如网页写入：

```javascript
this.setData({
  scanVisible: true,
  records: [
    {
      tnf: 1,
      id: 'web',
      type: 'U',
      payload: finalUrl
    }
  ]
});
```

比如应用写入：

```javascript
this.setData({
  scanVisible: true,
  records: [
    {
      tnf: 4,
      id: 'pkg',
      type: 'android.com:pkg',
      payload: packageName
    }
  ]
});
```

如果是音乐场景，我的做法是组合两条记录：

- 一条 URI 记录，写深链
- 一条 `android.com:pkg` 记录，指定目标 App

这样体验会更稳定。

### 第二步：打开写入弹窗，开始发现标签

我把这部分逻辑封装成了一个独立组件 `scan-dialog`，原因有两个：

- `NFC` 写入流程天然是一个独立状态机
- 等待、写入中、成功、失败，这几种状态很适合做成统一弹窗

组件显示时执行：

1. 判断 `wx.getNFCAdapter` 是否存在
2. 获取 `NFC` 适配器
3. 调用 `startDiscovery()`
4. 注册 `onDiscovered()` 监听

### 第三步：发现标签后判断是否支持 NDEF

这一步不能省。

```javascript
const techs = Array.isArray(res && res.techs) ? res.techs : [];

if (techs.includes('NDEF')) {
  this.ndefAdapterWrite();
} else {
  this.setData({
    scanStatus: 'error',
    errorMessage: '不支持的标签技术'
  });
}
```

如果你不做这个判断，很多非 `NDEF` 标签会直接把用户带进失败流程，而且错误原因会很模糊。

### 第四步：连接并写入

连接成功后，把业务记录转换为 `ArrayBuffer`，再调用 `writeNdefMessage()`。

```javascript
ndef.writeNdefMessage({
  records: records.map((recordItem) => ({
    tnf: recordItem.tnf,
    id: string2ArrayBuffer(recordItem.id),
    type: string2ArrayBuffer(recordItem.type),
    payload: buildPayload(recordItem)
  })),
  success: () => {
    console.log('写入成功');
  },
  fail: () => {
    console.log('写入失败');
  }
});
```

这里有个非常关键的细节：

- `id`
- `type`
- `payload`

最终往往都要转成二进制，也就是 `ArrayBuffer`。

我的项目里专门封装了字符串转 `ArrayBuffer` 和 URI Payload 编码逻辑，用来保证写进去的数据尽量符合 `NDEF` 规范。

## 六、除了 NFC API，本质上还要配哪些小程序能力

很多人以为做 `NFC` 小程序只要盯着 `NFC API` 就够了，其实不是。

一个真的可用的项目，往往还要配合这些能力：

### 1. `wx.request()`

如果你的写入内容不是纯手输，而是需要解析分享链接，就要用网络请求。

比如我的音乐写入页，支持：

- 网易云音乐分享链接
- QQ 音乐分享链接

处理方式是：

1. 用户粘贴分享链接
2. 小程序请求该链接
3. 读取重定向地址
4. 提取歌曲 ID
5. 转成目标 App 可识别的深链
6. 再写入 `NFC`

这类场景要记得提前在小程序后台配置合法 `request` 域名。

### 2. `wx.getClipboardData()`

这个 API 很适合 `NFC` 工具类小程序，因为大量输入场景都来自分享链接或包名复制。

```javascript
wx.getClipboardData({
  success: (res) => {
    console.log(res.data);
  }
});
```

我当前项目的网页写入、音乐写入、应用写入都支持一键粘贴，能明显减少输入成本。

### 3. `wx.canIUse()` 和兼容性判断

做工具类小程序，不要默认所有用户环境都完整支持。

比如版本更新能力里，我会先判断：

```javascript
if (!wx.canIUse || !wx.canIUse('getUpdateManager')) {
  return;
}
```

同样地，做 `NFC` 时也建议先判断 `wx.getNFCAdapter` 是否存在，避免设备或基础库不支持时直接报错。

### 4. `wx.getUpdateManager()`

如果你准备把项目长期维护并开源，这个能力很值得接入。

原因很简单：`NFC` 这类项目通常要不断修兼容问题，版本升级会比较频繁，及时让用户获取新版体验非常重要。

## 七、我这个项目里，NFC 集成是怎么拆模块的

为了后续开源更清晰，我把当前项目大致拆成了这几块：

### 1. 页面层

- `write-app`：写入应用包名
- `write-web`：写入网页地址
- `write-music`：解析音乐链接并写入

页面层只负责：

- 收集用户输入
- 校验参数
- 组装写入记录
- 打开扫描弹窗

### 2. 组件层

- `scan-dialog`

这个组件专门负责：

- 开启 `NFC` 发现
- 监听标签
- 判断 `NDEF`
- 连接标签
- 执行写入
- 展示状态反馈

这样做的好处是，所有业务页面都不用重复写一套 `NFC` 状态机。

### 3. 工具层

- `convert.js`：做字符串转二进制、URI Payload 编码
- `extract.js`：做音乐链接解析

这类项目特别适合把"业务输入"和"底层写入格式"分开，不然后期你一旦增加更多标签场景，页面逻辑会越来越乱。

## 八、实战里最容易踩的坑

如果你准备自己做一个类似项目，这部分建议重点看。

### 1. 不做重复发现保护

标签贴近手机时，`onDiscovered()` 可能在短时间内触发多次。

如果你没有加锁，可能会出现：

- 重复连接
- 重复写入
- 成功后又立刻报错

我在组件里用了 `writingLock` 来避免重复写入，这一步非常必要。

### 2. 只管写，不管清理

如果弹窗关闭后不执行：

- `offDiscovered()`
- `stopDiscovery()`
- `close()`

后面页面状态会越来越不稳定。

### 3. URI Payload 直接裸写字符串

很多开发者会把 URL 直接当普通字符串写进去，但 `URI Record` 最好按 `NDEF` 规范做前缀编码。

比如：

- `http://`
- `https://`
- 自定义协议

不同场景在 Payload 处理上是有差异的。

### 4. 忽略平台差异

做应用直达时，Android 和 iOS 的路径完全不是一个玩法。

如果你文章里不说明、代码里不区分、页面里不提示，用户体验会非常差。

### 5. 只做成功态，不做失败态

真正上线后，失败场景比你想象得多：

- 手机不支持 `NFC`
- 标签不是 `NDEF`
- 标签已损坏
- 标签容量不足
- 连接失败
- 写入失败

工具类产品尤其需要把失败原因讲人话。

## 九、如果你准备开源到 GitHub，建议这样整理

既然你准备把这个小程序开源，我建议不要只传代码仓库，最好同步整理下面这些内容。

### 1. README 要写清楚

建议至少包含：

- 项目简介
- 功能截图
- 技术栈
- 支持场景
- 已知限制
- 本地运行方式
- 小程序后台配置项
- `NFC` 设备要求

### 2. 文章和仓库互相导流

你发掘金文章时，可以在文末放：

- `GitHub` 仓库地址
- 项目截图
- 功能演示图
- 后续迭代计划

仓库 `README` 里也可以反向挂文章链接，方便读者理解实现思路。

### 3. 把能力边界写清楚

比如：

- 当前主要支持 Android
- 基于 `NDEF` 标签写入
- 音乐链接解析依赖合法域名配置
- iOS 暂不支持完整直达能力

这类说明越提前写清楚，后面 Issue 越少。

## 十、适合发掘金的文章结尾可以怎么写

如果你准备直接发布，我给你一个比较自然的收尾模板：

> 小程序并不是不能做 NFC，关键是要在微信提供的能力边界内，围绕 `NDEF` 标签把发现、连接、写入和交互流程设计完整。  
> 我这次做的 `NFC Scan`，本质上就是把"应用包名写入""网页链接写入""音乐深链写入"这三类常见场景做了产品化封装。  
> 如果你也在做类似项目，建议优先把标签格式、平台边界、失败态处理这三件事先打磨好，再去扩展更多业务能力。  
> 后续我也会把这个小程序整理后开源到 `GitHub`，如果你对小程序 `NFC`、NDEF 写入、音乐深链解析这类方向感兴趣，欢迎交流。

## 十一、给你的发布建议

最后，结合你当前这个项目，我建议你下一步直接做这几件事：

- 先把仓库发布到 `GitHub`
- 补一份完整 `README`
- 把这篇文章作为首篇技术介绍发到掘金
- 在文章里配 3 张图：首页、写入页、扫描弹窗
- 在仓库里补充项目结构和能力边界说明

这样你的开源项目会更完整，也更容易被别人看懂和复用。

## 十二、本文可直接复用的标题备选

如果你准备发掘金，下面几个标题都可以直接用：

- `NFC 如何在小程序中集成？我做了一个可写入标签的微信小程序`
- `微信小程序接入 NFC 实战：从标签发现到 NDEF 写入`
- `小程序能做 NFC 吗？一个 NFC Scan 开源项目的落地总结`
- `从 0 到 1 做一个支持 NFC 写入的小程序，需要哪些 API？`

如果你愿意，我下一步还可以继续帮你补两样内容：

- 一版更适合掘金排版的"精修版文章"
- 一版适合放在 `GitHub README` 的开源项目介绍
