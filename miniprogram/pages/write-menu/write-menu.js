import { showPixelToast } from '../../utils/pixel-toast';

const DEVELOPER_PROMISE_ACK_KEY = 'developerPromiseAcknowledged';

Page({
    data: {
        navHeight: 64,
        developerPromiseDialogVisible: false,
        canDeviceProcessNFC: false,
        nfcUnsupportedDialogVisible: false,
    },

    onLoad() {
        const systemInfo = wx.getSystemInfoSync();
        const statusBarHeight = systemInfo.statusBarHeight || 20;
        this.setData({
            navHeight: statusBarHeight + 44,
            developerPromiseDialogVisible: this.shouldShowDeveloperPromiseDialog(),
        });
        this.checkDeviceProcessNFC();
    },

    onShow() {
        this.syncCustomTabBar();
    },

    syncCustomTabBar() {
        const tabBar = this.getTabBar && this.getTabBar();

        if (tabBar && tabBar.setData) {
            tabBar.setData({
                selected: 0,
            });
        }
    },

    shouldShowDeveloperPromiseDialog() {
        try {
            return !Boolean(wx.getStorageSync(DEVELOPER_PROMISE_ACK_KEY));
        } catch (error) {
            return true;
        }
    },

    checkDeviceProcessNFC() {
        const nfcAdapter = wx.getNFCAdapter ? wx.getNFCAdapter() : null;

        this.setData({
            canDeviceProcessNFC: nfcAdapter !== null,
            nfcUnsupportedDialogVisible: nfcAdapter === null,
        });
    },

    ensureNfcSupport() {
        if (this.data.canDeviceProcessNFC) {
            return true;
        }

        showPixelToast({
            message: '当前设备暂不支持 NFC',
            theme: 'warning',
        });
        return false;
    },

    handleWriteApp() {
        if (!this.ensureNfcSupport()) {
            return;
        }

        wx.navigateTo({
            url: '/pages/write-app/write-app',
        });
    },

    handleWriteMusic() {
        if (!this.ensureNfcSupport()) {
            return;
        }

        wx.navigateTo({
            url: '/pages/write-music/write-music',
        });
    },

    handleWriteWeb() {
        if (!this.ensureNfcSupport()) {
            return;
        }

        wx.navigateTo({
            url: '/pages/write-web/write-web',
        });
    },

    handleWriteLocalAudio() {
        wx.navigateTo({
            url: '/pages/write-local-audio/write-local-audio',
        });
    },

    handleCloseDeveloperPromiseDialog() {
        try {
            wx.setStorageSync(DEVELOPER_PROMISE_ACK_KEY, true);
        } catch (error) {
        }

        this.setData({
            developerPromiseDialogVisible: false,
        });
    },

    handleCloseUnsupportedDialog() {
        this.setData({
            nfcUnsupportedDialogVisible: false,
        });
    },
});
