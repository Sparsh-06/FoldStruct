const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { screen } = require('electron');

let mainWindow;

// Define folder categories and their respective file extensions
const folderCategories = {
    Documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'],
    Images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'],
    Videos: ['.mp4', '.mkv', '.avi', '.mov', '.wmv'],
    Audio: ['.mp3', '.wav', '.aac', '.flac'],
    Compressed: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    Code: ['.js', '.py', '.html', '.css', '.java', '.cpp', '.c', '.php'],
    Executables: ['.exe', '.msi', '.bat', '.sh'],
};

// Path to store the file map JSON
const fileMapPath = path.join(app.getPath('userData'), 'fileMap.json');

// When the app is ready, create the main window
app.whenReady().then(() => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    mainWindow = new BrowserWindow({
        width,
        height,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    // Load the main HTML file
    mainWindow.loadFile('index.html');
});

// Handle the 'organize-files' event
ipcMain.handle('organize-files', async (_, directoryPath) => {
    try {
        // Use the provided directory path or default to the Downloads folder
        const dirPath = directoryPath || app.getPath('downloads');
        const fileMap = {};

        // Get all files in the specified directory
        const files = fs.readdirSync(dirPath);

        // To keep track of which folders need to be created
        const foldersToCreate = new Set();

        files.forEach((file) => {
            const filePath = path.join(dirPath, file);

            // Skip directories
            if (fs.lstatSync(filePath).isDirectory()) return;

            const fileExtension = path.extname(file).toLowerCase();

            // Check for relevant category based on the file extension
            for (const [category, extensions] of Object.entries(folderCategories)) {
                if (extensions.includes(fileExtension)) {
                    // Add the folder to the set if it is relevant
                    foldersToCreate.add(category);
                    // Move files into their respective folders based on extension
                    const targetFolder = path.join(dirPath, category);
                    if (!fs.existsSync(targetFolder)) {
                        fs.mkdirSync(targetFolder);
                    }

                    const targetPath = path.join(targetFolder, file);
                    fs.renameSync(filePath, targetPath);

                    // Track original and new locations
                    fileMap[file] = { original: filePath, new: targetPath };
                    break;
                }
            }
        });

        // Save the file map to JSON
        fs.writeFileSync(fileMapPath, JSON.stringify(fileMap, null, 2));

        return { success: true, message: 'Files organized successfully.' };
    } catch (err) {
        return { success: false, message: err.message };
    }
});

// Handle the 'undo-organize' event
ipcMain.handle('undo-organize', async () => {
    try {
        if (!fs.existsSync(fileMapPath)) {
            return { success: false, message: 'No changes to undo.' };
        }

        const fileMap = JSON.parse(fs.readFileSync(fileMapPath, 'utf8'));

        // Move files back to their original locations
        for (const [fileName, paths] of Object.entries(fileMap)) {
            const { original, new: newPath } = paths;

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

// Quit the app when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
