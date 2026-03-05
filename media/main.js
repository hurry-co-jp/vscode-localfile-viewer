import { initTheme } from './themes.js';
import { loadFileList } from './sidebar.js';
import { initRouter, loadFile } from './router.js';

// Initialize Theme
initTheme();

// Show "Open in Browser" button only when inside VSCode Webview (iframe)
if (window.parent !== window) {
    const btn = document.getElementById('open-in-browser');
    if (btn) {
        btn.style.display = '';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.parent.postMessage({ type: 'openInBrowser', url: window.location.href }, '*');
        });
    }
}

// Initialize Router
const initialFile = initRouter();

// Load File List
loadFileList((path, el, type) => {
    // On file click in sidebar
    loadFile(path, el, true, type);
}).then(() => {
    // After list loaded, load initial file if present
    if (initialFile) {
        loadFile(initialFile);
    }
});
