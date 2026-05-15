import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';

const sourcePath = new URL('../miniprogram/pages/write-local-media/write-local-media.ts', import.meta.url);
const rawSource = await fs.readFile(sourcePath, 'utf8');

function stripImports(source) {
  return source
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];\s*/g, '')
    .replace(/import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];\s*/g, '');
}

function createPageHarness(stubs = {}) {
  let capturedPage = null;
  const context = {
    Page(config) {
      capturedPage = config;
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

  assert.ok(capturedPage, 'Page config should be captured');

  return function instantiatePage() {
    const page = {
      ...capturedPage,
      data: JSON.parse(JSON.stringify(capturedPage.data || {})),
      setData(update, callback) {
        this.data = {
          ...this.data,
          ...update,
        };

        if (typeof callback === 'function') {
          callback.call(this);
        }
      },
    };

    Object.keys(capturedPage).forEach((key) => {
      if (typeof capturedPage[key] === 'function') {
        page[key] = capturedPage[key].bind(page);
      }
    });

    return page;
  };
}

{
  const wxStub = {
    chooseMessageFile({ success }) {
      success({
        tempFiles: [
          {
            name: 'oversized.mp4',
            size: 99,
            path: '/tmp/oversized.mp4',
          },
        ],
      });
    },
  };

  const createPage = createPageHarness({
    wx: wxStub,
    getNavMetrics: () => ({ navHeight: 64 }),
    showPixelToast: () => {},
    createMediaFile: async () => ({}),
    createMediaShare: async () => ({}),
    prepareMediaUpload: async () => ({}),
    DEFAULT_THEME_KEY: 'pixel',
    buildPlayPageUrl: () => 'https://example.com/play/pixel/share',
    formatFileSize: (size) => `${size}B`,
    getMediaTypeLabel: () => '视频',
    hasConfiguredPlayBaseUrl: () => true,
    normalizeMediaRecord: (record) => record,
    validateMediaFile: () => ({
      valid: false,
      message: '文件过大',
    }),
  });
  const page = createPage();

  page.handleChooseFile();

  assert.equal(page.data.selectedFileName, 'oversized.mp4');
  assert.equal(page.data.errorMessage, '文件过大');
  assert.equal(page.data.canSubmitMedia, false);
}

{
  const wxStub = {
    chooseMessageFile({ success }) {
      success({
        tempFiles: [
          {
            name: 'demo.mp3',
            size: 2048,
            path: '/tmp/demo.mp3',
          },
        ],
      });
    },
  };

  const createPage = createPageHarness({
    wx: wxStub,
    getNavMetrics: () => ({ navHeight: 64 }),
    showPixelToast: () => {},
    createMediaFile: async () => ({}),
    createMediaShare: async () => ({}),
    prepareMediaUpload: async () => ({}),
    DEFAULT_THEME_KEY: 'pixel',
    buildPlayPageUrl: () => 'https://example.com/play/pixel/share',
    formatFileSize: (size) => `${size}B`,
    getMediaTypeLabel: () => '音频',
    hasConfiguredPlayBaseUrl: () => true,
    normalizeMediaRecord: (record) => record,
    validateMediaFile: () => ({
      valid: true,
      extension: 'mp3',
      mediaType: 'audio',
    }),
  });
  const page = createPage();

  page.handleChooseFile();

  assert.equal(page.data.selectedFileName, 'demo.mp3');
  assert.equal(page.data.errorMessage, '');
  assert.equal(page.data.canSubmitMedia, true);
}

{
  const createPage = createPageHarness({
    wx: {},
    getNavMetrics: () => ({ navHeight: 64 }),
    showPixelToast: () => {},
    createMediaFile: async () => ({}),
    createMediaShare: async () => ({}),
    prepareMediaUpload: async () => ({}),
    DEFAULT_THEME_KEY: 'pixel',
    buildPlayPageUrl: () => 'https://example.com/play/pixel/share',
    formatFileSize: (size) => `${size}B`,
    getMediaTypeLabel: () => '音频',
    hasConfiguredPlayBaseUrl: () => true,
    normalizeMediaRecord: (record) => ({
      ...record,
      fileName: record.fileName || 'saved.mp3',
      fileSizeText: record.fileSizeText || '2KB',
      mediaTypeLabel: record.mediaTypeLabel || '音频',
    }),
    validateMediaFile: () => ({
      valid: true,
      extension: 'mp3',
      mediaType: 'audio',
    }),
  });
  const page = createPage();

  page.applyExistingRecord({
    fileName: 'saved.mp3',
    fileSizeText: '2KB',
    mediaTypeLabel: '音频',
  });

  assert.equal(page.data.canSubmitMedia, true);
}

{
  let cleanupResolved = false;
  let toastMessage = '';

  const wxStub = {
    cloud: {
      uploadFile({ success }) {
        success({
          fileID: 'cloud://demo-env/media-files/audio/openid/demo.mp3',
        });
      },
      deleteFile() {
        return new Promise((resolve) => {
          setTimeout(() => {
            cleanupResolved = true;
            resolve();
          }, 0);
        });
      },
    },
  };

  const createPage = createPageHarness({
    wx: wxStub,
    getNavMetrics: () => ({ navHeight: 64 }),
    showPixelToast: ({ message }) => {
      toastMessage = message;
    },
    createMediaFile: async () => {
      throw new Error('登记失败');
    },
    createMediaShare: async () => ({}),
    prepareMediaUpload: async () => ({
      upload: {
        cloudPath: 'media-files/audio/openid/demo.mp3',
      },
    }),
    DEFAULT_THEME_KEY: 'pixel',
    buildPlayPageUrl: () => 'https://example.com/play/pixel/share',
    formatFileSize: (size) => `${size}B`,
    getMediaTypeLabel: () => '音频',
    hasConfiguredPlayBaseUrl: () => true,
    normalizeMediaRecord: (record) => record,
    validateMediaFile: () => ({
      valid: true,
      extension: 'mp3',
      mediaType: 'audio',
    }),
  });
  const page = createPage();

  page.selectedLocalFile = {
    name: 'demo.mp3',
    size: 2048,
    path: '/tmp/demo.mp3',
    extension: 'mp3',
    mediaType: 'audio',
  };
  page.setData({
    canSubmitMedia: true,
    selectedFileName: 'demo.mp3',
  });

  await page.handleWriteMedia();

  assert.equal(cleanupResolved, true, 'cleanup should finish before write flow resolves');
  assert.equal(page.data.errorMessage, '登记失败');
  assert.equal(toastMessage, '登记失败');
}

console.log('PASS verify-write-local-media-behavior');
