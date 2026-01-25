export function escapeHtml(text) {
    return (text || '').toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function log(msg, isError = false) {
    const logEl = document.getElementById('debug-log');
    if (!logEl) {
        console.log(msg); // Fallback if DOM not ready
        return;
    }
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    if (isError) line.style.color = '#ff6b6b';
    logEl.appendChild(line);
    console.log(msg);
}

// Simple path resolver for SPA navigation
export function resolvePath(basePath, relativePath) {
    if (relativePath.startsWith('/')) return relativePath.slice(1); // Absolute from root

    // Default to empty if basePath is null/undefined
    const stack = (basePath || '').split('/');
    // Remove filename to get directory, unless basePath ends with /
    if (basePath && !basePath.endsWith('/')) {
        stack.pop();
    }

    const parts = relativePath.split('/');
    for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') {
            if (stack.length > 0) stack.pop();
        } else {
            stack.push(part);
        }
    }
    return stack.join('/');
}
