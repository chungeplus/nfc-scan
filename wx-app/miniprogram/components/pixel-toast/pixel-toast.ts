type ToastTheme = 'info' | 'success' | 'warning' | 'error';

interface PixelToastData {
    message: string;
    theme: ToastTheme;
    visible: boolean;
}

interface PixelToastOptions {
    duration?: number;
    message?: string;
    theme?: ToastTheme;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

Component({
    data: {
        visible: false,
        message: '',
        theme: 'info' as ToastTheme,
    },

    lifetimes: {
        detached() {
            if (toastTimer) {
                clearTimeout(toastTimer);
                toastTimer = null;
            }
        },
    },

    methods: {
        show(options: PixelToastOptions) {
            const safeOptions = options || {};
            const message = safeOptions.message || '';
            const theme = safeOptions.theme || 'info';
            const duration = Number.isFinite(safeOptions.duration) ? safeOptions.duration : 1800;

            if (toastTimer) {
                clearTimeout(toastTimer);
                toastTimer = null;
            }

            this.setData({
                visible: true,
                message,
                theme,
            } as PixelToastData);

            toastTimer = setTimeout(() => {
                this.hide();
            }, duration);
        },

        hide() {
            if (toastTimer) {
                clearTimeout(toastTimer);
                toastTimer = null;
            }

            this.setData({
                visible: false,
            } as Partial<PixelToastData>);
        },

        handleMaskTap() {
            this.hide();
        },
    },
});
