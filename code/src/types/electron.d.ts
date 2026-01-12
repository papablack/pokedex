// Type definitions for Electron API exposed through preload
export interface ElectronAPI {
  closeApp: () => void;
  isElectron: boolean;
  isDev: boolean;
  initElectronLayout: () => void;
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<boolean>;
    remove: (key: string) => Promise<boolean>;
    clear: () => Promise<boolean>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}