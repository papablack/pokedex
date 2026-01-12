// Type definitions for Electron API exposed through preload
export interface ElectronAPI {
  closeApp: () => void;
  isElectron: boolean;
  isDev: boolean;
  initElectronLayout: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}