import {
    AUDIO_ACCEPT_EXTENSIONS,
    AUDIO_MAX_SIZE,
    DEFAULT_THEME_KEY,
    MEDIA_ACCEPT_EXTENSIONS,
    PLAY_BASE_URL,
    THEME_KEYS,
    VIDEO_ACCEPT_EXTENSIONS,
    VIDEO_MAX_SIZE,
} from './cloud-config';

type MediaType = 'audio' | 'video' | '';

export interface MediaLikeRecord {
    _id?: string;
    createdAt?: number;
    fileExt?: string;
    fileName?: string;
    fileSize?: number;
    id?: string;
    latestPlayUrl?: string;
    latestShareId?: string;
    latestShareTitle?: string;
    latestThemeKey?: string;
    mediaType?: string;
    name?: string;
    shareCount?: number;
    size?: number;
    [key: string]: unknown;
}

export interface NormalizedMediaRecord extends MediaLikeRecord {
    fileExt: string;
    fileName: string;
    fileSize: number;
    fileSizeText: string;
    id: string;
    latestPlayUrl: string;
    latestShareId: string;
    latestShareTitle: string;
    latestThemeKey: string;
    mediaType: 'audio' | 'video';
    mediaTypeLabel: string;
    shareCount: number;
    uploadedAtText: string;
}

export interface ValidateMediaFileFailure {
    message: string;
    valid: false;
}

export interface ValidateMediaFileSuccess {
    extension: string;
    mediaType: MediaType;
    sizeLimit: number;
    valid: true;
}

export type ValidateMediaFileResult = ValidateMediaFileFailure | ValidateMediaFileSuccess;

export function getFileExtension(fileName = ''): string {
    const normalized = String(fileName || '').trim();
    const lastDotIndex = normalized.lastIndexOf('.');

    if (lastDotIndex < 0) {
        return '';
    }

    return normalized.slice(lastDotIndex + 1).toLowerCase();
}

export function getMediaTypeByExtension(extension = ''): MediaType {
    const normalized = String(extension || '').toLowerCase();

    if (AUDIO_ACCEPT_EXTENSIONS.includes(normalized)) {
        return 'audio';
    }

    if (VIDEO_ACCEPT_EXTENSIONS.includes(normalized)) {
        return 'video';
    }

    return '';
}

export function getMediaTypeLabel(mediaType = ''): string {
    return mediaType === 'video' ? '视频' : '音频';
}

export function formatFileSize(size = 0): string {
    const bytes = Number(size) || 0;

    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
    }

    if (bytes >= 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))}KB`;
    }

    return `${bytes}B`;
}

export function formatUploadTime(timestamp: number | string | undefined): string {
    const time = Number(timestamp);

    if (!time) {
        return '--';
    }

    const date = new Date(time);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function trimPlayBaseUrl(): string {
    return String(PLAY_BASE_URL || '').trim().replace(/\/+$/, '');
}

export function hasConfiguredPlayBaseUrl(): boolean {
    return Boolean(trimPlayBaseUrl());
}

export function normalizeThemeKey(themeKey = ''): string {
    const normalized = String(themeKey || '').toLowerCase();
    return THEME_KEYS.includes(normalized) ? normalized : DEFAULT_THEME_KEY;
}

export function buildPlayPageUrl(shareId = '', themeKey = ''): string {
    const baseUrl = trimPlayBaseUrl();
    const normalizedShareId = String(shareId || '').trim();
    const normalizedThemeKey = normalizeThemeKey(themeKey);

    if (!baseUrl || !normalizedShareId) {
        return '';
    }

    return `${baseUrl}/play/${encodeURIComponent(normalizedThemeKey)}/${encodeURIComponent(normalizedShareId)}`;
}

export function getSuggestedTitle(fileName = ''): string {
    const normalized = String(fileName || '').trim();
    const withoutExtension = normalized.replace(/\.[^./\\]+$/, '').trim();
    return withoutExtension || '未命名内容';
}

export function normalizeMediaRecord(record: MediaLikeRecord = {}): NormalizedMediaRecord {
    const id = String(record.id || record._id || '');
    const fileName = String(record.fileName || record.name || '未命名文件');
    const fileSize = Number(record.fileSize || record.size || 0);
    const createdAt = Number(record.createdAt || 0);
    const fileExt = String(record.fileExt || getFileExtension(fileName) || '').toLowerCase();
    const mediaType = (record.mediaType || getMediaTypeByExtension(fileExt) || 'audio') as 'audio' | 'video';
    const latestShareId = String(record.latestShareId || '').trim();
    const shareCount = Number(record.shareCount || 0);

    return {
        ...record,
        id,
        fileName,
        fileSize,
        fileExt,
        mediaType,
        mediaTypeLabel: getMediaTypeLabel(mediaType),
        fileSizeText: formatFileSize(fileSize),
        uploadedAtText: formatUploadTime(createdAt),
        shareCount,
        latestShareId,
        latestShareTitle: String(record.latestShareTitle || ''),
        latestThemeKey: normalizeThemeKey(String(record.latestThemeKey || '')),
        latestPlayUrl: String(record.latestPlayUrl || buildPlayPageUrl(latestShareId, String(record.latestThemeKey || ''))),
    };
}

export function sumMediaFileSize(records: MediaLikeRecord[] = []): number {
    return records.reduce((total, item) => total + (Number(item.fileSize) || 0), 0);
}

export function validateMediaFile(file: MediaLikeRecord = {}): ValidateMediaFileResult {
    const fileName = String(file.name || '');
    const fileSize = Number(file.size || 0);
    const extension = getFileExtension(fileName);
    const mediaType = getMediaTypeByExtension(extension);

    if (!MEDIA_ACCEPT_EXTENSIONS.includes(extension)) {
        return {
            valid: false,
            message: `仅支持 ${MEDIA_ACCEPT_EXTENSIONS.join(' / ')} 文件`,
        };
    }

    const sizeLimit = mediaType === 'video' ? VIDEO_MAX_SIZE : AUDIO_MAX_SIZE;
    if (fileSize > sizeLimit) {
        return {
            valid: false,
            message: `${getMediaTypeLabel(mediaType)}超过 ${formatFileSize(sizeLimit)}，请压缩后重试`,
        };
    }

    return {
        valid: true,
        extension,
        mediaType,
        sizeLimit,
    };
}

export function getSupportText(): string {
    return `音频 ${AUDIO_ACCEPT_EXTENSIONS.join(' / ')}，${formatFileSize(AUDIO_MAX_SIZE)} 内；视频 ${VIDEO_ACCEPT_EXTENSIONS.join(' / ')}，${formatFileSize(VIDEO_MAX_SIZE)} 内`;
}

export {
    AUDIO_ACCEPT_EXTENSIONS,
    AUDIO_MAX_SIZE,
    DEFAULT_THEME_KEY,
    MEDIA_ACCEPT_EXTENSIONS,
    PLAY_BASE_URL,
    THEME_KEYS,
    VIDEO_ACCEPT_EXTENSIONS,
    VIDEO_MAX_SIZE,
};
