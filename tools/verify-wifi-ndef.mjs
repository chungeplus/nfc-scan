import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const source = await fs.readFile(
  new URL('../miniprogram/utils/wifi-ndef.ts', import.meta.url),
  'utf8'
);
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(transpiled)}`;
const {
  AUTH_TYPE_WPA2_PSK,
  ENCR_TYPE_AES,
  WIFI_WSC_MIME_TYPE,
  buildWifiConfigPayload,
} = await import(moduleUrl);

function readTlv(view, offset) {
  assert.ok(
    offset >= 0 && offset <= view.length,
    `invalid TLV offset ${offset} for ${view.length}-byte buffer`
  );
  assert.ok(
    offset + 4 <= view.length,
    `truncated TLV header at offset ${offset}`
  );

  const fieldId = (view[offset] << 8) | view[offset + 1];
  const length = (view[offset + 2] << 8) | view[offset + 3];
  const valueStart = offset + 4;
  const valueEnd = valueStart + length;

  assert.ok(
    valueEnd <= view.length,
    `TLV length ${length} at field 0x${fieldId.toString(16)} exceeds remaining bytes`
  );

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

function collectFields(view) {
  let offset = 0;
  const fields = [];
  const fieldIds = [];

  while (offset < view.length) {
    const field = readTlv(view, offset);
    assert.equal(
      fieldIds.includes(field.fieldId),
      false,
      `duplicate TLV field 0x${field.fieldId.toString(16)}`
    );
    fields.push(field);
    fieldIds.push(field.fieldId);
    offset = field.nextOffset;
  }

  return { fields, fieldIds };
}

assert.equal(WIFI_WSC_MIME_TYPE, 'application/vnd.wfa.wsc');
const expectedFieldOrder = [0x1026, 0x1045, 0x1003, 0x100f, 0x1027];

const payload = new Uint8Array(
  buildWifiConfigPayload({
    ssid: 'OfficeWiFi',
    password: 'Pixel12345678',
  })
);

const credential = readTlv(payload, 0);
assert.equal(credential.fieldId, 0x100e);
assert.equal(
  credential.nextOffset,
  payload.length,
  'payload should contain exactly one outer credential TLV'
);

const seen = collectFields(credential.value);

assert.deepEqual(
  seen.fieldIds,
  expectedFieldOrder,
  'credential fields should stay in the exact validation order'
);
assert.equal(
  seen.fieldIds.includes(0x1020),
  false,
  'minimal validation payload should not include a MAC address field yet'
);
assert.equal(seen.fields[0].value[0], 0x01);
assert.equal(decodeUtf8(seen.fields[1].value), 'OfficeWiFi');
assert.equal((seen.fields[2].value[0] << 8) | seen.fields[2].value[1], AUTH_TYPE_WPA2_PSK);
assert.equal((seen.fields[3].value[0] << 8) | seen.fields[3].value[1], ENCR_TYPE_AES);
assert.equal(decodeUtf8(seen.fields[4].value), 'Pixel12345678');

const spacedPayload = new Uint8Array(
  buildWifiConfigPayload({
    ssid: '  OfficeWiFi  ',
    password: ' Pixel12345678 ',
  })
);
const spacedCredential = readTlv(spacedPayload, 0);
const spacedFields = collectFields(spacedCredential.value);
assert.equal(decodeUtf8(spacedFields.fields[1].value), '  OfficeWiFi  ');
assert.equal(decodeUtf8(spacedFields.fields[4].value), ' Pixel12345678 ');

assert.throws(
  () => collectFields(new Uint8Array([
    0x10, 0x26, 0x00, 0x01, 0x01,
    0x10, 0x26, 0x00, 0x01, 0x02,
  ])),
  /duplicate/i
);

assert.throws(
  () => readTlv(new Uint8Array([0x10, 0x0e, 0x00]), 0),
  /truncated/i
);

assert.throws(
  () => readTlv(new Uint8Array([0x10, 0x0e, 0x00, 0x05, 0x01]), 0),
  /length/i
);

console.log('PASS verify-wifi-ndef');
