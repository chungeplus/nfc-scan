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

### 3. `onDiscovered()`

监听标签被发现的事件。

```javascript
nfcAdapter.onDiscovered((res) => {
  console.log('发现标签', res);
});
```

### 4. `getNdef()`

拿到 `NDEF` 读写实例。

```javascript
const ndef = nfcAdapter.getNdef();
```

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

### 7. `offDiscovered()`、`stopDiscovery()`、`close()`

这 3 个 API 用来做资源清理。

```javascript
nfcAdapter.offDiscovered(handler);
nfcAdapter.stopDiscovery();
ndef.close();
```

## 四、NDEF 记录怎么设计

### 1. URI 记录

适合写入网页链接、音乐深链、自定义协议链接。

```javascript
{
  tnf: 1,
  id: 'web',
  type: 'U',
  payload: 'https://example.com'
}
```

### 2. Android Application Record

适合做 Android 应用直达。

```javascript
{
  tnf: 4,
  id: 'pkg',
  type: 'android.com:pkg',
  payload: 'com.tencent.mobileqq'
}
```

## 五、一个实际可用的小程序 NFC 写入流程

### 第一步：准备写入数据

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

### 第二步：打开写入弹窗，开始发现标签

1. 判断 `wx.getNFCAdapter` 是否存在
2. 获取 `NFC` 适配器
3. 调用 `startDiscovery()`
4. 注册 `onDiscovered()` 监听

### 第三步：发现标签后判断是否支持 NDEF

```javascript
const techs = Array.isArray(res && res.techs) ? res.techs : [];
if (techs.includes('NDEF')) {
  this.ndefAdapterWrite();
} else {
  this.setData({ scanStatus: 'error', errorMessage: '不支持的标签技术' });
}
```

### 第四步：连接并写入

连接成功后，把业务记录转换为 `ArrayBuffer`，再调用 `writeNdefMessage()`。

## 六、本质上还要配哪些小程序能力

- `wx.request()` - 音乐链接解析
- `wx.getClipboardData()` - 一键粘贴
- `wx.canIUse()` - 兼容性判断
- `wx.getUpdateManager()` - 版本更新

## 七、实战里最容易踩的坑

1. **不做重复发现保护** - 标签贴近时 `onDiscovered()` 可能触发多次
2. **只管写，不管清理** - 弹窗关闭后不执行资源清理
3. **URI Payload 直接裸写字符串** - 没有按 NDEF 规范做前缀编码
4. **忽略平台差异** - Android 和 iOS 路径完全不同
5. **只做成功态，不做失败态** - 工具类产品尤其需要把失败原因讲人话

## 八、如果你准备开源到 GitHub

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

### 2. 把能力边界写清楚

- 当前主要支持 Android
- 基于 `NDEF` 标签写入
- 音乐链接解析依赖合法域名配置
- iOS 暂不支持完整直达能力

## 九、适合发掘金的文章结尾

> 小程序并不是不能做 NFC，关键是要在微信提供的能力边界内，围绕 `NDEF` 标签把发现、连接、写入和交互流程设计完整。
> 我这次做的 `NFC Scan`，本质上就是把"应用包名写入""网页链接写入""音乐深链写入"这三类常见场景做了产品化封装。
> 如果你也在做类似项目，建议优先把标签格式、平台边界、失败态处理这三件事先打磨好，再去扩展更多业务能力。
> 后续我也会把这个小程序整理后开源到 `GitHub`，如果你对小程序 `NFC`、NDEF 写入、音乐深链解析这类方向感兴趣，欢迎交流。

## 十、备选标题

- `NFC 如何在小程序中集成？我做了一个可写入标签的微信小程序`
- `微信小程序接入 NFC 实战：从标签发现到 NDEF 写入`
- `小程序能做 NFC 吗？一个 NFC Scan 开源项目的落地总结`
- `从 0 到 1 做一个支持 NFC 写入的小程序，需要哪些 API？`
