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

function isYamlFile(filename) {
    const name = (filename || '').toLowerCase();
    return name.endsWith('.yaml') || name.endsWith('.yml');
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

export async function renderContent(filename, text) {
    // Determine current directory for relative link resolution
    const parts = filename.split('/');
    parts.pop(); // Remove filename
    window.currentFileDir = parts.join('/');

    // YAML
    if (isYamlFile(filename)) {
        removeMarpStyle();
        renderCodeBlock(text, 'yaml');
        return;
    }

    // Marp
    if (/^---\n[\s\S]*\bmarp:\s*true\b[\s\S]*\n---/.test(text)) {
        await renderMarp(text);
        return;
    }

    // Markdown
    removeMarpStyle();
    previewEl.classList.remove('marp-container');
    await renderMarkdown(text);

    // Generate Table of Contents after rendering
    generateToc(previewEl);
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
            const { Marp } = await import('https://esm.sh/@marp-team/marp-core@4.0.0?bundle');
            marpInstance = new Marp({
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
