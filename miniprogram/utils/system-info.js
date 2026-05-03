function getStatusBarHeight() {
    try {
        if (wx.getWindowInfo) {
            const windowInfo = wx.getWindowInfo();
            return Number(windowInfo.statusBarHeight) || 20;
        }
    } catch (error) {
    }

    return 20;
}

function getNavMetrics() {
    const statusBarHeight = getStatusBarHeight();
    return {
        statusBarHeight,
        navHeight: statusBarHeight + 44,
    };
}

export { getNavMetrics };
