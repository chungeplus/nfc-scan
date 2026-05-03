/**
 * 显示像素风 Toast
 * @param {Object} options - 配置项
 * @param {string} options.message - 提示文案
 * @param {'info'|'success'|'warning'|'error'} [options.theme] - 主题
 * @param {number} [options.duration] - 持续时间（毫秒）
 */
function showPixelToast(options) {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const toast = currentPage && currentPage.selectComponent
        ? currentPage.selectComponent('#pixel-toast')
        : null;

    if (toast && toast.show) {
        toast.show(options);
        return;
    }

    const safeOptions = options || {};
    const title = safeOptions.message || '';
    wx.showToast({
        title,
        icon: 'none',
        duration: Number.isFinite(safeOptions.duration) ? safeOptions.duration : 1800,
    });
}

export { showPixelToast };
