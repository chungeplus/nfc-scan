const cloud = require('wx-server-sdk');

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;
const mediaFiles = db.collection('media_files');
const mediaShares = db.collection('media_shares');

const MAX_LIMIT = 50;
const THEME_KEYS = ['pixel', 'minimal', 'poster'];
const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav'];
const VIDEO_EXTENSIONS = ['mp4'];
const ALL_EXTENSIONS = [...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS];
const AUDIO_MAX_SIZE = 10 * 1024 * 1024;
const VIDEO_MAX_SIZE = 20 * 1024 * 1024;
const STORAGE_ROOT = 'media-files';
const SUMMARY_PAGE_SIZE = 100;

exports.main = async (event = {}) => {
    const { action = '', payload = {} } = event;
    const { OPENID = '' } = cloud.getWXContext();

    try {
        if (!OPENID) {
            throw new Error('未获取到用户身份');
        }

        switch (action) {
        case 'prepareUpload':
            return await prepareMediaUpload(payload, OPENID);
        case 'createFile':
            return await createMediaFile(payload, OPENID);
        case 'createShare':
            return await createMediaShare(payload, OPENID);
        case 'listFiles':
            return await listMediaFiles(payload, OPENID);
        case 'deleteFile':
            return await deleteMediaFile(payload, OPENID);
        default:
            throw new Error(`不支持的操作类型: ${action || '空'}`);
        }
    } catch (error) {
        console.error('[media-share-service] 执行错误:', error);
        return {
            success: false,
            message: error && error.message ? error.message : '云函数执行失败',
        };
    }
};

async function prepareMediaUpload(payload, openid) {
    const fileName = String(payload.fileName || '').trim();
    const payloadFileExt = String(payload.fileExt || '').trim().toLowerCase();
    const mediaType = String(payload.mediaType || '').trim().toLowerCase();

    if (!fileName) {
        throw new Error('缺少文件名称');
    }

    let fileExt = payloadFileExt || getFileExtension(fileName);
    fileExt = fileExt.toLowerCase().trim();

    if (!ALL_EXTENSIONS.includes(fileExt)) {
        throw new Error(`仅支持 ${ALL_EXTENSIONS.join(' / ')} 文件`);
    }

    const normalizedMediaType = getMediaTypeFromExtension(fileExt);

    if (!normalizedMediaType || (mediaType && mediaType !== normalizedMediaType)) {
        throw new Error('媒体类型无效');
    }

    return {
        success: true,
        upload: {
            cloudPath: buildCloudMediaPath(fileName, normalizedMediaType, openid),
            fileExt,
            mediaType: normalizedMediaType,
        },
    };
}

async function createMediaFile(payload, openid) {
    const fileId = String(payload.fileId || '').trim();
    const fileName = String(payload.fileName || '').trim();
    const fileExt = String(payload.fileExt || '').trim().toLowerCase();
    const fileSize = Number(payload.fileSize || 0);
    const mediaType = String(payload.mediaType || '').trim().toLowerCase();

    if (!fileId) {
        throw new Error('缺少文件标识');
    }

    if (!fileName) {
        throw new Error('缺少文件名称');
    }

    if (!ALL_EXTENSIONS.includes(fileExt)) {
        throw new Error(`仅支持 ${ALL_EXTENSIONS.join(' / ')} 文件`);
    }

    const normalizedMediaType = getMediaTypeFromExtension(fileExt);
    if (!normalizedMediaType || (mediaType && mediaType !== normalizedMediaType)) {
        throw new Error('媒体类型无效');
    }

    const sizeLimit = normalizedMediaType === 'video' ? VIDEO_MAX_SIZE : AUDIO_MAX_SIZE;
    if (!fileSize || fileSize <= 0 || fileSize > sizeLimit) {
        throw new Error(`${normalizedMediaType === 'video' ? '视频' : '音频'}文件大小无效`);
    }

    const cloudPath = await verifyUploadedFile(fileId, openid, normalizedMediaType);
    const now = Date.now();
    const record = {
        openid,
        mediaType: normalizedMediaType,
        fileId,
        cloudPath,
        fileName,
        fileExt,
        fileSize,
        createdAt: now,
        updatedAt: now,
    };

    const result = await mediaFiles.add({
        data: record,
    });

    return {
        success: true,
        record: {
            id: result._id,
            ...record,
        },
    };
}

async function createMediaShare(payload, openid) {
    const fileRecordId = String(payload.fileRecordId || '').trim();
    const themeKey = String(payload.themeKey || '').trim().toLowerCase();

    if (!fileRecordId) {
        throw new Error('缺少文件记录标识');
    }

    if (!THEME_KEYS.includes(themeKey)) {
        throw new Error('播放页风格无效');
    }

    const fileRecord = await getMediaFileById(fileRecordId, openid);
    if (!fileRecord) {
        throw new Error('文件记录不存在');
    }

    const shareId = await generateShareId();
    const now = Date.now();
    const shareRecord = {
        shareId,
        fileRecordId,
        openid,
        mediaType: fileRecord.mediaType,
        themeKey,
        createdAt: now,
        updatedAt: now,
    };

    const result = await mediaShares.add({
        data: shareRecord,
    });

    return {
        success: true,
        share: {
            id: result._id,
            ...shareRecord,
        },
    };
}

async function listMediaFiles(payload, openid) {
    const limit = normalizeLimit(payload.limit);
    let fileRecords = [];

    try {
        const orderedResult = await mediaFiles
            .where({ openid })
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        fileRecords = Array.isArray(orderedResult.data) ? orderedResult.data : [];
    } catch (error) {
        const fallbackResult = await mediaFiles
            .where({ openid })
            .limit(limit * 4)
            .get();

        fileRecords = Array.isArray(fallbackResult.data)
            ? fallbackResult.data
                .slice()
                .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0))
                .slice(0, limit)
            : [];
    }

    const summary = await getMediaFileSummary(openid);

    if (!fileRecords.length) {
        return {
            success: true,
            records: [],
            summary,
        };
    }

    const fileRecordIds = fileRecords.map(item => item._id);
    const shareRecords = await listSharesByFileIds(fileRecordIds, openid);
    const shareMetaMap = buildShareMetaMap(shareRecords);

    const records = fileRecords.map((item) => {
        const shareMeta = shareMetaMap[item._id] || {};

        return {
            id: item._id,
            ...item,
            shareCount: shareMeta.shareCount || 0,
            latestShareId: shareMeta.latestShareId || '',
            latestThemeKey: shareMeta.latestThemeKey || 'pixel',
            latestShareCreatedAt: shareMeta.latestShareCreatedAt || 0,
        };
    });

    return {
        success: true,
        records,
        summary,
    };
}

async function deleteMediaFile(payload, openid) {
    const recordId = String(payload.recordId || '').trim();

    if (!recordId) {
        throw new Error('缺少记录标识');
    }

    const fileRecord = await getMediaFileById(recordId, openid);
    if (!fileRecord) {
        throw new Error('文件记录不存在');
    }

    if (fileRecord.fileId) {
        await deleteCloudFileOrThrow(fileRecord.fileId);
    }

    await mediaShares
        .where({
            fileRecordId: recordId,
            openid,
        })
        .remove();

    await mediaFiles.doc(recordId).remove();

    return {
        success: true,
        recordId,
    };
}

async function getMediaFileById(recordId, openid) {
    const result = await mediaFiles
        .where({
            _id: recordId,
            openid,
        })
        .limit(1)
        .get();

    return Array.isArray(result.data) && result.data[0]
        ? result.data[0]
        : null;
}

async function listSharesByFileIds(fileRecordIds = [], openid = '') {
    if (!fileRecordIds.length) {
        return [];
    }

    const query = {
        openid,
        fileRecordId: _.in(fileRecordIds),
    };
    const pageSize = 100;
    const records = [];
    let skip = 0;

    while (true) {
        let result;

        try {
            result = await mediaShares
                .where(query)
                .orderBy('createdAt', 'desc')
                .skip(skip)
                .limit(pageSize)
                .get();
        } catch (error) {
            result = await mediaShares
                .where(query)
                .skip(skip)
                .limit(pageSize)
                .get();
        }

        const pageRecords = Array.isArray(result.data) ? result.data : [];
        records.push(...pageRecords);

        if (pageRecords.length < pageSize) {
            break;
        }

        skip += pageSize;
    }

    return records.slice().sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0));
}

function buildShareMetaMap(shareRecords = []) {
    return shareRecords.reduce((map, item) => {
        const key = String(item.fileRecordId || '');
        if (!key) {
            return map;
        }

        if (!map[key]) {
            map[key] = {
                shareCount: 0,
                latestShareId: '',
                latestThemeKey: 'pixel',
                latestShareCreatedAt: 0,
            };
        }

        map[key].shareCount += 1;

        const createdAt = Number(item.createdAt || 0);
        if (createdAt >= map[key].latestShareCreatedAt) {
            map[key].latestShareId = item.shareId || '';
            map[key].latestThemeKey = item.themeKey || 'pixel';
            map[key].latestShareCreatedAt = createdAt;
        }

        return map;
    }, {});
}

async function deleteCloudFileOrThrow(fileId) {
    const result = await cloud.deleteFile({
        fileList: [fileId],
    });
    const fileList = Array.isArray(result.fileList) ? result.fileList : [];

    if (fileList[0] && fileList[0].status === -1 && !isMissingStorageFile(fileList[0])) {
        throw new Error('删除云存储文件失败，请稍后重试');
    }
}

async function generateShareId() {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let attempt = 0; attempt < 10; attempt += 1) {
        let shareId = '';
        for (let index = 0; index < 14; index += 1) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            shareId += charset[randomIndex];
        }

        const result = await mediaShares
            .where({ shareId })
            .limit(1)
            .get();

        if (!Array.isArray(result.data) || !result.data.length) {
            return shareId;
        }
    }

    throw new Error('生成分享 ID 失败，请稍后重试');
}

function getMediaTypeFromExtension(extension = '') {
    const normalized = String(extension || '').toLowerCase();

    if (AUDIO_EXTENSIONS.includes(normalized)) {
        return 'audio';
    }

    if (VIDEO_EXTENSIONS.includes(normalized)) {
        return 'video';
    }

    return '';
}

function getFileExtension(fileName = '') {
    const normalized = String(fileName || '').trim();
    const lastDotIndex = normalized.lastIndexOf('.');

    if (lastDotIndex < 0) {
        return '';
    }

    return normalized.slice(lastDotIndex + 1).toLowerCase();
}

function sanitizeFileName(fileName = 'media') {
    const normalized = String(fileName || 'media').trim() || 'media';
    return normalized.replace(/[^\w.\-\u4e00-\u9fa5]/g, '_');
}

function buildCloudMediaPath(fileName = 'media', mediaType = '', openid = '') {
    const safeName = sanitizeFileName(fileName);
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    return `${STORAGE_ROOT}/${mediaType}/${openid}/${Date.now()}-${randomSuffix}-${safeName}`;
}

function extractCloudPathFromFileId(fileId = '') {
    const normalized = String(fileId || '').trim();
    const matched = normalized.match(/^cloud:\/\/[^/]+\/(.+)$/);
    return matched && matched[1] ? matched[1] : '';
}

function isOwnedMediaPath(cloudPath = '', openid = '', mediaType = '') {
    const normalizedPath = String(cloudPath || '').trim();
    const expectedPrefix = `${STORAGE_ROOT}/${mediaType}/${openid}/`;
    return Boolean(normalizedPath) && normalizedPath.startsWith(expectedPrefix);
}

async function verifyUploadedFile(fileId, openid, mediaType) {
    const cloudPath = extractCloudPathFromFileId(fileId);

    if (!cloudPath) {
        throw new Error('文件标识无效');
    }

    if (!isOwnedMediaPath(cloudPath, openid, mediaType)) {
        throw new Error('文件路径无效');
    }

    const result = await cloud.getTempFileURL({
        fileList: [fileId],
    });
    const fileList = Array.isArray(result.fileList) ? result.fileList : [];
    const fileInfo = fileList[0] || null;
    const tempFileURL = fileInfo ? String(fileInfo.tempFileURL || '').trim() : '';

    if (!fileInfo || fileInfo.status === -1 || !tempFileURL) {
        throw new Error('云存储文件不存在或不可访问');
    }

    return cloudPath;
}

async function getMediaFileSummary(openid) {
    const summary = {
        totalCount: 0,
        totalSize: 0,
    };
    let skip = 0;

    while (true) {
        const result = await mediaFiles
            .where({ openid })
            .skip(skip)
            .limit(SUMMARY_PAGE_SIZE)
            .get();

        const pageRecords = Array.isArray(result.data) ? result.data : [];
        summary.totalCount += pageRecords.length;
        summary.totalSize += pageRecords.reduce(
            (total, item) => total + (Number(item.fileSize) || 0),
            0,
        );

        if (pageRecords.length < SUMMARY_PAGE_SIZE) {
            break;
        }

        skip += SUMMARY_PAGE_SIZE;
    }

    return summary;
}

function isMissingStorageFile(fileInfo = {}) {
    const message = `${fileInfo.errMsg || ''} ${fileInfo.code || ''}`.toLowerCase();

    return message.includes('not exist')
        || message.includes('not found')
        || message.includes('no such file')
        || message.includes('resource not found')
        || message.includes('invalid fileid');
}

function normalizeLimit(limit) {
    const parsed = Number(limit);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return MAX_LIMIT;
    }

    return Math.min(Math.floor(parsed), MAX_LIMIT);
}
