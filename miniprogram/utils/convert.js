/**
 * 将字符串转换为 UTF-8 编码的 ArrayBuffer
 * @param {string} str - 输入字符串
 * @return {ArrayBuffer} 转换后的 ArrayBuffer
 */
function string2ArrayBuffer(str) {
    let len = str.length;
    let bytes = 0;

    // 计算需要的字节数
    for (let i = 0; i < len; i++) {
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

    // 分配缓冲区
    const buffer = new ArrayBuffer(bytes);
    const uint8 = new Uint8Array(buffer);
    let offset = 0;

    // 填充字节
    for (let i = 0; i < len; i++) {
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
 * 将字节数组转换为字符串（支持 UTF-8 多字节字符）
 * @param {ArrayBuffer} bytes - 字节数组
 * @returns {string} - 转换后的字符串
 */
function bytesToString(bytes) {
    // 将字节数组解码为字符串（支持 UTF-8 多字节字符）
    let result = '';
    const input = new Uint8Array(bytes);

    for (let i = 0; i < input.length; i++) {
        // 将当前字节转为 8 位二进制字符串（不足位数时左侧补零）
        const binary = input[i].toString(2).padStart(8, '0');
        // 通过前导连续的 1（且后跟一个 0）判断是否为多字节字符的起始字节
        // 例如：110xxxxx（2 字节）、1110xxxx（3 字节）、11110xxx（4 字节）
        const leadingOnesMatch = binary.match(/^1+?(?=0)/);

        if (leadingOnesMatch) {
            // 多字节字符的总字节数由前导 1 的个数决定
            const numBytes = leadingOnesMatch[0].length;
            // 起始字节中的有效位（去掉前导位与紧随的 0）
            // 对于 110xxxxx、1110xxxx、11110xxx 等，取后面的 x 位
            let codeBits = binary.slice(7 - numBytes);

            // 依次读取并拼接后续续字节（形如 10xxxxxx）的 6 个有效位
            for (let offset = 1; offset < numBytes; offset++) {
                codeBits += input[i + offset].toString(2).padStart(8, '0').slice(2);
            }

            // 将拼接得到的二进制位转换为码点，再转为字符
            result += String.fromCharCode(parseInt(codeBits, 2));
            // 跳过已处理的续字节
            i += numBytes - 1;
        } else {
            // 单字节（ASCII）字符，直接转换
            result += String.fromCharCode(input[i]);
        }
    }

    // 返回最终拼接的字符串
    return result;
};

/**
 * 生成符合NDEF规范的URI类型Payload
 * 支持两类协议：
 *  1. 网易云音乐自定义协议 orpheus://
 *  2. QQ音乐自定义协议 qqmusic://
 *  3. 微信自定义协议 weixin://
 *  4. 标准HTTPS协议 https://
 *  5. 标准HTTP协议 http://
 *  
 * @param {string} targetUrl - 待处理的目标链接（如 "orpheus://song/413829859" 或 write-music.js:87 qqmusic://qq.com/media/playSonglist?p={"song":[{"type":"0","songmid":"003vUjJp3QwFcd"}],"action":"play"} 或 "https://www.baidu.com"）
 * @return {ArrayBuffer} 符合NDEF规范的二进制Payload（可直接用于NFC写入）
 */
function encodeNdefUriPayload(targetUrl) {
    // ndefPrefix：NDEF URI类型的前缀码（遵循NDEF规范，不同协议对应固定前缀）
    // uriContent：协议处理后的核心内容（去除冗余协议头，保留可被解析的关键部分）
    let ndefPrefix = 0x00;
    let uriContent = targetUrl;

    // 处理网易云音乐自定义协议 orpheus://
    if (targetUrl.startsWith('orpheus://')) {
        // NDEF规范：自定义协议无标准前缀，固定用 0x00 标识
        ndefPrefix = 0x00;
        // 保留完整协议路径（无需截取，应用需完整URI才能识别跳转目标）
        uriContent = targetUrl;
    }
    // 处理QQ音乐自定义协议 qqmusic://
    else if (targetUrl.startsWith('qqmusic://')) {
        // NDEF规范：自定义协议无标准前缀，固定用 0x00 标识
        ndefPrefix = 0x00;
        // 保留完整协议路径（无需截取，应用需完整URI才能识别跳转目标）
        uriContent = targetUrl;
    }
    // 处理微信自定义协议 weixin://
    else if (targetUrl.startsWith('weixin://')) {
        // NDEF规范：weixin:// 对应标准前缀码 0x03（用于缩短Payload长度）
        ndefPrefix = 0x00;
        // 截取协议头后的内容（前缀码已标识协议类型，无需重复保留 weixin://）
        uriContent = targetUrl.replace('weixin://', '');
    }
    // 处理标准HTTP协议
    else if (targetUrl.startsWith('http://')) {
        // NDEF规范：http:// 对应标准前缀码 0x05（用于缩短Payload长度）
        ndefPrefix = 0x03;
        // 截取协议头后的内容（前缀码已标识协议类型，无需重复保留 http://）
        uriContent = targetUrl.replace('http://', '');
    }
    // 处理标准HTTPS协议
    else if (targetUrl.startsWith('https://')) {
        // NDEF规范：https:// 对应标准前缀码 0x04（用于缩短Payload长度）
        ndefPrefix = 0x04;
        // 截取协议头后的内容（前缀码已标识协议类型，无需重复保留 https://）
        uriContent = targetUrl.replace('https://', '');
    }


    // 将处理后的URI内容转为UTF-8二进制
    const uriContentBuffer = string2ArrayBuffer(uriContent);
    // 将NDEF前缀码转为二进制（1字节长度）
    const ndefPrefixBuffer = new Uint8Array([ndefPrefix]);

    // 合并前缀码与URI内容（NDEF规范要求：前缀码必须位于Payload首位）
    const totalPayloadLength = ndefPrefixBuffer.byteLength + uriContentBuffer.byteLength;
    const totalPayloadBuffer = new ArrayBuffer(totalPayloadLength);
    const payloadView = new Uint8Array(totalPayloadBuffer);

    // 写入前缀码（第0位：NDEF协议标识）
    payloadView.set(ndefPrefixBuffer, 0);
    // 写入URI核心内容（从第1位开始：避免覆盖前缀码）
    payloadView.set(new Uint8Array(uriContentBuffer), ndefPrefixBuffer.byteLength);

    return totalPayloadBuffer;
}


export {
    string2ArrayBuffer,
    bytesToString,
    encodeNdefUriPayload
}
