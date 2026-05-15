import { showPixelToast } from '../../utils/pixel-toast';
import { getNavMetrics } from '../../utils/system-info';
import {
    describeWifiError,
    getConnectedWifiInfo,
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
        pageHint: '仅限 WPA2-Personal',
    },

    onLoad() {
        const { navHeight } = getNavMetrics();
        this.setData({
            navHeight,
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
            });
        } catch (error) {
            this.setData({
                loadingCurrentWifi: false,
            });
        }
    },

    async handleScanNearbyWifi() {
        this.setData({
            scanningNearbyWifi: true,
        });

        try {
            const nearbyWifiList = await scanNearbyWifi();
            this.setData({
                nearbyWifiList,
                scanningNearbyWifi: false,
            });
        } catch (error) {
            this.setData({
                scanningNearbyWifi: false,
            });
            showPixelToast({
                message: describeWifiError(error),
                theme: 'warning',
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
        });
    },

    handleSelectNearbyWifi(event) {
        const selectedSsid = event && event.currentTarget && event.currentTarget.dataset
            ? event.currentTarget.dataset.ssid || ''
            : '';

        this.setData({
            selectedSsid,
        });
    },

    handlePasswordInput(event) {
        const wifiPassword = event && event.detail ? event.detail.value || '' : '';

        this.setData({
            wifiPassword,
        });
    },

    handleOpenScanDialog() {
        const selectedSsid = (this.data.selectedSsid || '').trim();
        const wifiPassword = (this.data.wifiPassword || '').trim();

        if (!selectedSsid || !wifiPassword) {
            showPixelToast({
                message: '请先选择 WLAN 并输入密码。',
                theme: 'warning',
            });
            return;
        }

        this.setData({
            scanVisible: true,
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
