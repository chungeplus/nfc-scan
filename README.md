# NFC 卡片助手

基于微信小程序、云开发和云托管的 NFC 写卡工具，当前主线版本为 `V3.0`。

## 当前能力

- 支持 `应用 / 音乐 / 网页 / WLAN / 本地音视频` 五类写卡入口
- `应用` 写卡仅支持 Android 包名直达，iPhone 微信进入首页会直接提示当前设备不支持 NFC 写卡
- `音乐` 写卡当前支持 `网易云音乐` 和 `QQ 音乐` 分享链接解析后写入
- `网页` 写卡支持手动输入或粘贴链接，自动补全 `https://`
- `WLAN` 写卡面向 Android，写入标准 `application/vnd.wfa.wsc` Wi-Fi NDEF 记录
- `本地音视频` 支持上传微信会话文件、生成播放页并写入 NFC
- 支持“我的文件”查看、复用、复制链接和删除媒体写卡记录

## 项目结构

```text
nfc-scan/
├─ miniprogram/         # 微信小程序
├─ cloudfunctions/      # 云函数
├─ play-web-service/    # 云托管服务与播放页
├─ tools/               # 本地校验脚本
├─ docs/                # 功能说明与原型
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
- [当前功能说明](docs/current-feature.md)
- [当前版本原型](docs/current-prototype.md)

## 版本说明

- 当前实现以 `miniprogram + media-share-service + play-web-service` 的完整联动为准
- 文档默认描述当前 `master` 的真实页面与功能，阅读时建议先看“当前功能说明”，再看“当前版本原型”

## Repository Tooling

- `npm run lint`: run shared code and style linting
- `npm run typecheck`: run mini program, web service, and cloud function type checks
- `npm run build`: build the cloud function and web service outputs
- `npm run verify`: run the full repository verification gate

## Modernization Rules

- Mini program TypeScript uses the official WeChat `typescript` compiler plugin together with `sass`.
- New and migrated async code should prefer `Promise`, `async`, and `await`.
- Once a module is migrated to `*.ts`, that `*.ts` file becomes the source of truth.
