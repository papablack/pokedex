import { app, BrowserWindow, Menu, shell, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import express from 'express';
import { AddressInfo } from 'net';
import dotenv from 'dotenv';

const rootDir = path.join(__dirname, '../../');

try {
  const envPath = path.join(rootDir, '.env');
  if(fs.existsSync(envPath)) {
    console.log('Loading .env from:', envPath);
    dotenv.config({ path: envPath });
    console.log('Environment variables loaded');
    console.log('DEV environment variable:', process.env.DEV);
    console.log('NODE_ENV:', process.env.NODE_ENV);
  }  
} catch (error) {
  console.log('Could not load .env file:', error instanceof Error ? error.message : String(error));
  console.log('Using default environment');
}

// Enable live reload for development
const isDev = process.env.NODE_ENV === 'development' || process.env.DEV === '1' || false;
console.log('isDev determined as:', isDev);

// Force dev tools open if DEV=1
if (process.env.DEV === '1') {
  console.log('DEV=1 detected, will force DevTools open');
}

let mainWindow: BrowserWindow | null;
let server: any;

const createServer = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    const expressApp = express();
    
    // Serve static files from the public directory
    expressApp.use(express.static(path.join(rootDir, 'public')));

    // Handle SPA routing - serve index.html for all unmatched routes
    expressApp.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      // If the request is for a file that doesn't exist, serve index.html
      if (!req.url.includes('.')) {
        res.sendFile(path.join(rootDir, 'public', 'index.html'));
      } else {
        next();
      }
    });

    // Start server on available port
    server = expressApp.listen(0, 'localhost', () => {
      const port = (server.address() as AddressInfo).port;
      console.log(`Electron Express server running on http://localhost:${port}`);
      resolve(port);
    });

    server.on('error', reject);
  });
};

const createWindow = async (): Promise<void> => {
  // Start the express server first
  const port = await createServer();

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 800,
    minHeight: 700,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(rootDir, 'dist', 'preload.js') // Use compiled preload from dist
    },
    icon: path.join(rootDir, 'public', 'icon.png'), // Add your icon
    show: true, // Show immediately for debugging
    titleBarStyle: 'hidden'
  });

  console.log('Window created');

  // Force window to show and focus
  mainWindow.show();
  mainWindow.focus();
  console.log('Window forced to show and focus');

  // Load the app using HTTP instead of file protocol
  console.log(`Loading URL: http://localhost:${port}`);
  try {
    await mainWindow.loadURL(`http://localhost:${port}`);
    console.log('URL loaded successfully');
    
    // Force open dev tools immediately if DEV=1 is set
    if (process.env.DEV === '1' || isDev) {
      console.log('Forcing DevTools open immediately (DEV=1 or isDev=true)');
      mainWindow.webContents.openDevTools();
      
      // Also try after a short delay in case it needs DOM to be ready
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          console.log('Opening DevTools again after delay');
          mainWindow.webContents.openDevTools();
        }
      }, 1000);
    }
  } catch (error) {
    console.error('Failed to load URL:', error);
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    if (mainWindow) {
      mainWindow.show();
      console.log('Window shown');
      
      // Focus on window and open dev tools in dev mode
      if (isDev) {
        console.log('Opening DevTools again in ready-to-show (DEV mode)');
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    // Close the express server when window closes
    if (server) {
      server.close();
      server = null;
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
};

// IPC Handlers
ipcMain.on('app-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  await createWindow();
  createMenu();

  app.on('activate', async () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  // Close the express server
  if (server) {
    server.close();
    server = null;
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

// Create application menu
const createMenu = (): void => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};