/**
 * 全局配置文件
 * NFC直达小程序
 */

/**
 * 应用配置
 */
const APP_CONFIG = {
    name: 'NFC直达',
    version: '1.0.0',
};

/**
 * 正则表达式配置
 */
const REGEX_CONFIG = {
    CLOUD_MUSIC: /https?:\/\/(163cn\.tv)\/\S+/i,
    QQ_MUSIC: /https?:\/\/(?:c6\.y\.qq\.com\/base\/fcgi-bin\/u\?__=\w+|y\.qq\.com\/n\/ryqq\/songDetail\/[0-9A-Za-z]+)/i,
    XHS: /https?:\/\/(?:xg\.zhihu\.com|xhslink\.com)\/\S+/i,
    URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i,
};

/**
 * 应用包名配置
 */
const APP_PACKAGE_CONFIG = {
    NETEASE_CLOUD_MUSIC: 'com.netease.cloudmusic',
    QQ_MUSIC: 'com.tencent.qqmusic',
    XIAOHONGSHU: 'com.xingin.xhs',
};

/**
 * 音乐平台配置
 */
const MUSIC_PLATFORM_CONFIG = {
    NETEASE_CLOUD_MUSIC: {
        name: '网易云音乐',
        package: APP_PACKAGE_CONFIG.NETEASE_CLOUD_MUSIC,
        scheme: 'orpheus://song/{songId}/?autoplay=true',
    },
    QQ_MUSIC: {
        name: 'QQ音乐',
        package: APP_PACKAGE_CONFIG.QQ_MUSIC,
        scheme: 'qqmusic://qq.com/media/playSonglist?p={songId}',
    },
};

/**
 * NFC配置
 */
const NFC_CONFIG = {
    WRITE_STATUS: {
        INPUT: 'input',
        PARSING: 'parsing',
        WRITING: 'writing',
        SUCCESS: 'success',
        ERROR: 'error',
    },
    RECORD_TYPE: {
        MUSIC: {
            TNF: 1,
            TYPE: 'U',
        },
        ANDROID_PACKAGE: {
            TNF: 4,
            TYPE: 'android.com:pkg',
        },
    },
};

export {
    APP_CONFIG,
    REGEX_CONFIG,
    APP_PACKAGE_CONFIG,
    MUSIC_PLATFORM_CONFIG,
    NFC_CONFIG,
};
