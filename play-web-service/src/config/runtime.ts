import path from 'node:path';

export const ROOT_DIR = path.join(__dirname, '..', '..');
export const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
export const PLAY_THEMES = ['pixel', 'minimal', 'poster'] as const;
export const MEDIA_TYPES = ['audio', 'video'] as const;

export type PlayTheme = (typeof PLAY_THEMES)[number];
export type MediaType = (typeof MEDIA_TYPES)[number];
export type CorsAllowOrigin = '*' | string[];

export const CLOUD_ENV_ID = readStringEnv('CLOUD_ENV_ID');
export const CORS_ALLOW_ORIGIN = normalizeCorsOrigin(process.env.CORS_ALLOW_ORIGIN);

function readStringEnv(name: string): string {
  return String(process.env[name] || '').trim();
}

function normalizeCorsOrigin(value: string | undefined): CorsAllowOrigin {
  const normalized = String(value || '').trim();
  if (!normalized || normalized === '*') {
    return '*';
  }

  return normalized
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}
