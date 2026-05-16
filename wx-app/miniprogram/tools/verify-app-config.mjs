import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(
  new URL('../app.json', import.meta.url),
  'utf8'
);
const appConfig = JSON.parse(source);

const locationPermission = appConfig.permission?.['scope.userLocation'];
assert.ok(locationPermission, 'scope.userLocation permission is required');
assert.ok(
  locationPermission.desc.length <= 30,
  `scope.userLocation desc must be <= 30 chars, received ${locationPermission.desc.length}`
);

console.log('PASS verify-app-config');
