export interface MediaShareServiceEvent {
    action?: string;
    payload?: Record<string, unknown>;
}

export interface MediaShareServiceFailure {
    success: false;
    message: string;
    code?: string;
}

export type MediaShareServiceResponse =
    | Record<string, unknown>
    | MediaShareServiceFailure;

export function createFailure(message: string, code?: string): MediaShareServiceFailure {
    return code
        ? { success: false, message, code }
        : { success: false, message };
}
