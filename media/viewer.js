import { log, escapeHtml } from './utils.js';
import { generateToc } from './toc.js';

const previewEl = document.getElementById('preview');
let marpInstance = null;
let mermaid = null;

// Initialize Mermaid (lazy load)
async function initMermaid() {
    if (mermaid) return mermaid;
    try {
        const module = await import('./libs/mermaid.esm.min.mjs');
        mermaid = module.default;
        mermaid.initialize({
            startOnLoad: false,
            theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark',
            securityLevel: 'loose',
            flowchart: { useMaxWidth: false, htmlLabels: true },
            sequence: { useMaxWidth: false },
            gantt: { useMaxWidth: false }
        });
        return mermaid;
    } catch (e) {
        log("Failed to load Mermaid: " + e.message, true);
        return null;
    }
}



function renderCodeBlock(text, language = '') {
    const langClass = language ? ` language-${language}` : '';
    previewEl.classList.remove('marp-container');
    previewEl.innerHTML = `<pre><code class="${langClass.trim()}">${escapeHtml(text)}</code></pre>`;

    // Highlight JS
    try {
        const codeEl = previewEl.querySelector('pre code');
        if (codeEl && window.hljs && typeof window.hljs.highlightElement === 'function') {
            window.hljs.highlightElement(codeEl);
        }
    } catch (e) { /* ignore */ }
}

export async function renderContent(filename, text, group) { // group: 'markdown'|'code'|'image'|'media'
    // Determine current directory for relative link resolution
    const parts = filename.split('/');
    parts.pop(); // Remove filename
    window.currentFileDir = parts.join('/');

    // Determine file extension for specific tag generation (in media) or highlighting (in code)
    const ext = filename.split('.').pop().toLowerCase();

    if (group === 'image') {
        removeMarpStyle();
        previewEl.classList.remove('marp-container');
        previewEl.innerHTML = `<div style="display: flex; justify-content: center; align-items: center; height: 100%;">
            <img src="/contents/${filename}" style="max-width: 100%; max-height: 100vh; object-fit: contain;">
        </div>`;
        return;
    }

    if (group === 'media') {
        removeMarpStyle();
        previewEl.classList.remove('marp-container');

        if (ext === 'pdf') {
            previewEl.innerHTML = `<embed src="/contents/${filename}" type="application/pdf" width="100%" height="100%" style="min-height: 90vh;">`;
        } else if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) {
            previewEl.innerHTML = `<div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                <video controls src="/contents/${filename}" style="max-width: 100%; max-height: 100vh;"></video>
            </div>`;
        } else if (['mp3', 'wav'].includes(ext)) {
            previewEl.innerHTML = `<div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                <audio controls src="/contents/${filename}"></audio>
            </div>`;
        } else {
            // Fallback for unknown media
            previewEl.innerHTML = `<div style="padding: 20px;">
                <p>Cannot preview media type: .${ext}</p>
                <a href="/contents/${filename}" target="_blank">Download / Open in new tab</a>
            </div>`;
        }
        return;
    }

    if (group === 'markdown') {
        // Check for Marp
        if (text && /^---\n[\s\S]*\bmarp:\s*true\b[\s\S]*\n---/.test(text)) {
            await renderMarp(text);
            return;
        }

        removeMarpStyle();
        previewEl.classList.remove('marp-container');
        await renderMarkdown(text || '');
        generateToc(previewEl);
        return;

    }
    // Default to 'code' (or fallback)
    removeMarpStyle();

    // Simple extension to language mapping for library
    const langMap = {
        'js': 'javascript', 'ts': 'typescript', 'py': 'python',
        'html': 'html', 'css': 'css', 'json': 'json', 'sh': 'bash',
        'rs': 'rust', 'go': 'go', 'java': 'java', 'c': 'c', 'cpp': 'cpp',
        'yaml': 'yaml', 'yml': 'yaml'
    };
    renderCodeBlock(text || '', langMap[ext] || ext);
}



function removeMarpStyle() {
    const styleEl = document.getElementById('marp-style');
    if (styleEl) styleEl.remove();
}

async function renderMarp(md) {
    log("Detected Marp slide deck. Rendering with Marp Core...");
    previewEl.innerHTML = '<div class="marp-placeholder">Rendering Slides...</div>';

    try {
        if (!marpInstance) {
            const mod = await import('./libs/marp.bundle.js');
            // Handle CJS/ESM interop: might be default export or named, or default.Marp
            const MarpClass = mod.Marp || (mod.default && mod.default.Marp) || mod.default;

            if (!MarpClass || typeof MarpClass !== 'function') {
                throw new Error("Marp class not found in bundle");
            }
            marpInstance = new MarpClass({
                html: true,
                markdown: { html: true, breaks: true }
            });
        }

        const { html, css } = marpInstance.render(md);

        // Inject Style
        let styleEl = document.getElementById('marp-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'marp-style';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = css;

        previewEl.classList.add('marp-container');
        previewEl.innerHTML = html;
        log("Marp slides rendered successfully.");

    } catch (e) {
        log(`Marp render error: ${e.message}`, true);
        previewEl.innerHTML = `<div class="error-box">Marp Error: ${e.message}</div>`;
    }
}

async function renderMarkdown(md) {
    log("Starting markdown render...");
    const renderer = new marked.Renderer();
    let mermaidIndex = 0;
    const mermaidGraphs = [];

    renderer.code = (code, language) => {
        const codeStr = (code || '').toString();
        const langStr = (language || '').toString();

        // Mermaid Detection
        const isMermaidContent = /^(graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|flowchart)\b/.test(codeStr.trim());
        const isMermaidLang = langStr === 'mermaid' || langStr.startsWith('mermaid ');

        if (isMermaidLang || (!langStr && isMermaidContent)) {
            const id = `mermaid-${mermaidIndex++}`;
            mermaidGraphs.push({ id, code: codeStr });
            return `<div id="${id}" class="mermaid-placeholder">Loading diagram...</div>`;
        }

        const escaped = escapeHtml(codeStr);
        const langClass = langStr ? ` class="language-${langStr}"` : '';
        return `<pre><code${langClass}>${escaped}</code></pre>`;
    };

    renderer.image = (href, title, text) => {
        let src = href;
        if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('//')) {
            // It's a local path.
            // We need to resolve it relative to the current file being viewed.
            // However, the current URL is http://localhost:PORT/.
            // The file content was fetched from /contents/path/to/file.md.

            // To properly resolve, we need to know the current directory of the markdown file.
            // But right now `renderContent` receives just (filename, text).
            // `filename` is the relative path from Content Root, e.g. "docs/readme.md".

            // So we can construct the image path:
            // "docs/images/foo.png" => "/contents/docs/images/foo.png"

            if (window.currentFileDir) {
                // Clean up leading ./
                if (src.startsWith('./')) src = src.substring(2);

                // If starts with /, it might mean root of workspace? 
                // Usually in MD, / means root. So /contents/src.
                if (src.startsWith('/')) {
                    src = `/contents${src}`;
                } else {
                    // Relative join
                    // Simple path join implementation
                    const parts = window.currentFileDir.split('/').filter(p => p);
                    const srcParts = src.split('/');

                    for (const part of srcParts) {
                        if (part === '..') parts.pop();
                        else if (part !== '.') parts.push(part);
                    }
                    src = '/contents/' + parts.join('/');
                }
            } else {
                // Fallback if we don't know the dir (shouldn't happen if we set it)
                if (!src.startsWith('/')) src = '/contents/' + src;
            }
        }

        const titleAttr = title ? ` title="${title}"` : '';
        return `<img src="${src}" alt="${text}"${titleAttr}>`;
    };

    marked.setOptions({ renderer });

    const parsed = await marked.parse(md);
    previewEl.innerHTML = parsed;

    // Render Mermaid
    if (mermaidGraphs.length > 0) {
        await initMermaid();
        if (!mermaid) {
            // Fallback if load failed
            mermaidGraphs.forEach(g => {
                const el = document.getElementById(g.id);
                if (el) el.innerHTML = `<div class="error-box">Mermaid failed to load (Check network).</div>`;
            });
            return;
        }

        for (const graph of mermaidGraphs) {
            try {
                const { svg } = await mermaid.render(`svg-${graph.id}`, graph.code);
                const element = document.getElementById(graph.id);
                if (element) element.innerHTML = svg;
            } catch (error) {
                log(`Mermaid error for ${graph.id}: ${error.message}`, true);
                const element = document.getElementById(graph.id);
                if (element) {
                    element.innerHTML = `<div class="error-box" style="border:1px solid red; padding:10px;">
                        <strong>Mermaid Error:</strong><br>${error.message}
                        <pre>${escapeHtml(graph.code)}</pre>
                    </div>`;
                }
            }
        }
    }
}
