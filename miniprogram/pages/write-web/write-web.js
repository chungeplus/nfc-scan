/**
 * 网页写入页面
 * @description 用于写入网页URL到NFC标签
 */
import { showPixelToast } from '../../utils/pixel-toast';
Page({
    data: {
        navHeight: 64,
        webUrl: '',
        urlError: '',
        canSubmit: false,
        scanVisible: false,
        records: [],
    },

    /**
     * 页面加载时初始化导航高度
     * @returns {void}
     */
    onLoad() {
        const systemInfo = wx.getSystemInfoSync();
        const statusBarHeight = systemInfo.statusBarHeight || 20;
        this.setData({
            navHeight: statusBarHeight + 44,
        });
    },

    /**
     * 粘贴剪贴板内容
     */
    handlePasteTap() {
        wx.getClipboardData({
            success: (res) => {
                const webUrl = (res.data || '').trim();
                this.updateWebUrlState(webUrl);
            }
        });
    },

    /**
     * 网页URL输入变化
     * @param {Object} event - 事件对象
     */
    handleWebUrlInput(event) {
        const webUrl = event && event.detail ? event.detail.value || '' : '';
        this.updateWebUrlState(webUrl);
    },

    /**
     * 更新网页输入状态
     * @param {string} webUrl - 网页地址
     * @returns {void}
     */
    updateWebUrlState(webUrl) {
        const normalizedInput = (webUrl || '').trim();
        let urlError = '';

        if (normalizedInput && !this.validateUrl(normalizedInput)) {
            urlError = '请输入有效的网址';
        }

        this.setData({
            webUrl,
            urlError,
            canSubmit: Boolean(normalizedInput) && !urlError,
        });
    },

    /**
     * 打开NFC扫描弹窗
     */
    handleOpenScanDialog() {
        const webUrl = (this.data.webUrl || '').trim();

        if (!webUrl) {
            showPixelToast({
                message: '请输入网页链接',
                theme: 'warning',
            });
            return;
        }

        if (!this.validateUrl(webUrl)) {
            this.setData({
                urlError: '请输入有效的网址',
            });
            showPixelToast({
                message: '请输入有效的URL',
                theme: 'warning',
            });
            return;
        }

        this.parseShareUrl();
    },

    /**
     * 验证URL格式
     * @param {string} url - URL字符串
     * @returns {boolean} 是否为有效URL
     */
    validateUrl(url) {
        const normalizedUrl = this.normalizeUrl(url);
        const urlRegex = /^https?:\/\/(?:(?:localhost)|(?:\d{1,3}(?:\.\d{1,3}){3})|(?:[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+))(?::\d{1,5})?(?:[/?#][^\s]*)?$/i;
        return urlRegex.test(normalizedUrl);
    },

    /**
     * 规范化URL
     * @param {string} url - 原始URL
     * @returns {string} 规范化后的URL
     */
    normalizeUrl(url) {
        const trimmedUrl = (url || '').trim();

        if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
            return `https://${trimmedUrl}`;
        }

        return trimmedUrl;
    },

    /**
     * 解析并准备写入数据
     */
    parseShareUrl() {
        const finalUrl = this.normalizeUrl(this.data.webUrl);

        this.setData({
            urlError: '',
            scanVisible: true,
            records: [
                {
                    tnf: 1,
                    id: 'web',
                    type: 'U',
                    payload: finalUrl,
                },
            ],
        });
    },

    /**
     * 关闭NFC扫描弹窗
     */
    handleCloseScanDialog() {
        this.setData({
            scanVisible: false,
            records: [],
        });
    },
});
