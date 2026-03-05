import { log } from './utils.js';

let mermaid = null;

// Initialize Mermaid (lazy load)
export async function initMermaid() {
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

// Fix foreignObject height clipping in Mermaid SVGs
export function fixMermaidForeignObjects(container) {
    const foreignObjects = container.querySelectorAll('foreignObject');
    foreignObjects.forEach(fo => {
        // Get the inner div content
        const innerDiv = fo.querySelector('div');
        if (innerDiv) {
            // Measure actual content height
            const contentHeight = innerDiv.scrollHeight || innerDiv.offsetHeight;
            const currentHeight = parseFloat(fo.getAttribute('height')) || 0;

            // If content is taller than container, adjust
            if (contentHeight > currentHeight) {
                fo.setAttribute('height', contentHeight + 10); // Add padding
            }
        }
    });
}

export function getMermaid() {
    return mermaid;
}
