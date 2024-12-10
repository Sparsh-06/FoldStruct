const { ipcRenderer } = require('electron');
const path = require('path');
const os = require('os');

// Function to handle organizing files
document.getElementById('organizeFilesBtn').addEventListener('click', () => {
    const directoryPath = document.getElementById('directoryPath').value.trim();
    ipcRenderer.invoke('organize-files', directoryPath)
        .then((response) => {
            document.getElementById('output').textContent = response.message;
        });
});

// Function to handle undoing the organization
document.getElementById('undoChangesBtn').addEventListener('click', () => {
    ipcRenderer.invoke('undo-organize')
        .then((response) => {
            document.getElementById('output').textContent = response.message;
        });
});

// Function to handle clicking on the quick shortcut buttons
document.querySelectorAll('.shortcut').forEach(button => {
    button.addEventListener('click', () => {
        const folder = button.getAttribute('data-path');
        let folderPath;

        // Define the paths for the common folders
        switch (folder) {
            case 'desktop':
                folderPath = path.join(os.homedir(), 'Desktop');
                break;
            case 'downloads':
                folderPath = path.join(os.homedir(), 'Downloads');
                break;
            case 'documents':
                folderPath = path.join(os.homedir(), 'Documents');
                break;
            case 'pictures':
                folderPath = path.join(os.homedir(), 'Pictures');
                break;
            default:
                folderPath = '';
        }

        // Call the organize-files event with the path of the folder
        if (folderPath) {
            ipcRenderer.invoke('organize-files', folderPath)
                .then((response) => {
                    document.getElementById('output').textContent = response.message;
                });
        }
    });
});
