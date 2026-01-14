import * as fs from 'fs';
import * as path from 'path';
import { DebugLogger } from './debug';

export class StorageManager {
    private storageFilePath: string;

    constructor(rootDir: string) {
        this.storageFilePath = path.join(rootDir, 'storage.json');
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