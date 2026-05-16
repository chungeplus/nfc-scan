declare namespace AppTypes {
  interface PendingMediaRecord {
    id?: string;
    fileId?: string;
    fileName?: string;
    fileSize?: number;
    fileExt?: string;
    mediaType?: 'audio' | 'video';
    latestShareId?: string;
    latestThemeKey?: 'pixel' | 'minimal' | 'poster';
    latestPlayUrl?: string;
    [key: string]: unknown;
  }

  interface GlobalData {
    cloudEnvId: string;
    pendingMediaRecord: PendingMediaRecord | null;
  }
}

interface IAppOption {
  globalData: AppTypes.GlobalData;
}
