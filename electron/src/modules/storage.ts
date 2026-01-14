import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { DebugLogger } from './debug';

export class StorageManager {
    private storageFilePath: string;

    constructor(rootDir: string) {
        // Determine the best location for storage file
        let storageDir: string;
        
        if (app.isPackaged) {
            // In packaged app, store next to the executable
            storageDir = path.dirname(process.execPath);
            DebugLogger.info(`Packaged app detected, storage directory: ${storageDir}`);
        } else {
            // In development, use the rootDir
            storageDir = rootDir;
            DebugLogger.info(`Development mode, storage directory: ${storageDir}`);
        }
        
        this.storageFilePath = path.join(storageDir, 'storage.json');
        DebugLogger.info(`Storage file path: ${this.storageFilePath}`);
        
        // Create directory if it doesn't exist
        try {
            const dir = path.dirname(this.storageFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                DebugLogger.info(`Created storage directory: ${dir}`);
            }
        } catch (error) {
            DebugLogger.error(`Failed to create storage directory: ${error}`);
        }
    }

    loadData(): Record<string, any> {
        try {
            if (fs.existsSync(this.storageFilePath)) {
                const data = fs.readFileSync(this.storageFilePath, 'utf-8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load storage data:', error);
            DebugLogger.error(`Failed to load storage data: ${error}`);
        }
        return {};
    }

    saveData(data: Record<string, any>): void {
        try {
            fs.writeFileSync(this.storageFilePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            console.error('Failed to save storage data:', error);
            DebugLogger.error(`Failed to save storage data: ${error}`);
        }
    }

    get(key: string): any {
        DebugLogger.info(`Storage get request: ${key}`);
        const data = this.loadData();
        const value = data[key] || null;
        DebugLogger.info(`Storage get result for '${key}': ${value !== null ? 'found' : 'not found'}`);
        return value;
    }

    set(key: string, value: any): boolean {
        DebugLogger.info(`Storage set request: ${key}`);
        const data = this.loadData();
        data[key] = value;
        this.saveData(data);
        DebugLogger.info(`Storage set completed for key: ${key}`);
        return true;
    }

    remove(key: string): boolean {
        DebugLogger.info(`Storage remove request: ${key}`);
        const data = this.loadData();
        delete data[key];
        this.saveData(data);
        DebugLogger.info(`Storage remove completed for key: ${key}`);
        return true;
    }

    clear(): boolean {
        DebugLogger.info('Storage clear request');
        this.saveData({});
        DebugLogger.info('Storage cleared successfully');
        return true;
    }
}