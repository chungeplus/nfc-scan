"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFailure = createFailure;
function createFailure(message, code) {
    return code
        ? { success: false, message, code }
        : { success: false, message };
}
