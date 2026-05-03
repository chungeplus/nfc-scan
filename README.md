# NFC卡片助手

基于微信小程序、云开发和云部署的 NFC 写卡工具。当前主线版本为 `V3.0`。

## 当前能力

- 保留 `应用 / 音乐 / 网页` 写入能力
- 新增 `本地音视频` 上传与写入
- 新增 `我的文件` 管理
- 使用 `media-share-service` 管理 `media_files / media_shares`
- 使用 `play-web-service` 提供官网、播放页与分享详情接口

## 项目结构

```text
nfc-scan/
├─ miniprogram/         # 微信小程序
├─ cloudfunctions/      # 云函数
├─ play-web-service/    # 云部署服务与网页播放页
├─ docs/                # 版本化文档中心
└─ README.md
```

## 关键入口

- 小程序主入口：`miniprogram/pages/write-menu`
- 本地音视频：`miniprogram/pages/write-local-media`
- 我的文件：`miniprogram/pages/my-files`
- 云函数：`cloudfunctions/media-share-service`
- 云部署：`play-web-service`

## 文档

- [文档中心](C:/Users/yeizi/Desktop/nfc-scan/docs/README.md)
- [V3.0 项目总需求](C:/Users/yeizi/Desktop/nfc-scan/docs/versions/V3.0/requirements/V3.0-项目总需求.md)
- [V3.0 专项需求](C:/Users/yeizi/Desktop/nfc-scan/docs/versions/V3.0/requirements/V3.0-本地音视频播放页写入NFC需求.md)
- [V3.0 技术方案](C:/Users/yeizi/Desktop/nfc-scan/docs/versions/V3.0/technical/V3.0-本地音视频播放页写入NFC技术方案.md)
- [V3.0 开发任务拆分](C:/Users/yeizi/Desktop/nfc-scan/docs/versions/V3.0/technical/V3.0-开发任务拆分.md)

## 版本说明

- 当前主线统一维护在 `docs/versions/V3.0/`
- `V1.0 / V2.0` 仅保留归档说明，不再维护整套历史文档
- 当前实现以 `write-local-media + media-share-service + play-web-service` 为准
