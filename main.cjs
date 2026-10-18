const { app, BrowserWindow, shell, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure Windows recognizes notifications, taskbar grouping, and shortcuts
app.setAppUserModelId('com.liime.drawdesk');

let mainWindow = null;

// Enforce single instance lock
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

  function createWindow() {
    // Choose DrawDesk icon asset depending on platform and environment
    const icoPath = path.join(__dirname, '../build/icon.ico');
    const pngPath = path.join(__dirname, '../build/icon.png');
    let appIcon = null;

    if (fs.existsSync(icoPath)) {
      appIcon = nativeImage.createFromPath(icoPath);
    } else if (fs.existsSync(pngPath)) {
      appIcon = nativeImage.createFromPath(pngPath);
    }

    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 960,
      minHeight: 640,
      title: 'DrawDesk',
      icon: appIcon || (fs.existsSync(icoPath) ? icoPath : pngPath),
      backgroundColor: '#121214',
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        spellcheck: false,
      },
    });

    if (appIcon) {
      mainWindow.setIcon(appIcon);
    }

    // Graceful presentation when content is ready
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });

    // Handle opening external links in the user's default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('http:') || url.startsWith('https:')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (url.startsWith('http:') || url.startsWith('https:')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });

    // Set minimal application menu with essential shortcuts
    const template = [
      {
        label: 'File',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { type: 'separator' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    // Load dev server or packaged production build
    const devServerUrl = process.env.ELECTRON_START_URL;

    if (devServerUrl) {
      mainWindow.loadURL(devServerUrl);
    } else {
      const indexPath = path.join(__dirname, '../dist/index.html');
      mainWindow.loadFile(indexPath);
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}
