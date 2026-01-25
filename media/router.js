import { log, resolvePath } from './utils.js';
import { renderContent } from './viewer.js';
import { setActiveFile } from './sidebar.js';
import { updateBreadcrumbs } from './breadcrumbs.js';

let currentFilePath = '';
const previewEl = document.getElementById('preview');

export async function loadFile(filename, clickedEl = null, updateHistory = true, fileType = null) {
    if (!filename) return;

    setActiveFile(filename);
    currentFilePath = filename;

    // Update Breadcrumbs
    updateBreadcrumbs(filename);

    // Determine processing mode
    // If fileType is provided (from sidebar), use it.
    // Otherwise fallback to extension-based guess (for initial load/history).
    let group = fileType;
    if (!group) {
        const ext = '.' + filename.split('.').pop().toLowerCase();
        // Simple fallback map matching default server config roughly
        if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'].includes(ext)) group = 'image';
        else if (['.pdf', '.mp4', '.webm', '.ogg', '.mov', '.mp3', '.wav'].includes(ext)) group = 'media';
        else if (['.md', '.markdown'].includes(ext)) group = 'markdown';
        else group = 'code';
    }

    const skipFetch = (group === 'image' || group === 'media');

    try {
        let text = null;
        if (!skipFetch) {
            const encodedPath = filename.split('/').map(s => encodeURIComponent(s)).join('/');
            const res = await fetch(`contents/${encodedPath}`);

            if (!res.ok) throw new Error("Not found");
            text = await res.text();
        }

        await renderContent(filename, text, group);

        if (updateHistory) {
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('file', filename);
            window.history.pushState({}, '', newUrl);
        }
    } catch (e) {
        previewEl.innerHTML = `<div class="empty-state">Error loading file: ${e.message}</div>`;
        log(e.message, true);
    }
}

export function initRouter() {
    // Intercept internal links
    previewEl.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        // Ignore external
        if (/^(http:|https:|\/\/|#)/.test(href)) return;

        const lower = href.toLowerCase();
        if (lower.endsWith('.md') || lower.endsWith('.yaml') || lower.endsWith('.yml')) {
            e.preventDefault();
            const targetPath = resolvePath(currentFilePath, href);
            loadFile(targetPath);
        }
    });

    // Browser Back/Forward
    window.addEventListener('popstate', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const file = urlParams.get('file');
        if (file) {
            loadFile(file, null, false);
        } else {
            // If no file in URL, clear preview? Or keep last?
            // Usually 'back' to root means empty state
            previewEl.innerHTML = '<div class="empty-state">Select a file to preview</div>';
            currentFilePath = '';
            setActiveFile('');
            updateBreadcrumbs('');
        }
    });

    // Initial Load
    const urlParams = new URLSearchParams(window.location.search);
    const initialFile = urlParams.get('file');
    // If no initialFile, do nothing -> Empty State
    return initialFile;
}
