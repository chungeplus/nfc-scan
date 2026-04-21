/**
 * 应用写入页面
 * @description 用于写入Android应用包名到NFC标签
 */
import { showPixelToast } from '../../utils/pixel-toast';

const APP_DATA = [
    { typeName: "自定义", apps: [{ appName: "自定义", packageName: "" }] },
    { typeName: "社交", apps: [
        { appName: "微信", packageName: "com.tencent.mm" },
        { appName: "QQ", packageName: "com.tencent.mobileqq" },
        { appName: "微博", packageName: "com.sina.weibo" },
        { appName: "抖音", packageName: "com.ss.android.ugc.aweme" },
        { appName: "快手", packageName: "com.smile.gifmaker" },
        { appName: "小红书", packageName: "com.xingin.xhs" },
        { appName: "哔哩哔哩", packageName: "tv.danmaku.bili" },
    ]},
    { typeName: "游戏", apps: [
        { appName: "王者荣耀", packageName: "com.tencent.tmgp.sgame" },
        { appName: "和平精英", packageName: "com.tencent.tmgp.pubgmhd" },
        { appName: "原神", packageName: "com.miHoYo.Yuanshen" },
        { appName: "蛋仔派对", packageName: "com.netease.party" },
        { appName: "明日方舟", packageName: "com.hypergryph.arknights" },
    ]},
    { typeName: "影音", apps: [
        { appName: "腾讯视频", packageName: "com.tencent.qqlive" },
        { appName: "爱奇艺", packageName: "com.qiyi.video" },
        { appName: "网易云音乐", packageName: "com.netease.cloudmusic" },
        { appName: "QQ音乐", packageName: "com.tencent.qqmusic" },
    ]},
    { typeName: "工具", apps: [
        { appName: "支付宝", packageName: "com.eg.android.AlipayGphone" },
        { appName: "高德地图", packageName: "com.autonavi.minimap" },
        { appName: "百度地图", packageName: "com.baidu.BaiduMap" },
    ]},
    { typeName: "购物", apps: [
        { appName: "淘宝", packageName: "com.taobao.taobao" },
        { appName: "京东", packageName: "com.jingdong.app.mall" },
        { appName: "拼多多", packageName: "com.xunmeng.pinduoduo" },
    ]},
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
        const systemInfo = wx.getSystemInfoSync();
        const statusBarHeight = systemInfo.statusBarHeight || 20;
        const { APP_DATA } = this.data;
        const typePickerOptions = APP_DATA.map((typeItem, typeIndex) => ({ label: typeItem.typeName, value: typeIndex }));
        this.setData({ navHeight: statusBarHeight + 44, typePickerOptions });
        this.handleDefaultPickerValue();
        this.buildPickerViewData();
    },

    handleDefaultPickerValue() {
        const { APP_DATA, pickerValue } = this.data;
        const currentType = APP_DATA[pickerValue[0]] || { apps: [] };
        const currentApp = currentType.apps[pickerValue[1]] || {};
        this.setData({
            packageName: currentApp.packageName || '',
            appName: currentApp.appName || '',
            allowEditPackageName: pickerValue[0] === 0,
        });
        this.syncPlatformView();
    },

    handleSelectPlatform(event) {
        const platform = event.currentTarget.dataset.platform || 'android';
        if (platform === 'ios') {
            this.setData({ platform, appName: 'iOS 应用', packageName: '', allowEditPackageName: true });
            showPixelToast({ message: 'iOS 直达能力暂未接入', theme: 'info' });
            return;
        }
        this.setData({ platform });
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
        const appData = this.data.APP_DATA;
        const tempTypeIndex = this.data.tempTypeIndex;
        const tempAppIndex = this.data.tempAppIndex;
        const currentType = appData[tempTypeIndex] || { apps: [] };
        const typeViewList = appData.map((item, index) => ({
            typeName: item.typeName, index,
            className: index === tempTypeIndex ? 'type-item type-item--active' : 'type-item',
        }));
        const appViewList = currentType.apps.map((item, index) => ({
            appName: item.appName, index,
            className: index === tempAppIndex ? 'app-item app-item--subactive' : 'app-item',
        }));
        this.setData({ typeViewList, appViewList });
    },

    handleOpenPicker() {
        this.setData({ pickerVisible: true, tempTypeIndex: this.data.pickerValue[0], tempAppIndex: this.data.pickerValue[1] }, () => {
            this.buildPickerViewData();
        });
    },

    handleSelectType(event) {
        const index = Number(event.currentTarget.dataset.index || 0);
        this.setData({ tempTypeIndex: index, tempAppIndex: 0 }, () => {
            this.buildPickerViewData();
        });
    },

    handleSelectApp(event) {
        const index = Number(event.currentTarget.dataset.index || 0);
        this.setData({ tempAppIndex: index }, () => {
            this.buildPickerViewData();
        });
    },

    handleConfirmPicker() {
        const pickerValue = [this.data.tempTypeIndex, this.data.tempAppIndex];
        const { APP_DATA } = this.data;
        const currentType = APP_DATA[pickerValue[0]] || { apps: [] };
        const currentApp = currentType.apps[pickerValue[1]] || {};
        this.setData({
            pickerValue,
            packageName: this.data.platform === 'ios' ? '' : currentApp.packageName || '',
            appName: currentApp.appName || '',
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
                this.setData({ packageName });
                this.syncPlatformView();
            },
        });
    },

    handlePackageNameInput(event) {
        const packageName = event.detail.value || '';
        this.setData({ packageName });
        this.syncPlatformView();
    },

    handleOpenScanDialog() {
        if (this.data.platform === 'ios') {
            showPixelToast({ message: 'iOS 直达能力暂未接入', theme: 'warning' });
            return;
        }
        const packageName = (this.data.packageName || '').trim();
        if (!packageName) {
            showPixelToast({ message: '请输入包名', theme: 'warning' });
            return;
        }
        if (this.data.packageError) {
            showPixelToast({ message: this.data.packageError, theme: 'warning' });
            return;
        }
        this.setData({
            scanVisible: true,
            records: [{ tnf: 4, id: "pkg", type: "android.com:pkg", payload: packageName }],
        });
    },

    handleCloseScanDialog() {
        this.setData({ scanVisible: false, records: [] });
    },
});
