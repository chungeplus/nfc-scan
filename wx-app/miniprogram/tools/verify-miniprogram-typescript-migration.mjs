import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function read(relativePath) {
  return fs.readFile(path.join(rootDir, relativePath), 'utf8');
}

const sharedTsFiles = [
  'utils/cloud-config.ts',
  'utils/convert.ts',
  'utils/extract.ts',
  'utils/media.ts',
  'utils/media-share-service.ts',
  'utils/pixel-toast.ts',
  'utils/system-info.ts',
  'utils/wifi-manager.ts',
  'utils/wifi-ndef.ts',
];

for (const relativePath of sharedTsFiles) {
  const source = await read(relativePath);
  assert.match(source, /export /, `${relativePath} should export typed symbols`);
}

const uiTsFiles = [
  'custom-tab-bar/index.ts',
  'components/pixel-icon/pixel-icon.ts',
  'components/pixel-navbar/pixel-navbar.ts',
  'components/pixel-toast/pixel-toast.ts',
  'components/scan-dialog/scan-dialog.ts',
];

for (const relativePath of uiTsFiles) {
  const source = await read(relativePath);
  assert.match(source, /(Component|Page)\(/, `${relativePath} should remain a mini program runtime module`);
}

const pageTsFiles = [
  'app.ts',
  'pages/my-files/my-files.ts',
  'pages/write-menu/write-menu.ts',
  'pages/write-app/write-app.ts',
  'pages/write-web/write-web.ts',
  'pages/write-music/write-music.ts',
  'pages/write-local-media/write-local-media.ts',
  'pages/write-wifi/write-wifi.ts',
];

for (const relativePath of pageTsFiles) {
  const source = await read(relativePath);
  assert.match(source, /(App|Page)(<[\s\S]*?>)?\(/, `${relativePath} should remain a mini program entrypoint`);
}

console.log('PASS verify-miniprogram-typescript-migration task1');
