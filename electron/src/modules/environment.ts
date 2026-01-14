import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';
import { DebugLogger } from './debug';

export class EnvironmentManager {
    static setup(rootDir: string): { isDev: boolean } {
        // Load environment variables
        try {
            const envPath = path.join(rootDir, '.env');
            if (fs.existsSync(envPath)) {
                console.log('Loading .env from:', envPath);
                DebugLogger.info(`Loading .env from: ${envPath}`);
                dotenv.config({ path: envPath });
                console.log('Environment variables loaded');
                DebugLogger.info('Environment variables loaded successfully');
                console.log('DEV environment variable:', process.env.DEV);
                DebugLogger.info(`DEV environment variable: ${process.env.DEV}`);
                console.log('NODE_ENV:', process.env.NODE_ENV);
                DebugLogger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
            } else {
                DebugLogger.info('No .env file found, using default environment');
            }
        } catch (error) {
            console.log('Could not load .env file:', error instanceof Error ? error.message : String(error));
            DebugLogger.error(`Could not load .env file: ${error instanceof Error ? error.message : String(error)}`);
            console.log('Using default environment');
            DebugLogger.info('Using default environment');
        }

        // Determine development mode
        const isDev = process.env.NODE_ENV === 'development' || process.env.DEV === '1' || false;
        console.log('isDev determined as:', isDev);
        DebugLogger.info(`Development mode: ${isDev}`);

        // Force dev tools open if DEV=1
        if (process.env.DEV === '1') {
            console.log('DEV=1 detected, will force DevTools open');
            DebugLogger.info('DEV=1 detected, will force DevTools open');
        }

        return { isDev };
    }
}