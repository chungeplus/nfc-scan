import type { Response } from 'express';

type JsonObject = Record<string, unknown>;

export type ApiSuccessResponse<T extends JsonObject = Record<string, never>> = {
  success: true;
} & T;

export type ApiErrorResponse<T extends JsonObject = Record<string, never>> = {
  success: false;
  code: string;
  message: string;
} & T;

export function sendSuccess<T extends JsonObject>(
  res: Response,
  payload: T,
  statusCode = 200,
): Response<ApiSuccessResponse<T>> {
  return res.status(statusCode).json({
    success: true,
    ...payload,
  });
}

export function sendError<T extends JsonObject = Record<string, never>>(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  payload?: T,
): Response<ApiErrorResponse<T>> {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    ...(payload || {}),
  });
}
