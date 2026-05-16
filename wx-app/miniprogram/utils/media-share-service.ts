import { MEDIA_SHARE_SERVICE_NAME } from './cloud-config';

export interface MediaShareServiceResult<T = Record<string, unknown>> {
    message?: string;
    record?: T;
    records?: T[];
    result?: T;
    share?: T;
    success: boolean;
    summary?: Record<string, unknown>;
    upload?: Record<string, unknown>;
}

function callMediaShareService<T = Record<string, unknown>>(
    action: string,
    payload: Record<string, unknown> = {},
): Promise<MediaShareServiceResult<T>> {
    return new Promise((resolve, reject) => {
        if (!wx.cloud?.callFunction) {
            reject(new Error('Cloud capability is not available'));
            return;
        }

        wx.cloud.callFunction({
            name: MEDIA_SHARE_SERVICE_NAME,
            data: { action, payload },
            success: (res) => {
                const result = (res?.result || {}) as MediaShareServiceResult<T>;
                if (result.success) {
                    resolve(result);
                    return;
                }

                reject(new Error(result.message || 'Cloud function call failed'));
            },
            fail: reject,
        });
    });
}

export const createMediaFile = <T = Record<string, unknown>>(payload: Record<string, unknown>) =>
    callMediaShareService<T>('createFile', payload);
export const prepareMediaUpload = <T = Record<string, unknown>>(payload: Record<string, unknown>) =>
    callMediaShareService<T>('prepareUpload', payload);
export const createMediaShare = <T = Record<string, unknown>>(payload: Record<string, unknown>) =>
    callMediaShareService<T>('createShare', payload);
export const listMediaFiles = <T = Record<string, unknown>>(payload: Record<string, unknown> = {}) =>
    callMediaShareService<T>('listFiles', payload);
export const deleteMediaFile = <T = Record<string, unknown>>(payload: Record<string, unknown>) =>
    callMediaShareService<T>('deleteFile', payload);
