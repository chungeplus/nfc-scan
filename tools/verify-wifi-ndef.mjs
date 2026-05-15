import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(
  new URL('../miniprogram/utils/wifi-ndef.js', import.meta.url),
  'utf8'
);
const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
const { WIFI_WSC_MIME_TYPE, buildWifiConfigPayload } = await import(moduleUrl);

function readTlv(view, offset) {
  const fieldId = (view[offset] << 8) | view[offset + 1];
  const length = (view[offset + 2] << 8) | view[offset + 3];
  const valueStart = offset + 4;
  const valueEnd = valueStart + length;

  return {
    fieldId,
    length,
    value: view.slice(valueStart, valueEnd),
    nextOffset: valueEnd,
  };
}

function decodeUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}

assert.equal(WIFI_WSC_MIME_TYPE, 'application/vnd.wfa.wsc');

const payload = new Uint8Array(
  buildWifiConfigPayload({
    ssid: 'OfficeWiFi',
    password: 'Pixel12345678',
  })
);

const credential = readTlv(payload, 0);
assert.equal(credential.fieldId, 0x100e);

let innerOffset = 0;
const seen = new Map();
while (innerOffset < credential.value.length) {
  const field = readTlv(credential.value, innerOffset);
  seen.set(field.fieldId, field);
  innerOffset = field.nextOffset;
}

assert.equal(decodeUtf8(seen.get(0x1045).value), 'OfficeWiFi');
assert.equal(decodeUtf8(seen.get(0x1027).value), 'Pixel12345678');
assert.equal((seen.get(0x1003).value[0] << 8) | seen.get(0x1003).value[1], 0x0020);

console.log('PASS verify-wifi-ndef');
