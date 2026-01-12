import { RWSService } from '@rws-framework/client';

/**
 * StorageService for handling both localStorage and Electron file storage
 * Automatically detects the environment and uses appropriate storage method
 */
class StorageService extends RWSService {

    /**
     * Check if we're running in Electron environment
     */
    private get isElectron(): boolean {
        return typeof window !== 'undefined' && 
               window.electronAPI && 
               window.electronAPI.isElectron;
    }

    /**
     * Get a value from storage
     * @param key The storage key
     * @returns Promise<string | null> for Electron, string | null for web
     */
    async get(key: string): Promise<string | null> {
        try {
            if (this.isElectron) {
                const value = await window.electronAPI.storage.get(key);
                return value !== null ? String(value) : null;
            } else {
                // Web environment - use localStorage
                if (typeof localStorage !== 'undefined') {
                    return localStorage.getItem(key);
                }
                return null;
            }
        } catch (error) {
            console.error(`Storage get error for key "${key}":`, error);
            return null;
        }
    }

    /**
     * Set a value in storage
     * @param key The storage key
     * @param value The value to store
     * @returns Promise<boolean> for Electron, boolean for web
     */
    async set(key: string, value: string): Promise<boolean> {
        try {
            if (this.isElectron) {
                return await window.electronAPI.storage.set(key, value);
            } else {
                // Web environment - use localStorage
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(key, value);
                    return true;
                }
                return false;
            }
        } catch (error) {
            console.error(`Storage set error for key "${key}":`, error);
            return false;
        }
    }

    /**
     * Remove a value from storage
     * @param key The storage key to remove
     * @returns Promise<boolean> for Electron, boolean for web
     */
    async remove(key: string): Promise<boolean> {
        try {
            if (this.isElectron) {
                return await window.electronAPI.storage.remove(key);
            } else {
                // Web environment - use localStorage
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem(key);
                    return true;
                }
                return false;
            }
        } catch (error) {
            console.error(`Storage remove error for key "${key}":`, error);
            return false;
        }
    }

    /**
     * Clear all storage
     * @returns Promise<boolean> for Electron, boolean for web
     */
    async clear(): Promise<boolean> {
        try {
            if (this.isElectron) {
                return await window.electronAPI.storage.clear();
            } else {
                // Web environment - use localStorage
                if (typeof localStorage !== 'undefined') {
                    localStorage.clear();
                    return true;
                }
                return false;
            }
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }

    /**
     * Synchronous get method for web environments (fallback)
     * Note: This will return null in Electron environment as sync operations aren't supported
     */
    getSync(key: string): string | null {
        try {
            if (this.isElectron) {
                console.warn('getSync is not supported in Electron environment. Use get() instead.');
                return null;
            } else {
                // Web environment - use localStorage
                if (typeof localStorage !== 'undefined') {
                    return localStorage.getItem(key);
                }
                return null;
            }
        } catch (error) {
            console.error(`Storage getSync error for key "${key}":`, error);
            return null;
        }
    }

    /**
     * Synchronous set method for web environments (fallback)
     * Note: This will return false in Electron environment as sync operations aren't supported
     */
    setSync(key: string, value: string): boolean {
        try {
            if (this.isElectron) {
                console.warn('setSync is not supported in Electron environment. Use set() instead.');
                return false;
            } else {
                // Web environment - use localStorage
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(key, value);
                    return true;
                }
                return false;
            }
        } catch (error) {
            console.error(`Storage setSync error for key "${key}":`, error);
            return false;
        }
    }

    /**
     * Check if storage is available
     */
    isAvailable(): boolean {
        return this.isElectron || typeof localStorage !== 'undefined';
    }

    /**
     * Get the current storage type
     */
    getStorageType(): 'electron' | 'localStorage' | 'none' {
        if (this.isElectron) {
            return 'electron';
        } else if (typeof localStorage !== 'undefined') {
            return 'localStorage';
        } else {
            return 'none';
        }
    }
}

export default StorageService.getSingleton();
export { StorageService as StorageServiceInstance };