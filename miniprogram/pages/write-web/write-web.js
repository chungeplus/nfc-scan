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

    onLoad() {
        const systemInfo = wx.getSystemInfoSync();
        const statusBarHeight = systemInfo.statusBarHeight || 20;
        this.setData({ navHeight: statusBarHeight + 44 });
    },

    handlePasteTap() {
        wx.getClipboardData({
            success: (res) => {
                const webUrl = (res.data || '').trim();
                this.updateWebUrlState(webUrl);
            }
        });
    },

    handleWebUrlInput(event) {
        const webUrl = event.detail.value || '';
        this.updateWebUrlState(webUrl);
    },

    updateWebUrlState(webUrl) {
        const normalizedInput = (webUrl || '').trim();
        let urlError = '';
        if (normalizedInput && !this.validateUrl(normalizedInput)) {
            urlError = '请输入有效的网址';
        }
        this.setData({ webUrl, urlError, canSubmit: Boolean(normalizedInput) && !urlError });
    },

    handleOpenScanDialog() {
        const webUrl = (this.data.webUrl || '').trim();
        if (!webUrl) {
            showPixelToast({ message: '请输入网页链接', theme: 'warning' });
            return;
        }
        if (!this.validateUrl(webUrl)) {
            this.setData({ urlError: '请输入有效的网址' });
            showPixelToast({ message: '请输入有效的URL', theme: 'warning' });
            return;
        }
        this.parseShareUrl();
    },

    validateUrl(url) {
        const normalizedUrl = this.normalizeUrl(url);
        const urlRegex = /^https?:\/\/(?:(?:localhost)|(?:\d{1,3}(?:\.\d{1,3}){3})|(?:[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+))(?::\d{1,5})?(?:[/?#][^\s]*)?$/i;
        return urlRegex.test(normalizedUrl);
    },

    normalizeUrl(url) {
        const trimmedUrl = (url || '').trim();
        if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
            return `https://${trimmedUrl}`;
        }
        return trimmedUrl;
    },

    parseShareUrl() {
        const finalUrl = this.normalizeUrl(this.data.webUrl);
        this.setData({
            urlError: '',
            scanVisible: true,
            records: [{ tnf: 1, id: 'web', type: 'U', payload: finalUrl }],
        });
    },

    handleCloseScanDialog() {
        this.setData({ scanVisible: false, records: [] });
    },
});
