import { string2ArrayBuffer, encodeNdefUriPayload } from '../../utils/convert';

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
        successMessage: {
            type: String,
            value: 'NFC 标签写入完成',
        },
        successSubMessage: {
            type: String,
            value: '可贴近手机验证',
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
        scanStatus: 'waiting',
        errorMessage: '',
        baseNfcAdapter: null,
        runNfcAdapter: null,
        handleDiscoveredWrap: null,
        resetTimer: null,
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
                    errorMessage: '当前设备不支持 NFC',
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
                    baseNfcAdapter.offDiscovered(this.data.handleDiscoveredWrap);
                    baseNfcAdapter.onDiscovered(this.data.handleDiscoveredWrap);
                },
                fail: () => {
                    this.setData({
                        scanStatus: 'error',
                        errorMessage: '发现 NFC 设备失败，请重试',
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

            if (this.data.runNfcAdapter) {
                this.data.runNfcAdapter.close();
            }

            if (this.data.baseNfcAdapter) {
                this.data.baseNfcAdapter.offDiscovered(this.data.handleDiscoveredWrap);
                this.data.baseNfcAdapter.stopDiscovery();
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

        handleDiscovered(res) {
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
                errorMessage: '当前标签类型暂不支持',
                writingLock: false,
            });
        },

        ndefAdapterWrite() {
            const runNfcAdapter = this.data.baseNfcAdapter.getNdef();

            this.setData({
                runNfcAdapter,
            });

            const writeRecords = () => {
                runNfcAdapter.writeNdefMessage({
                    records: this.properties.records.map((recordItem) => {
                        const payload = recordItem.tnf === 1 && recordItem.type === 'U'
                            ? encodeNdefUriPayload(recordItem.payload)
                            : string2ArrayBuffer(recordItem.payload);

                        return {
                            tnf: recordItem.tnf,
                            id: string2ArrayBuffer(recordItem.id),
                            type: string2ArrayBuffer(recordItem.type),
                            payload,
                        };
                    }),
                    success: () => {
                        this.setData({
                            scanStatus: 'success',
                            writingLock: false,
                        });
                    },
                    fail: () => {
                        this.setData({
                            scanStatus: 'error',
                            errorMessage: '写入失败，请重试',
                            writingLock: false,
                        });
                    },
                });
            };

            runNfcAdapter.connect({
                success: writeRecords,
                fail: (error) => {
                    const errCode = error ? error.errCode : undefined;
                    const errMsg = error ? error.errMsg || '' : '';
                    const alreadyConnected = errCode === 13022 || /already\s+co?connected/i.test(errMsg);

                    if (alreadyConnected) {
                        writeRecords();
                        return;
                    }

                    this.setData({
                        scanStatus: 'error',
                        errorMessage: '连接标签失败，请重试',
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
