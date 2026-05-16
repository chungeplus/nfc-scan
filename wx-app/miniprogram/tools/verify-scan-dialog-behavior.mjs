import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';

const sourcePath = new URL('../components/scan-dialog/scan-dialog.ts', import.meta.url);
const [rawSource, wxmlSource, scssSource] = await Promise.all([
  fs.readFile(sourcePath, 'utf8'),
  fs.readFile(new URL('../components/scan-dialog/scan-dialog.wxml', import.meta.url), 'utf8'),
  fs.readFile(new URL('../components/scan-dialog/scan-dialog.scss', import.meta.url), 'utf8'),
]);

assert.match(
  wxmlSource,
  /stage__beam\s+motion-scan-loop/,
  'scan-dialog waiting state should render a shared scan loop beam'
);
assert.match(
  wxmlSource,
  /stage__process-core\s+motion-scan-processing/,
  'scan-dialog writing state should render a shared processing core'
);
assert.match(
  wxmlSource,
  /stage__icon-wrap\s+motion-scan-complete/,
  'scan-dialog success state should use the shared completion semantic'
);
assert.match(
  wxmlSource,
  /stage__icon-wrap\s+motion-scan-alert/,
  'scan-dialog error state should use the shared alert semantic'
);
assert.doesNotMatch(
  scssSource,
  /@keyframes\s+tagApproach/,
  'scan-dialog should stop owning tagApproach keyframes'
);
assert.doesNotMatch(
  scssSource,
  /@keyframes\s+phonePulse/,
  'scan-dialog should stop owning phonePulse keyframes'
);

function stripImports(source) {
  return source
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];\s*/g, '')
    .replace(/import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];\s*/g, '');
}

function createComponentHarness(stubs = {}) {
  let capturedComponent = null;
  const context = {
    Component(config) {
      capturedComponent = config;
    },
    ...stubs,
  };

  const transpiled = ts.transpileModule(stripImports(rawSource), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  vm.runInNewContext(transpiled, context, {
    filename: sourcePath.pathname,
  });

  assert.ok(capturedComponent, 'Component config should be captured');

  return function instantiateComponent() {
    const component = {
      properties: Object.fromEntries(
        Object.entries(capturedComponent.properties || {}).map(([key, value]) => [key, value.value])
      ),
      data: JSON.parse(JSON.stringify(capturedComponent.data || {})),
      setData(update, callback) {
        this.data = {
          ...this.data,
          ...update,
        };

        if (typeof callback === 'function') {
          callback.call(this);
        }
      },
      triggerEvent() {},
    };

    const methods = capturedComponent.methods || {};
    Object.keys(methods).forEach((key) => {
      if (typeof methods[key] === 'function') {
        component[key] = methods[key].bind(component);
      }
    });

    const lifetimes = capturedComponent.lifetimes || {};
    if (typeof lifetimes.attached === 'function') {
      lifetimes.attached.call(component);
    }

    return component;
  };
}

function createAdapterHarness(writeHandler) {
  const runNfcAdapter = {
    connect({ success }) {
      success();
    },
    writeNdefMessage(options) {
      writeHandler(options);
    },
    close() {},
  };

  const baseNfcAdapter = {
    startDiscovery({ success }) {
      success();
    },
    stopDiscovery() {},
    onDiscovered() {},
    offDiscovered() {},
    getNdef() {
      return runNfcAdapter;
    },
  };

  return {
    baseNfcAdapter,
    runNfcAdapter,
  };
}

{
  let writtenRecords = null;
  const adapterHarness = createAdapterHarness(({ records, success }) => {
    writtenRecords = records;
    success();
  });
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => adapterHarness.baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => `ab:${value}`,
    encodeNdefUriPayload: (value) => `uri:${value}`,
    hexToArrayBuffer: (value) => value,
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [
    { tnf: 1, id: 'web', type: 'U', payload: 'https://example.com' },
  ];
  component.onShow();
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });

  assert.equal(component.data.scanStatus, 'success');
  assert.equal(component.data.writingLock, false);
  assert.equal(writtenRecords.length, 1);
  assert.equal(writtenRecords[0].tnf, 1);
  assert.equal(writtenRecords[0].id, 'ab:web');
  assert.equal(writtenRecords[0].type, 'ab:U');
  assert.equal(writtenRecords[0].payload, 'uri:https://example.com');
}

{
  const adapterHarness = createAdapterHarness(({ fail }) => fail());
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => adapterHarness.baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => value,
    encodeNdefUriPayload: (value) => value,
    hexToArrayBuffer: (value) => value,
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [
    { tnf: 1, id: 'web', type: 'U', payload: 'https://example.com' },
  ];
  component.onShow();
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });

  assert.equal(component.data.scanStatus, 'error');
  assert.equal(component.data.writingLock, false);
}

{
  const adapterHarness = createAdapterHarness(() => {});
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => adapterHarness.baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => value,
    encodeNdefUriPayload: (value) => value,
    hexToArrayBuffer: (value) => value,
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.onShow();
  component.handleDiscovered({
    techs: ['IsoDep'],
    stopDefault() {},
  });

  assert.equal(component.data.scanStatus, 'error');
  assert.equal(component.data.writingLock, false);
}

{
  let writtenRecords = null;
  const adapterHarness = createAdapterHarness(({ records, success }) => {
    writtenRecords = records;
    success();
  });
  const typeBuffer = new Uint8Array([0x61, 0x70]).buffer;
  const payloadBuffer = new Uint8Array([0x10, 0x0e]).buffer;
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => adapterHarness.baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => `ab:${value}`,
    encodeNdefUriPayload: (value) => value,
    hexToArrayBuffer: (value) => {
      if (value === '') {
        return new ArrayBuffer(0);
      }
      if (value === '6170') {
        return typeBuffer;
      }
      return payloadBuffer;
    },
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [];
  component.properties.writeRequest = {
    recordStrategy: 'documented-records',
    records: [
      {
        idHex: '',
        typeHex: '6170',
        payloadHex: '100e',
      },
    ],
  };
  component.onShow();
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });

  assert.equal(writtenRecords.length, 1);
  assert.equal(writtenRecords[0].tnf, undefined);
  assert.deepEqual(
    new Set(Object.keys(writtenRecords[0])),
    new Set(['id', 'type', 'payload']),
    'strict WLAN writes should include only documented record keys'
  );
  assert.deepEqual(Array.from(new Uint8Array(writtenRecords[0].id)), []);
  assert.deepEqual(Array.from(new Uint8Array(writtenRecords[0].type)), [0x61, 0x70]);
  assert.deepEqual(Array.from(new Uint8Array(writtenRecords[0].payload)), [0x10, 0x0e]);
}

{
  const runNfcAdapter = {
    connect({ fail }) {
      fail({ errCode: 13000, errMsg: 'connect failed' });
    },
    writeNdefMessage() {},
    close() {},
  };
  const baseNfcAdapter = {
    startDiscovery({ success }) {
      success();
    },
    stopDiscovery() {},
    onDiscovered() {},
    offDiscovered() {},
    getNdef() {
      return runNfcAdapter;
    },
  };
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => value,
    encodeNdefUriPayload: (value) => value,
    hexToArrayBuffer: (value) => value,
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [
    { tnf: 1, id: 'web', type: 'U', payload: 'https://example.com' },
  ];
  component.onShow();
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });

  assert.equal(component.data.scanStatus, 'error');
  assert.equal(component.data.writingLock, false);
}

{
  let writeCalls = 0;
  let writtenRecords = null;
  const runNfcAdapter = {
    connect({ fail }) {
      fail({ errMsg: 'already connected' });
    },
    writeNdefMessage(options) {
      writeCalls += 1;
      writtenRecords = options.records;
      options.success();
    },
    close() {},
  };
  const baseNfcAdapter = {
    startDiscovery({ success }) {
      success();
    },
    stopDiscovery() {},
    onDiscovered() {},
    offDiscovered() {},
    getNdef() {
      return runNfcAdapter;
    },
  };
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => `ab:${value}`,
    encodeNdefUriPayload: (value) => `uri:${value}`,
    hexToArrayBuffer: (value) => value,
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [
    { tnf: 1, id: 'web', type: 'U', payload: 'https://example.com' },
  ];
  component.onShow();
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });

  assert.equal(writeCalls, 1);
  assert.equal(component.data.scanStatus, 'success');
  assert.equal(component.data.writingLock, false);
  assert.equal(writtenRecords.length, 1);
  assert.equal(writtenRecords[0].tnf, 1);
}

{
  let writeCalls = 0;
  const adapterHarness = createAdapterHarness(({ success }) => {
    writeCalls += 1;
    success();
  });
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => adapterHarness.baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => value,
    encodeNdefUriPayload: (value) => value,
    hexToArrayBuffer: (value) => {
      if (value === 'badhex') {
        throw new Error('bad hex');
      }

      return value;
    },
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [
    { tnf: 1, id: 'web', type: 'U', payload: 'https://example.com' },
  ];
  component.properties.writeRequest = {
    recordStrategy: 'documented-records',
    records: [
      {
        idHex: '',
        typeHex: '6170',
        payloadHex: 'badhex',
      },
    ],
  };

  assert.doesNotThrow(() => {
    component.onShow();
    component.handleDiscovered({
      techs: ['NDEF'],
      stopDefault() {},
    });
  });

  assert.equal(writeCalls, 0);
  assert.equal(component.data.scanStatus, 'error');
  assert.equal(component.data.writingLock, false);
  assert.equal(typeof component.data.errorMessage, 'string');
  assert.notEqual(component.data.errorMessage.length, 0);
}

{
  let writeCalls = 0;
  const adapterHarness = createAdapterHarness(({ success }) => {
    writeCalls += 1;
    success();
  });
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => adapterHarness.baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => value,
    encodeNdefUriPayload: (value) => value,
    hexToArrayBuffer: (value) => value,
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [
    { tnf: 1, id: 'web', type: 'U', payload: 'https://example.com' },
  ];
  component.properties.writeRequest = {
    recordStrategy: 'documented-records',
    records: [{ idHex: '' }],
  };
  component.onShow();
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });

  assert.equal(writeCalls, 0);
  assert.equal(component.data.scanStatus, 'error');
  assert.equal(component.data.writingLock, false);
}

{
  let writeCalls = 0;
  const adapterHarness = createAdapterHarness(({ success }) => {
    writeCalls += 1;
    success();
  });
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => adapterHarness.baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => value,
    encodeNdefUriPayload: (value) => value,
    hexToArrayBuffer: (value) => value,
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [
    { tnf: 1, id: 'web', type: 'U', payload: 'https://example.com' },
  ];
  component.properties.writeRequest = {
    recordStrategy: 'documented-records',
    records: [{ idHex: '   ', typeHex: '6170', payloadHex: '100e' }],
  };
  component.onShow();
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });

  assert.equal(writeCalls, 0);
  assert.equal(component.data.scanStatus, 'error');
  assert.equal(component.data.writingLock, false);
}

{
  let writeCalls = 0;
  const adapterHarness = createAdapterHarness(({ success }) => {
    writeCalls += 1;
    success();
  });
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => adapterHarness.baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => value,
    encodeNdefUriPayload: (value) => value,
    hexToArrayBuffer: (value) => value,
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [
    { tnf: 1, id: 'web', type: 'U', payload: 'https://example.com' },
  ];
  component.properties.writeRequest = {
    recordStrategy: 'documented-records',
    records: [{ typeHex: '   ', payloadHex: '100e' }],
  };
  component.onShow();
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });

  assert.equal(writeCalls, 0);
  assert.equal(component.data.scanStatus, 'error');
  assert.equal(component.data.writingLock, false);
}

{
  let writeCalls = 0;
  const adapterHarness = createAdapterHarness(({ success }) => {
    writeCalls += 1;
    success();
  });
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => adapterHarness.baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => value,
    encodeNdefUriPayload: (value) => value,
    hexToArrayBuffer: (value) => value,
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [
    { tnf: 1, id: 'web', type: 'U', payload: 'https://example.com' },
  ];
  component.properties.writeRequest = {
    recordStrategy: 'documented-records',
    records: [{ typeHex: '6170', payloadHex: '   ' }],
  };
  component.onShow();
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });

  assert.equal(writeCalls, 0);
  assert.equal(component.data.scanStatus, 'error');
  assert.equal(component.data.writingLock, false);
}

{
  let writeCalls = 0;
  const adapterHarness = createAdapterHarness(({ success }) => {
    writeCalls += 1;
    success();
  });
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => adapterHarness.baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => value,
    encodeNdefUriPayload: (value) => value,
    hexToArrayBuffer: (value) => value,
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [
    { tnf: 1, id: 'web', type: 'U', payload: 'https://example.com' },
  ];
  component.properties.writeRequest = {
    records: [{ typeHex: '6170', payloadHex: '100e' }],
  };
  component.onShow();
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });

  assert.equal(writeCalls, 0);
  assert.equal(component.data.scanStatus, 'error');
  assert.equal(component.data.writingLock, false);
}

{
  let writeCalls = 0;
  const adapterHarness = createAdapterHarness(({ success }) => {
    writeCalls += 1;
    success();
  });
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => adapterHarness.baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => value,
    encodeNdefUriPayload: (value) => value,
    hexToArrayBuffer: (value) => value,
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [
    { tnf: 1, id: 'web', type: 'U', payload: 'https://example.com' },
  ];
  component.properties.writeRequest = {
    recordStrategy: 'legacy',
    records: [{ typeHex: '6170', payloadHex: '100e' }],
  };
  component.onShow();
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });

  assert.equal(writeCalls, 0);
  assert.equal(component.data.scanStatus, 'error');
  assert.equal(component.data.writingLock, false);
}

{
  let writeCalls = 0;
  const adapterHarness = createAdapterHarness(({ success }) => {
    writeCalls += 1;
    success();
  });
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => adapterHarness.baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => value,
    encodeNdefUriPayload: (value) => value,
    hexToArrayBuffer: (value) => value,
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [
    { tnf: 1, id: 'web', type: 'U', payload: 'https://example.com' },
  ];
  component.properties.writeRequest = {
    recordStrategy: 'documented-records',
    records: [{ typeHex: 123, payloadHex: '100e' }],
  };
  component.onShow();
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });

  assert.equal(writeCalls, 0);
  assert.equal(component.data.scanStatus, 'error');
  assert.equal(component.data.writingLock, false);
}

{
  let writeCalls = 0;
  const adapterHarness = createAdapterHarness(({ success }) => {
    writeCalls += 1;
    success();
  });
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => adapterHarness.baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => value,
    encodeNdefUriPayload: (value) => value,
    hexToArrayBuffer: (value) => value,
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [
    { tnf: 1, id: 'web', type: 'U', payload: 'https://example.com' },
  ];
  component.properties.writeRequest = {
    recordStrategy: 'documented-records',
    records: [],
  };
  component.onShow();
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });

  assert.equal(writeCalls, 0);
  assert.equal(component.data.scanStatus, 'error');
  assert.equal(component.data.writingLock, false);
  assert.equal(typeof component.data.errorMessage, 'string');
  assert.notEqual(component.data.errorMessage.length, 0);
}

{
  let writeCalls = 0;
  const adapterHarness = createAdapterHarness(({ success }) => {
    writeCalls += 1;
    success();
  });
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => adapterHarness.baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => value,
    encodeNdefUriPayload: (value) => value,
    hexToArrayBuffer: (value) => value,
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [
    { tnf: 1, id: 'web', type: 'U', payload: 'https://example.com' },
  ];
  component.properties.writeRequest = {
    recordStrategy: 'documented-records',
    records: null,
  };
  component.onShow();
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });

  assert.equal(writeCalls, 0);
  assert.equal(component.data.scanStatus, 'error');
  assert.equal(component.data.writingLock, false);
  assert.equal(typeof component.data.errorMessage, 'string');
  assert.notEqual(component.data.errorMessage.length, 0);
}

{
  let writeCalls = 0;
  const adapterHarness = createAdapterHarness(({ success }) => {
    writeCalls += 1;
    success();
  });
  const createComponent = createComponentHarness({
    wx: {
      getNFCAdapter: () => adapterHarness.baseNfcAdapter,
    },
    string2ArrayBuffer: (value) => `ab:${value}`,
    encodeNdefUriPayload: (value) => `uri:${value}`,
    hexToArrayBuffer: (value) => value,
    clearTimeout,
    setTimeout,
  });
  const component = createComponent();

  component.properties.records = [
    { tnf: 1, id: 'web', type: 'U', payload: 'https://example.com' },
  ];
  component.onShow();
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });
  component.handleDiscovered({
    techs: ['NDEF'],
    stopDefault() {},
  });

  assert.equal(writeCalls, 1);
  assert.equal(component.data.scanStatus, 'success');
  assert.equal(component.data.writingLock, false);
}

console.log('PASS verify-scan-dialog-behavior');
