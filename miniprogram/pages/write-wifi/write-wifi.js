import { getNavMetrics } from '../../utils/system-info';
import {
    describeWifiError,
    getConnectedWifiInfo,
    getWifiRuntime,
    initWifiModule,
    scanNearbyWifi,
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
        statusMessage: '',
        statusTone: 'info',
        wifiRuntime: null,
        pageHint: '仅限 WPA2-Personal',
    },

    onLoad() {
        const { navHeight } = getNavMetrics();
        const wifiRuntime = getWifiRuntime();
        const statusMessage = this.getInitialStatusMessage(wifiRuntime);

        this.setData({
            navHeight,
            wifiRuntime,
            statusMessage,
            statusTone: 'info',
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
                statusMessage: selectedSsid ? '' : this.data.statusMessage,
            });
        } catch (error) {
            this.setData({
                loadingCurrentWifi: false,
                statusMessage: describeWifiError(error, this.data.wifiRuntime),
                statusTone: 'warning',
            });
        }
    },

    async handleScanNearbyWifi() {
        this.setData({
            scanningNearbyWifi: true,
        });

        try {
            await initWifiModule();
            const nearbyWifiList = await scanNearbyWifi();
            this.setData({
                nearbyWifiList,
                scanningNearbyWifi: false,
                statusMessage: nearbyWifiList.length ? '' : '未扫描到附近 WLAN',
                statusTone: nearbyWifiList.length ? 'info' : 'warning',
            });
        } catch (error) {
            this.setData({
                scanningNearbyWifi: false,
                statusMessage: describeWifiError(error, this.data.wifiRuntime),
                statusTone: 'warning',
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
            statusMessage: '',
        });
    },

    handleSelectNearbyWifi(event) {
        const selectedSsid = event && event.currentTarget && event.currentTarget.dataset
            ? event.currentTarget.dataset.ssid || ''
            : '';

        this.setData({
            selectedSsid,
            statusMessage: '',
        });
    },

    handlePasswordInput(event) {
        const wifiPassword = event && event.detail ? event.detail.value || '' : '';

        this.setData({
            wifiPassword,
            statusMessage: this.data.statusMessage === '请先选择网络并输入密码'
                ? ''
                : this.data.statusMessage,
        });
    },

    handleOpenScanDialog() {
        const selectedSsid = (this.data.selectedSsid || '').trim();
        const wifiPassword = (this.data.wifiPassword || '').trim();

        if (!selectedSsid || !wifiPassword) {
            this.setData({
                statusMessage: '请先选择网络并输入密码',
                statusTone: 'warning',
            });
            return;
        }

        this.setData({
            scanVisible: true,
            statusMessage: '',
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

    getInitialStatusMessage(wifiRuntime) {
        if (wifiRuntime && String(wifiRuntime.platform || '').toLowerCase() === 'devtools') {
            return '开发者工具可能读不到真实 WLAN，请用安卓真机预览。';
        }

        return '';
    },

    resetSensitiveState() {
        this.setData({
            scanVisible: false,
            records: [],
            wifiPassword: '',
        });
    },
});
