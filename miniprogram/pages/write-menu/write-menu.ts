import { showPixelToast } from '../../utils/pixel-toast';
import { getClientPlatformInfo, getNavMetrics } from '../../utils/system-info';

const ROOT_PAGE_PREFIX = '/pages';

const DEVELOPER_PROMISE_ACK_KEY = 'developerPromiseAcknowledged';

interface WriteMenuPageData {
    navHeight: number;
    developerPromiseDialogVisible: boolean;
    canDeviceProcessNFC: boolean;
    isIOSClient: boolean;
    iosBlockedDialogVisible: boolean;
    nfcUnsupportedDialogVisible: boolean;
}

Page({
    data: {
        navHeight: 64,
        developerPromiseDialogVisible: false,
        canDeviceProcessNFC: false,
        isIOSClient: false,
        iosBlockedDialogVisible: false,
        nfcUnsupportedDialogVisible: false,
    } as WriteMenuPageData,

    onLoad() {
        const { navHeight } = getNavMetrics();
        const { isIOS } = getClientPlatformInfo();

        this.setData({
            navHeight,
            isIOSClient: isIOS,
            developerPromiseDialogVisible: !isIOS && this.shouldShowDeveloperPromiseDialog(),
        });
        this.checkDeviceProcessNFC(isIOS);
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

    checkDeviceProcessNFC(isIOSClient?: boolean) {
        const nextIsIOSClient = typeof isIOSClient === 'boolean'
            ? isIOSClient
            : this.data.isIOSClient;

        if (nextIsIOSClient) {
            this.setData({
                canDeviceProcessNFC: false,
                iosBlockedDialogVisible: true,
                nfcUnsupportedDialogVisible: false,
            });
            return;
        }

        const nfcAdapter = wx.getNFCAdapter ? wx.getNFCAdapter() : null;

        this.setData({
            canDeviceProcessNFC: nfcAdapter !== null,
            nfcUnsupportedDialogVisible: nfcAdapter === null,
        });
    },

    ensureNfcSupport() {
        if (this.data.isIOSClient) {
            this.setData({
                iosBlockedDialogVisible: true,
            });
            return false;
        }

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
            url: `${ROOT_PAGE_PREFIX}/write-app/write-app`,
        });
    },

    handleWriteMusic() {
        if (!this.ensureNfcSupport()) {
            return;
        }

        wx.navigateTo({
            url: `${ROOT_PAGE_PREFIX}/write-music/write-music`,
        });
    },

    handleWriteWeb() {
        if (!this.ensureNfcSupport()) {
            return;
        }

        wx.navigateTo({
            url: `${ROOT_PAGE_PREFIX}/write-web/write-web`,
        });
    },

    handleWriteWifi() {
        if (!this.ensureNfcSupport()) {
            return;
        }

        wx.navigateTo({
            url: `${ROOT_PAGE_PREFIX}/write-wifi/write-wifi`,
        });
    },

    handleWriteLocalMedia() {
        if (this.data.isIOSClient) {
            this.ensureNfcSupport();
            return;
        }

        wx.navigateTo({
            url: `${ROOT_PAGE_PREFIX}/write-local-media/write-local-media`,
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

    handleCloseIosBlockedDialog() {
        this.setData({
            iosBlockedDialogVisible: false,
        });
    },

    handleCloseUnsupportedDialog() {
        this.setData({
            nfcUnsupportedDialogVisible: false,
        });
    },
});
