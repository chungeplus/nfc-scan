export interface PixelToastOptions {
    duration?: number;
    message: string;
    theme?: 'info' | 'success' | 'warning' | 'error';
}

interface PixelToastComponent {
    show?: (options: PixelToastOptions) => void;
}

export function showPixelToast(options: PixelToastOptions): void {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const toast = currentPage?.selectComponent?.('#pixel-toast') as PixelToastComponent | undefined;

    if (toast?.show) {
        toast.show(options);
        return;
    }

    wx.showToast({
        title: options.message || '',
        icon: 'none',
        duration: Number.isFinite(options.duration) ? options.duration : 1800,
    });
}
