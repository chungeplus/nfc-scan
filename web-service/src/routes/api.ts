import type { Request, Response } from 'express';
import { Router } from 'express';
import { generatePoster, getAvailablePosterTypes, PosterGeneratorError } from '../services/poster-generator';
import { getShareDetailByShareId, HttpError } from '../services/share-detail';
import { sendError, sendSuccess } from '../utils/http-response';

const router = Router();

router.get('/share/detail', async (req: Request, res: Response) => {
  const shareId = readQueryString(req.query.shareId || req.query.id);

  if (!shareId) {
    return sendError(res, 'MISSING_SHARE_ID', '缺少分享 ID', 400);
  }

  try {
    const share = await getShareDetailByShareId(shareId);
    return sendSuccess(res, { share });
  }
  catch (error) {
    console.error('[GET /api/share/detail] 查询失败', error);
    const normalizedError = normalizeError(error);
    return sendError(
      res,
      normalizedError.code,
      normalizedError.message,
      normalizedError.statusCode,
    );
  }
});

router.post('/generate-poster', async (req: Request, res: Response) => {
  try {
    const { posterType, size, style } = req.body;

    if (!posterType) {
      return sendError(res, 'MISSING_POSTER_TYPE', '缺少海报类型', 400);
    }

    const result = await generatePoster({
      posterType,
      size,
      style,
    });

    if (result.success && result.data) {
      return sendSuccess(res, { data: result.data });
    }
    else {
      return sendError(
        res,
        result.error?.code || 'GENERATE_FAILED',
        result.error?.message || '海报生成失败',
        500,
        { details: result.error?.details },
      );
    }
  }
  catch (error) {
    console.error('[POST /api/generate-poster] 生成失败', error);
    const normalizedError = normalizeError(error);
    return sendError(
      res,
      normalizedError.code,
      normalizedError.message,
      normalizedError.statusCode,
    );
  }
});

router.get('/poster/types', (_req: Request, res: Response) => {
  const types = getAvailablePosterTypes();
  return sendSuccess(res, { types });
});

function readQueryString(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return '';
}

function normalizeError(error: unknown): HttpError | PosterGeneratorError {
  if (error instanceof HttpError || error instanceof PosterGeneratorError) {
    return error;
  }

  return new HttpError('操作失败，请稍后重试', 'UNKNOWN_ERROR', 500);
}

export default router;
