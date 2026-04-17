/**
 * 从网易云音乐URL中提取songId
 * @param {string} url - 网易云音乐的歌曲链接（如重定向后的Location URL）
 * @returns {string|null} - 提取到的songId，若未找到则返回null
 */
function extractCloudMusicSongId(url) {
    // 正则表达式匹配 "song?id=" 后面的数字（支持可能的参数分隔符 & 或 #）
    const regex = /song\?id=(\d+)/i;
    const match = url.match(regex);
    // 如果匹配成功，返回捕获到的数字部分（第一个分组），否则返回null
    return match ? match[1] : null;
}

/**
 * 从QQ音乐URL中提取songmid（歌曲唯一标识）
 * @param {string} url - QQ音乐的歌曲链接（如重定向后的Location URL）
 * @returns {string|null} - 提取到的songmid，若未找到则返回null
 */
function extractQqMusicSongId(url) {
    // 正则表达式匹配 "songmid=" 的非特殊字符（支持字母+数字组合）
    // 考虑URL中可能的参数分隔符（&或#），匹配到分隔符为止
    const regex = /(songmid)=([^&#]+)/i;
    const match = url.match(regex);
    // 若匹配成功，返回捕获到的标识（第二个分组），否则返回null
    return match ? match[2] : null;
}

export {
    extractCloudMusicSongId,
    extractQqMusicSongId
}