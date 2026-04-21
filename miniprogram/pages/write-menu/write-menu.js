/**
 * 首页 - NFC写入功能选择页面
 * @description 提供多种NFC写入方式的入口
 */
import { showPixelToast } from '../../utils/pixel-toast';

const DEVELOPER_PROMISE_ACK_KEY = 'developerPromiseAcknowledged';

Page({
    data: {
        navHeight: 64,
        developerPromiseDialogVisible: false,
        canDeviceProcessNFC: false,
        nfcUnsupportedDialogVisible: false,
    },

    /**
     * 页面加载时执行
     */
    onLoad() {
        const systemInfo = wx.getSystemInfoSync();
        const statusBarHeight = systemInfo.statusBarHeight || 20;
        this.setData({
            navHeight: statusBarHeight + 44,
            developerPromiseDialogVisible: this.shouldShowDeveloperPromiseDialog(),
        });
        this.checkDeviceProcessNFC();
    },

    /**
     * 判断是否需要展示开发者承诺弹窗
     * @returns {boolean} 是否展示弹窗
     */
    shouldShowDeveloperPromiseDialog() {
        try {
            return !Boolean(wx.getStorageSync(DEVELOPER_PROMISE_ACK_KEY));
        } catch (error) {
            return true;
        }
    },

    /**
     * 检测设备是否支持NFC功能
     */
    checkDeviceProcessNFC() {
        let nfcAdapter = null;

        if (wx.getNFCAdapter) {
            nfcAdapter = wx.getNFCAdapter();
        }

        this.setData({
            canDeviceProcessNFC: nfcAdapter !== null,
            nfcUnsupportedDialogVisible: nfcAdapter === null,
        });
    },

    /**
     * 跳转至应用写入页面
     */
    handleWriteApp() {
        if (!this.data.canDeviceProcessNFC) {
            showPixelToast({
                message: '设备不支持NFC功能',
                theme: 'warning',
            });
            return;
        }

        wx.navigateTo({
            url: '/pages/write-app/write-app',
        });
    },

    /**
     * 跳转至音乐写入页面
     */
    handleWriteMusic() {
        if (!this.data.canDeviceProcessNFC) {
            showPixelToast({
                message: '设备不支持NFC功能',
                theme: 'warning',
            });
            return;
        }

        wx.navigateTo({
            url: '/pages/write-music/write-music',
        });
    },

    /**
     * 跳转至网页写入页面
     */
    handleWriteWeb() {
        if (!this.data.canDeviceProcessNFC) {
            showPixelToast({
                message: '设备不支持NFC功能',
                theme: 'warning',
            });
            return;
        }

        wx.navigateTo({
            url: '/pages/write-web/write-web',
        });
    },

    /**
     * 关闭开发者承诺弹窗
     */
    handleCloseDeveloperPromiseDialog() {
        try {
            wx.setStorageSync(DEVELOPER_PROMISE_ACK_KEY, true);
        } catch (error) {
        }

        this.setData({
            developerPromiseDialogVisible: false,
        });
    },

    /**
     * 关闭 NFC 不支持弹窗
     */
    handleCloseUnsupportedDialog() {
        this.setData({
            nfcUnsupportedDialogVisible: false,
        });
    },
});
