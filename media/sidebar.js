import { log, escapeHtml } from './utils.js';

const fileListEl = document.getElementById('file-list');

export async function loadFileList(onFileClick) {
    try {
        const res = await fetch('/api/files');
        if (!res.ok) throw new Error("Failed to load file list");

        const data = await res.json();
        // Handle both old array format (fallback) and new object format
        const files = Array.isArray(data) ? data : data.files;
        const rootName = data.rootName || "Explorer";

        // Update Header
        const headerEl = document.querySelector('.sidebar-header h2');
        if (headerEl) headerEl.textContent = rootName;

        log(`Loaded ${files.length} files`);
        fileListEl.innerHTML = '';
        const treeRoot = buildFileTree(files);
        renderTree(treeRoot, fileListEl, onFileClick);
    } catch (e) {
        log("Error loading files: " + e.message, true);
        fileListEl.innerHTML = '<li class="file-item error">Error loading files</li>';
    }
}

function buildFileTree(files) {
    const root = {};

    files.forEach(file => {
        const path = file.path;
        const type = file.type;
        const parts = path.split('/');
        let current = root;

        parts.forEach((part, index) => {
            if (!current[part]) {
                const isFile = index === parts.length - 1;
                current[part] = isFile
                    ? { type: 'file', name: part, path: path, fileType: type }
                    : { type: 'folder', name: part, children: {} };
            }
            if (current[part].type === 'folder') {
                current = current[part].children;
            }
        });
    });

    return root;
}

function renderTree(node, container, onFileClick) {
    const entries = Object.values(node);

    // Sort: Folders first, then Files. Alphabetical within.
    entries.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });

    entries.forEach(entry => {
        const li = document.createElement('li');

        if (entry.type === 'folder') {
            li.className = 'folder-item';
            const details = document.createElement('details');
            details.className = 'tree-folder';

            const summary = document.createElement('summary');
            summary.className = 'tree-folder-name';
            summary.innerHTML = `<span class="folder-icon">📁</span> ${escapeHtml(entry.name)}`;
            details.appendChild(summary);

            const ul = document.createElement('ul');
            ul.className = 'tree-list';
            renderTree(entry.children, ul, onFileClick);
            details.appendChild(ul);

            li.appendChild(details);
            container.appendChild(li);
        } else {
            li.className = 'file-item';
            li.textContent = entry.name;
            li.dataset.path = entry.path;
            li.onclick = (e) => {
                e.stopPropagation();
                if (onFileClick) onFileClick(entry.path, li, entry.fileType);
            };
            container.appendChild(li);
        }
    });
}

function renderFileList(files, onFileClick) {
    fileListEl.innerHTML = '';
    const treeRoot = buildFileTree(files);
    renderTree(treeRoot, fileListEl, onFileClick);
}

export function setActiveFile(filename) {
    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));

    // Using dataset to find correct element
    const item = document.querySelector(`.file-item[data-path="${filename}"]`);
    if (item) {
        item.classList.add('active');

        // Expand parents
        let parent = item.closest('details');
        while (parent) {
            parent.open = true;
            parent = parent.parentElement.closest('details');
        }
    }
}
