/**
 * 将字符串转换为 UTF-8 编码的 ArrayBuffer。
 * @param {string} str 输入字符串
 * @returns {ArrayBuffer}
 */
function string2ArrayBuffer(str) {
    let bytes = 0;

    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < 0x007F) {
            bytes += 1;
        } else if (code < 0x07FF) {
            bytes += 2;
        } else if (code < 0xFFFF) {
            bytes += 3;
        } else {
            bytes += 4;
        }
    }

    const buffer = new ArrayBuffer(bytes);
    const uint8 = new Uint8Array(buffer);
    let offset = 0;

    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < 0x007F) {
            uint8[offset++] = code;
        } else if (code < 0x07FF) {
            uint8[offset++] = 0xC0 | (code >>> 6);
            uint8[offset++] = 0x80 | (code & 0x3F);
        } else if (code < 0xFFFF) {
            uint8[offset++] = 0xE0 | (code >>> 12);
            uint8[offset++] = 0x80 | ((code >>> 6) & 0x3F);
            uint8[offset++] = 0x80 | (code & 0x3F);
        } else {
            uint8[offset++] = 0xF0 | (code >>> 18);
            uint8[offset++] = 0x80 | ((code >>> 12) & 0x3F);
            uint8[offset++] = 0x80 | ((code >>> 6) & 0x3F);
            uint8[offset++] = 0x80 | (code & 0x3F);
        }
    }

    return buffer;
}

/**
 * 将字节数组转换为字符串，支持 UTF-8 多字节字符。
 * @param {ArrayBuffer} bytes 输入字节数组
 * @returns {string}
 */
function bytesToString(bytes) {
    let result = '';
    const input = new Uint8Array(bytes);

    for (let i = 0; i < input.length; i++) {
        const binary = input[i].toString(2).padStart(8, '0');
        const leadingOnesMatch = binary.match(/^1+?(?=0)/);

        if (leadingOnesMatch) {
            const numBytes = leadingOnesMatch[0].length;
            let codeBits = binary.slice(7 - numBytes);

            for (let offset = 1; offset < numBytes; offset++) {
                codeBits += input[i + offset].toString(2).padStart(8, '0').slice(2);
            }

            result += String.fromCharCode(parseInt(codeBits, 2));
            i += numBytes - 1;
        } else {
            result += String.fromCharCode(input[i]);
        }
    }

    return result;
}

/**
 * 生成符合 NDEF 规范的 URI Payload。
 * @param {string} targetUrl 目标链接
 * @returns {ArrayBuffer}
 */
function encodeNdefUriPayload(targetUrl) {
    let ndefPrefix = 0x00;
    let uriContent = targetUrl;

    if (targetUrl.startsWith('orpheus://')) {
        ndefPrefix = 0x00;
        uriContent = targetUrl;
    } else if (targetUrl.startsWith('qqmusic://')) {
        ndefPrefix = 0x00;
        uriContent = targetUrl;
    } else if (targetUrl.startsWith('weixin://')) {
        ndefPrefix = 0x00;
        uriContent = targetUrl.replace('weixin://', '');
    } else if (targetUrl.startsWith('http://')) {
        ndefPrefix = 0x03;
        uriContent = targetUrl.replace('http://', '');
    } else if (targetUrl.startsWith('https://')) {
        ndefPrefix = 0x04;
        uriContent = targetUrl.replace('https://', '');
    }

    const uriContentBuffer = string2ArrayBuffer(uriContent);
    const ndefPrefixBuffer = new Uint8Array([ndefPrefix]);
    const totalPayloadLength = ndefPrefixBuffer.byteLength + uriContentBuffer.byteLength;
    const totalPayloadBuffer = new ArrayBuffer(totalPayloadLength);
    const payloadView = new Uint8Array(totalPayloadBuffer);

    payloadView.set(ndefPrefixBuffer, 0);
    payloadView.set(new Uint8Array(uriContentBuffer), ndefPrefixBuffer.byteLength);

    return totalPayloadBuffer;
}

export {
    string2ArrayBuffer,
    bytesToString,
    encodeNdefUriPayload,
};
