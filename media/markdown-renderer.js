import { log, escapeHtml } from './utils.js';
import { initMermaid, getMermaid, fixMermaidForeignObjects } from './mermaid-renderer.js';

const previewEl = document.getElementById('preview');

export async function renderMarkdown(md) {
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
            if (window.currentFileDir) {
                if (src.startsWith('./')) src = src.substring(2);
                if (src.startsWith('/')) {
                    src = `/contents${src}`;
                } else {
                    const parts = window.currentFileDir.split('/').filter(p => p);
                    const srcParts = src.split('/');
                    for (const part of srcParts) {
                        if (part === '..') parts.pop();
                        else if (part !== '.') parts.push(part);
                    }
                    src = '/contents/' + parts.join('/');
                }
            } else {
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
        const mermaid = getMermaid();
        if (!mermaid) {
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
                if (element) {
                    element.innerHTML = svg;
                    fixMermaidForeignObjects(element);
                }
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
