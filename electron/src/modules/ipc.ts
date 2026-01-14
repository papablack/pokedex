import { ipcMain } from 'electron';
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
        // App close handler
        ipcMain.on('app-close', () => {
            DebugLogger.info('Received app-close IPC message');
            this.windowManager.closeWindow();
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
        ipcMain.removeAllListeners('app-close');
        ipcMain.removeHandler('storage-get');
        ipcMain.removeHandler('storage-set');
        ipcMain.removeHandler('storage-remove');
        ipcMain.removeHandler('storage-clear');
        DebugLogger.info('IPC handlers cleaned up');
    }
}