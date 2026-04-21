/**
 * 像素风格导航栏组件
 * @description 自定义复古像素风格导航栏，支持多种主题色
 */
Component({
    properties: {
        title: {
            type: String,
            value: 'NFC直达',
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
            const systemInfo = wx.getSystemInfoSync();
            const statusBarHeight = systemInfo.statusBarHeight || 20;
            this.setData({
                statusBarHeight,
                navHeight: statusBarHeight + 44,
            });
        },
    },

    methods: {
        /**
         * 返回上一页
         * @returns {void}
         */
        goBack() {
            const pages = getCurrentPages();
            if (pages.length > 1) {
                wx.navigateBack({
                    fail: () => {
                        wx.reLaunch({
                            url: '/pages/write-menu/write-menu',
                        });
                    },
                });
            } else {
                wx.reLaunch({
                    url: '/pages/write-menu/write-menu',
                });
            }
        },

        /**
         * 返回首页
         * @returns {void}
         */
        goHome() {
            wx.reLaunch({
                url: '/pages/write-menu/write-menu',
            });
        },
    },
});
