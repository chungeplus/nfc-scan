interface WifiListEntry {
    BSSID?: string;
    SSID?: string;
    secure?: boolean;
    signalStrength?: number;
}

interface NormalizedWifiItem {
    BSSID: string;
    SSID: string;
    secure: boolean;
    signalStrength: number;
}

interface WifiRuntime {
    platform: string;
}

interface WifiErrorLike {
    errCode?: number;
    errMsg?: string;
    errmsg?: string;
}

interface WifiDescribeOptions {
    context?: 'current' | 'scan';
}

interface WifiSystemSetting {
    locationEnabled?: boolean;
    wifiEnabled?: boolean;
}

interface WifiAppAuthorizeSetting {
    locationAuthorized?: string;
}

interface WifiScanIssue {
    action?: 'open_app_authorize_setting';
    code: 'app_location_denied' | 'location_disabled' | 'wifi_disabled';
    message: string;
}

function normalizeWifiList(wifiList: WifiListEntry[] = []): NormalizedWifiItem[] {
    const strongestBySsid = new Map<string, NormalizedWifiItem>();

    wifiList.forEach((wifi) => {
        const ssid = wifi && typeof wifi.SSID === 'string' ? wifi.SSID.trim() : '';

        if (!ssid) {
            return;
        }

        const normalizedItem: NormalizedWifiItem = {
            SSID: ssid,
            BSSID: wifi && typeof wifi.BSSID === 'string' ? wifi.BSSID : '',
            secure: Boolean(wifi && wifi.secure),
            signalStrength: Number(wifi && Number.isFinite(wifi.signalStrength) ? wifi.signalStrength : 0),
        };
        const current = strongestBySsid.get(ssid);

        if (!current || normalizedItem.signalStrength > current.signalStrength) {
            strongestBySsid.set(ssid, normalizedItem);
        }
    });

    return Array.from(strongestBySsid.values()).sort(
        (left, right) => right.signalStrength - left.signalStrength
    );
}

function getWifiRuntime(): WifiRuntime {
    try {
        const systemInfo = wx.getSystemInfoSync ? wx.getSystemInfoSync() : undefined;

        return {
            platform: typeof systemInfo?.platform === 'string' ? systemInfo.platform : '',
        };
    } catch {
        return {
            platform: '',
        };
    }
}

function isDevtoolsRuntime(runtime: WifiRuntime = { platform: '' }): boolean {
    return String(runtime.platform || '').toLowerCase() === 'devtools';
}

function getErrMsg(error: WifiErrorLike = {}): string {
    return String(error.errMsg || error.errmsg || '').toLowerCase();
}

function normalizeAuthorizeState(value: unknown): string {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function inferWifiErrorCode(error: WifiErrorLike = {}): number | null {
    if (Number.isFinite(error.errCode)) {
        return Number(error.errCode);
    }

    const errMsg = getErrMsg(error);

    if (errMsg.includes('not init')) {
        return 12000;
    }
    if (errMsg.includes('system not support')) {
        return 12001;
    }
    if (errMsg.includes('wifi not turned on')) {
        return 12005;
    }
    if (errMsg.includes('gps not turned on')) {
        return 12006;
    }
    if (errMsg.includes('user denied')) {
        return 12007;
    }
    if (errMsg.includes('weapp in background')) {
        return 12011;
    }
    if (errMsg.includes('wifi config may be expired')) {
        return 12013;
    }
    if (errMsg.includes('invalid wep') || errMsg.includes('invalid wpa password')) {
        return 12014;
    }
    if (errMsg.includes('system internal error')) {
        return 12010;
    }

    return null;
}

function getInternalWifiErrorKind(error: WifiErrorLike = {}): '' | 'background' | 'gps_off' | 'permission_denied' | 'wifi_off' {
    const errMsg = getErrMsg(error);

    if (errMsg.includes('wifi not turned on')) {
        return 'wifi_off';
    }
    if (errMsg.includes('gps not turned on')) {
        return 'gps_off';
    }
    if (errMsg.includes('user denied')) {
        return 'permission_denied';
    }
    if (errMsg.includes('weapp in background')) {
        return 'background';
    }

    return '';
}

function describeWifiError(
    error: WifiErrorLike = {},
    runtime: WifiRuntime = { platform: '' },
    options: WifiDescribeOptions = {},
): string {
    const errCode = inferWifiErrorCode(error);
    const context = options.context || 'scan';

    switch (errCode) {
    case 12000:
        return 'WLAN 模块尚未初始化，请重新进入页面后重试。';
    case 12001:
        if (isDevtoolsRuntime(runtime)) {
            return '开发者工具可能读不到真实 WLAN，请用安卓真机预览。';
        }
        return '当前设备暂不支持 WLAN 能力。';
    case 12005:
        return '请先打开手机 Wi-Fi 开关后再重试。';
    case 12006:
        return '请先打开手机定位/GPS 开关后再扫描附近 WLAN。';
    case 12007:
        return '扫描附近 WLAN 需要位置权限，请在微信设置中允许。';
    case 12010:
        return describeInternalWifiError(error, runtime, context);
    case 12011:
        return '请回到前台后重试，后台状态下无法读取 WLAN 列表。';
    case 12013:
        return '系统保存的 Wi-Fi 配置可能已过期，建议先忽略该网络后重试。';
    case 12014:
        return '系统判定当前 Wi-Fi 密码无效，请检查后重试。';
    default:
        if (isDevtoolsRuntime(runtime)) {
            return '开发者工具可能读不到真实 WLAN，请用安卓真机预览。';
        }

        if (context === 'current') {
            return '';
        }

        return '扫描失败，请确认已开启 Wi-Fi、定位，并允许微信获取位置信息。';
    }
}

function describeInternalWifiError(
    error: WifiErrorLike = {},
    runtime: WifiRuntime = { platform: '' },
    context: 'current' | 'scan' = 'scan',
): string {
    const errorKind = getInternalWifiErrorKind(error);

    if (errorKind === 'wifi_off') {
        return '请先打开手机 Wi-Fi 开关后再重试。';
    }
    if (errorKind === 'gps_off') {
        return '请先打开手机定位/GPS 开关后再扫描附近 WLAN。';
    }
    if (errorKind === 'permission_denied') {
        return '扫描附近 WLAN 需要位置权限，请在微信设置中允许。';
    }
    if (errorKind === 'background') {
        return '请回到前台后重试，后台状态下无法读取 WLAN 列表。';
    }
    if (isDevtoolsRuntime(runtime)) {
        return '开发者工具可能读不到真实 WLAN，请用安卓真机预览。';
    }
    if (context === 'current') {
        return '';
    }

    return '扫描失败，请确认已开启 Wi-Fi、定位，并允许微信获取位置信息。';
}

function shouldShowConnectedWifiError(error: WifiErrorLike = {}, runtime: WifiRuntime = { platform: '' }): boolean {
    const errCode = inferWifiErrorCode(error);

    if (isDevtoolsRuntime(runtime)) {
        return false;
    }

    if (errCode !== null && [12001, 12005, 12006, 12007, 12011, 12013, 12014].includes(errCode)) {
        return true;
    }

    if (errCode === 12010) {
        return Boolean(getInternalWifiErrorKind(error));
    }

    return false;
}

function getWifiSystemSetting(): WifiSystemSetting {
    try {
        return wx.getSystemSetting ? wx.getSystemSetting() : {};
    } catch {
        return {};
    }
}

function getWifiAppAuthorizeSetting(): WifiAppAuthorizeSetting {
    try {
        return wx.getAppAuthorizeSetting ? wx.getAppAuthorizeSetting() : {};
    } catch {
        return {};
    }
}

function getWifiScanIssue({
    runtime = { platform: '' },
    systemSetting = {},
    appAuthorizeSetting = {},
}: {
    appAuthorizeSetting?: WifiAppAuthorizeSetting;
    runtime?: WifiRuntime;
    systemSetting?: WifiSystemSetting;
} = {}): WifiScanIssue | null {
    if (isDevtoolsRuntime(runtime)) {
        return null;
    }

    if (systemSetting && systemSetting.wifiEnabled === false) {
        return {
            code: 'wifi_disabled',
            message: '请先打开手机 Wi-Fi 开关后再重试。',
        };
    }

    if (systemSetting && systemSetting.locationEnabled === false) {
        return {
            code: 'location_disabled',
            message: '请先打开手机定位/GPS 开关后再扫描附近 WLAN。',
        };
    }

    const locationAuthorized = normalizeAuthorizeState(appAuthorizeSetting.locationAuthorized);

    if (locationAuthorized === 'denied') {
        return {
            code: 'app_location_denied',
            message: '请在系统设置中允许微信使用定位。',
            action: 'open_app_authorize_setting',
        };
    }

    return null;
}

function readWifiScanIssue(runtime: WifiRuntime = { platform: '' }): WifiScanIssue | null {
    return getWifiScanIssue({
        runtime,
        systemSetting: getWifiSystemSetting(),
        appAuthorizeSetting: getWifiAppAuthorizeSetting(),
    });
}

function openWifiAppAuthorizeSetting(): Promise<boolean> {
    return new Promise((resolve, reject) => {
        if (!wx.openAppAuthorizeSetting) {
            resolve(false);
            return;
        }

        wx.openAppAuthorizeSetting({
            success: () => resolve(true),
            fail: reject,
        });
    });
}

function initWifiModule(): Promise<void> {
    return new Promise((resolve, reject) => {
        wx.startWifi({
            success: () => resolve(),
            fail: reject,
        });
    });
}

function getConnectedWifiInfo(): Promise<WechatMiniprogram.WifiInfo | null> {
    return new Promise((resolve, reject) => {
        wx.getConnectedWifi({
            success: (res) => resolve(res && res.wifi ? res.wifi : null),
            fail: reject,
        });
    });
}

function ensureLocationPermission(): Promise<void> {
    return new Promise((resolve, reject) => {
        wx.getSetting({
            success: ({ authSetting = {} }) => {
                const authState = (authSetting as Record<string, boolean | undefined>)['scope.userLocation'];

                if (authState === true) {
                    resolve();
                    return;
                }

                if (authState === false) {
                    wx.openSetting({
                        success: (res) => {
                            if (res.authSetting && res.authSetting['scope.userLocation']) {
                                resolve();
                                return;
                            }

                            reject({ errCode: 12007 });
                        },
                        fail: reject,
                    });
                    return;
                }

                wx.authorize({
                    scope: 'scope.userLocation',
                    success: () => resolve(),
                    fail: () => reject({ errCode: 12007 }),
                });
            },
            fail: reject,
        });
    });
}

function scanNearbyWifi(): Promise<WifiListEntry[]> {
    return ensureLocationPermission().then(
        () => new Promise((resolve, reject) => {
            const handleResult = (res: { wifiList?: WifiListEntry[] }) => {
                if (wx.offGetWifiList) {
                    wx.offGetWifiList(handleResult);
                }

                resolve(normalizeWifiList(res && res.wifiList ? res.wifiList : []));
            };

            if (wx.offGetWifiList) {
                wx.offGetWifiList(handleResult);
            }

            wx.onGetWifiList(handleResult);
            wx.getWifiList({
                success: () => {},
                fail: (error) => {
                    if (wx.offGetWifiList) {
                        wx.offGetWifiList(handleResult);
                    }

                    reject(error);
                },
            });
        })
    );
}

export {
    describeWifiError,
    getConnectedWifiInfo,
    getWifiRuntime,
    getWifiScanIssue,
    initWifiModule,
    normalizeWifiList,
    openWifiAppAuthorizeSetting,
    readWifiScanIssue,
    scanNearbyWifi,
    shouldShowConnectedWifiError,
};
