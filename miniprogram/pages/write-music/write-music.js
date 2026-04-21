/**
 * 音乐写入页面
 * @description 用于解析并写入音乐直达链接到NFC标签
 */
import { extractCloudMusicSongId, extractQqMusicSongId } from '../../utils/extract.js';
import { showPixelToast } from '../../utils/pixel-toast';

const CLOUD_MUSIC_SHARE_URL_REGEX = /https?:\/\/(163cn\.tv)\/\S+/i;
const QQ_MUSIC_SHARE_URL_REGEX = /https?:\/\/(?:c6\.y\.qq\.com\/base\/fcgi-bin\/u\?__=\w+|y\.qq\.com\/n\/ryqq\/songDetail\/[0-9A-Za-z]+)/i;

Page({
    data: {
        navHeight: 64,
        shareUrl: '',
        canSubmit: false,
        writeStatus: 'input',
        parsingLoading: false,
        scanVisible: false,
        records: []
    },

    onLoad() {
        const systemInfo = wx.getSystemInfoSync();
        const statusBarHeight = systemInfo.statusBarHeight || 20;
        this.setData({ navHeight: statusBarHeight + 44 });
    },

    handlePasteTap() {
        wx.getClipboardData({
            success: (res) => {
                this.updateShareUrlState(res.data || '');
            }
        });
    },

    handleShareUrlInput(event) {
        const shareUrl = event.detail.value || '';
        this.updateShareUrlState(shareUrl);
    },

    updateShareUrlState(shareUrl) {
        const normalizedInput = (shareUrl || '').trim();
        this.setData({ shareUrl, canSubmit: Boolean(normalizedInput) });
    },

    handleOpenScanDialog() {
        this.parseShareUrl();
    },

    resetParsingState() {
        this.setData({ writeStatus: 'input', parsingLoading: false });
    },

    handleParseError(message) {
        showPixelToast({ message, theme: 'error' });
        this.resetParsingState();
    },

    openScanDialog(records) {
        this.setData({ scanVisible: true, records });
        this.resetParsingState();
    },

    getRedirectLocation(res) {
        const header = res && res.header ? res.header : {};
        return header.Location || header.location || '';
    },

    parseShareUrl() {
        const { shareUrl } = this.data;
        this.setData({ writeStatus: 'parsing', parsingLoading: true });

        if (CLOUD_MUSIC_SHARE_URL_REGEX.test(shareUrl)) {
            this.handleCloudShareUrl();
        } else if (QQ_MUSIC_SHARE_URL_REGEX.test(shareUrl)) {
            this.handleQqShareUrl();
        } else {
            showPixelToast({ message: '链接不支持', theme: 'warning' });
            this.setData({ writeStatus: 'input', parsingLoading: false });
        }
    },

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
                    { tnf: 1, id: 'music', type: 'U', payload: `orpheus://song/${songId}/?autoplay=true` },
                    { tnf: 4, id: 'pkg', type: 'android.com:pkg', payload: 'com.netease.cloudmusic' }
                ]);
            },
            fail: () => {
                this.handleParseError('网络请求失败');
            }
        });
    },

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
                    { tnf: 1, id: 'music', type: 'U', payload: `qqmusic://qq.com/media/playSonglist?p=${JSON.stringify({ song: [{ songmid: songId }] })}` },
                    { tnf: 4, id: 'pkg', type: 'android.com:pkg', payload: 'com.tencent.qqmusic' }
                ]);
            },
            fail: () => {
                this.handleParseError('网络请求失败');
            }
        });
    },

    handleCloseScanDialog() {
        this.setData({ scanVisible: false, records: [], writeStatus: 'input', parsingLoading: false });
    },
});
