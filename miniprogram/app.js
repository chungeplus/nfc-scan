App({
    /**
     * 小程序启动时执行
     * @returns {void}
     */
    onLaunch() {
        this.checkForMiniProgramUpdate();
    },

    /**
     * 检查小程序版本更新
     * @returns {void}
     */
    checkForMiniProgramUpdate() {
        if (!wx.canIUse || !wx.canIUse('getUpdateManager')) {
            return;
        }

        const updateManager = wx.getUpdateManager();

        updateManager.onCheckForUpdate((result) => {
            if (!result || !result.hasUpdate) {
                return;
            }
        });

        updateManager.onUpdateReady(() => {
            wx.showModal({
                title: '发现新版本',
                content: '新版本已准备好，是否立即重启更新？',
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
