import { BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { DebugLogger } from './debug';
import { ExpressServer } from './server';

export class WindowManager {
    private mainWindow: BrowserWindow | null = null;
    private server: ExpressServer;
    private rootDir: string;
    private isDev: boolean;

    constructor(rootDir: string, isDev: boolean) {
        this.rootDir = rootDir;
        this.isDev = isDev;
        this.server = new ExpressServer(rootDir);
    }

    async createWindow(): Promise<BrowserWindow> {
        DebugLogger.info('Starting window creation process...');
        
        // Start the express server first
        DebugLogger.info('Starting Express server...');
        const port = await this.server.start();
        DebugLogger.info(`Express server ready on port ${port}`);

        // Create the browser window
        DebugLogger.info('Creating BrowserWindow...');
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 900,
            minWidth: 800,
            minHeight: 700,
            frame: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: true,
                preload: path.join(this.rootDir, 'dist', 'preload.js')
            },
            icon: path.join(this.rootDir, 'public', 'icon.png'),
            show: true,
            titleBarStyle: 'hidden'
        });

        // Set main window for debug logger
        DebugLogger.setMainWindow(this.mainWindow);

        console.log('Window created');
        DebugLogger.info('BrowserWindow created successfully');

        // Force window to show and focus
        this.mainWindow.show();
        this.mainWindow.focus();
        console.log('Window forced to show and focus');
        DebugLogger.info('Window shown and focused');

        // Load the app using HTTP instead of file protocol
        console.log(`Loading URL: http://localhost:${port}`);
        DebugLogger.info(`Loading application URL: http://localhost:${port}`);
        try {
            await this.mainWindow.loadURL(`http://localhost:${port}`);
            console.log('URL loaded successfully');
            DebugLogger.info('Application URL loaded successfully');
            
            // Force open dev tools immediately if DEV=1 is set
            if (process.env.DEV === '1' || this.isDev) {
                console.log('Forcing DevTools open immediately (DEV=1 or isDev=true)');
                DebugLogger.info('Opening DevTools (development mode)');
                this.mainWindow.webContents.openDevTools();
                
                // Also try after a short delay in case it needs DOM to be ready
                setTimeout(() => {
                    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                        console.log('Opening DevTools again after delay');
                        DebugLogger.info('Reopening DevTools after delay');
                        this.mainWindow.webContents.openDevTools();
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Failed to load URL:', error);
            DebugLogger.error(`Failed to load application URL: ${error}`);
        }

        this.setupWindowEvents();
        return this.mainWindow;
    }

    private setupWindowEvents(): void {
        if (!this.mainWindow) return;

        // Show window when ready to prevent visual flash
        this.mainWindow.once('ready-to-show', () => {
            console.log('Window ready to show');
            DebugLogger.info('Window ready-to-show event triggered');
            if (this.mainWindow) {
                this.mainWindow.show();
                console.log('Window shown');
                DebugLogger.info('Window displayed successfully');
                
                // Focus on window and open dev tools in dev mode
                if (this.isDev) {
                    console.log('Opening DevTools again in ready-to-show (DEV mode)');
                    DebugLogger.info('Opening DevTools in development mode');
                    this.mainWindow.webContents.openDevTools();
                }
            }
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            DebugLogger.info('Window closed event triggered');
            this.mainWindow = null;
            DebugLogger.setMainWindow(null);
            // Close the express server when window closes
            this.server.stop();
        });

        // Handle external links
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            DebugLogger.info(`External URL requested: ${url}`);
            shell.openExternal(url);
            return { action: 'deny' };
        });
    }

    getMainWindow(): BrowserWindow | null {
        return this.mainWindow;
    }

    closeWindow(): void {
        if (this.mainWindow) {
            this.mainWindow.close();
        }
    }

    stopServer(): void {
        this.server.stop();
    }
}