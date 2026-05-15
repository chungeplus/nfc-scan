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

function describeWifiError(error = {}) {
    switch (error.errCode) {
    case 12000:
        return 'WLAN 模块尚未初始化，请重新进入页面后重试。';
    case 12001:
        return '当前设备暂不支持 WLAN 能力。';
    case 12005:
        return '请先打开手机 Wi-Fi 开关后再重试。';
    case 12006:
        return '请先打开手机定位/GPS 开关后再扫描附近 WLAN。';
    case 12007:
        return '扫描附近 WLAN 需要位置权限，请在微信设置中允许。';
    case 12011:
        return '请回到前台后重试，后台状态下无法读取 WLAN 列表。';
    default:
        return '获取 WLAN 信息失败，请稍后重试。';
    }
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
    initWifiModule,
    normalizeWifiList,
    scanNearbyWifi,
};
