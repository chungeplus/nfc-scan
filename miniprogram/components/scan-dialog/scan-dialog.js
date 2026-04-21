/**
 * NFC扫描弹窗组件
 * @description 用于检测和写入NFC标签
 */
import { string2ArrayBuffer, bytesToString, encodeNdefUriPayload } from '../../utils/convert';

Component({
    properties: {
        visible: {
            type: Boolean,
            value: false,
        },
        records: {
            type: Array,
            value: [],
        }
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
        }
    },

    methods: {
        /**
         * 模拟发现NFC标签（仅用于动效演示）
         */
        simulateCardDetected() {
            if (this.data.scanStatus !== 'waiting') {
                return;
            }

            this.setData({
                scanStatus: 'writing',
                errorMessage: '',
            });

            setTimeout(() => {
                const hasRecords = Array.isArray(this.properties.records) && this.properties.records.length > 0;

                if (hasRecords) {
                    this.setData({
                        scanStatus: 'success',
                    });
                } else {
                    this.setData({
                        scanStatus: 'error',
                        errorMessage: '无写入数据',
                    });
                }
            }, 800);
        },

        /**
         * 显示弹窗时初始化NFC
         */
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
                baseNfcAdapter: baseNfcAdapter,
                writingLock: false,
                resetTimer: null,
            });
            this.data.baseNfcAdapter.startDiscovery({
                success: () => {
                    this.data.baseNfcAdapter.offDiscovered(this.data.handleDiscoveredWrap);
                    this.data.baseNfcAdapter.onDiscovered(this.data.handleDiscoveredWrap);
                },
                fail: () => {
                    this.setData({
                        scanStatus: 'error',
                        errorMessage: '发现NFC设备失败，请重试',
                        baseNfcAdapter: null,
                        writingLock: false,
                    });
                }
            });
        },

        /**
         * 关闭弹窗时清理NFC
         */
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

        /**
         * 处理NFC标签发现事件
         * @param {Object} res - NFC发现事件响应
         */
        handleDiscovered(res) {
            if (this.data.writingLock) {
                return;
            }

            if (res.stopDefault) {
                res.stopDefault();
            }

            this.setData({
                scanStatus: 'writing',
                writingLock: true,
            });

            const techs = Array.isArray(res && res.techs) ? res.techs : [];

            if (techs.includes('NDEF')) {
                this.ndefAdapterWrite();
            } else {
                this.setData({
                    scanStatus: 'error',
                    errorMessage: '不支持的标签技术',
                    writingLock: false,
                });
            }
        },

        /**
         * 使用NDEF方式写入NFC标签
         */
        ndefAdapterWrite() {
            const runNfcAdapter = this.data.baseNfcAdapter.getNdef();

            this.setData({
                runNfcAdapter: runNfcAdapter,
            });

            const writeRecords = () => {
                this.data.runNfcAdapter.writeNdefMessage({
                    records: [
                        ...this.properties.records.map((recordItem) => {
                            let payload = new ArrayBuffer(0);
                            if (recordItem.tnf === 1 && recordItem.type === "U") {
                                payload = encodeNdefUriPayload(recordItem.payload);
                            } else {
                                payload = string2ArrayBuffer(recordItem.payload);
                            }
                            return {
                                tnf: recordItem.tnf,
                                id: string2ArrayBuffer(recordItem.id),
                                type: string2ArrayBuffer(recordItem.type),
                                payload: payload,
                            };
                        })
                    ],
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
                    }
                });
            };

            this.data.runNfcAdapter.connect({
                success: writeRecords,
                fail: (error) => {
                    const errCode = error ? error.errCode : undefined;
                    const errMsg = error ? error.errMsg || '' : '';
                    const already = errCode === 13022 || /already\s+co?connected/i.test(errMsg);
                    if (already) {
                        writeRecords();
                    } else {
                        this.setData({
                            scanStatus: 'error',
                            errorMessage: '连接失败，请重试',
                            writingLock: false,
                        });
                    }
                }
            });
        },

        /**
         * 取消操作
         */
        handleCancel() {
            this.triggerEvent('close');
        },

        /**
         * 确认操作
         */
        handleConfirm() {
            this.triggerEvent('close');
        },

        /**
         * 重试操作
         */
        handleRetry() {
            this.onClose();
            setTimeout(() => {
                this.onShow();
            }, 80);
        }
    }
});
