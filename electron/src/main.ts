import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { DebugLogger } from './modules/debug';
import { EnvironmentManager } from './modules/environment';
import { WindowManager } from './modules/window';
import { StorageManager } from './modules/storage';
import { IPCManager } from './modules/ipc';
import { MenuManager } from './modules/menu';

class ElectronApp {
    private rootDir: string;
    private isDev: boolean;
    private windowManager: WindowManager;
    private storageManager: StorageManager;
    private ipcManager: IPCManager;

    constructor() {
        this.rootDir = path.join(__dirname, '../../');
        
        // Setup environment and get development flag
        const { isDev } = EnvironmentManager.setup(this.rootDir);
        this.isDev = isDev;

        // Initialize managers
        this.windowManager = new WindowManager(this.rootDir, this.isDev);
        this.storageManager = new StorageManager(this.rootDir);
        this.ipcManager = new IPCManager(this.storageManager, this.windowManager);

        this.setupAppEvents();
    }

    private setupAppEvents(): void {
        // This method will be called when Electron has finished initialization
        app.whenReady().then(async () => {
            DebugLogger.info('Electron app is ready');
            await this.windowManager.createWindow();
            DebugLogger.info('Window creation completed');
            MenuManager.createMenu();
            DebugLogger.info('Application menu created');

            app.on('activate', async () => {
                DebugLogger.info('App activate event triggered');
                // On macOS it's common to re-create a window in the app when the
                // dock icon is clicked and there are no other windows open.
                if (BrowserWindow.getAllWindows().length === 0) {
                    DebugLogger.info('No windows open, creating new window');
                    await this.windowManager.createWindow();
                }
            });
        });

        // Quit when all windows are closed, except on macOS
        app.on('window-all-closed', () => {
            DebugLogger.info('All windows closed event triggered');
            
            // Stop the server
            this.windowManager.stopServer();
            
            if (process.platform !== 'darwin') {
                DebugLogger.info('Quitting application');
                app.quit();
            }
        });

        // Security: Prevent new window creation
        app.on('web-contents-created', (_, contents) => {
            DebugLogger.info('New web contents created, setting security handlers');
            contents.setWindowOpenHandler(({ url }) => {
                DebugLogger.info(`External URL requested: ${url}`);
                shell.openExternal(url);
                return { action: 'deny' };
            });
        });

        // Handle app termination
        app.on('before-quit', () => {
            DebugLogger.info('App is about to quit, cleaning up...');
            this.cleanup();
        });
    }

    private cleanup(): void {
        this.ipcManager.cleanup();
        DebugLogger.info('App cleanup completed');
    }
}

// Initialize the application
new ElectronApp();