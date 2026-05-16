export function extractCloudMusicSongId(url: string): string | null {
    const regex = /song\?id=(\d+)/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

export function extractQqMusicSongId(url: string): string | null {
    const regex = /(songmid)=([^&#]+)/i;
    const match = url.match(regex);
    return match ? match[2] : null;
}
