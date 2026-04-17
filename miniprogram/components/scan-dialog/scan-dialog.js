
import { string2ArrayBuffer, bytesToString, encodeNdefUriPayload } from '../../utils/convert';

Component({
    properties: {
        visible: {
            type: Boolean,
            value: false
        },
        records: {
            type: Array,
            value: []
        }
    },

    data: {
        scanStatus: 'waiting',
        errorMessage: '',
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
        onShow() {
            const baseNfcAdapter = wx.getNFCAdapter();
            this.setData({
                baseNfcAdapter: baseNfcAdapter
            });
            this.data.baseNfcAdapter.startDiscovery({
                success: () => {
                    this.data.baseNfcAdapter.offDiscovered(this.data.handleDiscoveredWrap);
                    this.data.baseNfcAdapter.onDiscovered(this.data.handleDiscoveredWrap);
                },
                fail: () => {
                    this.setData({
                        scanStatus: "error",
                        errorMessage: "发现NFC设备失败，请重试",
                        baseNfcAdapter: null
                    });
                }
            });
        },

        onClose() {
            if (this.data.runNfcAdapter) {
                this.data.runNfcAdapter.close();
            }
            if (this.data.baseNfcAdapter) {
                this.data.baseNfcAdapter.offDiscovered(this.data.handleDiscoveredWrap);
                this.data.baseNfcAdapter.stopDiscovery();
            }

            setTimeout(() => {
                this.setData({
                    scanStatus: 'waiting',
                    errorMessage: '',
                    baseNfcAdapter: null,
                    runNfcAdapter: null,
                });
            }, 1000);

        },

        handleDiscovered(res) {
            if (res.stopDefault) {
                res.stopDefault();
            }

            console.log(res.messages);
            console.log(res.messages[0].records);

            res.messages[0].records.forEach((record) => {
                console.log(bytesToString(record.payload));
                console.log(bytesToString(record.type));
                console.log(bytesToString(record.id));

            })


            this.setData({
                scanStatus: 'writing'
            });

            if (res.techs.includes('NDEF')) {
                this.ndefAdapterWrite(res);
            } else {
                this.setData({
                    scanStatus: 'error',
                    errorMessage: '不支持的标签技术',
                });
            }
        },

        ndefAdapterWrite() {
            const runNfcAdapter = this.data.baseNfcAdapter.getNdef();

            this.setData({
                runNfcAdapter: runNfcAdapter
            });

            const writeRecords = () => {
                this.data.runNfcAdapter.writeNdefMessage({
                    records: [
                        ...this.properties.records.map((recordItem) => {
                            let payload = new ArrayBuffer([])
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
                            }
                        })
                    ],
                    success: () => {
                        this.setData({
                            scanStatus: 'success'
                        });
                    },
                    fail: (error) => {
                        console.log(error);
                        
                        this.setData({
                            scanStatus: "error",
                            errorMessage: "写入失败，请重试",
                        });
                    }
                });
            };

            this.data.runNfcAdapter.connect({
                success: writeRecords,
                fail: (error) => {
                    const already = error?.errCode === 13022 || /already\s+co?connected/i.test(error?.errMsg || '');
                    if (already) {
                        writeRecords();
                    } else {
                        this.setData({
                            scanStatus: "error",
                            errorMessage: "连接失败，请重试",
                        });
                    }
                }
            });
        },

        handleCancel() {
            this.triggerEvent('close');
        },

        handleConfirm() {
            this.triggerEvent('close');
        },

        handleRetry() {
            this.onClose();
            this.onShow();
        }
    }
});