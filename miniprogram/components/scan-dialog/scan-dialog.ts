import { string2ArrayBuffer, encodeNdefUriPayload, hexToArrayBuffer } from '../../utils/convert';

interface LegacyRecordInput {
    id?: unknown;
    payload?: unknown;
    tnf?: number;
    type?: unknown;
}

interface DocumentedRecordInput {
    idHex?: string;
    payloadHex?: string;
    typeHex?: string;
}

interface WriteRequest {
    recordStrategy?: string;
    records?: DocumentedRecordInput[] | null;
}

type ScanStatus = 'waiting' | 'writing' | 'success' | 'error';
type NfcDiscoveredResult = Parameters<WechatMiniprogram.OnDiscoveredCallback>[0] & {
    stopDefault?: () => void;
};

function isArrayBufferValue(value: unknown): value is ArrayBuffer {
    return value instanceof ArrayBuffer || Object.prototype.toString.call(value) === '[object ArrayBuffer]';
}

function normalizeBinaryValue(value: unknown): ArrayBuffer | null {
    if (isArrayBufferValue(value)) {
        return value;
    }

    if (ArrayBuffer.isView(value)) {
        return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
    }

    return null;
}

function toRecordBuffer(value: unknown): ArrayBuffer {
    const binaryValue = normalizeBinaryValue(value);

    if (binaryValue) {
        return binaryValue;
    }

    return string2ArrayBuffer(typeof value === 'string' ? value : '');
}

function buildRecordPayload(recordItem: LegacyRecordInput): ArrayBuffer {
    const binaryValue = normalizeBinaryValue(recordItem ? recordItem.payload : null);

    if (binaryValue) {
        return binaryValue;
    }

    if (recordItem && recordItem.tnf === 1 && recordItem.type === 'U') {
        return encodeNdefUriPayload(typeof recordItem.payload === 'string' ? recordItem.payload : '');
    }

    return toRecordBuffer(recordItem ? recordItem.payload : '');
}

function buildDocumentedRecords(writeRequest: WriteRequest | null | undefined) {
    if (!writeRequest || writeRequest.recordStrategy !== 'documented-records') {
        return null;
    }

    if (!Array.isArray(writeRequest.records) || writeRequest.records.length === 0) {
        throw new Error('INVALID_DOCUMENTED_RECORDS');
    }

    return writeRequest.records.map((recordItem) => ({
        id: hexToArrayBuffer(recordItem.idHex || ''),
        type: hexToArrayBuffer(recordItem.typeHex || ''),
        payload: hexToArrayBuffer(recordItem.payloadHex || ''),
    }));
}

function buildLegacyRecord(recordItem: LegacyRecordInput) {
    return {
        tnf: recordItem.tnf,
        id: toRecordBuffer(recordItem.id),
        type: toRecordBuffer(recordItem.type),
        payload: buildRecordPayload(recordItem),
    };
}

Component({
    properties: {
        visible: {
            type: Boolean,
            value: false,
        },
        records: {
            type: Array,
            value: [],
        },
        writeRequest: {
            type: Object,
            value: null,
        },
        successMessage: {
            type: String,
            value: 'NFC 标签写入完成',
        },
        successSubMessage: {
            type: String,
            value: '可贴近手机进行验证',
        },
        successPrimaryText: {
            type: String,
            value: '确定',
        },
        successSecondaryText: {
            type: String,
            value: '',
        },
    },

    data: {
        scanStatus: 'waiting' as ScanStatus,
        errorMessage: '',
        baseNfcAdapter: null as WechatMiniprogram.NFCAdapter | null,
        runNfcAdapter: null as ReturnType<WechatMiniprogram.NFCAdapter['getNdef']> | null,
        handleDiscoveredWrap: null as ((res: NfcDiscoveredResult) => void) | null,
        resetTimer: null as ReturnType<typeof setTimeout> | null,
        writingLock: false,
    },

    lifetimes: {
        attached() {
            this.setData({
                handleDiscoveredWrap: this.handleDiscovered.bind(this),
            });
        },
    },

    observers: {
        visible(value) {
            if (value) {
                this.onShow();
            } else {
                this.onClose();
            }
        },
    },

    methods: {
        onShow() {
            if (this.data.resetTimer) {
                clearTimeout(this.data.resetTimer);
            }

            if (!wx.getNFCAdapter) {
                this.setData({
                    scanStatus: 'error',
                    errorMessage: '当前设备不支持 NFC 功能',
                    writingLock: false,
                });
                return;
            }

            const baseNfcAdapter = wx.getNFCAdapter();
            this.setData({
                scanStatus: 'waiting',
                errorMessage: '',
                baseNfcAdapter,
                writingLock: false,
                resetTimer: null,
            });

            baseNfcAdapter.startDiscovery({
                success: () => {
                    const handleDiscoveredWrap = this.data.handleDiscoveredWrap;
                    if (handleDiscoveredWrap) {
                        baseNfcAdapter.offDiscovered(handleDiscoveredWrap);
                        baseNfcAdapter.onDiscovered(handleDiscoveredWrap);
                    }
                },
                fail: () => {
                    this.setData({
                        scanStatus: 'error',
                        errorMessage: '请开启手机 NFC 后重试',
                        baseNfcAdapter: null,
                        writingLock: false,
                    });
                },
            });
        },

        onClose() {
            if (this.data.resetTimer) {
                clearTimeout(this.data.resetTimer);
            }

            const runNfcAdapter = this.data.runNfcAdapter as { close?: () => void } | null;
            if (runNfcAdapter?.close) {
                runNfcAdapter.close();
            }

            const baseNfcAdapter = this.data.baseNfcAdapter;
            const handleDiscoveredWrap = this.data.handleDiscoveredWrap;
            if (baseNfcAdapter) {
                if (handleDiscoveredWrap) {
                    baseNfcAdapter.offDiscovered(handleDiscoveredWrap);
                }
                baseNfcAdapter.stopDiscovery();
            }

            const resetTimer = setTimeout(() => {
                this.setData({
                    scanStatus: 'waiting',
                    errorMessage: '',
                    baseNfcAdapter: null,
                    runNfcAdapter: null,
                    writingLock: false,
                    resetTimer: null,
                });
            }, 1000);

            this.setData({
                resetTimer,
            });
        },

        handleDiscovered(res: NfcDiscoveredResult) {
            if (this.data.writingLock) {
                return;
            }

            if (res && typeof res.stopDefault === 'function') {
                res.stopDefault();
            }

            this.setData({
                scanStatus: 'writing',
                writingLock: true,
            });

            const techs = Array.isArray(res && res.techs) ? res.techs : [];

            if (techs.includes('NDEF')) {
                this.ndefAdapterWrite();
                return;
            }

            this.setData({
                scanStatus: 'error',
                errorMessage: '当前标签类型暂不支持，请更换 NDEF 标签后重试',
                writingLock: false,
            });
        },

        ndefAdapterWrite() {
            const runNfcAdapter = this.data.baseNfcAdapter?.getNdef();

            if (!runNfcAdapter) {
                this.setData({
                    scanStatus: 'error',
                    errorMessage: 'NFC 写入适配器不可用',
                    writingLock: false,
                });
                return;
            }

            this.setData({
                runNfcAdapter,
            });

            const handleWriteRequestError = () => {
                this.setData({
                    scanStatus: 'error',
                    errorMessage: '鏍囩鍐欏叆鏁版嵁鏍煎紡鏃犳晥锛岃杩斿洖鍚庨噸璇?',
                    writingLock: false,
                });
            };

            const writeRecords = () => {
                let records = null;

                try {
                    const strictRecords = buildDocumentedRecords(this.properties.writeRequest as WriteRequest | null);
                    records = strictRecords || (this.properties.records as LegacyRecordInput[]).map(buildLegacyRecord);
                } catch {
                    handleWriteRequestError();
                    return;
                }

                runNfcAdapter.writeNdefMessage({
                    records,
                    success: () => {
                        this.setData({
                            scanStatus: 'success',
                            writingLock: false,
                        });
                    },
                    fail: () => {
                        this.setData({
                            scanStatus: 'error',
                            errorMessage: '标签写入失败，请将标签贴近手机后重试',
                            writingLock: false,
                        });
                    },
                });
            };

            runNfcAdapter.connect({
                success: writeRecords,
                fail: (error: { errCode?: number; errMsg?: string }) => {
                    const errCode = error ? error.errCode : undefined;
                    const errMsg = error ? error.errMsg || '' : '';
                    const alreadyConnected = errCode === 13022 || /already\s+co?connected/i.test(errMsg);

                    if (alreadyConnected) {
                        writeRecords();
                        return;
                    }

                    this.setData({
                        scanStatus: 'error',
                        errorMessage: '未能连接到标签，请将标签贴近手机后重试',
                        writingLock: false,
                    });
                },
            });
        },

        handleCancel() {
            this.triggerEvent('close');
        },

        handlePrimaryAction() {
            this.triggerEvent('close');
        },

        handleSecondaryAction() {
            this.triggerEvent('secondaryaction');
        },

        handleRetry() {
            this.onClose();
            setTimeout(() => {
                this.onShow();
            }, 80);
        },
    },
});
