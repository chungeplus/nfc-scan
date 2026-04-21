import { extractCloudMusicSongId, extractQqMusicSongId } from '../../utils/extract.js';
import { showPixelToast } from '../../utils/pixel-toast';

/**
 * 网易云音乐分享链接正则
 */
const CLOUD_MUSIC_SHARE_URL_REGEX = /https?:\/\/(163cn\.tv)\/\S+/i;

/**
 * QQ音乐分享链接正则
 */
const QQ_MUSIC_SHARE_URL_REGEX = /https?:\/\/(?:c6\.y\.qq\.com\/base\/fcgi-bin\/u\?__=\w+|y\.qq\.com\/n\/ryqq\/songDetail\/[0-9A-Za-z]+)/i;

Page({
    data: {
        navHeight: 64,
        shareUrl: ``,
        canSubmit: false,
        writeStatus: 'input',
        parsingLoading: false,
        scanVisible: false,
        records: []
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
                this.updateShareUrlState(res.data || '');
            }
        });
    },

    /**
     * 分享链接输入变化
     * @param {Object} event - 事件对象
     */
    handleShareUrlChange(event) {
        this.updateShareUrlState(event.detail.value || '');
    },

    /**
     * 分享链接输入变化（原生 textarea/input）
     * @param {Object} event - 事件对象
     */
    handleShareUrlInput(event) {
        const shareUrl = event && event.detail ? event.detail.value || '' : '';
        this.updateShareUrlState(shareUrl);
    },

    /**
     * 更新分享链接输入状态
     * @param {string} shareUrl - 分享链接
     * @returns {void}
     */
    updateShareUrlState(shareUrl) {
        const normalizedInput = (shareUrl || '').trim();
        this.setData({
            shareUrl,
            canSubmit: Boolean(normalizedInput),
        });
    },

    /**
     * 打开NFC扫描弹窗
     */
    handleOpenScanDialog() {
        this.parseShareUrl();
    },

    /**
     * 重置解析状态
     * @returns {void}
     */
    resetParsingState() {
        this.setData({
            writeStatus: 'input',
            parsingLoading: false,
        });
    },

    /**
     * 处理解析失败
     * @param {string} message - 提示文案
     * @returns {void}
     */
    handleParseError(message) {
        showPixelToast({
            message,
            theme: 'error',
        });
        this.resetParsingState();
    },

    /**
     * 打开NFC扫描弹窗并注入写入记录
     * @param {Array} records - NDEF记录列表
     * @returns {void}
     */
    openScanDialog(records) {
        this.setData({
            scanVisible: true,
            records,
        });
        this.resetParsingState();
    },

    /**
     * 获取重定向地址
     * @param {Object} res - 请求响应
     * @returns {string} 重定向地址
     */
    getRedirectLocation(res) {
        const header = res && res.header ? res.header : {};
        return header.Location || header.location || '';
    },

    /**
     * 解析分享链接
     */
    parseShareUrl() {
        const { shareUrl } = this.data;

        this.setData({
            writeStatus: 'parsing',
            parsingLoading: true,
        });

        if (CLOUD_MUSIC_SHARE_URL_REGEX.test(shareUrl)) {
            this.handleCloudShareUrl();
        } else if (QQ_MUSIC_SHARE_URL_REGEX.test(shareUrl)) {
            this.handleQqShareUrl();
        } else {
            showPixelToast({
                message: '链接不支持',
                theme: 'warning',
            });
            this.setData({
                writeStatus: 'input',
                parsingLoading: false,
            });
        }
    },

    /**
     * 处理网易云音乐分享链接
     */
    handleCloudShareUrl() {
        const { shareUrl } = this.data;

        const musicUrl = shareUrl.match(CLOUD_MUSIC_SHARE_URL_REGEX)[0];

        wx.request({
            url: musicUrl,
            method: 'GET',
            redirect: 'manual',
            success: (res) => {
                const location = this.getRedirectLocation(res);
                const songId = location ? extractCloudMusicSongId(location) : '';

                if (!location || !songId) {
                    this.handleParseError('解析失败');
                    return;
                }

                this.openScanDialog([
                    {
                        tnf: 1,
                        id: 'music',
                        type: 'U',
                        payload: `orpheus://song/${songId}/?autoplay=true`,
                    },
                    {
                        tnf: 4,
                        id: 'pkg',
                        type: 'android.com:pkg',
                        payload: 'com.netease.cloudmusic',
                    }
                ]);
            },
            fail: () => {
                this.handleParseError('网络请求失败');
            }
        });
    },

    /**
     * 处理QQ音乐分享链接
     */
    handleQqShareUrl() {
        const { shareUrl } = this.data;
        const musicUrl = shareUrl.match(QQ_MUSIC_SHARE_URL_REGEX)[0];

        wx.request({
            url: musicUrl,
            method: 'GET',
            redirect: 'manual',
            success: (res) => {
                const location = this.getRedirectLocation(res);
                const songId = location ? extractQqMusicSongId(location) : '';

                if (!location || !songId) {
                    this.handleParseError('解析失败');
                    return;
                }

                this.openScanDialog([
                    {
                        tnf: 1,
                        id: 'music',
                        type: 'U',
                        payload: `qqmusic://qq.com/media/playSonglist?p=${JSON.stringify({ song: [{ songmid: songId }] })}`,
                    },
                    {
                        tnf: 4,
                        id: 'pkg',
                        type: 'android.com:pkg',
                        payload: 'com.tencent.qqmusic',
                    }
                ]);
            },
            fail: () => {
                this.handleParseError('网络请求失败');
            }
        });
    },

    /**
     * 关闭NFC扫描弹窗
     */
    handleCloseScanDialog() {
        this.setData({
            scanVisible: false,
            records: [],
            writeStatus: 'input',
            parsingLoading: false,
        });
    },
});
