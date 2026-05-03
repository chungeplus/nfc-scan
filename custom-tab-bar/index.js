const TAB_LIST = [
    {
        pagePath: '/miniprogram/pages/write-menu/write-menu',
        text: 'NFC',
        icon: 'nfc',
    },
    {
        pagePath: '/miniprogram/pages/my-files/my-files',
        text: '我的文件',
        icon: 'record',
    },
];

Component({
    data: {
        selected: 0,
        list: TAB_LIST,
    },

    methods: {
        handleSwitchTab(event) {
            const index = Number(
                event && event.currentTarget && event.currentTarget.dataset
                    ? event.currentTarget.dataset.index || 0
                    : 0
            );
            const item = this.data.list[index];

            if (!item || index === this.data.selected) {
                return;
            }

            wx.switchTab({
                url: item.pagePath,
            });
        },
    },
});
