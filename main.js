const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;

const folderCategories = {
  Documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'],
  Images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'],
  Videos: ['.mp4', '.mkv', '.avi', '.mov', '.wmv'],
  Audio: ['.mp3', '.wav', '.aac', '.flac'],
  Compressed: ['.zip', '.rar', '.7z', '.tar', '.gz'],
  Code: ['.js', '.py', '.html', '.css', '.java', '.cpp', '.c', '.php'],
  Executables: ['.exe', '.msi', '.bat', '.sh'],
};

const fileMapPath = path.join(app.getPath('userData'), 'fileMap.json');

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');

  ipcMain.handle('organize-files', async () => {
    try {
      const downloadsPath = app.getPath('downloads');
      const fileMap = {};

      // Create folders for categories
      Object.keys(folderCategories).forEach((category) => {
        const folderPath = path.join(downloadsPath, category);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath);
        }
      });

      // Move files into respective folders
      const files = fs.readdirSync(downloadsPath);

      files.forEach((file) => {
        const filePath = path.join(downloadsPath, file);

        // Skip directories
        if (fs.lstatSync(filePath).isDirectory()) return;

        const fileExtension = path.extname(file).toLowerCase();

        for (const [category, extensions] of Object.entries(folderCategories)) {
          if (extensions.includes(fileExtension)) {
            const targetFolder = path.join(downloadsPath, category);
            const targetPath = path.join(targetFolder, file);

            fs.renameSync(filePath, targetPath);

            // Track original and new locations
            fileMap[file] = { original: filePath, new: targetPath };
            break;
          }
        }
      });

      // Save file map to JSON
      fs.writeFileSync(fileMapPath, JSON.stringify(fileMap, null, 2));

      return { success: true, message: 'Files organized successfully.' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('undo-organize', async () => {
    try {
      if (!fs.existsSync(fileMapPath)) {
        return { success: false, message: 'No changes to undo.' };
      }

      const fileMap = JSON.parse(fs.readFileSync(fileMapPath, 'utf8'));

      for (const [fileName, paths] of Object.entries(fileMap)) {
        const { original, new: newPath } = paths;

        // Move file back to original location
        if (fs.existsSync(newPath)) {
          fs.renameSync(newPath, original);
        }
      }

      // Remove the fileMap.json
      fs.unlinkSync(fileMapPath);

      return { success: true, message: 'Changes have been undone.' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
