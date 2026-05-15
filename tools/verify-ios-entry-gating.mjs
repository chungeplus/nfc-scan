import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [jsSource, wxmlSource] = await Promise.all([
  fs.readFile(
    new URL('../miniprogram/pages/write-menu/write-menu.ts', import.meta.url),
    'utf8'
  ),
  fs.readFile(
    new URL('../miniprogram/pages/write-menu/write-menu.wxml', import.meta.url),
    'utf8'
  ),
]);

assert.match(jsSource, /getClientPlatformInfo/);
assert.match(jsSource, /isIOSClient/);
assert.match(jsSource, /iosBlockedDialogVisible/);
assert.match(wxmlSource, /iosBlockedDialogVisible/);
assert.doesNotMatch(jsSource, /IOS_BLOCKED_MESSAGE/);
assert.match(wxmlSource, /苹果手机微信暂不支持 NFC 写卡/);
assert.match(wxmlSource, /请使用安卓设备继续操作/);
assert.doesNotMatch(wxmlSource, /仍可查看页面和管理云端文件/);

console.log('PASS verify-ios-entry-gating');
