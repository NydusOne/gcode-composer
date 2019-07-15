const {app, BrowserWindow, dialog} = require('electron');
let mainWindow;

// WebGL workaround for Intel Graphic HD 3000
app.commandLine.appendSwitch("ignore-gpu-blacklist");

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  if (process.platform != 'darwin')
    app.quit();
});

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200, 
    height: 800, 
    frame:true,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true
    }});

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/frontend/index.html');

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});
