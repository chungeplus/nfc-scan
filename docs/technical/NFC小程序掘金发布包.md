---
theme: hydrogen
---

> 项目已开源：[chungeplus/nfc-scan](https://github.com/chungeplus/nfc-scan)，配套源码+需求文档，欢迎 star

![gh_78e57d43077f_258.jpg](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/f17cc0d1b59043a7a34ca045591c9618~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAg55So5rOl56eN6I236Iqx:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiNDIxMjk4NDI4OTQ0MjAzMCJ9&rk3s=f64ab15b&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1777359118&x-orig-sign=6755EQ27mdlF%2Fy591DRPdGmQeQQ%3D)

***

# 先说结论

小程序**可以做 NFC**，但有明确的能力边界：

*   主要面向 **Android 设备**
*   基于 **NDEF 标准标签**做发现、连接和写入
*   iOS 端暂时无法按 Android 的方式落地

所以与其纠结"能不能做"，不如把**"在能力边界内怎么做"**这件事先摸清楚。

***

# 一、我的项目里做了什么

**NFC Scan** 这个小程序，核心功能就一件：**把网页链接、应用包名、音乐直达链接写进 NFC 标签**，让用户用手机碰一碰就能跳转到目标内容。

实现的效果就是：

1.  用户在小程序里填写目标内容
2.  点击开始写入
3.  小程序开启 NFC 标签发现
4.  用户把手机贴近标签
5.  小程序写入 NDEF 记录
6.  返回成功或失败

| 功能截图1 | 功能截图2 |
| --- | --- |
| 应用写入 | 音乐写入 |
| 网页写入 | NFC弹窗 |

***

# 二、正式写代码前，先了解这几个限制

## 1. 设备限制

*   需要 **Android 真机**，且设备本身支持 NFC
*   微信基础库版本需要匹配 NFC 能力
*   iOS 侧能力不完整，入口说明可以保留，但不要开放写入

## 2. 标签限制

*   **不是所有 NFC 标签都能写**，最稳妥的是标准 NDEF 标签
*   标签容量不足、损坏、加密、协议不兼容，都会导致失败

所以一定要做好**错误态文案**：

    当前设备不支持 NFC
    不支持的标签技术
    写入失败，请重试
    标签损坏或容量不足

## 3. 能力边界

小程序适合做：

*   标签发现
*   NDEF 连接
*   标准记录写入
*   写入流程的交互引导

小程序不适合做：

*   全协议全格式兼容
*   底层扇区级操作
*   脱离微信能力边界的 NFC 控制

***

# 三、核心 API 就这 7 个

这是实战重点。做 NFC 写入小程序的 API 核心就一组：

## 1. `wx.getNFCAdapter()` — 获取适配器

```javascript
const nfcAdapter = wx.getNFCAdapter();
```

这是入口，后续所有操作都从这里开始。

## 2. `startDiscovery()` — 开始监听标签

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

用户点击"开始写入"后调用。

## 3. `onDiscovered()` — 监听标签发现

```javascript
nfcAdapter.onDiscovered((res) => {
  // 判断标签类型，决定是否进入写入流程
  const techs = res.techs || [];
  if (techs.includes('NDEF')) {
    this.ndefAdapterWrite();
  } else {
    this.showError('不支持的标签技术');
  }
});
```

## 4. `getNdef()` — 获取 NDEF 实例

```javascript
const ndef = nfcAdapter.getNdef();
```

做应用直达、网页链接这类场景，都离不开这个实例。

## 5. `connect()` — 连接标签

```javascript
ndef.connect({
  success() {
    this.writeRecords();
  },
  fail(error) {
    // 13022 或 "already connected" 说明已连接，可以继续写入
    if (error.errCode === 13022) {
      this.writeRecords();
    } else {
      this.showError('连接失败');
    }
  }
});
```

## 6. `writeNdefMessage()` — 执行写入

```javascript
ndef.writeNdefMessage({
  records: records.map(item => ({
    tnf: item.tnf,
    id: string2ArrayBuffer(item.id),
    type: string2ArrayBuffer(item.type),
    payload: buildPayload(item),
  })),
  success() {
    console.log('写入成功');
  },
  fail() {
    console.log('写入失败');
  }
});
```

注意：这里的 `records` 必须符合 NDEF 规范，不是随便传字符串就行。

## 7. 资源清理 — 3 个 API

    offDiscovered()  // 取消监听
    stopDiscovery()   // 停止发现
    close()           // 关闭连接

很多人容易忽略这一层，结果弹窗关了还在监听、同一标签被重复触发。

***

# 四、NDEF 记录怎么设计

"我要往标签里写什么格式"是第一次做 NFC 开发最容易卡住的地方。

## 场景一：写入网页链接 → 用 URI 记录

```javascript
{
  tnf: 1,
  id: 'web',
  type: 'U',
  payload: 'https://example.com'
}
```

## 场景二：写入应用包名 → 用 Android Application Record

```javascript
{
  tnf: 4,
  id: 'pkg',
  type: 'android.com:pkg',
  payload: 'com.tencent.mobileqq'
}
```

## 场景三：写入音乐直达链接

我当时的做法是**组合两条记录**：

```javascript
// 网易云音乐
{
  tnf: 1,
  id: 'music',
  type: 'U',
  payload: 'orpheus://song/413829859/?autoplay=true'
}
// + 目标 App 包名
{
  tnf: 4,
  id: 'pkg',
  type: 'android.com:pkg',
  payload: 'com.netease.cloudmusic'
}
```

这样体验更稳定，碰一碰就能直接拉起对应 App 播放歌曲。

***

# 五、完整写入流程怎么写

我的做法是把 NFC 写入封装成一个独立组件 `scan-dialog`，原因有两个：

1.  NFC 写入天然是一个**独立状态机**
2.  等待、写入中、成功、失败、重试，适合做成统一弹窗

整体流程拆解如下：

## 第一步：准备写入数据

在用户点击"开始写入"后，把业务内容整理成标准 `records`，传给弹窗组件。

```javascript
this.setData({
  scanVisible: true,
  records: [{
    tnf: 1,
    id: 'web',
    type: 'U',
    payload: 'https://example.com'
  }]
});
```

## 第二步：组件显示，开始监听

```javascript
onShow() {
  if (!wx.getNFCAdapter) {
    this.setData({ scanStatus: 'error', errorMessage: '当前设备不支持 NFC' });
    return;
  }

  const adapter = wx.getNFCAdapter();
  adapter.startDiscovery({
    success: () => {
      adapter.onDiscovered(this.handleDiscovered);
    },
    fail: () => {
      this.setData({ scanStatus: 'error', errorMessage: '发现NFC设备失败' });
    }
  });
}
```

## 第三步：发现标签后判断类型

```javascript
handleDiscovered(res) {
  const techs = Array.isArray(res.techs) ? res.techs : [];

  if (techs.includes('NDEF')) {
    this.ndefAdapterWrite();
  } else {
    this.setData({ scanStatus: 'error', errorMessage: '不支持的标签技术' });
  }
}
```

## 第四步：连接并写入

```javascript
ndefAdapterWrite() {
  const ndef = this.data.baseNfcAdapter.getNdef();

  ndef.connect({
    success: () => {
      ndef.writeNdefMessage({
        records: this.buildRecords(),
        success: () => {
          this.setData({ scanStatus: 'success' });
        },
        fail: () => {
          this.setData({ scanStatus: 'error', errorMessage: '写入失败，请重试' });
        }
      });
    },
    fail: (error) => {
      if (error.errCode === 13022) {
        // 已连接，直接写入
        ndef.writeNdefMessage({ ... });
      } else {
        this.setData({ scanStatus: 'error', errorMessage: '连接失败' });
      }
    }
  });
}
```

***

# 六、除了 NFC API，还要配哪些能力

很多人以为只要盯着 NFC API 就够了，其实不是。

| API                     | 用途       |
| ----------------------- | -------- |
| `wx.request()`          | 音乐分享链接解析 |
| `wx.getClipboardData()` | 一键粘贴     |
| `wx.canIUse()`          | 兼容性判断    |
| `wx.getUpdateManager()` | 版本更新     |

***

# 七、最容易踩的 5 个坑

## 1. 不做重复发现保护

标签贴近时 `onDiscovered()` 可能在短时间触发多次，没加锁就会出现重复写入。

我的做法是加一个 `writingLock`，发现标签后立刻上锁，写完再解锁。

## 2. 只管写，不管清理

弹窗关闭后不执行 `offDiscovered()` + `stopDiscovery()` + `close()`，会导致页面状态越来越乱。

## 3. URI Payload 直接裸写字符串

URI Record 要按 NDEF 规范做**前缀编码**：

*   `https://` → 前缀码 `0x04`
*   `http://` → 前缀码 `0x03`
*   自定义协议（`orpheus://`、`qqmusic://`）→ 前缀码 `0x00`

不同场景处理方式不一样，直接写字符串进去大概率会失败。

## 4. 忽略平台差异

Android 和 iOS 的 NFC 路径完全不同。我的处理方式是 iOS 保留入口但禁用写入，避免用户误解。

## 5. 只做成功态，不做失败态

真正上线后，失败场景比想象的多：

    手机不支持 NFC
    标签不是 NDEF 类型
    标签已损坏
    标签容量不足
    连接失败
    写入失败

工具类产品尤其需要把失败原因讲清楚，不要只给一个"写入失败"的模糊提示。

***

# 八、项目结构一览

```
miniprogram/
├── components/               # 自定义组件
│   ├── pixel-navbar/         # 像素风导航栏
│   ├── pixel-toast/          # 像素风提示
│   ├── pixel-icon/           # 像素风图标
│   └── scan-dialog/          # NFC 写入弹窗
├── pages/                    # 页面
│   ├── write-menu/           # 首页（功能入口）
│   ├── write-app/           # 应用写入
│   ├── write-music/          # 音乐写入
│   └── write-web/           # 网页写入
├── styles/                   # 全局样式
├── utils/                    # 工具函数
│   ├── convert.js           # NDEF 数据转换
│   └── extract.js           # 音乐链接解析
└── app.js
```

***

# 九、最后

小程序 NFC 这件事，核心就一句话：**在微信提供的能力边界内，把 NDEF 标签的发现、连接、写入和交互流程设计完整**。

如果你是自己从零做，建议优先把：

*   标签格式（NDEF 规范）
*   平台边界（Android / iOS 差异）
*   失败态处理（把原因讲清楚）

这三件事先打磨好，再去扩展更多业务能力。

> 项目已开源到 GitHub：[chungeplus/nfc-scan](https://github.com/chungeplus/nfc-scan)，包含完整源码、需求文档和发布说明，欢迎参考交流。
