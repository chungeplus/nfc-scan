/**
 * 从网易云音乐 URL 中提取 songId。
 * @param {string} url
 * @returns {string|null}
 */
function extractCloudMusicSongId(url) {
    const regex = /song\?id=(\d+)/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

/**
 * 从 QQ 音乐 URL 中提取 songmid。
 * @param {string} url
 * @returns {string|null}
 */
function extractQqMusicSongId(url) {
    const regex = /(songmid)=([^&#]+)/i;
    const match = url.match(regex);
    return match ? match[2] : null;
}

export {
    extractCloudMusicSongId,
    extractQqMusicSongId,
};
