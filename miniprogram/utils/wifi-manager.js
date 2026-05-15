function normalizeWifiList(wifiList = []) {
    const strongestBySsid = new Map();

    wifiList.forEach((wifi) => {
        const ssid = wifi && typeof wifi.SSID === 'string' ? wifi.SSID.trim() : '';

        if (!ssid) {
            return;
        }

        const normalizedItem = {
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

function getWifiRuntime() {
    try {
        const systemInfo = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};

        return {
            platform: typeof systemInfo.platform === 'string' ? systemInfo.platform : '',
        };
    } catch (error) {
        return {
            platform: '',
        };
    }
}

function isDevtoolsRuntime(runtime = {}) {
    return String(runtime.platform || '').toLowerCase() === 'devtools';
}

function getErrMsg(error = {}) {
    return String(error.errMsg || error.errmsg || '').toLowerCase();
}

function inferWifiErrorCode(error = {}) {
    if (Number.isFinite(error.errCode)) {
        return error.errCode;
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

function describeWifiError(error = {}, runtime = {}) {
    const errCode = inferWifiErrorCode(error);

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
        return describeInternalWifiError(error, runtime);
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
        return '未读取到 WLAN 信息，可尝试扫描附近网络。';
    }
}

function describeInternalWifiError(error = {}, runtime = {}) {
    const errMsg = getErrMsg(error);

    if (errMsg.includes('wifi not turned on')) {
        return '请先打开手机 Wi-Fi 开关后再重试。';
    }
    if (errMsg.includes('gps not turned on')) {
        return '请先打开手机定位/GPS 开关后再扫描附近 WLAN。';
    }
    if (errMsg.includes('user denied')) {
        return '扫描附近 WLAN 需要位置权限，请在微信设置中允许。';
    }
    if (errMsg.includes('weapp in background')) {
        return '请回到前台后重试，后台状态下无法读取 WLAN 列表。';
    }
    if (isDevtoolsRuntime(runtime)) {
        return '开发者工具可能读不到真实 WLAN，请用安卓真机预览。';
    }
    return '系统返回了 WLAN 内部错误，请稍后重试。';
}

function shouldShowConnectedWifiError(error = {}, runtime = {}) {
    const errCode = inferWifiErrorCode(error);

    if (isDevtoolsRuntime(runtime)) {
        return false;
    }

    return [12001, 12005, 12006, 12007, 12010, 12011, 12013, 12014].includes(errCode);
}

function initWifiModule() {
    return new Promise((resolve, reject) => {
        wx.startWifi({
            success: resolve,
            fail: reject,
        });
    });
}

function getConnectedWifiInfo() {
    return new Promise((resolve, reject) => {
        wx.getConnectedWifi({
            success: (res) => resolve(res && res.wifi ? res.wifi : null),
            fail: reject,
        });
    });
}

function ensureLocationPermission() {
    return new Promise((resolve, reject) => {
        wx.getSetting({
            success: ({ authSetting = {} }) => {
                const authState = authSetting['scope.userLocation'];

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
                    success: resolve,
                    fail: () => reject({ errCode: 12007 }),
                });
            },
            fail: reject,
        });
    });
}

function scanNearbyWifi() {
    return ensureLocationPermission().then(
        () => new Promise((resolve, reject) => {
            const handleResult = (res) => {
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
    initWifiModule,
    normalizeWifiList,
    scanNearbyWifi,
    shouldShowConnectedWifiError,
};
