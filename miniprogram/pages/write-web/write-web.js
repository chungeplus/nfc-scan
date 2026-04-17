
Page({
    data: {
        webUrl: '',

        scanVisible: false,
        records: []
    },

    handlePasteTap() {
        wx.getClipboardData({
            success: (res) => {
                const webUrl = res.data;
                this.setData({
                    webUrl: webUrl
                });
            }
        });
    },

    handleWebUrlInput(event) {
        const webUrl = event.detail.value;
        this.setData({
            webUrl,
        });
    },

    handleOpenScanDialog() {
        this.parseShareUrl();
    },

    parseShareUrl() {
        const { webUrl } = this.data;
        this.setData({
            scanVisible: true,
            records: [
                {
                    tnf: 1,
                    id: 'web',
                    type: 'U',
                    payload: webUrl,
                },
            ],
        });
    },


    handleCloseScanDialog() {
        this.setData({
            scanVisible: false,
            records: [],
        });
    },
});