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

console.log('PASS verify-miniprogram-typescript-migration task1');
