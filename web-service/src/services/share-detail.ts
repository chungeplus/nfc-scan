import type { MediaType, PlayTheme } from '../config/runtime';
import { MEDIA_TYPES, PLAY_THEMES } from '../config/runtime';
import { getCloudbaseApp, getDatabase } from './cloudbase';

const mediaTypes = new Set<MediaType>(MEDIA_TYPES);
const playThemes = new Set<PlayTheme>(PLAY_THEMES);

export interface ShareDetail {
  shareId: string;
  mediaType: MediaType;
  themeKey: PlayTheme;
  fileName: string;
  mediaUrl: string;
}

interface ShareRecord {
  shareId: string;
  fileRecordId: string;
  mediaType: string;
  themeKey: string;
}

interface FileRecord {
  fileId: string;
  fileName: string;
}

export class HttpError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'HttpError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export async function getShareDetailByShareId(shareId: string): Promise<ShareDetail> {
  const normalizedShareId = String(shareId || '').trim();
  if (!normalizedShareId) {
    throw new HttpError('Missing share ID', 'MISSING_SHARE_ID', 400);
  }

  const db = getDatabase();
  const shareResult = await db
    .collection('media_shares')
    .where({
      shareId: normalizedShareId,
    })
    .limit(1)
    .get();

  const shareRecord = normalizeDocumentData<ShareRecord>(shareResult?.data);
  if (!shareRecord) {
    throw new HttpError('Share not found or deleted', 'SHARE_NOT_FOUND', 404);
  }

  const fileResult = await db
    .collection('media_files')
    .doc(shareRecord.fileRecordId)
    .get()
    .catch(() => ({ data: null }));

  const fileRecord = normalizeDocumentData<FileRecord>(fileResult?.data);
  if (!fileRecord) {
    throw new HttpError('Share not found or deleted', 'FILE_NOT_FOUND', 404);
  }

  const mediaUrl = await getPlayableUrl(fileRecord.fileId);
  const mediaType = normalizeMediaType(shareRecord.mediaType);
  const themeKey = normalizeThemeKey(shareRecord.themeKey);

  return {
    shareId: shareRecord.shareId,
    mediaType,
    themeKey,
    fileName: fileRecord.fileName,
    mediaUrl,
  };
}

async function getPlayableUrl(fileId: string): Promise<string> {
  const cloudbaseApp = getCloudbaseApp();
  const response = await cloudbaseApp.getTempFileURL({
    fileList: [fileId],
  });

  const fileInfo = Array.isArray(response?.fileList) ? response.fileList[0] : null;
  const mediaUrl = String(fileInfo?.tempFileURL || '').trim();

  if (!mediaUrl) {
    throw new HttpError('Media URL generation failed', 'MEDIA_URL_FAILED', 500);
  }

  return mediaUrl;
}

function normalizeDocumentData<T>(data: unknown): T | null {
  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {
    return (data[0] as T) || null;
  }

  return data as T;
}

function normalizeMediaType(value: string): MediaType {
  const mediaType = String(value || '').trim().toLowerCase() as MediaType;
  if (!mediaTypes.has(mediaType)) {
    throw new HttpError('Unsupported media type', 'INVALID_MEDIA_TYPE', 500);
  }

  return mediaType;
}

function normalizeThemeKey(value: string): PlayTheme {
  const themeKey = String(value || '').trim().toLowerCase() as PlayTheme;
  if (!playThemes.has(themeKey)) {
    throw new HttpError('Unsupported play theme', 'INVALID_THEME_KEY', 500);
  }

  return themeKey;
}
