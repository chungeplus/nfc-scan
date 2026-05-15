import { showPixelToast } from '../../utils/pixel-toast';
import { getNavMetrics } from '../../utils/system-info';

interface AppCatalogItem {
    appName: string;
    packageName: string;
}

interface AppCatalogType {
    typeName: string;
    apps: AppCatalogItem[];
}

interface PickerOption {
    label: string;
    value: number;
}

interface TypeViewItem {
    typeName: string;
    index: number;
    className: string;
}

interface AppViewItem {
    appName: string;
    index: number;
    className: string;
}

interface ScanRecord {
    tnf: number;
    id: string;
    type: string;
    payload: string;
}

interface WriteAppPageData {
    navHeight: number;
    appTypeLabel: string;
    packagePlaceholder: string;
    canWrite: boolean;
    packageError: string;
    APP_DATA: AppCatalogType[];
    typePickerOptions: PickerOption[];
    appPickerOptions: PickerOption[];
    typeViewList: TypeViewItem[];
    appViewList: AppViewItem[];
    pickerValue: [number, number];
    pickerVisible: boolean;
    tempTypeIndex: number;
    tempAppIndex: number;
    appName: string;
    packageName: string;
    allowEditPackageName: boolean;
    scanVisible: boolean;
    records: ScanRecord[];
}

const APP_DATA: AppCatalogType[] = [
    {
        typeName: '自定义',
        apps: [
            { appName: '自定义', packageName: '' },
        ],
    },
    {
        typeName: '社交',
        apps: [
            { appName: '微信', packageName: 'com.tencent.mm' },
            { appName: 'QQ', packageName: 'com.tencent.mobileqq' },
            { appName: '微博', packageName: 'com.sina.weibo' },
            { appName: '抖音', packageName: 'com.ss.android.ugc.aweme' },
            { appName: '小红书', packageName: 'com.xingin.xhs' },
        ],
    },
    {
        typeName: '影音',
        apps: [
            { appName: 'QQ音乐', packageName: 'com.tencent.qqmusic' },
            { appName: '网易云音乐', packageName: 'com.netease.cloudmusic' },
            { appName: '腾讯视频', packageName: 'com.tencent.qqlive' },
            { appName: '哔哩哔哩', packageName: 'tv.danmaku.bili' },
            { appName: '爱奇艺', packageName: 'com.qiyi.video' },
        ],
    },
    {
        typeName: '工具',
        apps: [
            { appName: '支付宝', packageName: 'com.eg.android.AlipayGphone' },
            { appName: '高德地图', packageName: 'com.autonavi.minimap' },
            { appName: '百度地图', packageName: 'com.baidu.BaiduMap' },
            { appName: 'WPS Office', packageName: 'cn.wps.moffice_eng' },
            { appName: '百度网盘', packageName: 'com.baidu.netdisk' },
        ],
    },
    {
        typeName: '游戏',
        apps: [
            { appName: '王者荣耀', packageName: 'com.tencent.tmgp.sgame' },
            { appName: '和平精英', packageName: 'com.tencent.tmgp.pubgmhd' },
            { appName: '原神', packageName: 'com.miHoYo.Yuanshen' },
            { appName: '蛋仔派对', packageName: 'com.netease.party' },
            { appName: '英雄联盟手游', packageName: 'com.tencent.lolm' },
        ],
    },
];

Page({
    data: {
        navHeight: 64,
        appTypeLabel: 'Android 应用',
        packagePlaceholder: 'com.tencent.mobileqq',
        canWrite: false,
        packageError: '',
        APP_DATA,
        typePickerOptions: [] as PickerOption[],
        appPickerOptions: [] as PickerOption[],
        typeViewList: [] as TypeViewItem[],
        appViewList: [] as AppViewItem[],
        pickerValue: [1, 0] as [number, number],
        pickerVisible: false,
        tempTypeIndex: 1,
        tempAppIndex: 0,
        appName: '',
        packageName: '',
        allowEditPackageName: false,
        scanVisible: false,
        records: [] as ScanRecord[],
    } as WriteAppPageData,

    onLoad() {
        const { navHeight } = getNavMetrics();
        const typePickerOptions = APP_DATA.map((typeItem, typeIndex) => ({
            label: typeItem.typeName,
            value: typeIndex,
        }));

        this.setData({
            navHeight,
            typePickerOptions,
        });

        this.handleDefaultPickerValue();
        this.buildPickerViewData();
    },

    handleDefaultPickerValue() {
        const { pickerValue } = this.data;
        const currentType = APP_DATA[pickerValue[0]] || { apps: [] };
        const currentApp = currentType.apps[pickerValue[1]];
        const packageName = currentApp ? currentApp.packageName : '';
        const appName = currentApp ? currentApp.appName : '';

        this.setData({
            packageName,
            appName,
            allowEditPackageName: pickerValue[0] === 0,
        });
        this.syncPlatformView();
    },

    syncPlatformView() {
        const packageName = (this.data.packageName || '').trim();
        let packageError = '';

        if (packageName) {
            const packageRegex = /^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/;
            if (!packageRegex.test(packageName)) {
                packageError = '包名格式不正确';
            }
        }

        this.setData({
            appTypeLabel: this.data.appName || 'Android 应用',
            packagePlaceholder: 'com.tencent.mobileqq',
            canWrite: Boolean(packageName) && !packageError,
            packageError,
        });
    },

    buildPickerViewData() {
        const tempTypeIndex = this.data.tempTypeIndex;
        const tempAppIndex = this.data.tempAppIndex;
        const currentType = APP_DATA[tempTypeIndex] || { apps: [] };

        const typeViewList = APP_DATA.map((item, index) => ({
            typeName: item.typeName,
            index,
            className: index === tempTypeIndex
                ? 'picker-preview__item picker-preview__item--active'
                : 'picker-preview__item',
        }));

        const appViewList = currentType.apps.map((item, index) => ({
            appName: item.appName,
            index,
            className: index === tempAppIndex
                ? 'picker-preview__item picker-preview__item--subactive'
                : 'picker-preview__item',
        }));

        this.setData({
            typeViewList,
            appViewList,
        });
    },

    handleOpenPicker() {
        this.setData({
            pickerVisible: true,
            tempTypeIndex: this.data.pickerValue[0],
            tempAppIndex: this.data.pickerValue[1],
        }, () => {
            this.buildPickerViewData();
        });
    },

    handleSelectType(event: WechatMiniprogram.BaseEvent) {
        const index = Number(
            event && event.currentTarget && event.currentTarget.dataset
                ? event.currentTarget.dataset.index || 0
                : 0
        );
        this.setData({
            tempTypeIndex: index,
            tempAppIndex: 0,
        }, () => {
            this.buildPickerViewData();
        });
    },

    handleSelectApp(event: WechatMiniprogram.BaseEvent) {
        const index = Number(
            event && event.currentTarget && event.currentTarget.dataset
                ? event.currentTarget.dataset.index || 0
                : 0
        );
        this.setData({
            tempAppIndex: index,
        }, () => {
            this.buildPickerViewData();
        });
    },

    handleConfirmPicker() {
        const pickerValue = [this.data.tempTypeIndex, this.data.tempAppIndex] as [number, number];
        const currentType = APP_DATA[pickerValue[0]] || { apps: [] };
        const currentApp = currentType.apps[pickerValue[1]];
        const packageName = currentApp ? currentApp.packageName : '';
        const appName = currentApp ? currentApp.appName : '';

        this.setData({
            pickerValue,
            packageName,
            appName,
            pickerVisible: false,
            allowEditPackageName: pickerValue[0] === 0,
        }, () => {
            this.syncPlatformView();
            this.buildPickerViewData();
        });
    },

    handleCancelPicker() {
        this.setData({ pickerVisible: false });
    },

    noop() {},

    handlePasteTap() {
        wx.getClipboardData({
            success: (res: { data?: string }) => {
                const packageName = res.data || '';
                this.setData({
                    packageName,
                });
                this.syncPlatformView();
            },
        });
    },

    handlePackageNameInput(event: WechatMiniprogram.Input) {
        const packageName = event && event.detail ? event.detail.value || '' : '';
        this.setData({
            packageName,
        });
        this.syncPlatformView();
    },

    handleOpenScanDialog() {
        const packageName = (this.data.packageName || '').trim();
        if (!packageName) {
            showPixelToast({
                message: '请输入包名',
                theme: 'warning',
            });
            return;
        }

        if (this.data.packageError) {
            showPixelToast({
                message: this.data.packageError,
                theme: 'warning',
            });
            return;
        }

        this.setData({
            scanVisible: true,
            records: [
                {
                    tnf: 4,
                    id: 'pkg',
                    type: 'android.com:pkg',
                    payload: packageName,
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
});
