import { MEDIA_SHARE_SERVICE_NAME } from './cloud-config';

function callMediaShareService(action, payload = {}) {
    return new Promise((resolve, reject) => {
        if (!wx.cloud || !wx.cloud.callFunction) {
            reject(new Error('请先开启云开发能力'));
            return;
        }

        wx.cloud.callFunction({
            name: MEDIA_SHARE_SERVICE_NAME,
            data: {
                action,
                payload,
            },
            success: (res) => {
                const result = (res && res.result) || {};

                if (result.success) {
                    resolve(result);
                    return;
                }

                reject(new Error(result.message || '云函数调用失败'));
            },
            fail: (error) => {
                console.error('[media-share-service] 云函数调用失败:', error);
                reject(error);
            },
        });
    });
}

function createMediaFile(payload) {
    return callMediaShareService('createFile', payload);
}

function prepareMediaUpload(payload) {
    return callMediaShareService('prepareUpload', payload);
}

function createMediaShare(payload) {
    return callMediaShareService('createShare', payload);
}

function listMediaFiles(payload = {}) {
    return callMediaShareService('listFiles', payload);
}

function deleteMediaFile(payload) {
    return callMediaShareService('deleteFile', payload);
}

export {
    createMediaFile,
    createMediaShare,
    deleteMediaFile,
    listMediaFiles,
    prepareMediaUpload,
};
