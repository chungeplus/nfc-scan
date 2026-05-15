const WIFI_WSC_MIME_TYPE = 'application/vnd.wfa.wsc';

const WSC_FIELD_ID = {
    AUTH_TYPE: 0x1003,
    CREDENTIAL: 0x100E,
    NETWORK_KEY: 0x1027,
    SSID: 0x1045,
};

const AUTH_TYPE_WPA2_PSK = 0x0020;

function assertNonEmptyString(value, fieldName) {
    const normalized = typeof value === 'string' ? value.trim() : '';

    if (!normalized) {
        throw new Error(`${fieldName} is required`);
    }

    return normalized;
}

function encodeUtf8(value) {
    const normalized = String(value);
    const bytes = [];

    for (const char of normalized) {
        const codePoint = char.codePointAt(0);

        if (codePoint <= 0x7F) {
            bytes.push(codePoint);
            continue;
        }

        if (codePoint <= 0x7FF) {
            bytes.push(0xC0 | (codePoint >> 6));
            bytes.push(0x80 | (codePoint & 0x3F));
            continue;
        }

        if (codePoint <= 0xFFFF) {
            bytes.push(0xE0 | (codePoint >> 12));
            bytes.push(0x80 | ((codePoint >> 6) & 0x3F));
            bytes.push(0x80 | (codePoint & 0x3F));
            continue;
        }

        bytes.push(0xF0 | (codePoint >> 18));
        bytes.push(0x80 | ((codePoint >> 12) & 0x3F));
        bytes.push(0x80 | ((codePoint >> 6) & 0x3F));
        bytes.push(0x80 | (codePoint & 0x3F));
    }

    return new Uint8Array(bytes);
}

function encodeUint16(value) {
    return new Uint8Array([(value >> 8) & 0xFF, value & 0xFF]);
}

function concatBytes(parts) {
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    parts.forEach((part) => {
        result.set(part, offset);
        offset += part.length;
    });

    return result;
}

function createTlv(fieldId, valueBytes) {
    return concatBytes([
        encodeUint16(fieldId),
        encodeUint16(valueBytes.length),
        valueBytes,
    ]);
}

function buildWifiConfigPayload({ ssid, password }) {
    const normalizedSsid = assertNonEmptyString(ssid, 'ssid');
    const normalizedPassword = assertNonEmptyString(password, 'password');

    const credentialValue = concatBytes([
        createTlv(WSC_FIELD_ID.SSID, encodeUtf8(normalizedSsid)),
        createTlv(WSC_FIELD_ID.NETWORK_KEY, encodeUtf8(normalizedPassword)),
        createTlv(WSC_FIELD_ID.AUTH_TYPE, encodeUint16(AUTH_TYPE_WPA2_PSK)),
    ]);

    return createTlv(WSC_FIELD_ID.CREDENTIAL, credentialValue).buffer;
}

export {
    AUTH_TYPE_WPA2_PSK,
    WIFI_WSC_MIME_TYPE,
    buildWifiConfigPayload,
};
