import { contextBridge, ipcRenderer } from 'electron';

// Check if we're in development mode
const isDev = process.env.DEV === '1' || process.env.NODE_ENV === 'development';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    closeApp: () => {
        ipcRenderer.send('app-close');
    },
    isElectron: true,
    isDev: isDev,
    initElectronLayout: () => {
        // Signal to the renderer that it should rebuild the layout with electron attribute
        window.dispatchEvent(new CustomEvent('electron-ready', { detail: { isDev } }));
    },
    storage: {
        get: (key: string) => ipcRenderer.invoke('storage-get', key),
        set: (key: string, value: any) => ipcRenderer.invoke('storage-set', key, value),
        remove: (key: string) => ipcRenderer.invoke('storage-remove', key),
        clear: () => ipcRenderer.invoke('storage-clear')
    }
});

// Initialize electron layout when DOM is loaded
const initLayout = () => {
    console.log('Preload: signaling electron layout init');
    window.dispatchEvent(new CustomEvent('electron-ready', { detail: { isDev } }));
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => initLayout(), 100);
    });
} else {
    setTimeout(() => initLayout(), 100);
}

console.log('Preload script loaded, isDev:', isDev);