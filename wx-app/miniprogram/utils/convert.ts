function toUint8Array(input: ArrayBuffer | ArrayBufferView): Uint8Array {
    if (input instanceof ArrayBuffer) {
        return new Uint8Array(input);
    }

    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
}

export function string2ArrayBuffer(str: string): ArrayBuffer {
    let bytes = 0;

    for (let i = 0; i < str.length; i += 1) {
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

    for (let i = 0; i < str.length; i += 1) {
        const code = str.charCodeAt(i);
        if (code < 0x007F) {
            uint8[offset] = code;
            offset += 1;
        } else if (code < 0x07FF) {
            uint8[offset] = 0xC0 | (code >>> 6);
            uint8[offset + 1] = 0x80 | (code & 0x3F);
            offset += 2;
        } else if (code < 0xFFFF) {
            uint8[offset] = 0xE0 | (code >>> 12);
            uint8[offset + 1] = 0x80 | ((code >>> 6) & 0x3F);
            uint8[offset + 2] = 0x80 | (code & 0x3F);
            offset += 3;
        } else {
            uint8[offset] = 0xF0 | (code >>> 18);
            uint8[offset + 1] = 0x80 | ((code >>> 12) & 0x3F);
            uint8[offset + 2] = 0x80 | ((code >>> 6) & 0x3F);
            uint8[offset + 3] = 0x80 | (code & 0x3F);
            offset += 4;
        }
    }

    return buffer;
}

export function bytesToString(bytes: ArrayBuffer | ArrayBufferView): string {
    let result = '';
    const input = toUint8Array(bytes);

    for (let i = 0; i < input.length; i += 1) {
        const binary = input[i].toString(2).padStart(8, '0');
        const leadingOnesMatch = binary.match(/^1+?(?=0)/);

        if (leadingOnesMatch) {
            const numBytes = leadingOnesMatch[0].length;
            let codeBits = binary.slice(7 - numBytes);

            for (let offset = 1; offset < numBytes; offset += 1) {
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

export function arrayBufferToHex(buffer: ArrayBuffer | ArrayBufferView | null | undefined): string {
    if (!buffer) {
        return '';
    }

    return Array.from(toUint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

export function hexToArrayBuffer(hexValue: string): ArrayBuffer {
    const normalizedHex = typeof hexValue === 'string'
        ? hexValue.trim().replace(/\s+/g, '').toLowerCase()
        : '';

    if (!normalizedHex) {
        return new ArrayBuffer(0);
    }

    if (normalizedHex.length % 2 !== 0 || /[^0-9a-f]/.test(normalizedHex)) {
        throw new Error('invalid hex string');
    }

    const output = new Uint8Array(normalizedHex.length / 2);

    for (let index = 0; index < normalizedHex.length; index += 2) {
        output[index / 2] = parseInt(normalizedHex.slice(index, index + 2), 16);
    }

    return output.buffer;
}

export function encodeNdefUriPayload(targetUrl: string): ArrayBuffer {
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
