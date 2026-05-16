import { showPixelToast } from '../../utils/pixel-toast';
import {
    createMediaFile,
    createMediaShare,
    prepareMediaUpload,
} from '../../utils/media-share-service';
import {
    DEFAULT_THEME_KEY,
    buildPlayPageUrl,
    formatFileSize,
    getMediaTypeLabel,
    hasConfiguredPlayBaseUrl,
    normalizeMediaRecord,
    validateMediaFile,
} from '../../utils/media';
import type { NormalizedMediaRecord } from '../../utils/media';
import { getNavMetrics } from '../../utils/system-info';

const ROOT_PAGE_PREFIX = '/pages';

type ThemeKey = 'pixel' | 'minimal' | 'poster';

interface ScanRecord {
    tnf: number;
    id: string;
    type: string;
    payload: string;
}

interface ThemeOption {
    key: ThemeKey;
    label: string;
}

interface SelectedLocalFile {
    name: string;
    size: number;
    path: string;
    type: string;
    extension: string;
    mediaType: 'audio' | 'video';
    [key: string]: unknown;
}

interface LocalChooseFile {
    name?: string;
    size?: number;
    path?: string;
    tempFilePath?: string;
    type?: string;
}

interface WriteLocalMediaPageData {
    navHeight: number;
    selectedFileName: string;
    selectedFileSizeText: string;
    selectedFileTagText: string;
    currentRecord: NormalizedMediaRecord | null;
    errorMessage: string;
    primaryButtonText: string;
    canSubmitMedia: boolean;
    submitting: boolean;
    submittingText: string;
    scanVisible: boolean;
    records: ScanRecord[];
    themeKey: ThemeKey;
    themeOptions: ThemeOption[];
}

interface PrepareUploadResponse {
    cloudPath?: string;
}

interface CreateShareResponse {
    shareId?: string;
    themeKey?: string;
}

interface UploadFileResult {
    fileID: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (
        typeof error === 'object'
        && error !== null
        && 'message' in error
        && typeof error.message === 'string'
        && error.message
    ) {
        return error.message;
    }

    return fallback;
}

function isThemeKey(value: string): value is ThemeKey {
    return value === 'pixel' || value === 'minimal' || value === 'poster';
}

Page({
    selectedLocalFile: null as SelectedLocalFile | null,

    data: {
        navHeight: 64,
        selectedFileName: '',
        selectedFileSizeText: '',
        selectedFileTagText: '',
        currentRecord: null as WriteLocalMediaPageData['currentRecord'],
        errorMessage: '',
        primaryButtonText: '上传并写入 NFC',
        canSubmitMedia: false,
        submitting: false,
        submittingText: '上传中...',
        scanVisible: false,
        records: [] as ScanRecord[],
        themeKey: DEFAULT_THEME_KEY as ThemeKey,
        themeOptions: [
            { key: 'pixel', label: 'Pixel' },
            { key: 'minimal', label: 'Minimal' },
            { key: 'poster', label: 'Poster' },
        ] as ThemeOption[],
    } as WriteLocalMediaPageData,

    onLoad() {
        const { navHeight } = getNavMetrics();

        this.setData({
            navHeight,
        });

        this.consumePendingRecord();
    },

    consumePendingRecord() {
        const app = getApp();
        const pendingRecord = app && app.globalData ? app.globalData.pendingMediaRecord : null;

        if (!pendingRecord) {
            return;
        }

        app.globalData.pendingMediaRecord = null;
        this.selectedLocalFile = null;
        this.applyExistingRecord(pendingRecord);
        showPixelToast({
            message: '已带入文件，可直接写入 NFC',
            theme: 'success',
        });
    },

    getPrimaryButtonText(hasRecord: boolean) {
        return hasRecord ? '生成链接并写入 NFC' : '上传并写入 NFC';
    },

    applyExistingRecord(record: Parameters<typeof normalizeMediaRecord>[0]) {
        const normalizedRecord = normalizeMediaRecord(record);

        this.setData({
            currentRecord: normalizedRecord,
            selectedFileName: normalizedRecord.fileName,
            selectedFileSizeText: normalizedRecord.fileSizeText,
            selectedFileTagText: `${normalizedRecord.mediaTypeLabel} / 已上传`,
            errorMessage: '',
            primaryButtonText: this.getPrimaryButtonText(true),
            canSubmitMedia: true,
        });
    },

    resetSelectedState(extraData: Partial<WriteLocalMediaPageData> = {}) {
        this.setData({
            currentRecord: null,
            selectedFileName: '',
            selectedFileSizeText: '',
            selectedFileTagText: '',
            primaryButtonText: this.getPrimaryButtonText(false),
            canSubmitMedia: false,
            themeKey: this.data.themeKey || DEFAULT_THEME_KEY,
            ...extraData,
        });
    },

    handleChooseFile() {
        if (this.data.submitting) {
            return;
        }

        wx.chooseMessageFile({
            count: 1,
            type: 'file',
            extension: ['mp3', 'm4a', 'wav', 'mp4'],
            success: (res) => {
                const tempFile = res && res.tempFiles && res.tempFiles[0]
                    ? res.tempFiles[0] as LocalChooseFile
                    : null;

                if (!tempFile) {
                    showPixelToast({
                        message: '没有选择到文件',
                        theme: 'info',
                    });
                    return;
                }

                const localFile = {
                    name: tempFile.name || '未命名文件',
                    size: Number(tempFile.size || 0),
                    path: tempFile.path || tempFile.tempFilePath || '',
                    type: tempFile.type || '',
                };
                const validation = validateMediaFile(localFile);

                if (!localFile.path) {
                    this.selectedLocalFile = null;
                    this.resetSelectedState();
                    showPixelToast({
                        message: '无法读取文件，请重新选择',
                        theme: 'error',
                    });
                    return;
                }

                if (!validation.valid) {
                    this.selectedLocalFile = null;
                    this.resetSelectedState({
                        selectedFileName: localFile.name,
                        selectedFileSizeText: formatFileSize(localFile.size),
                        selectedFileTagText: '待上传',
                        errorMessage: validation.message,
                    });
                    showPixelToast({
                        message: validation.message,
                        theme: 'error',
                    });
                    return;
                }

                this.selectedLocalFile = {
                    ...localFile,
                    extension: validation.extension,
                    mediaType: validation.mediaType as SelectedLocalFile['mediaType'],
                };

                this.resetSelectedState({
                    selectedFileName: localFile.name,
                    selectedFileSizeText: formatFileSize(localFile.size),
                    selectedFileTagText: `${getMediaTypeLabel(validation.mediaType)} / 待上传`,
                    canSubmitMedia: true,
                    errorMessage: '',
                });

                showPixelToast({
                    message: '已选择本地文件',
                    theme: 'success',
                });
            },
            fail: (error: WechatMiniprogram.GeneralCallbackResult) => {
                if (error && /cancel/i.test(error.errMsg || '')) {
                    return;
                }

                showPixelToast({
                    message: '选择文件失败，请重试',
                    theme: 'error',
                });
            },
        });
    },

    handleSelectTheme(event: WechatMiniprogram.BaseEvent) {
        const themeKey = String(
            event && event.currentTarget && event.currentTarget.dataset
                ? event.currentTarget.dataset.key || ''
                : ''
        );

        if (!isThemeKey(themeKey) || themeKey === this.data.themeKey) {
            return;
        }

        this.setData({
            themeKey,
        });
    },

    async handleWriteMedia() {
        if (this.data.submitting) {
            return;
        }

        if (!hasConfiguredPlayBaseUrl()) {
            showPixelToast({
                message: '播放页地址未配置，请联系管理员',
                theme: 'error',
            });
            return;
        }

        if (this.data.currentRecord) {
            try {
                await this.createShareAndOpenDialog(this.data.currentRecord, this.data.themeKey);
            } catch (error: unknown) {
                const message = getErrorMessage(error, '生成链接失败，请稍后重试');
                this.setData({
                    errorMessage: message,
                });
                showPixelToast({
                    message,
                    theme: 'error',
                });
            }
            return;
        }

        if (!this.selectedLocalFile) {
            showPixelToast({
                message: '请先选择本地音视频文件',
                theme: 'info',
            });
            return;
        }

        const validation = validateMediaFile(this.selectedLocalFile);
        if (!validation.valid) {
            this.setData({
                errorMessage: validation.message,
            });
            showPixelToast({
                message: validation.message,
                theme: 'error',
            });
            return;
        }

        let uploadedFileId = '';
        let createdRecord: NormalizedMediaRecord | null = null;

        try {
            this.setData({
                submitting: true,
                submittingText: '上传中...',
                errorMessage: '',
            });

            const prepareUploadResult = await prepareMediaUpload({
                fileName: this.selectedLocalFile.name,
                fileExt: this.selectedLocalFile.extension,
                mediaType: this.selectedLocalFile.mediaType,
            });
            const uploadConfig = (prepareUploadResult.upload || {}) as PrepareUploadResponse;
            const uploadResult = await this.uploadLocalMedia(
                this.selectedLocalFile,
                uploadConfig.cloudPath || '',
            );
            uploadedFileId = uploadResult.fileID;

            this.setData({
                submittingText: '登记中...',
            });

            const createFileResult = await createMediaFile<Parameters<typeof normalizeMediaRecord>[0]>({
                fileId: uploadedFileId,
                fileName: this.selectedLocalFile.name,
                fileSize: this.selectedLocalFile.size,
                fileExt: this.selectedLocalFile.extension,
                mediaType: this.selectedLocalFile.mediaType,
            });

            createdRecord = normalizeMediaRecord(createFileResult.record || {});
            this.selectedLocalFile = null;
            this.applyExistingRecord(createdRecord);

            await this.createShareAndOpenDialog(createdRecord, this.data.themeKey, false);
        } catch (error: unknown) {
            if (uploadedFileId && !createdRecord) {
                try {
                    await this.deleteCloudFile(uploadedFileId);
                } catch (cleanupError) {
                    console.error('[write-local-media] 清理已上传文件失败:', cleanupError);
                }
            }

            const message = getErrorMessage(error, '上传失败，请稍后重试');
            this.setData({
                errorMessage: message,
            });
            showPixelToast({
                message,
                theme: 'error',
            });
        } finally {
            this.setData({
                submitting: false,
                submittingText: '上传中...',
            });
        }
    },

    async createShareAndOpenDialog(record: NormalizedMediaRecord, themeKey: ThemeKey, updateSubmitting = true) {
        try {
            if (updateSubmitting) {
                this.setData({
                    submitting: true,
                    submittingText: '生成中...',
                    errorMessage: '',
                });
            } else {
                this.setData({
                    submittingText: '生成中...',
                });
            }

            const createShareResult = await createMediaShare<CreateShareResponse>({
                fileRecordId: record.id,
                themeKey,
            });
            const share = createShareResult.share || {};
            const shareUrl = buildPlayPageUrl(share.shareId, share.themeKey);

            if (!shareUrl) {
                throw new Error('播放页地址未配置，请联系管理员');
            }

            const nextRecord = normalizeMediaRecord({
                ...record,
                latestShareId: share.shareId,
                latestThemeKey: share.themeKey,
            });

            this.setData({
                currentRecord: nextRecord,
                selectedFileTagText: `${nextRecord.mediaTypeLabel} / 已上传`,
                primaryButtonText: this.getPrimaryButtonText(true),
            });

            this.openScanDialog(shareUrl);
        } finally {
            if (updateSubmitting) {
                this.setData({
                    submitting: false,
                    submittingText: '上传中...',
                });
            }
        }
    },

    uploadLocalMedia(file: SelectedLocalFile, cloudPath = ''): Promise<UploadFileResult> {
        return new Promise((resolve, reject) => {
            if (!cloudPath) {
                reject(new Error('上传路径生成失败，请稍后重试'));
                return;
            }

            wx.cloud.uploadFile({
                cloudPath,
                filePath: file.path,
                success: (result) => resolve({ fileID: result.fileID }),
                fail: reject,
            });
        });
    },

    deleteCloudFile(fileId: string) {
        if (!fileId || !wx.cloud || !wx.cloud.deleteFile) {
            return Promise.resolve();
        }

        return wx.cloud.deleteFile({
            fileList: [fileId],
        });
    },

    openScanDialog(playUrl: string) {
        if (!playUrl) {
            showPixelToast({
                message: '播放页链接生成失败，请稍后重试',
                theme: 'error',
            });
            return;
        }

        this.setData({
            scanVisible: true,
            records: [
                {
                    tnf: 1,
                    id: 'share',
                    type: 'U',
                    payload: playUrl,
                },
            ],
        });
    },

    handleCloseScanDialog() {
        this.setData({
            scanVisible: false,
            records: [],
        });
    },

    handleGoToFiles() {
        this.handleCloseScanDialog();
        wx.switchTab({
            url: `${ROOT_PAGE_PREFIX}/my-files/my-files`,
        });
    },
});
