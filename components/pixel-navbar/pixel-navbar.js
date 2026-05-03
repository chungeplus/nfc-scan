const HOME_ROUTE = '/miniprogram/pages/write-menu/write-menu';

function getNavMetrics() {
    try {
        if (wx.getWindowInfo) {
            const windowInfo = wx.getWindowInfo();
            const statusBarHeight = Number(windowInfo.statusBarHeight) || 20;
            return {
                statusBarHeight,
                navHeight: statusBarHeight + 44,
            };
        }
    } catch (error) {
    }

    return {
        statusBarHeight: 20,
        navHeight: 64,
    };
}

Component({
    properties: {
        title: {
            type: String,
            value: 'NFC卡片助手',
        },
        showBack: {
            type: Boolean,
            value: true,
        },
        showHome: {
            type: Boolean,
            value: false,
        },
        theme: {
            type: String,
            value: 'home',
        },
    },

    data: {
        statusBarHeight: 20,
        navHeight: 64,
    },

    lifetimes: {
        attached() {
            const { statusBarHeight, navHeight } = getNavMetrics();
            this.setData({
                statusBarHeight,
                navHeight,
            });
        },
    },

    methods: {
        goBack() {
            const pages = getCurrentPages();

            if (pages.length > 1) {
                wx.navigateBack({
                    fail: () => {
                        this.goHome();
                    },
                });
                return;
            }

            this.goHome();
        },

        goHome() {
            wx.switchTab({
                url: HOME_ROUTE,
                fail: () => {
                    wx.reLaunch({
                        url: HOME_ROUTE,
                    });
                },
            });
        },
    },
});
