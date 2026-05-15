# NFC 卡片助手

基于微信小程序、云开发和云托管的 NFC 写卡工具，当前主线版本为 `V3.0`。

## 当前能力

- 支持 `应用 / 音乐 / 网页 / WLAN / 本地音视频` 五类写卡入口
- `WLAN` 写卡面向 Android 场景，写入标准 `application/vnd.wfa.wsc` Wi-Fi NDEF 记录
- WLAN 页面支持优先带出当前已连接网络，并按需扫描附近 WLAN
- 当前 WLAN 写卡版本聚焦 `WPA2-Personal`，不支持开放网络 / WEP / 企业网络
- 支持本地音视频上传后生成播放页并写入 NFC
- 支持“我的文件”查看、复用和删除媒体写卡记录

## 项目结构

```text
nfc-scan/
├─ miniprogram/         # 微信小程序
├─ cloudfunctions/      # 云函数
├─ play-web-service/    # 云托管服务与播放页
├─ tools/               # 本地校验脚本
├─ docs/                # 设计、原型、计划
└─ README.md
```

## 关键入口

- 小程序首页：`miniprogram/pages/write-menu`
- WLAN 写卡页：`miniprogram/pages/write-wifi`
- 本地音视频：`miniprogram/pages/write-local-media`
- 我的文件：`miniprogram/pages/my-files`
- 云函数：`cloudfunctions/media-share-service`
- 云托管：`play-web-service`

## 文档

- [文档目录](docs/README.md)
- [WLAN NFC 需求设计](docs/superpowers/specs/2026-05-14-wlan-nfc-design.md)
- [WLAN NFC 原型同步稿](docs/superpowers/specs/2026-05-15-wlan-nfc-prototype.md)
- [WLAN NFC 实施计划](docs/superpowers/plans/2026-05-14-wlan-nfc-implementation.md)

## 版本说明

- 当前实现以 `write-local-media + media-share-service + play-web-service + write-wifi` 为准
- 当前 `master` 已同步 WLAN 入口、Wi-Fi NDEF 编码和相关文档
