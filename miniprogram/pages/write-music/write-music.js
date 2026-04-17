import { extractCloudMusicSongId, extractQqMusicSongId } from '../../utils/extract.js';

const CLOUD_MUSIC_SHARE_URL_REGEX = /https?:\/\/(163cn\.tv)\/\S+/i;

const QQ_MUSIC_SHARE_URL_REGEX = /https?:\/\/(?:c6\.y\.qq\.com\/base\/fcgi-bin\/u\?__=\w+|y\.qq\.com\/n\/ryqq\/songDetail\/[0-9A-Za-z]+)/i;

Page({
    data: {
        shareUrl: ``,

        writeStatus: 'input',

        parsingLoading: false,


        scanVisible: false,
        records: []
    },

    handlePasteTap() {
        wx.getClipboardData({
            success: (res) => {
                const shareUrl = res.data;
                this.setData({
                    shareUrl: shareUrl
                });
            }
        });
    },

    handleShareUrlChange(event) {
        const shareUrl = event.detail.value;

        this.setData({
            shareUrl,
        });
    },

    handleOpenScanDialog() {
        this.parseShareUrl();
    },

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
        } else if (XHS_SHARE_URL_REGEX.test(shareUrl)) {
            this.handleXhsShareUrl();
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
                const location = res.header.Location;

                const songId = extractCloudMusicSongId(location);

                this.setData({
                    scanVisible: true,
                    writeStatus: 'input',
                    parsingLoading: false,
                    records: [
                        {
                            tnf: 1,
                            id: 'music',
                            type: 'U',
                            payload: `orpheus://song/${songId}/?autoplay=true`,
                        },
                        {
                            tnf: 4,
                            id: "pkg",
                            type: "android.com:pkg",
                            payload: "com.netease.cloudmusic",
                        }
                    ],
                });
            }
        })
    },

    handleQqShareUrl() {
        const { shareUrl } = this.data;
        const musicUrl = shareUrl.match(QQ_MUSIC_SHARE_URL_REGEX)[0];

        wx.request({
            url: musicUrl,
            method: 'GET',
            redirect: 'manual',
            success: (res) => {
                const location = res.header.Location;

                const songId = extractQqMusicSongId(location);

                this.setData({
                    scanVisible: true,
                    writeStatus: 'input',
                    records: [
                        {
                            tnf: 1,
                            id: 'music',
                            type: 'U',
                            payload: `qqmusic://qq.com/media/playSonglist?p=${JSON.stringify({ song: [{ songmid: songId }] })}`,
                        },
                        {
                            tnf: 4,
                            id: "pkg",
                            type: "android.com:pkg",
                            payload: "com.tencent.qqmusic",
                        }
                    ],
                });
            }
        })
    },

    handleCloseScanDialog() {
        this.setData({
            scanVisible: false,
            records: [],
            writeStatus: 'input',
            parsingLoading: false,
        });
    },
});