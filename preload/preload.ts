import { contextBridge, ipcRenderer } from 'electron';

// Initialize isDev as false, will be updated from main process
let isDev = false;

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    closeApp: () => {
        ipcRenderer.send('app-close');
    },
    isElectron: true,
    isDev: () => isDev, // Return as function to get current value
    initElectronLayout: () => {
        // Signal to the renderer that it should rebuild the layout with electron attribute
        window.dispatchEvent(new CustomEvent('electron-ready', { detail: { isDev } }));
    },
    storage: {
        get: (key: string) => ipcRenderer.invoke('storage-get', key),
        set: (key: string, value: any) => ipcRenderer.invoke('storage-set', key, value),
        remove: (key: string) => ipcRenderer.invoke('storage-remove', key),
        clear: () => ipcRenderer.invoke('storage-clear')
    },
    debug: {
        addLog: (message: string, level: string, source: string) => {
            // Send debug log to renderer via custom event
            window.dispatchEvent(new CustomEvent('electron-debug-log', {
                detail: { message, level, source }
            }));
        }
    }
});

// Listen for dev mode status from main process
ipcRenderer.on('dev-mode-status', (event, devMode) => {
    isDev = devMode;
    window.dispatchEvent(new CustomEvent('dev-mode-changed', {
        detail: { isDev: devMode }
    }));
});

// Listen for debug logs from main process
ipcRenderer.on('debug-log', (event, { message, level, source }) => {
    window.dispatchEvent(new CustomEvent('electron-debug-log', {
        detail: { message, level, source }
    }));
});

// Initialize electron layout when DOM is loaded
const initLayout = () => {
    window.dispatchEvent(new CustomEvent('electron-ready', { detail: { isDev } }));
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => initLayout(), 100);
    });
} else {
    setTimeout(() => initLayout(), 100);
}