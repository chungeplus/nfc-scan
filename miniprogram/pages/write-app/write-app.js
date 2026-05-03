import { showPixelToast } from '../../utils/pixel-toast';
import { getNavMetrics } from '../../utils/system-info';

const APP_DATA = [
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
        platform: 'android',
        androidChipClass: 'chip chip--red chip--active',
        iosChipClass: 'chip chip--blue',
        appTypeLabel: 'Android 应用',
        packagePlaceholder: 'com.tencent.mobileqq',
        canWrite: false,
        packageError: '',
        APP_DATA,
        typePickerOptions: [],
        appPickerOptions: [],
        typeViewList: [],
        appViewList: [],
        pickerValue: [1, 0],
        pickerVisible: false,
        tempTypeIndex: 1,
        tempAppIndex: 0,
        appName: '',
        packageName: '',
        allowEditPackageName: false,
        scanVisible: false,
        records: [],
    },

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
        const currentApp = currentType.apps[pickerValue[1]] || {};
        const packageName = currentApp.packageName || '';
        const appName = currentApp.appName || '';

        this.setData({
            packageName,
            appName,
            allowEditPackageName: pickerValue[0] === 0,
        });
        this.syncPlatformView();
    },

    handleSelectPlatform(event) {
        const platform = event && event.currentTarget && event.currentTarget.dataset
            ? event.currentTarget.dataset.platform || 'android'
            : 'android';

        if (platform === 'ios') {
            this.setData({
                platform,
                appName: this.data.appName || 'iOS 应用',
                packageName: '',
                allowEditPackageName: true,
            });
            showPixelToast({
                message: 'iOS 直达能力暂未接入',
                theme: 'info',
            });
            this.syncPlatformView();
            return;
        }

        this.setData({
            platform,
        });
        this.handleDefaultPickerValue();
    },

    syncPlatformView() {
        const platform = this.data.platform;
        const packageName = (this.data.packageName || '').trim();
        const isAndroid = platform === 'android';
        let packageError = '';

        if (isAndroid && packageName) {
            const packageRegex = /^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/;
            if (!packageRegex.test(packageName)) {
                packageError = '包名格式不正确';
            }
        }

        this.setData({
            androidChipClass: isAndroid ? 'chip chip--red chip--active' : 'chip chip--red',
            iosChipClass: isAndroid ? 'chip chip--blue' : 'chip chip--blue chip--active',
            appTypeLabel: this.data.appName || (isAndroid ? 'Android 应用' : 'iOS 应用'),
            packagePlaceholder: isAndroid ? 'com.tencent.mobileqq' : 'com.example.iosapp',
            canWrite: isAndroid ? Boolean(packageName) && !packageError : false,
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

    handleSelectType(event) {
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

    handleSelectApp(event) {
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
        const pickerValue = [this.data.tempTypeIndex, this.data.tempAppIndex];
        const currentType = APP_DATA[pickerValue[0]] || { apps: [] };
        const currentApp = currentType.apps[pickerValue[1]] || {};
        const packageName = this.data.platform === 'ios'
            ? ''
            : currentApp.packageName || '';
        const appName = currentApp.appName || '';

        this.setData({
            pickerValue,
            packageName,
            appName,
            pickerVisible: false,
            allowEditPackageName: this.data.platform === 'ios' || pickerValue[0] === 0,
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
            success: (res) => {
                const packageName = res.data || '';
                this.setData({
                    packageName,
                });
                this.syncPlatformView();
            },
        });
    },

    handlePackageNameInput(event) {
        const packageName = event && event.detail ? event.detail.value || '' : '';
        this.setData({
            packageName,
        });
        this.syncPlatformView();
    },

    handleOpenScanDialog() {
        if (this.data.platform === 'ios') {
            showPixelToast({
                message: 'iOS 直达能力暂未接入',
                theme: 'warning',
            });
            return;
        }

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
