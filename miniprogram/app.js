import { CLOUD_ENV_ID } from './utils/cloud-config';

App({
    globalData: {
        cloudEnvId: CLOUD_ENV_ID,
        pendingAudioRecord: null,
    },

    onLaunch() {
        this.initCloud();
        this.checkForMiniProgramUpdate();
    },

    initCloud() {
        if (!wx.cloud) {
            return;
        }

        wx.cloud.init({
            env: CLOUD_ENV_ID,
            traceUser: true,
        });
    },

    checkForMiniProgramUpdate() {
        if (!wx.canIUse || !wx.canIUse('getUpdateManager')) {
            return;
        }

        const updateManager = wx.getUpdateManager();

        updateManager.onUpdateReady(() => {
            wx.showModal({
                title: '发现新版本',
                content: '新版本已经准备好了，是否立即重启更新？',
                confirmText: '立即更新',
                cancelText: '稍后',
                success: (res) => {
                    if (res && res.confirm) {
                        updateManager.applyUpdate();
                    }
                },
            });
        });

        updateManager.onUpdateFailed(() => {
            wx.showModal({
                title: '更新提示',
                content: '新版本下载失败，请删除当前小程序后重新打开。',
                showCancel: false,
                confirmText: '我知道了',
            });
        });
    },
});
