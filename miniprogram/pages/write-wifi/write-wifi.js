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

function buildPickerWifiList(currentWifi = null, nearbyWifiList = [], activeSsid = '') {
    const currentSsid = currentWifi && currentWifi.SSID ? currentWifi.SSID : '';
    const nearbyBySsid = new Map();

    nearbyWifiList.forEach((item) => {
        if (item && item.SSID) {
            nearbyBySsid.set(item.SSID, item);
        }
    });

    const combinedList = [];

    if (currentSsid) {
        const currentMatch = nearbyBySsid.get(currentSsid);

        combinedList.push({
            SSID: currentSsid,
            signalStrength: currentMatch ? currentMatch.signalStrength : 0,
            isCurrent: true,
        });
    }

    nearbyWifiList.forEach((item) => {
        if (!item || !item.SSID || item.SSID === currentSsid) {
            return;
        }

        combinedList.push({
            ...item,
            isCurrent: false,
        });
    });

    return combinedList.map((item) => ({
        ...item,
        className: item.SSID === activeSsid
            ? 'picker-preview__item picker-preview__item--active'
            : 'picker-preview__item',
        signalLabel: Number.isFinite(item.signalStrength) && item.signalStrength > 0
            ? `信号 ${item.signalStrength}`
            : '',
    }));
}

function isDevtoolsRuntime(runtime = {}) {
    return String(runtime.platform || '').toLowerCase() === 'devtools';
}

Page({
    data: {
        navHeight: 64,
        currentWifi: null,
        selectedSsid: '',
        pendingSelectedSsid: '',
        pickerWifiList: [],
        nearbyWifiList: [],
        wifiPassword: '',
        scanVisible: false,
        records: [],
        loadingCurrentWifi: true,
        scanningNearbyWifi: false,
        currentWifiMessage: '',
        pickerMessage: '',
        pickerAction: '',
        formMessage: '',
        wifiRuntime: null,
        pickerVisible: false,
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

    syncPickerWifiList(activeSsid) {
        const nextActiveSsid = typeof activeSsid === 'string'
            ? activeSsid
            : this.data.pendingSelectedSsid || this.data.selectedSsid;

        this.setData({
            pickerWifiList: buildPickerWifiList(
                this.data.currentWifi,
                this.data.nearbyWifiList,
                nextActiveSsid
            ),
        });
    },

    async bootstrapWifiPage() {
        try {
            await initWifiModule();
            const currentWifi = await getConnectedWifiInfo();
            const selectedSsid = currentWifi && currentWifi.SSID ? currentWifi.SSID : '';

            this.setData({
                currentWifi,
                selectedSsid,
                pendingSelectedSsid: selectedSsid,
                loadingCurrentWifi: false,
                currentWifiMessage: '',
            }, () => {
                this.syncPickerWifiList(selectedSsid);
            });
        } catch (error) {
            this.setData({
                loadingCurrentWifi: false,
                currentWifiMessage: !isDevtoolsRuntime(this.data.wifiRuntime)
                    && shouldShowConnectedWifiError(error, this.data.wifiRuntime)
                    ? describeWifiError(error, this.data.wifiRuntime, { context: 'current' })
                    : '',
            }, () => {
                this.syncPickerWifiList();
            });
        }
    },

    async fetchNearbyWifi(options = {}) {
        const showEmptyMessage = Boolean(options.showEmptyMessage);

        this.setData({
            scanningNearbyWifi: true,
            pickerMessage: '',
            pickerAction: '',
            formMessage: '',
        });

        const scanIssue = readWifiScanIssue(this.data.wifiRuntime);
        if (scanIssue) {
            this.setData({
                scanningNearbyWifi: false,
                pickerMessage: scanIssue.message,
                pickerAction: scanIssue.action || '',
            });
            return;
        }

        try {
            await initWifiModule();
            const nearbyWifiList = await scanNearbyWifi();

            this.setData({
                nearbyWifiList,
                scanningNearbyWifi: false,
                pickerMessage: nearbyWifiList.length || !showEmptyMessage ? '' : '未扫描到附近 WLAN',
                pickerAction: '',
            }, () => {
                this.syncPickerWifiList();
            });
        } catch (error) {
            const nextScanIssue = readWifiScanIssue(this.data.wifiRuntime);
            const pickerMessage = isDevtoolsRuntime(this.data.wifiRuntime)
                ? ''
                : describeWifiError(error, this.data.wifiRuntime, { context: 'scan' });

            this.setData({
                scanningNearbyWifi: false,
                pickerMessage,
                pickerAction: nextScanIssue && nextScanIssue.action ? nextScanIssue.action : '',
            });
        }
    },

    handleOpenPicker() {
        const pendingSelectedSsid = this.data.selectedSsid
            || (this.data.currentWifi && this.data.currentWifi.SSID)
            || '';

        this.setData({
            pickerVisible: true,
            pendingSelectedSsid,
            pickerMessage: '',
            pickerAction: '',
            formMessage: '',
        }, () => {
            this.syncPickerWifiList(pendingSelectedSsid);

            if (!this.data.nearbyWifiList.length && !this.data.scanningNearbyWifi) {
                this.fetchNearbyWifi();
            }
        });
    },

    handleClosePicker() {
        this.setData({
            pickerVisible: false,
            pendingSelectedSsid: this.data.selectedSsid,
            pickerMessage: '',
            pickerAction: '',
        }, () => {
            this.syncPickerWifiList(this.data.selectedSsid);
        });
    },

    handlePickWifi(event) {
        const pendingSelectedSsid = event && event.currentTarget && event.currentTarget.dataset
            ? event.currentTarget.dataset.ssid || ''
            : '';

        this.setData({
            pendingSelectedSsid,
            formMessage: '',
        }, () => {
            this.syncPickerWifiList(pendingSelectedSsid);
        });
    },

    handleConfirmWifiSelection() {
        const selectedSsid = (this.data.pendingSelectedSsid || '').trim();

        if (!selectedSsid) {
            this.setData({
                pickerMessage: '请选择一个 WLAN',
            });
            return;
        }

        this.setData({
            selectedSsid,
            pickerVisible: false,
            formMessage: '',
        }, () => {
            this.syncPickerWifiList(selectedSsid);
        });
    },

    async handleRefreshNearbyWifi() {
        await this.fetchNearbyWifi({ showEmptyMessage: true });
    },

    async handleOpenWechatLocationSetting() {
        try {
            const opened = await openWifiAppAuthorizeSetting();

            this.setData({
                pickerMessage: opened
                    ? '请在系统里允许微信使用定位，返回后再刷新 WLAN 列表。'
                    : '当前微信版本不支持直接打开权限设置，请手动允许微信使用定位。',
                pickerAction: opened ? '' : 'open_app_authorize_setting',
            });
        } catch (error) {
            this.setData({
                pickerMessage: '无法打开微信权限设置，请手动在系统设置中允许微信使用定位。',
                pickerAction: 'open_app_authorize_setting',
            });
        }
    },

    handlePasswordInput(event) {
        const wifiPassword = event && event.detail ? event.detail.value || '' : '';

        this.setData({
            wifiPassword,
            formMessage: '',
        });
    },

    noop() {},

    handleOpenScanDialog() {
        const selectedSsid = (this.data.selectedSsid || '').trim();
        const wifiPassword = (this.data.wifiPassword || '').trim();

        if (!selectedSsid || !wifiPassword) {
            this.setData({
                formMessage: '请先选择 WLAN 并输入密码',
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
