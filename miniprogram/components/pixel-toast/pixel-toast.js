/**
 * 像素风 Toast 组件
 * @description 用于替换 wx.showToast，提供可自定义像素风提示
 */
Component({
    data: {
        visible: false,
        message: '',
        theme: 'info',
    },

    lifetimes: {
        detached() {
            if (this._timer) {
                clearTimeout(this._timer);
                this._timer = null;
            }
        },
    },

    methods: {
        /**
         * 显示 Toast
         * @param {Object} options - 配置项
         * @param {string} options.message - 提示文案
         * @param {'info'|'success'|'warning'|'error'} [options.theme] - 主题
         * @param {number} [options.duration] - 持续时间（毫秒）
         */
        show(options) {
            const safeOptions = options || {};
            const message = safeOptions.message || '';
            const theme = safeOptions.theme || 'info';
            const duration = Number.isFinite(safeOptions.duration) ? safeOptions.duration : 1800;

            if (this._timer) {
                clearTimeout(this._timer);
                this._timer = null;
            }

            this.setData({
                visible: true,
                message,
                theme,
            });

            this._timer = setTimeout(() => {
                this.hide();
            }, duration);
        },

        /**
         * 隐藏 Toast
         */
        hide() {
            if (this._timer) {
                clearTimeout(this._timer);
                this._timer = null;
            }

            this.setData({
                visible: false,
            });
        },

        /**
         * 页面点击时关闭Toast
         * @returns {void}
         */
        handleMaskTap() {
            this.hide();
        },
    },
});
