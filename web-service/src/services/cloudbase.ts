import cloudbase from '@cloudbase/node-sdk';
import { CLOUD_ENV_ID } from '../config/runtime';

type CloudbaseApp = ReturnType<typeof cloudbase.init>;
type CloudbaseDatabase = ReturnType<CloudbaseApp['database']>;

export interface CloudbaseCredentialState {
  cloudEnvIdConfigured: boolean;
  apiKeyConfigured: boolean;
}

let appInstance: CloudbaseApp | null = null;

export function getCloudbaseApp(): CloudbaseApp {
  if (appInstance) {
    return appInstance;
  }

  if (!CLOUD_ENV_ID) {
    throw new Error('Missing CLOUD_ENV_ID environment variable');
  }

  appInstance = cloudbase.init({
    env: CLOUD_ENV_ID,
    timeout: 15000,
  });

  return appInstance;
}

export function getDatabase(): CloudbaseDatabase {
  return getCloudbaseApp().database();
}

export function getCloudbaseCredentialState(): CloudbaseCredentialState {
  return {
    cloudEnvIdConfigured: Boolean(CLOUD_ENV_ID),
    apiKeyConfigured: Boolean(getCloudbaseApiKey()),
  };
}

function getCloudbaseApiKey(): string {
  return readStringEnv('CLOUDBASE_APIKEY');
}

function readStringEnv(name: string): string {
  return String(process.env[name] || '').trim();
}
