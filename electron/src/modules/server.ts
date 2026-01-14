import express from 'express';
import * as path from 'path';
import { AddressInfo } from 'net';
import { DebugLogger } from './debug';

export class ExpressServer {
    private server: any = null;
    private rootDir: string;

    constructor(rootDir: string) {
        this.rootDir = rootDir;
    }

    async start(): Promise<number> {
        return new Promise((resolve, reject) => {
            DebugLogger.info('Creating Express server...');
            const expressApp = express();
            
            // Serve static files from the public directory
            const staticPath = path.join(this.rootDir, 'public');
            DebugLogger.info(`Setting up static file serving from: ${staticPath}`);
            expressApp.use(express.static(staticPath));

            // Handle SPA routing - serve index.html for all unmatched routes
            expressApp.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
                DebugLogger.info(`Request received: ${req.method} ${req.url}`);
                // If the request is for a file that doesn't exist, serve index.html
                if (!req.url.includes('.')) {
                    const indexPath = path.join(this.rootDir, 'public', 'index.html');
                    DebugLogger.info(`Serving SPA route: ${req.url} -> index.html`);
                    res.sendFile(indexPath);
                } else {
                    next();
                }
            });

            // Start server on available port
            this.server = expressApp.listen(0, 'localhost', () => {
                const port = (this.server.address() as AddressInfo).port;
                console.log(`Electron Express server running on http://localhost:${port}`);
                DebugLogger.info(`Express server successfully started on port: ${port}`);
                resolve(port);
            });

            this.server.on('error', (error: Error) => {
                DebugLogger.error(`Express server error: ${error.message}`);
                reject(error);
            });
        });
    }

    stop(): void {
        if (this.server) {
            DebugLogger.info('Closing Express server');
            this.server.close();
            this.server = null;
        }
    }

    isRunning(): boolean {
        return this.server !== null;
    }
}