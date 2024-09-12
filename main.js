const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const wifi = require('node-wifi');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

// Initialize Wifi Module
wifi.init({
  iface: 'Wi-Fi'
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 250,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.on('ready', createWindow);

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

ipcMain.handle('start-scan', async (event, location) => {
  const filePath = 'C:\\Wifi-Scanner\\wifi-scan.csv';
  const append = fs.existsSync(filePath);

  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      { id: 'bssid', title: 'BSSID' },
      { id: 'ssid', title: 'SSID' },
      { id: 'signal', title: 'Signal Strength' },
	  { id: 'mode', title: 'Network Type' },
      { id: 'auth', title: 'Authentication Type' },
      { id: 'encrypt', title: 'Encryption Type' },
	  { id: 'freq', title: 'Frequency' },
	  { id: 'channel', title: 'Channel' },
      { id: 'location', title: 'Location' },
    ],
    append: append // Set append mode
  });

  let timer = 30;
  let allRecords = [];
  const bssidMap = new Map();

  const performScan = () => {
    return new Promise((resolve, reject) => {
      wifi.scan((error, networks) => {
        if (error) {
          reject(error);
        } else {
          networks.forEach(network => {
            const signalStrength = 2 * (network.signal_level + 100);
            if (!bssidMap.has(network.bssid) || bssidMap.get(network.bssid).signal < signalStrength) {
              bssidMap.set(network.bssid, {
                bssid: network.bssid,
                ssid: network.ssid,
                signal: signalStrength,
				mode: network.mode,
                auth: network.security,
                encrypt: network.security_flags,
				freq: (network.frequency / 1000),
				channel: network.channel,
                location: location
              });
            }
          });

          resolve();
        }
      });
    });
  };

  for (let i = 0; i < 30; i++) {
    await performScan();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second between scans
    timer--;
  }

  allRecords = Array.from(bssidMap.values());

  await csvWriter.writeRecords(allRecords);

  // Quit the app after the scan is completed
  setTimeout(() => {
    app.quit();
  }, 1000);

  return allRecords;
});