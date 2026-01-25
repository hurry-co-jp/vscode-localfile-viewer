import { loadFile } from './router.js';

export function updateBreadcrumbs(filePath) {
    const nav = document.getElementById('breadcrumbs');
    if (!nav) return;

    nav.innerHTML = '';

    // Create Home link
    const homeSpan = document.createElement('span');
    homeSpan.className = 'breadcrumb-item home';
    homeSpan.textContent = 'Home';
    homeSpan.onclick = () => loadFile('index.md');
    nav.appendChild(homeSpan);

    if (!filePath || filePath === 'index.md') return;

    const parts = filePath.split('/');

    parts.forEach((part, index) => {
        // Separator
        const sep = document.createElement('span');
        sep.className = 'breadcrumb-separator';
        sep.textContent = '/';
        nav.appendChild(sep);

        const item = document.createElement('span');
        item.className = 'breadcrumb-item';
        item.textContent = part;

        // Make only the last item (current file) non-interactive usually,
        // but here intermediate folders are just text for now.
        // We could make them clickable if we had folder pages.

        if (index === parts.length - 1) {
            item.classList.add('current');
        }

        nav.appendChild(item);
    });
}
