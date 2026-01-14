import { BrowserWindow } from 'electron';

export class DebugLogger {
    private static mainWindow: BrowserWindow | null = null;

    static setMainWindow(window: BrowserWindow | null) {
        this.mainWindow = window;
    }

    static log(message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info') {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [MAIN] ${message}`;
        
        // Console log with appropriate level
        switch (level) {
            case 'error':
                console.error(formattedMessage);
                break;
            case 'warn':
                console.warn(formattedMessage);
                break;
            case 'debug':
                console.debug(formattedMessage);
                break;
            default:
                console.log(formattedMessage);
        }
        
        // Send to renderer if window exists
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            try {
                this.mainWindow.webContents.send('debug-log', {
                    message,
                    level,
                    source: 'electron-main'
                });
            } catch (error) {
                console.error('Failed to send debug log to renderer:', error);
            }
        }
    }

    static info(message: string) {
        this.log(message, 'info');
    }

    static warn(message: string) {
        this.log(message, 'warn');
    }

    static error(message: string) {
        this.log(message, 'error');
    }

    static debug(message: string) {
        this.log(message, 'debug');
    }
}