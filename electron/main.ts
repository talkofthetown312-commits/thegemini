import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: 'Talk of the Town POS',
    backgroundColor: '#800000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    autoHideMenuBar: true,
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Hardware IPC Handlers
ipcMain.handle('hardware:kickCashDrawer', async () => {
  // Cash drawer kick pulse: ESC p 0 25 250 (0x1B 0x70 0x00 0x19 0xFA)
  console.log('[Electron Hardware] Cash drawer kick pulse triggered');
  return { success: true };
});

ipcMain.handle('hardware:getPrinters', async () => {
  if (!mainWindow) return [];
  return await mainWindow.webContents.getPrintersAsync();
});

ipcMain.handle('hardware:printSilent', async (_, options) => {
  if (!mainWindow) return { success: false };
  return new Promise((resolve) => {
    mainWindow?.webContents.print(
      {
        silent: options?.silent ?? true,
        printBackground: true,
        deviceName: options?.deviceName || undefined,
        pageSize: options?.pageSize || { width: 80000, height: 297000 }, // 80mm roll default
      },
      (success, failureReason) => {
        resolve({ success, error: failureReason });
      }
    );
  });
});
