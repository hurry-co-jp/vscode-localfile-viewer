import { log, escapeHtml } from './utils.js';
import { generateToc } from './toc.js';
import { renderMarp, removeMarpStyle } from './marp-viewer.js';
import { renderMarkdown } from './markdown-renderer.js';

const previewEl = document.getElementById('preview');

function renderCodeBlock(text, language = '') {
    const langClass = language ? ` language - ${language} ` : '';
    previewEl.classList.remove('marp-container');
    previewEl.innerHTML = `< pre > <code class="${langClass.trim()}">${escapeHtml(text)}</code></pre > `;

    try {
        const codeEl = previewEl.querySelector('pre code');
        if (codeEl && window.hljs && typeof window.hljs.highlightElement === 'function') {
            window.hljs.highlightElement(codeEl);
        }
    } catch (e) { /* ignore */ }
}

export async function renderContent(filename, text, group) {
    // Always clean up any previous Marp state
    removeMarpStyle();
    previewEl.classList.remove('marp-container');

    // Determine current directory for relative link resolution
    const parts = filename.split('/');
    parts.pop();
    window.currentFileDir = parts.join('/');

    const ext = filename.split('.').pop().toLowerCase();

    if (group === 'image') {
        previewEl.innerHTML = `< div style = "display: flex; justify-content: center; align-items: center; height: 100%;" >
    <img src="/contents/${filename}" style="max-width: 100%; max-height: 100vh; object-fit: contain;">
    </div>`;
        return;
    }

    if (group === 'media') {
        if (ext === 'pdf') {
            previewEl.innerHTML = `< embed src = "/contents/${filename}" type = "application/pdf" width = "100%" height = "100%" style = "min-height: 90vh;" > `;
        } else if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) {
            previewEl.innerHTML = `< div style = "display: flex; justify-content: center; align-items: center; height: 100%;" >
    <video controls src="/contents/${filename}" style="max-width: 100%; max-height: 100vh;"></video>
            </div > `;
        } else if (['mp3', 'wav'].includes(ext)) {
            previewEl.innerHTML = `< div style = "display: flex; justify-content: center; align-items: center; height: 100%;" >
    <audio controls src="/contents/${filename}"></audio>
            </div > `;
        } else {
            previewEl.innerHTML = `< div style = "padding: 20px;" >
                <p>Cannot preview media type: .${ext}</p>
                <a href="/contents/${filename}" target="_blank">Download / Open in new tab</a>
            </div > `;
        }
        return;
    }

    if (group === 'markdown') {
        const marpRegex = /^---\r?\n[\s\S]*?\bmarp:\s*true\b[\s\S]*?\r?\n---/i;
        if (text && marpRegex.test(text)) {
            await renderMarp(text, filename);
            return;
        }
        await renderMarkdown(text || '');
        generateToc(previewEl);
        return;
    }

    // Default: code / fallback
    const langMap = {
        'js': 'javascript', 'ts': 'typescript', 'py': 'python',
        'html': 'html', 'css': 'css', 'json': 'json', 'sh': 'bash',
        'rs': 'rust', 'go': 'go', 'java': 'java', 'c': 'c', 'cpp': 'cpp',
        'yaml': 'yaml', 'yml': 'yaml'
    };
    renderCodeBlock(text || '', langMap[ext] || ext);
}
