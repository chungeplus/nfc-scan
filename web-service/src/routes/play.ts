import type { Request, Response } from 'express';
import type { PlayTheme } from '../config/runtime';
import path from 'node:path';
import { Router } from 'express';
import { PLAY_THEMES, PUBLIC_DIR } from '../config/runtime';

const router = Router();
const themeKeys = new Set<PlayTheme>(PLAY_THEMES);
const playThemeEntryFiles: Record<PlayTheme, string> = {
  pixel: path.join(PUBLIC_DIR, 'play', 'pixel', 'index.html'),
  minimal: path.join(PUBLIC_DIR, 'play', 'minimal', 'index.html'),
  poster: path.join(PUBLIC_DIR, 'play', 'poster', 'index.html'),
};

router.get('/:themeKey/:shareId?', (req: Request, res: Response) => {
  const themeKey = normalizeThemeKey(req.params.themeKey);
  if (!themeKey) {
    return res.redirect(302, '/');
  }

  return res.sendFile(playThemeEntryFiles[themeKey]);
});

function normalizeThemeKey(value: string | undefined): PlayTheme | null {
  const themeKey = String(value || '').toLowerCase() as PlayTheme;
  return themeKeys.has(themeKey) ? themeKey : null;
}

export default router;
