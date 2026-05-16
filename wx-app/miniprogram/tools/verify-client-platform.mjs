import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(
  new URL('../utils/system-info.ts', import.meta.url),
  'utf8'
);

assert.match(source, /export interface ClientPlatformInfo/);
assert.match(source, /export function getClientPlatformInfo\(\)/);
assert.match(source, /wx\.getDeviceInfo/);
assert.match(source, /wx\.getSystemInfoSync/);
assert.match(source, /const isIOS =/);
assert.match(source, /return \{ platform, system, isIOS \};/);

console.log('PASS verify-client-platform');
