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
import { getNavMetrics } from '../../utils/system-info';

const ROOT_PAGE_PREFIX = '/miniprogram/pages';

const DEFAULT_LINK_PREVIEW = '生成后显示播放页链接';

Page({
    data: {
        navHeight: 64,
        selectedFileName: '',
        selectedFileSizeText: '',
        selectedFileTagText: '',
        currentRecord: null,
        currentShareUrl: '',
        errorMessage: '',
        linkPreviewText: DEFAULT_LINK_PREVIEW,
        primaryButtonText: '上传并写入 NFC',
        submitting: false,
        submittingText: '上传中...',
        scanVisible: false,
        records: [],
        themeKey: DEFAULT_THEME_KEY,
        themeOptions: [
            { key: 'pixel', label: 'Pixel' },
            { key: 'minimal', label: 'Minimal' },
            { key: 'poster', label: 'Poster' },
        ],
    },

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

    getPendingLinkText() {
        return DEFAULT_LINK_PREVIEW;
    },

    getPrimaryButtonText(hasRecord) {
        return hasRecord ? '生成链接并写入 NFC' : '上传并写入 NFC';
    },

    applyExistingRecord(record) {
        const normalizedRecord = normalizeMediaRecord(record);

        this.setData({
            currentRecord: normalizedRecord,
            currentShareUrl: normalizedRecord.latestPlayUrl || '',
            selectedFileName: normalizedRecord.fileName,
            selectedFileSizeText: normalizedRecord.fileSizeText,
            selectedFileTagText: `${normalizedRecord.mediaTypeLabel} / 已上传`,
            errorMessage: '',
            themeKey: normalizedRecord.latestThemeKey || DEFAULT_THEME_KEY,
            linkPreviewText: normalizedRecord.latestPlayUrl || this.getPendingLinkText(),
            primaryButtonText: this.getPrimaryButtonText(true),
        });
    },

    resetSelectedState(extraData = {}) {
        this.setData({
            currentRecord: null,
            currentShareUrl: '',
            selectedFileName: '',
            selectedFileSizeText: '',
            selectedFileTagText: '',
            linkPreviewText: this.getPendingLinkText(),
            primaryButtonText: this.getPrimaryButtonText(false),
            themeKey: DEFAULT_THEME_KEY,
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
                const tempFile = res && res.tempFiles && res.tempFiles[0] ? res.tempFiles[0] : null;

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
                    mediaType: validation.mediaType,
                };

                this.resetSelectedState({
                    selectedFileName: localFile.name,
                    selectedFileSizeText: formatFileSize(localFile.size),
                    selectedFileTagText: `${getMediaTypeLabel(validation.mediaType)} / 待上传`,
                    themeKey: this.data.themeKey || DEFAULT_THEME_KEY,
                    errorMessage: '',
                });

                showPixelToast({
                    message: '已选择本地文件',
                    theme: 'success',
                });
            },
            fail: (error) => {
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

    handleSelectTheme(event) {
        const themeKey = String(
            event && event.currentTarget && event.currentTarget.dataset
                ? event.currentTarget.dataset.key || ''
                : ''
        );

        if (!themeKey || themeKey === this.data.themeKey) {
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
            } catch (error) {
                const message = error && error.message ? error.message : '生成链接失败，请稍后重试';
                this.setData({
                    errorMessage: message,
                    linkPreviewText: this.data.currentShareUrl || this.getPendingLinkText(),
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
        let createdRecord = null;

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
            const uploadResult = await this.uploadLocalMedia(
                this.selectedLocalFile,
                prepareUploadResult.upload ? prepareUploadResult.upload.cloudPath : '',
            );
            uploadedFileId = uploadResult.fileID;

            this.setData({
                submittingText: '登记中...',
            });

            const createFileResult = await createMediaFile({
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
        } catch (error) {
            if (uploadedFileId && !createdRecord) {
                this.deleteCloudFile(uploadedFileId);
            }

            const message = error && error.message ? error.message : '上传失败，请稍后重试';
            this.setData({
                errorMessage: message,
                linkPreviewText: this.data.currentShareUrl || this.getPendingLinkText(),
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

    async createShareAndOpenDialog(record, themeKey, updateSubmitting = true) {
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

            const createShareResult = await createMediaShare({
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
                currentShareUrl: shareUrl,
                selectedFileTagText: `${nextRecord.mediaTypeLabel} / 已上传`,
                linkPreviewText: shareUrl,
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

    uploadLocalMedia(file, cloudPath = '') {
        return new Promise((resolve, reject) => {
            if (!cloudPath) {
                reject(new Error('上传路径生成失败，请稍后重试'));
                return;
            }

            wx.cloud.uploadFile({
                cloudPath,
                filePath: file.path,
                success: resolve,
                fail: reject,
            });
        });
    },

    deleteCloudFile(fileId) {
        if (!fileId || !wx.cloud || !wx.cloud.deleteFile) {
            return;
        }

        wx.cloud.deleteFile({
            fileList: [fileId],
        });
    },

    openScanDialog(playUrl) {
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
