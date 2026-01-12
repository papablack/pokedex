import { contextBridge, ipcRenderer } from 'electron';

// Check if we're in development mode
const isDev = process.env.DEV === '1' || process.env.NODE_ENV === 'development';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    closeApp: () => {
        console.log('Preload: closeApp called');
        ipcRenderer.send('app-close');
    },
    isElectron: true,
    isDev: isDev,
    initElectronLayout: () => {
        // Signal to the renderer that it should rebuild the layout with electron attribute
        console.log('Preload: signaling electron layout init');
        window.dispatchEvent(new CustomEvent('electron-ready', { detail: { isDev } }));
    }
});

// Initialize electron layout when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.electronAPI.initElectronLayout(), 100);
    });
} else {
    setTimeout(() => window.electronAPI.initElectronLayout(), 100);
}

console.log('Preload script loaded, isDev:', isDev);