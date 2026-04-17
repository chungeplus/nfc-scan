import Toast from 'tdesign-miniprogram/toast';

Page({


    data:{
        developerPromiseDialogVisible:true
    },

    onLoad() {
        this.checkDeviceProcessNFC();
    },

    checkDeviceProcessNFC() {
        let nfcAdapter = null

        if (wx.getNFCAdapter) {
            nfcAdapter = wx.getNFCAdapter();
        }

        if (!nfcAdapter) {
            Toast({
                context: this,
                selector: '#t-toast',
                message: '设备不支持NFC功能',
                theme: 'warning',
                direction: 'column',
            });
        }

        this.setData({
            canDeviceProcessNFC: nfcAdapter !== null
        });
    },


    handleWriteApp() {
        if (!this.data.canDeviceProcessNFC) {
            Toast({
                context: this,
                selector: '#t-toast',
                message: '设备不支持NFC功能',
                theme: 'warning',
                direction: 'column',
            });
            return;
        }

        wx.navigateTo({
            url: '/pages/write-app/write-app',
        })
    },

    handleWriteMusic() {
        if (!this.data.canDeviceProcessNFC) {
            Toast({
                context: this,
                selector: '#t-toast',
                message: '设备不支持NFC功能',
                theme: 'warning',
                direction: 'column',
            });
            return;
        }

        wx.navigateTo({
            url: '/pages/write-music/write-music',
        })
    },

    handleWriteWeb() {
        if (!this.data.canDeviceProcessNFC) {
            Toast({
                context: this,
                selector: '#t-toast',
                message: '设备不支持NFC功能',
                theme: 'warning',
                direction: 'column',
            });
            return;
        }

        wx.navigateTo({
            url: '/pages/write-web/write-web',
        })
    },

    handleWriteCustomVideo() {
        if (!this.data.canDeviceProcessNFC) {
            Toast({
                context: this,
                selector: '#t-toast',
                message: '设备不支持NFC功能',
                theme: 'warning',
                direction: 'column',
            });
            return;
        }

        wx.navigateTo({
            url: '/pages/write-custom-video/write-custom-video',
        })
    },

    handleCloseDeveloperPromiseDialog() {
        this.setData({
            developerPromiseDialogVisible: false
        })
    }
});