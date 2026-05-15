import { getNavMetrics } from '../../utils/system-info';
import {
    describeWifiError,
    getConnectedWifiInfo,
    getWifiRuntime,
    initWifiModule,
    openWifiAppAuthorizeSetting,
    readWifiScanIssue,
    scanNearbyWifi,
} from '../../utils/wifi-manager';
import type { WifiErrorLike, WifiListEntry, WifiRuntime } from '../../utils/wifi-manager';
import {
    WIFI_WSC_MIME_TYPE,
    buildWifiConfigPayload,
} from '../../utils/wifi-ndef';
import { arrayBufferToHex, string2ArrayBuffer } from '../../utils/convert';

interface PickerWifiItem {
    SSID: string;
    className: string;
}

interface WifiWriteRecord {
    idHex: string;
    typeHex: string;
    payloadHex: string;
}

interface WifiWriteRequest {
    recordStrategy: 'documented-records';
    records: WifiWriteRecord[];
}

interface FetchNearbyWifiOptions {
    showEmptyMessage?: boolean;
}

interface WriteWifiPageData {
    navHeight: number;
    currentWifi: WechatMiniprogram.WifiInfo | null;
    selectedSsid: string;
    pendingSelectedSsid: string;
    pickerWifiList: PickerWifiItem[];
    nearbyWifiList: WifiListEntry[];
    wifiPassword: string;
    showPassword: boolean;
    scanVisible: boolean;
    records: Array<Record<string, unknown>>;
    writeRequest: WifiWriteRequest | null;
    scanningNearbyWifi: boolean;
    pickerMessage: string;
    pickerAction: '' | 'open_app_authorize_setting';
    formMessage: string;
    wifiRuntime: WifiRuntime | null;
    pickerVisible: boolean;
}

function asWifiErrorLike(error: unknown): WifiErrorLike {
    if (typeof error === 'object' && error !== null) {
        return error as WifiErrorLike;
    }

    return {};
}

function buildPickerWifiList(
    currentWifi: WechatMiniprogram.WifiInfo | null = null,
    nearbyWifiList: WifiListEntry[] = [],
    activeSsid = '',
    committedSsid = '',
): PickerWifiItem[] {
    const currentSsid = currentWifi && currentWifi.SSID ? currentWifi.SSID : '';
    const nearbyBySsid = new Map<string, WifiListEntry>();

    nearbyWifiList.forEach((item) => {
        if (item && item.SSID) {
            nearbyBySsid.set(item.SSID, item);
        }
    });

    const combinedList: Array<{ SSID: string }> = [];

    if (currentSsid) {
        combinedList.push({
            SSID: currentSsid,
        });
    }

    const dedupedNearbyWifiList = Array.from(nearbyBySsid.values());

    dedupedNearbyWifiList.forEach((item) => {
        if (!item || !item.SSID || item.SSID === currentSsid) {
            return;
        }

        combinedList.push({
            SSID: item.SSID,
        });
    });

    return combinedList.map((item) => {
        const isActive = item.SSID === activeSsid;
        const shouldLock = isActive && activeSsid && activeSsid !== committedSsid;

        return {
            ...item,
            className: [
                'picker-preview__item',
                isActive ? 'picker-preview__item--active' : '',
                shouldLock ? 'motion-scan-lock' : '',
            ].filter(Boolean).join(' '),
        };
    });
}

function isDevtoolsRuntime(runtime: Partial<WifiRuntime> = {}) {
    return String(runtime.platform || '').toLowerCase() === 'devtools';
}

function buildWifiWriteRequest(ssid: string, password: string): WifiWriteRequest {
    return {
        recordStrategy: 'documented-records',
        records: [
            {
                idHex: '',
                typeHex: arrayBufferToHex(string2ArrayBuffer(WIFI_WSC_MIME_TYPE)),
                payloadHex: arrayBufferToHex(buildWifiConfigPayload({ ssid, password })),
            },
        ],
    };
}

Page({
    data: {
        navHeight: 64,
        currentWifi: null as WechatMiniprogram.WifiInfo | null,
        selectedSsid: '',
        pendingSelectedSsid: '',
        pickerWifiList: [] as PickerWifiItem[],
        nearbyWifiList: [] as WifiListEntry[],
        wifiPassword: '',
        showPassword: false,
        scanVisible: false,
        records: [] as Array<Record<string, unknown>>,
        writeRequest: null as WifiWriteRequest | null,
        scanningNearbyWifi: false,
        pickerMessage: '',
        pickerAction: '' as WriteWifiPageData['pickerAction'],
        formMessage: '',
        wifiRuntime: null as WifiRuntime | null,
        pickerVisible: false,
    } as WriteWifiPageData,

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

    syncPickerWifiList(activeSsid?: string) {
        const nextActiveSsid = typeof activeSsid === 'string'
            ? activeSsid
            : this.data.pendingSelectedSsid || this.data.selectedSsid;

        this.setData({
            pickerWifiList: buildPickerWifiList(
                this.data.currentWifi,
                this.data.nearbyWifiList,
                nextActiveSsid,
                this.data.selectedSsid
            ),
        });
    },

    async bootstrapWifiPage() {
        try {
            await initWifiModule();
            const currentWifi = await getConnectedWifiInfo();
            const selectedSsid = currentWifi && currentWifi.SSID ? currentWifi.SSID : '';
            const hasManualSelection = Boolean(
                (this.data.selectedSsid || '').trim() || (this.data.pendingSelectedSsid || '').trim()
            );
            const nextState: Partial<WriteWifiPageData> = {
                currentWifi,
            };

            if (!hasManualSelection && selectedSsid) {
                nextState.selectedSsid = selectedSsid;
                nextState.pendingSelectedSsid = selectedSsid;
            }

            this.setData(nextState, () => {
                this.syncPickerWifiList(hasManualSelection ? undefined : selectedSsid);
            });
        } catch (error: unknown) {
            this.setData({
                currentWifi: null,
            }, () => {
                this.syncPickerWifiList();
            });
        }
    },

    async fetchNearbyWifi(options: FetchNearbyWifiOptions = {}) {
        const showEmptyMessage = Boolean(options.showEmptyMessage);

        this.setData({
            scanningNearbyWifi: true,
            pickerMessage: '',
            pickerAction: '',
            formMessage: '',
        });

        const scanIssue = readWifiScanIssue(this.data.wifiRuntime || undefined);
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
        } catch (error: unknown) {
            const nextScanIssue = readWifiScanIssue(this.data.wifiRuntime || undefined);
            const pickerMessage = isDevtoolsRuntime(this.data.wifiRuntime || undefined)
                ? ''
                : describeWifiError(asWifiErrorLike(error), this.data.wifiRuntime || undefined, { context: 'scan' });

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

    handlePickWifi(event: WechatMiniprogram.BaseEvent) {
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
        const previousSelectedSsid = (this.data.selectedSsid || '').trim();
        const shouldResetSensitiveInput = Boolean(
            previousSelectedSsid && previousSelectedSsid !== selectedSsid
        );

        if (!selectedSsid) {
            this.setData({
                pickerMessage: '请选择一个 WLAN',
            });
            return;
        }

        this.setData({
            selectedSsid,
            pickerVisible: false,
            wifiPassword: shouldResetSensitiveInput ? '' : this.data.wifiPassword,
            showPassword: shouldResetSensitiveInput ? false : this.data.showPassword,
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

    handlePasswordInput(event: WechatMiniprogram.Input) {
        const wifiPassword = event && event.detail ? event.detail.value || '' : '';

        this.setData({
            wifiPassword,
            formMessage: '',
        });
    },

    handleTogglePassword() {
        if (!this.data.selectedSsid) {
            return;
        }

        this.setData({
            showPassword: !this.data.showPassword,
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
            records: [],
            writeRequest: buildWifiWriteRequest(selectedSsid, wifiPassword),
        });
    },

    handleCloseScanDialog() {
        this.setData({
            scanVisible: false,
            records: [],
            writeRequest: null,
        });
    },

    resetSensitiveState() {
        this.setData({
            scanVisible: false,
            records: [],
            writeRequest: null,
            wifiPassword: '',
            showPassword: false,
        });
    },
});
