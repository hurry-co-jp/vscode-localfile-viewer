import { initTheme } from './themes.js';
import { loadFileList } from './sidebar.js';
import { initRouter, loadFile } from './router.js';

// Initialize Theme
initTheme();

// Initialize Router
const initialFile = initRouter();

// Load File List
loadFileList((path, el) => {
    // On file click in sidebar
    loadFile(path, el);
}).then(() => {
    // After list loaded, load initial file if present
    if (initialFile) {
        loadFile(initialFile);
    }
});
