import { ipcMain, shell } from 'electron';
import { DebugLogger } from './debug';
import { StorageManager } from './storage';
import { WindowManager } from './window';

export class IPCManager {
    private storage: StorageManager;
    private windowManager: WindowManager;

    constructor(storage: StorageManager, windowManager: WindowManager) {
        this.storage = storage;
        this.windowManager = windowManager;
        this.setupHandlers();
    }

    private setupHandlers(): void {
        // App minimize handler
        ipcMain.on('app-minimize', () => {
            this.windowManager.minimizeWindow();
        });

        // App close handler
        ipcMain.on('app-close', () => {
            this.windowManager.closeWindow();
        });

        // Open external URL handler
        ipcMain.on('open-external-url', async (_event, url: string) => {
            try {
                await shell.openExternal(url);
                DebugLogger.info(`Opened external URL: ${url}`);
            } catch (error) {
                DebugLogger.error(`Failed to open external URL: ${url} - ${error}`);
            }
        });

        // Storage handlers
        ipcMain.handle('storage-get', async (_event, key: string) => {
            return this.storage.get(key);
        });

        ipcMain.handle('storage-set', async (_event, key: string, value: any) => {
            return this.storage.set(key, value);
        });

        ipcMain.handle('storage-remove', async (_event, key: string) => {
            return this.storage.remove(key);
        });

        ipcMain.handle('storage-clear', async (_event) => {
            return this.storage.clear();
        });

        DebugLogger.info('IPC handlers initialized');
    }

    cleanup(): void {
        ipcMain.removeAllListeners('app-minimize');
        ipcMain.removeAllListeners('app-close');
        ipcMain.removeAllListeners('open-external-url');
        ipcMain.removeHandler('storage-get');
        ipcMain.removeHandler('storage-set');
        ipcMain.removeHandler('storage-remove');
        ipcMain.removeHandler('storage-clear');
        DebugLogger.info('IPC handlers cleaned up');
    }
}
