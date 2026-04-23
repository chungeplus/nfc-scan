# 本地音频上传后写入 NFC 技术方案

**所属产品**：NFC卡片助手  
**所属版本**：V2.0  
**文档版本**：V1.0  
**创建日期**：2026-04-23  
**文档状态**：按当前代码实现整理

---

## 一、方案概述

当前版本的“本地音频上传后写入 NFC”采用的是一条直接可落地的链路：

1. 小程序从微信会话中选择本地音频文件
2. 前端校验文件格式与大小
3. 上传到云存储 `audio-files/`
4. 调用云函数 `audio-file-service`
5. 云函数写入数据库 `audio_files`
6. 云函数返回音频可访问链接 `playUrl`
7. 前端将 `playUrl` 写入 NFC 标签

该方案是当前代码已经实现的方案，不包含独立 H5 播放页，也不包含视频能力。

---

## 二、当前代码结构

### 2.1 页面结构

| 页面 | 路径 | 职责 |
|------|------|------|
| 首页 | `miniprogram/pages/write-menu` | 入口聚合、开发者承诺、NFC 支持检测 |
| 写入本地音频 | `miniprogram/pages/write-local-audio` | 选择文件、上传、生成链接、写卡 |
| 我的文件 | `miniprogram/pages/my-files` | 拉取记录、复用写卡、删除 |

### 2.2 公共组件

| 组件 | 路径 | 职责 |
|------|------|------|
| 自定义 tabBar | `miniprogram/custom-tab-bar` | 底部 `NFC / 我的文件` 切换 |
| NFC 写卡弹窗 | `miniprogram/components/scan-dialog` | 统一写卡交互状态 |
| 像素导航栏 | `miniprogram/components/pixel-navbar` | 顶部导航 |
| 像素 Toast | `miniprogram/components/pixel-toast` | 轻提示 |

### 2.3 云端结构

| 项目 | 当前实现 |
|------|----------|
| 云环境 | `cloud1-5gsbvhr91440e872` |
| 云函数 | `audio-file-service` |
| 数据库集合 | `audio_files` |
| 云存储目录 | `audio-files/` |

---

## 三、前端实现方案

### 3.1 基础配置

配置文件：`miniprogram/utils/cloud-config.js`

当前配置包括：

- 云环境 ID：`cloud1-5gsbvhr91440e872`
- 云函数名：`audio-file-service`
- 数据库集合名：`audio_files`
- 支持格式：`mp3 / m4a / wav`
- 文件大小上限：`20MB`

### 3.2 文件选择

页面：`miniprogram/pages/write-local-audio/write-local-audio.js`

当前使用：

- `wx.chooseMessageFile`

参数约束：

- `count: 1`
- `type: 'file'`
- `extension: ['mp3', 'm4a', 'wav']`

说明：

- 当前不是小程序内录音
- 当前只能从微信会话选择文件

### 3.3 文件校验

工具文件：`miniprogram/utils/audio.js`

当前校验逻辑：

- 通过扩展名判断是否为支持格式
- 限制最大体积为 `20MB`
- 文件名为空或路径异常时直接报错

相关方法：

- `validateAudioFile`
- `getFileExtension`
- `formatFileSize`
- `buildCloudAudioPath`

### 3.4 上传流程

上传由 `write-local-audio.js` 完成：

1. 调用 `wx.cloud.uploadFile`
2. 上传路径通过 `buildCloudAudioPath` 生成
3. 路径格式：

```text
audio-files/{timestamp}-{random}-{safeFileName}
```

上传成功后继续调用云函数建档。

页面状态补充：

- `submittingText` 会覆盖“上传中...”与“生成链接中...”
- `errorMessage` 通过 `inline-error` 展示格式校验、大小限制、上传失败和链接不可用等错误提示

### 3.5 云函数调用封装

文件：`miniprogram/utils/audio-file-service.js`

前端统一通过 `wx.cloud.callFunction` 调用：

- `createAudioRecord`
- `listAudioRecords`
- `deleteAudioRecord`

调用方式：

```js
wx.cloud.callFunction({
  name: 'audio-file-service',
  data: {
    action,
    payload,
  },
})
```

### 3.6 我的文件复用逻辑

为了支持“我的文件 -> 去写入 -> 回到写入本地音频页继续写卡”，当前实现使用：

- `app.globalData.pendingAudioRecord`

处理流程：

1. 在 `my-files` 点击 `去写入`
2. 将当前记录写入 `pendingAudioRecord`
3. `navigateTo` 到 `write-local-audio`
4. `write-local-audio` 在 `onLoad` 时消费该记录
5. 页面显示“已带入文件”

### 3.7 我的文件加载状态

页面：`miniprogram/pages/my-files/my-files.wxml`

当前实现：

- 页面进入后先展示“正在加载我的文件”
- 云函数返回当前用户音频记录与最新可用播放链接
- 根据返回结果切换为空态或列表态

### 3.8 自定义 tabBar

目录：`miniprogram/custom-tab-bar`

当前实现：

- `tabBar.custom = true`
- 共 2 个入口：
  - `NFC`
  - `我的文件`

页面在 `onShow` 中调用 `getTabBar()` 同步选中态。

---

## 四、云函数方案

文件：`cloudfunctions/audio-file-service/index.js`

### 4.1 action 设计

当前支持 3 个动作：

- `create`
- `list`
- `delete`

### 4.2 create

职责：

- 校验 `fileId / fileName / fileSize`
- 接收并写入 `fileExt`
- 调用 `cloud.getTempFileURL`
- 生成 `playUrl`
- 写入数据库记录

返回结果：

- `success`
- `record`

### 4.3 list

职责：

- 根据当前用户 `openid` 拉取活跃记录
- 优先按 `createdAt desc` 排序
- 若排序失败则回退为内存排序
- 为每条记录重新获取最新 `playUrl`
- 若链接重新获取失败，则返回空 `playUrl`，由前端禁用“去写入”

当前前端默认拉取：

- `limit: 50`

### 4.4 delete

职责：

- 校验记录归属
- 将记录状态改为 `deleted`
- 清空 `playUrl`
- 删除云存储文件
- 删除云存储文件失败时不会中断当前删除结果

删除后：

- 记录不会再在“我的文件”中展示
- 旧 NFC 链接失效

---

## 五、数据库设计

集合名称：`audio_files`

### 5.1 字段结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `openid` | String | 当前用户标识 |
| `fileId` | String | 云存储文件 ID |
| `fileName` | String | 原始文件名 |
| `fileExt` | String | 扩展名 |
| `fileSize` | Number | 文件大小，单位字节 |
| `playUrl` | String | 当前可访问链接 |
| `status` | String | `active / deleted` |
| `createdAt` | Number | 创建时间戳 |
| `updatedAt` | Number | 更新时间戳 |
| `deletedAt` | Number / null | 删除时间戳 |

### 5.2 推荐索引

建议建立：

- `openid`
- `status`
- `createdAt`

---

## 六、NFC 写卡实现

当前统一复用 `scan-dialog`。

### 6.1 写入数据格式

本地音频写入 NFC 时，记录格式为：

```js
[
  {
    tnf: 1,
    id: 'audio',
    type: 'U',
    payload: playUrl,
  }
]
```

### 6.2 写卡状态

当前组件覆盖以下状态：

- 等待贴近标签
- 写入中
- 写入成功
- 写入失败

### 6.3 本地音频成功态差异

本地音频成功态比其他页面多一个动作按钮：

- `继续写入`
- `回我的文件`

---

## 七、当前限制与注意事项

### 7.1 链接长期有效条件

当前代码通过 `cloud.getTempFileURL` 获取音频可访问链接。  
为了满足“写入 NFC 后长期有效”的目标，云存储 `audio-files/` 路径需要配置为`公有读`。

如果未配置为公有读，前端虽然仍可看到记录，但“我的文件”页可能拿不到可用 `playUrl`，此时“去写入”按钮会被禁用。

### 7.2 浏览器行为限制

当前写入的是云存储文件链接，不是独立播放页：

- 部分浏览器会直接播放
- 部分浏览器可能触发下载

这属于当前方案的已知边界。

### 7.3 当前未覆盖能力

当前技术方案不包含：

- 小程序内录音
- 独立 H5 播放页
- 视频上传
- 多主题媒体分享页
- 通用媒体数据架构

---

## 八、后续可升级方向

如果未来继续迭代，建议的升级顺序为：

1. 引入独立播放页，NFC 不再写云存储直链
2. 将音频记录拆分为文件记录与分享记录
3. 扩展视频能力
4. 支持多主题媒体分享页
