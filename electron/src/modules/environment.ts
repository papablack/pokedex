import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';
import { DebugLogger } from './debug';

export class EnvironmentManager {
    static setup(rootDir: string): { isDev: boolean } {
        // Check for DEV argument in command line
        const hasDevArg = process.argv.includes('--dev') || process.argv.includes('DEV=1');
        
        // Check for debug file in resources (for packaged apps)
        const debugFilePath = path.join(rootDir, 'debug.flag');
        const hasDebugFile = fs.existsSync(debugFilePath);
        
        if (hasDevArg || hasDebugFile) {
            process.env.DEV = '1';
        }
        
        // Load environment variables
        try {
            // Try multiple .env file locations for different build scenarios
            const envPaths = [
                path.join(rootDir, '.env'),                    // Development
                path.join(process.resourcesPath, '.env'),      // Packaged app resources
                path.join(process.cwd(), '.env'),              // Current working directory
                path.join(__dirname, '../../../.env'),        // Relative to dist/electron
                path.join(process.resourcesPath, 'app', '.env') // Inside app folder in resources
            ];
            
            let envLoaded = false;
            for (const envPath of envPaths) {
                if (fs.existsSync(envPath)) {
                    DebugLogger.info(`Loading .env from: ${envPath}`);
                    dotenv.config({ path: envPath });
                    envLoaded = true;
                    break;
                }
            }
            
            if (!envLoaded) {
                DebugLogger.info('No .env file found, using default environment');
            }
        } catch (error) {
            DebugLogger.error(`Could not load .env file: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Determine development mode with multiple checks
        const isDev = process.env.NODE_ENV === 'development' || 
                     process.env.DEV === '1' || 
                     hasDevArg || 
                     hasDebugFile || 
                     false;
        
        DebugLogger.info(`Development mode: ${isDev}`);

        return { isDev };
    }
}