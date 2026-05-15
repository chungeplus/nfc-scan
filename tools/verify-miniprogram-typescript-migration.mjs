import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function read(relativePath) {
  return fs.readFile(path.join(rootDir, relativePath), 'utf8');
}

const sharedTsFiles = [
  'miniprogram/utils/cloud-config.ts',
  'miniprogram/utils/convert.ts',
  'miniprogram/utils/extract.ts',
  'miniprogram/utils/media.ts',
  'miniprogram/utils/media-share-service.ts',
  'miniprogram/utils/pixel-toast.ts',
  'miniprogram/utils/system-info.ts',
  'miniprogram/utils/wifi-manager.ts',
  'miniprogram/utils/wifi-ndef.ts',
];

for (const relativePath of sharedTsFiles) {
  const source = await read(relativePath);
  assert.match(source, /export /, `${relativePath} should export typed symbols`);
}

const uiTsFiles = [
  'miniprogram/custom-tab-bar/index.ts',
  'miniprogram/components/pixel-icon/pixel-icon.ts',
  'miniprogram/components/pixel-navbar/pixel-navbar.ts',
  'miniprogram/components/pixel-toast/pixel-toast.ts',
  'miniprogram/components/scan-dialog/scan-dialog.ts',
];

for (const relativePath of uiTsFiles) {
  const source = await read(relativePath);
  assert.match(source, /(Component|Page)\(/, `${relativePath} should remain a mini program runtime module`);
}

console.log('PASS verify-miniprogram-typescript-migration task1');
