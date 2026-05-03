import { showPixelToast } from '../../utils/pixel-toast';
import { deleteMediaFile, listMediaFiles } from '../../utils/media-share-service';
import { formatFileSize, normalizeMediaRecord, sumMediaFileSize } from '../../utils/media';
import { getNavMetrics } from '../../utils/system-info';

const ROOT_PAGE_PREFIX = '/miniprogram/pages';

Page({
    data: {
        navHeight: 64,
        loading: false,
        records: [],
        totalCount: 0,
        totalSize: 0,
        totalSizeText: '0B',
        deleteDialogVisible: false,
        deleting: false,
        pendingDeleteId: '',
        pendingDeleteName: '',
    },

    onLoad() {
        const { navHeight } = getNavMetrics();

        this.setData({
            navHeight,
        });
    },

    onShow() {
        this.syncCustomTabBar();
        this.loadRecords(true);
    },

    onPullDownRefresh() {
        this.loadRecords(false);
    },

    syncCustomTabBar() {
        const tabBar = this.getTabBar && this.getTabBar();

        if (tabBar && tabBar.setData) {
            tabBar.setData({
                selected: 1,
            });
        }
    },

    async loadRecords(showLoading = true) {
        if (showLoading) {
            this.setData({
                loading: true,
            });
        }

        try {
            const result = await listMediaFiles({
                limit: 50,
            });
            const records = Array.isArray(result.records)
                ? result.records.map(item => normalizeMediaRecord(item))
                : [];
            const summary = result.summary || {};
            const totalCount = Number.isFinite(Number(summary.totalCount))
                ? Number(summary.totalCount)
                : records.length;
            const totalSize = Number.isFinite(Number(summary.totalSize))
                ? Number(summary.totalSize)
                : sumMediaFileSize(records);

            this.setData({
                records,
                totalCount,
                totalSize,
                totalSizeText: formatFileSize(totalSize),
            });
        } catch (error) {
            showPixelToast({
                message: error && error.message ? error.message : '加载文件失败',
                theme: 'error',
            });
        } finally {
            this.setData({
                loading: false,
            });
            wx.stopPullDownRefresh();
        }
    },

    handleGoNfc() {
        wx.switchTab({
            url: `${ROOT_PAGE_PREFIX}/write-menu/write-menu`,
        });
    },

    handleReuseRecord(event) {
        const recordId = event && event.currentTarget && event.currentTarget.dataset
            ? event.currentTarget.dataset.id || ''
            : '';
        const record = this.data.records.find(item => item.id === recordId);

        if (!record) {
            showPixelToast({
                message: '文件记录不存在',
                theme: 'error',
            });
            return;
        }

        const app = getApp();
        app.globalData.pendingMediaRecord = record;

        wx.navigateTo({
            url: `${ROOT_PAGE_PREFIX}/write-local-media/write-local-media?from=library`,
        });
    },

    handleCopyLink(event) {
        const recordId = event && event.currentTarget && event.currentTarget.dataset
            ? event.currentTarget.dataset.id || ''
            : '';
        const record = this.data.records.find(item => item.id === recordId);

        if (!record || !record.latestPlayUrl) {
            showPixelToast({
                message: '复制链接失败，请先重新生成播放页',
                theme: 'error',
            });
            return;
        }

        wx.setClipboardData({
            data: record.latestPlayUrl,
            success: () => {
                showPixelToast({
                    message: '已复制链接',
                    theme: 'success',
                });
            },
            fail: () => {
                showPixelToast({
                    message: '复制失败，请稍后重试',
                    theme: 'error',
                });
            },
        });
    },

    handlePromptDelete(event) {
        const recordId = event && event.currentTarget && event.currentTarget.dataset
            ? event.currentTarget.dataset.id || ''
            : '';
        const record = this.data.records.find(item => item.id === recordId);

        if (!record) {
            showPixelToast({
                message: '文件记录不存在',
                theme: 'error',
            });
            return;
        }

        this.setData({
            deleteDialogVisible: true,
            pendingDeleteId: record.id,
            pendingDeleteName: record.fileName,
        });
    },

    handleCloseDeleteDialog() {
        if (this.data.deleting) {
            return;
        }

        this.setData({
            deleteDialogVisible: false,
            pendingDeleteId: '',
            pendingDeleteName: '',
        });
    },

    async handleConfirmDelete() {
        if (this.data.deleting || !this.data.pendingDeleteId) {
            return;
        }

        try {
            this.setData({
                deleting: true,
            });

            await deleteMediaFile({
                recordId: this.data.pendingDeleteId,
            });

            const nextRecords = this.data.records.filter(item => item.id !== this.data.pendingDeleteId);
            const deletedRecord = this.data.records.find(item => item.id === this.data.pendingDeleteId);
            const nextTotalCount = Math.max(0, Number(this.data.totalCount || 0) - 1);
            const nextTotalSize = Math.max(
                0,
                Number(this.data.totalSize || 0) - Number(deletedRecord && deletedRecord.fileSize || 0),
            );

            this.setData({
                records: nextRecords,
                totalCount: nextTotalCount,
                totalSize: nextTotalSize,
                totalSizeText: formatFileSize(nextTotalSize),
                deleteDialogVisible: false,
                pendingDeleteId: '',
                pendingDeleteName: '',
            });

            showPixelToast({
                message: '文件已删除，相关 NFC 链接已失效',
                theme: 'success',
            });
        } catch (error) {
            showPixelToast({
                message: error && error.message ? error.message : '删除失败',
                theme: 'error',
            });
        } finally {
            this.setData({
                deleting: false,
            });
        }
    },
});
