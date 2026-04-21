/**
 * 应用写入页面
 * @description 用于写入Android应用包名到NFC标签
 */
import { showPixelToast } from '../../utils/pixel-toast';
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
        APP_DATA: [
            {
                typeName: "自定义",
                apps: [
                    { appName: "自定义", packageName: "" },
                ],
            },
            {
                typeName: "社交",
                apps: [
                    { appName: "微信", packageName: "com.tencent.mm" },
                    { appName: "QQ", packageName: "com.tencent.mobileqq" },
                    { appName: "微博", packageName: "com.sina.weibo" },
                    { appName: "抖音", packageName: "com.ss.android.ugc.aweme" },
                    { appName: "快手", packageName: "com.smile.gifmaker" },
                    { appName: "小红书", packageName: "com.xingin.xhs" },
                    { appName: "哔哩哔哩", packageName: "tv.danmaku.bili" },
                    { appName: "知乎", packageName: "com.zhihu.android" },
                    { appName: "豆瓣", packageName: "com.douban.frodo" },
                    { appName: "陌陌", packageName: "com.immomo.momo" },
                ],
            },
            {
                typeName: "游戏",
                apps: [
                    { appName: "王者荣耀", packageName: "com.tencent.tmgp.sgame" },
                    { appName: "和平精英", packageName: "com.tencent.tmgp.pubgmhd" },
                    { appName: "原神-国内官服", packageName: "com.miHoYo.Yuanshen" },
                    { appName: "原神-小米服", packageName: "com.miHoYo.ys.mi" },
                    { appName: "原神-B服", packageName: "com.mihoyo.ys.bilibili" },
                    { appName: "崩坏：星穹铁道", packageName: "com.miHoYo.hkrpg" },
                    { appName: "蛋仔派对", packageName: "com.netease.party" },
                    { appName: "我的世界", packageName: "com.netease.mc" },
                    { appName: "第五人格", packageName: "com.netease.dwrg" },
                    { appName: "穿越火线：枪战王者", packageName: "com.tencent.tmgp.cf" },
                    { appName: "使命召唤手游", packageName: "com.tencent.tmgp.codm" },
                    { appName: "暗区突围", packageName: "com.tencent.tmgp.ark" },
                    { appName: "英雄联盟手游", packageName: "com.tencent.lolm" },
                    { appName: "金铲铲之战", packageName: "com.tencent.tmgp.wegame" },
                    { appName: "明日方舟", packageName: "com.hypergryph.arknights" },
                    { appName: "光·遇", packageName: "com.netease.sky" },
                    { appName: "火影忍者手游", packageName: "com.tencent.tmgp.naruto" },
                    { appName: "永劫无间手游", packageName: "com.netease.nvsg" },
                    { appName: "地铁跑酷", packageName: "com.kiloo.subwaysurf" },
                    { appName: "球球大作战", packageName: "com.ztgame.bob" },
                    { appName: "战双帕弥什", packageName: "com.kurogame.zero" },
                    { appName: "元气骑士", packageName: "com.ChillyRoom.DungeonShooter" },
                    { appName: "植物大战僵尸2", packageName: "com.ea.game.pvz2_row" },
                    { appName: "三国杀", packageName: "com.bf.sgs" },
                    { appName: "创造与魔法", packageName: "com.hero.sm" },
                    { appName: "明日之后", packageName: "com.netease.mrzh" },
                    { appName: "绝区零", packageName: "com.miHoYo.zenless" },
                    { appName: "无畏契约：源能行动", packageName: "com.tencent.valorant", },
                    { appName: "三角洲行动", packageName: "com.tencent.sgame.sfps" },
                    { appName: "鸣潮", packageName: "com.kurogame.singularity" },
                    { appName: "巅峰极速", packageName: "com.netease.racing" },
                    { appName: "现代战舰", packageName: "com.artstorm.modernwarships" },
                    { appName: "萤火突击", packageName: "com.netease.firefly" },
                    { appName: "逆水寒", packageName: "com.netease.nsh" },
                    { appName: "我的勇者", packageName: "com.zqgame.myhero" },
                    { appName: "蔚蓝档案", packageName: "com.nexon.bluearchive" },
                    { appName: "寻道大千", packageName: "com.haowanyou.xd" },
                    { appName: "万龙觉醒", packageName: "com.youzu.wl" },
                    { appName: "燕云十六声", packageName: "com.netease.yysls" },
                    { appName: "远光84", packageName: "com.netease.yg84" },
                    { appName: "Phira测试服", packageName: "com.philiphub.phira" },
                    { appName: "苍翼：混沌效应", packageName: "com.netease.bbce" },
                    { appName: "像素火影", packageName: "com.mt.pixelnaruto" },
                    { appName: "三国：谋定天下", packageName: "com.youzu.sgmdtx" },
                    { appName: "植物大战僵尸融合版", packageName: "com.ea.pvz.merge" },
                    { appName: "植物大战僵尸杂交版", packageName: "com.ea.pvz.hybrid" },
                    { appName: "植物大战僵尸共生版", packageName: "com.ea.pvz.symbiosis", },
                    { appName: "超自然行动组", packageName: "com.tencent.snat" }
                ],
            },
            {
                typeName: "影音娱乐",
                apps: [
                    { appName: "腾讯视频", packageName: "com.tencent.qqlive" },
                    { appName: "爱奇艺", packageName: "com.qiyi.video" },
                    { appName: "优酷", packageName: "com.youku.phone" },
                    { appName: "芒果TV", packageName: "com.hunantv.imgo.activity" },
                    { appName: "哔哩哔哩", packageName: "tv.danmaku.bili" },
                    { appName: "西瓜视频", packageName: "com.ss.android.article.video" },
                    { appName: "抖音", packageName: "com.ss.android.ugc.aweme" },
                    { appName: "快手", packageName: "com.smile.gifmaker" },
                    { appName: "网易云音乐", packageName: "com.netease.cloudmusic" },
                    { appName: "QQ音乐", packageName: "com.tencent.qqmusic" },
                    { appName: "酷狗音乐", packageName: "com.kugou.android" },
                    { appName: "酷我音乐", packageName: "cn.kuwo.player" },
                    { appName: "咪咕视频", packageName: "com.cmvideo.migu" },
                    { appName: "咪咕音乐", packageName: "com.migu.music" },
                    { appName: "全民K歌", packageName: "com.tencent.karaoke" },
                ],
            },
            {
                typeName: "工具",
                apps: [
                    { appName: "支付宝", packageName: "com.eg.android.AlipayGphone" },
                    { appName: "高德地图", packageName: "com.autonavi.minimap" },
                    { appName: "百度地图", packageName: "com.baidu.BaiduMap" },
                    { appName: "WiFi万能钥匙", packageName: "com.lianchang.wifikey" },
                    { appName: "腾讯手机管家", packageName: "com.tencent.qqpimsecure" },
                    { appName: "360手机卫士", packageName: "com.qihoo360.mobilesafe" },
                    { appName: "墨迹天气", packageName: "com.moji.mjweather" },
                    { appName: "WPS Office", packageName: "cn.wps.moffice_eng" },
                    { appName: "QQ浏览器", packageName: "com.tencent.mtt" },
                    { appName: "百度网盘", packageName: "com.baidu.netdisk" },
                ],
            },
            {
                typeName: "购物",
                apps: [
                    { appName: "淘宝", packageName: "com.taobao.taobao" },
                    { appName: "京东", packageName: "com.jingdong.app.mall" },
                    { appName: "拼多多", packageName: "com.xunmeng.pinduoduo" },
                    { appName: "天猫", packageName: "com.tmall.wireless" },
                    { appName: "唯品会", packageName: "com.achievo.vipshop" },
                    { appName: "苏宁易购", packageName: "com.suning.mobile.ebuy" },
                    { appName: "抖音电商", packageName: "com.ss.android.ugc.aweme.shopping", },
                    { appName: "快手小店", packageName: "com.smile.gifmaker.shop" },
                    { appName: "闲鱼", packageName: "com.taobao.idlefish" },
                    { appName: "考拉海购", packageName: "com.kaola" },
                ],
            },
        ],

        typePickerOptions: [],
        appPickerOptions: [],
        typeViewList: [],
        appViewList: [],
        pickerValue: [1, 0],
        pickerVisible: false,
        tempTypeIndex: 1,
        tempAppIndex: 0,

        appName: "",
        packageName: "",
        allowEditPackageName: false,
        scanVisible: false,

        records: [],
    },

    /**
     * 页面加载时初始化
     */
    onLoad() {
        const systemInfo = wx.getSystemInfoSync();
        const statusBarHeight = systemInfo.statusBarHeight || 20;
        const { APP_DATA } = this.data;
        const typePickerOptions = APP_DATA.map((typeItem, typeIndex) => ({
            label: typeItem.typeName,
            value: typeIndex,
        }));
        this.setData({
            navHeight: statusBarHeight + 44,
            typePickerOptions,
        });

        this.handleDefaultPickerValue();
        this.buildPickerViewData();
    },

    /**
     * 设置默认选择值
     */
    handleDefaultPickerValue() {
        const { APP_DATA, pickerValue } = this.data;
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

    /**
     * 切换平台
     * @param {Object} event - 事件对象
     */
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

    /**
     * 同步平台展示数据
     * @returns {void}
     */
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

    /**
     * 构建选择器视图数据
     * @returns {void}
     */
    buildPickerViewData() {
        const appData = this.data.APP_DATA;
        const tempTypeIndex = this.data.tempTypeIndex;
        const tempAppIndex = this.data.tempAppIndex;
        const currentType = appData[tempTypeIndex] || { apps: [] };

        const typeViewList = appData.map((item, index) => ({
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

    /**
     * 打开应用选择器
     */
    handleOpenPicker() {
        this.setData({
            pickerVisible: true,
            tempTypeIndex: this.data.pickerValue[0],
            tempAppIndex: this.data.pickerValue[1],
        }, () => {
            this.buildPickerViewData();
        });
    },

    /**
     * 选择分类
     * @param {Object} event - 事件对象
     */
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

    /**
     * 选择应用
     * @param {Object} event - 事件对象
     */
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

    /**
     * 确认选择器
     * @param {Object} event - 事件对象
     */
    handleConfirmPicker() {
        const pickerValue = [this.data.tempTypeIndex, this.data.tempAppIndex];
        const { APP_DATA } = this.data;
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

    /**
     * 取消选择器
     */
    handleCancelPicker() {
        this.setData({ pickerVisible: false });
    },

    /**
     * 阻止弹框内容点击穿透遮罩
     * @returns {void}
     */
    noop() {},

    /**
     * 粘贴包名
     */
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

    /**
     * 包名输入
     * @param {Object} event - 事件对象
     */
    handlePackageNameInput(event) {
        const packageName = event && event.detail ? event.detail.value || '' : '';
        this.setData({
            packageName,
        });
        this.syncPlatformView();
    },

    /**
     * 打开NFC扫描弹窗
     */
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
                    id: "pkg",
                    type: "android.com:pkg",
                    payload: packageName,
                },
            ],
        });
    },

    /**
     * 关闭NFC扫描弹窗
     */
    handleCloseScanDialog() {
        this.setData({
            scanVisible: false,
            records: [],
        });
    },
});
