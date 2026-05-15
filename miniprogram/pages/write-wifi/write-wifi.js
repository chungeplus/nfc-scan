import { getNavMetrics } from '../../utils/system-info';
import {
    describeWifiError,
    getConnectedWifiInfo,
    getWifiRuntime,
    initWifiModule,
    openWifiAppAuthorizeSetting,
    readWifiScanIssue,
    scanNearbyWifi,
    shouldShowConnectedWifiError,
} from '../../utils/wifi-manager';
import {
    WIFI_WSC_MIME_TYPE,
    buildWifiConfigPayload,
} from '../../utils/wifi-ndef';

Page({
    data: {
        navHeight: 64,
        currentWifi: null,
        selectedSsid: '',
        nearbyWifiList: [],
        wifiPassword: '',
        scanVisible: false,
        records: [],
        loadingCurrentWifi: true,
        scanningNearbyWifi: false,
        currentWifiMessage: '',
        nearbyWifiMessage: '',
        nearbyWifiAction: '',
        formMessage: '',
        wifiRuntime: null,
        pageHint: '仅限 WPA2-Personal',
    },

    onLoad() {
        const { navHeight } = getNavMetrics();
        const wifiRuntime = getWifiRuntime();

        this.setData({
            navHeight,
            wifiRuntime,
        });
        this.bootstrapWifiPage();
    },

    onUnload() {
        this.resetSensitiveState();
    },

    async bootstrapWifiPage() {
        try {
            await initWifiModule();
            const currentWifi = await getConnectedWifiInfo();
            const selectedSsid = currentWifi && currentWifi.SSID ? currentWifi.SSID : '';

            this.setData({
                currentWifi,
                selectedSsid,
                loadingCurrentWifi: false,
                currentWifiMessage: '',
            });
        } catch (error) {
            this.setData({
                loadingCurrentWifi: false,
                currentWifiMessage: shouldShowConnectedWifiError(error, this.data.wifiRuntime)
                    ? describeWifiError(error, this.data.wifiRuntime, { context: 'current' })
                    : '',
            });
        }
    },

    async handleScanNearbyWifi() {
        this.setData({
            scanningNearbyWifi: true,
            nearbyWifiMessage: '',
            nearbyWifiAction: '',
            formMessage: '',
        });

        const scanIssue = readWifiScanIssue(this.data.wifiRuntime);
        if (scanIssue) {
            this.setData({
                scanningNearbyWifi: false,
                nearbyWifiMessage: scanIssue.message,
                nearbyWifiAction: scanIssue.action || '',
            });
            return;
        }

        try {
            await initWifiModule();
            const nearbyWifiList = await scanNearbyWifi();

            this.setData({
                nearbyWifiList,
                scanningNearbyWifi: false,
                nearbyWifiMessage: nearbyWifiList.length ? '' : '未扫描到附近 WLAN',
                nearbyWifiAction: '',
            });
        } catch (error) {
            this.setData({
                scanningNearbyWifi: false,
                nearbyWifiMessage: describeWifiError(error, this.data.wifiRuntime, { context: 'scan' }),
                nearbyWifiAction: '',
            });
        }
    },

    async handleOpenWechatLocationSetting() {
        try {
            const opened = await openWifiAppAuthorizeSetting();

            this.setData({
                nearbyWifiMessage: opened
                    ? '请在系统里允许微信使用定位，返回后再重新扫描。'
                    : '当前微信版本不支持直接打开权限设置，请手动允许微信使用定位。',
                nearbyWifiAction: opened ? '' : 'open_app_authorize_setting',
            });
        } catch (error) {
            this.setData({
                nearbyWifiMessage: '无法打开微信权限设置，请手动在系统设置中允许微信使用定位。',
                nearbyWifiAction: 'open_app_authorize_setting',
            });
        }
    },

    handleSelectCurrentWifi() {
        const currentWifi = this.data.currentWifi;
        const selectedSsid = currentWifi && currentWifi.SSID ? currentWifi.SSID : '';

        if (!selectedSsid) {
            return;
        }

        this.setData({
            selectedSsid,
            currentWifiMessage: '',
            formMessage: '',
        });
    },

    handleSelectNearbyWifi(event) {
        const selectedSsid = event && event.currentTarget && event.currentTarget.dataset
            ? event.currentTarget.dataset.ssid || ''
            : '';

        this.setData({
            selectedSsid,
            nearbyWifiMessage: '',
            nearbyWifiAction: '',
            formMessage: '',
        });
    },

    handlePasswordInput(event) {
        const wifiPassword = event && event.detail ? event.detail.value || '' : '';

        this.setData({
            wifiPassword,
            formMessage: '',
        });
    },

    handleOpenScanDialog() {
        const selectedSsid = (this.data.selectedSsid || '').trim();
        const wifiPassword = (this.data.wifiPassword || '').trim();

        if (!selectedSsid || !wifiPassword) {
            this.setData({
                formMessage: '请先选择网络并输入密码',
            });
            return;
        }

        this.setData({
            scanVisible: true,
            formMessage: '',
            records: [
                {
                    tnf: 2,
                    id: 'wifi',
                    type: WIFI_WSC_MIME_TYPE,
                    payload: buildWifiConfigPayload({
                        ssid: selectedSsid,
                        password: wifiPassword,
                    }),
                },
            ],
        });
    },

    handleCloseScanDialog() {
        this.setData({
            scanVisible: false,
            records: [],
        });
    },

    resetSensitiveState() {
        this.setData({
            scanVisible: false,
            records: [],
            wifiPassword: '',
        });
    },
});
