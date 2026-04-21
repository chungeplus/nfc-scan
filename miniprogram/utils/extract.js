/**
 * 从网易云音乐URL中提取songId
 * @param {string} url - 网易云音乐的歌曲链接
 * @returns {string|null} 提取到的songId，若未找到则返回null
 */
function extractCloudMusicSongId(url) {
    const regex = /song\?id=(\d+)/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

/**
 * 从QQ音乐URL中提取songmid
 * @param {string} url - QQ音乐的歌曲链接
 * @returns {string|null} 提取到的songmid，若未找到则返回null
 */
function extractQqMusicSongId(url) {
    const regex = /(songmid)=([^&#]+)/i;
    const match = url.match(regex);
    return match ? match[2] : null;
}

export {
    extractCloudMusicSongId,
    extractQqMusicSongId
}
