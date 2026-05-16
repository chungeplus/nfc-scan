export interface NavMetrics {
    navHeight: number;
    statusBarHeight: number;
}

export interface ClientPlatformInfo {
    isIOS: boolean;
    platform: string;
    system: string;
}

function getStatusBarHeight(): number {
    try {
        if (wx.getWindowInfo) {
            const windowInfo = wx.getWindowInfo();
            return Number(windowInfo.statusBarHeight) || 20;
        }
    } catch {
    }

    return 20;
}

export function getNavMetrics(): NavMetrics {
    const statusBarHeight = getStatusBarHeight();
    return {
        statusBarHeight,
        navHeight: statusBarHeight + 44,
    };
}

export function getClientPlatformInfo(): ClientPlatformInfo {
    try {
        const deviceInfo = (wx.getDeviceInfo ? wx.getDeviceInfo() : {}) as Partial<WechatMiniprogram.DeviceInfo>;
        const systemInfo = (wx.getSystemInfoSync ? wx.getSystemInfoSync() : {}) as Partial<WechatMiniprogram.SystemInfo>;
        const platform = String(deviceInfo.platform || systemInfo.platform || '').toLowerCase();
        const system = String(deviceInfo.system || systemInfo.system || '').toLowerCase();
        const isIOS = platform === 'ios' || system.includes('ios');

        return { platform, system, isIOS };
    } catch {
        return { platform: '', system: '', isIOS: false };
    }
}
