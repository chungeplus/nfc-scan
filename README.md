# NFC Scan - 微信小程序 NFC 写入工具

<div align="center">

<img src="https://img.shields.io/badge/WeChat%20Mini%20Program-3.10.2-blue" alt="Miniprogram Version">
<img src="https://img.shields.io/badge/NFC-NDEF%20Write-green" alt="NFC Capability">
<img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">

</div>

---

## 项目简介

**NFC Scan** 是一款基于微信小程序的 NFC 标签写入工具，核心功能是将应用包名、音乐直达链接、网页地址写入 NFC 标签，实现"碰一碰"快速跳转。

用户只需将手机靠近 NFC 标签，即可自动唤起目标应用、播放音乐或打开网页。

---

## 功能特性

| 功能 | 说明 |
|------|------|
| 应用写入 | 输入 Android 应用包名，写入 NFC 标签 |
| 音乐写入 | 解析网易云音乐 / QQ 音乐分享链接，写入 NFC 标签 |
| 网页写入 | 输入网页 URL，写入 NFC 标签 |
| 一键粘贴 | 支持从剪贴板快速粘贴链接或包名 |
| 实时校验 | 包名、URL 格式实时校验，错误提示 |
| 版本更新 | 自动检测并提示小程序版本更新 |

---

## 技术栈

| 类别 | 技术选型 |
|------|----------|
| 框架 | 微信小程序原生框架 |
| 组件 | 自研像素风 UI 组件 |
| 样式 | SCSS（变量 + 混合器 + 动画） |
| 图标 | pixel-icon 像素图标组件 |
| 字体 | 等宽字体（Courier New / monospace） |

---

## 项目结构

```
nfc-scan/
├── miniprogram/                  # 小程序主体代码
│   ├── components/               # 自定义组件
│   │   ├── pixel-navbar/         # 像素风导航栏
│   │   ├── pixel-toast/          # 像素风提示
│   │   ├── pixel-icon/           # 像素风图标
│   │   └── scan-dialog/          # NFC 写入弹窗
│   ├── pages/                    # 页面
│   │   ├── write-menu/           # 首页（功能入口）
│   │   ├── write-app/           # 应用写入
│   │   ├── write-music/          # 音乐写入
│   │   └── write-web/           # 网页写入
│   ├── styles/                   # 全局样式
│   │   ├── variables.scss        # SCSS 变量
│   │   ├── mixins.scss          # 混合器
│   │   ├── animations.scss       # 动画定义
│   │   └── base.scss            # 基础样式
│   ├── utils/                    # 工具函数
│   │   ├── convert.js           # NDEF 数据转换
│   │   ├── extract.js           # 音乐链接解析
│   │   └── pixel-toast.js       # Toast 封装
│   ├── app.js
│   ├── app.json
│   └── app.scss
├── 需求文档/                      # 项目文档
│   ├── 需求文档.md
│   ├── 发布说明.md
│   ├── 发布前测试清单.md
│   └── 回归测试结论单.md
├── UI图/                         # UI 设计稿
├── 原型图/                        # 交互原型
└── README.md
```

---

## 核心 API

本项目使用微信小程序提供的 NFC 能力：

| API | 用途 |
|-----|------|
| `wx.getNFCAdapter()` | 获取 NFC 适配器实例 |
| `nfcAdapter.startDiscovery()` | 开始监听 NFC 标签 |
| `nfcAdapter.onDiscovered()` | 监听标签发现事件 |
| `nfcAdapter.getNdef()` | 获取 NDEF 读写实例 |
| `ndef.connect()` | 连接 NFC 标签 |
| `ndef.writeNdefMessage()` | 写入 NDEF 记录 |
| `ndef.close()` | 关闭连接 |

---

## 已知限制

- **仅支持 Android 设备**：NFC 写入能力依赖 Android 真机
- **NDEF 标签**：当前仅支持标准 NDEF 格式标签
- **iOS 暂不支持**：iOS 端保留入口但不开放写入能力
- **音乐解析**：需在小程序后台配置合法 request 域名

---

## 本地运行

1. 下载项目代码
2. 使用微信开发者工具打开项目
3. 选择项目目录为 `nfc-scan/`
4. 编译预览

> 注意：NFC 写入功能需要在 Android 真机上测试，开发者工具模拟器不支持 NFC。

---

## 小程序后台配置

如需使用音乐链接解析功能，需在小程序后台配置以下合法域名：

- 网易云音乐域名
- QQ 音乐域名

---

## 相关文档

- [需求文档](需求文档/需求文档.md)
- [发布说明](需求文档/发布说明.md)
- [掘金文章：《NFC 如何在小程序中集成》](NFC如何在小程序中集成.md)

---

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。

---

## 交流与反馈

如果你在使用过程中遇到问题，或者有新功能建议，欢迎提交 Issue。
