import { BrowserWindow, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
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
        
        // Determine correct preload path for different build scenarios
        const preloadPaths = [
            path.join(this.rootDir, 'public', 'js', 'preload.js'),  // New location in public
            path.join(this.rootDir, 'preload', 'dist', 'preload.js'), // Old development path
            path.join(this.rootDir, 'dist', 'preload.js'),           // Alternative path
            path.join(__dirname, '..', '..', 'preload', 'dist', 'preload.js'), // Relative to electron dist
        ];
        
        let preloadPath = '';
        for (const testPath of preloadPaths) {
            console.log('Testing preload path:', testPath);
            DebugLogger.info(`Testing preload path: ${testPath}`);
            
            if (fs.existsSync(testPath)) {
                preloadPath = testPath;
                console.log('Found preload script at:', preloadPath);
                DebugLogger.info(`Found preload script at: ${preloadPath}`);
                break;
            }
        }
        
        if (!preloadPath) {
            // Fallback to the expected path even if file doesn't exist
            preloadPath = path.join(this.rootDir, 'preload', 'dist', 'preload.js');
            console.warn('Preload script not found, using fallback path:', preloadPath);
            DebugLogger.error(`Preload script not found, using fallback path: ${preloadPath}`);
        }
        
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 900,
            minWidth: 800,
            minHeight: 700,
            frame: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: false, // Disable for DevTools in packaged apps
                devTools: true, // Explicitly enable DevTools
                preload: preloadPath
            },
            icon: path.join(this.rootDir, 'public', 'icon.png'),
            show: true,
            titleBarStyle: 'hidden'
        });

        // Set main window for debug logger
        DebugLogger.setMainWindow(this.mainWindow);
        DebugLogger.info('BrowserWindow created successfully');

        // Force window to show and focus
        this.mainWindow.show();
        this.mainWindow.focus();
        DebugLogger.info('Window shown and focused');

        // Load the app using HTTP instead of file protocol
        DebugLogger.info(`Loading application URL: http://localhost:${port}`);
        try {
            await this.mainWindow.loadURL(`http://localhost:${port}`);
            DebugLogger.info('Application URL loaded successfully');
            
            // Force open dev tools immediately if DEV=1 is set
            if (process.env.DEV === '1' || this.isDev) {
                DebugLogger.info('Opening DevTools (development mode)');
                
                // Force DevTools open with multiple attempts
                this.mainWindow.webContents.openDevTools();
                
                // Multiple fallback attempts
                setTimeout(() => {
                    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                        this.mainWindow.webContents.openDevTools();
                    }
                }, 1000);
                
                setTimeout(() => {
                    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                        this.mainWindow.webContents.openDevTools();
                    }
                }, 3000);
            }
            
            // Send isDev status to renderer
            this.mainWindow.webContents.once('dom-ready', () => {
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.webContents.send('dev-mode-status', this.isDev);
                    DebugLogger.info(`Sent dev mode status to renderer: ${this.isDev}`);
                }
            });
        } catch (error) {
            DebugLogger.error(`Failed to load application URL: ${error}`);
        }

        this.setupWindowEvents();
        return this.mainWindow;
    }

    private setupWindowEvents(): void {
        if (!this.mainWindow) return;

        // Show window when ready to prevent visual flash
        this.mainWindow.once('ready-to-show', () => {
            DebugLogger.info('Window ready-to-show event triggered');
            if (this.mainWindow) {
                this.mainWindow.show();
                DebugLogger.info('Window displayed successfully');
                
                // Focus on window and open dev tools in dev mode
                if (this.isDev || process.env.DEV === '1') {
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