import { log } from './utils.js';

const previewEl = document.getElementById('preview');
let marpInstance = null;

export function removeMarpStyle() {
    const styleEl = document.getElementById('marp-style');
    if (styleEl) styleEl.remove();
    const nav = document.getElementById('marp-nav');
    if (nav) nav.remove();

    if (previewEl._marpKeyHandler) {
        window.removeEventListener('keydown', previewEl._marpKeyHandler);
        previewEl._marpKeyHandler = null;
    }
    if (previewEl._marpResizeObserver) {
        previewEl._marpResizeObserver.disconnect();
        previewEl._marpResizeObserver = null;
    }
    if (previewEl._marpFullscreenHandler) {
        document.removeEventListener('fullscreenchange', previewEl._marpFullscreenHandler);
        previewEl._marpFullscreenHandler = null;
    }
}

export async function renderMarp(md, filename = 'slide.md') {
    log("Rendering Marp slide deck...");

    // Set document title early so browser/print dialog can pick it up
    const base = filename.split('/').pop().replace(/\.[a-z0-9]+(\.[a-z0-9]+)*$/i, "");
    document.title = base;

    previewEl.innerHTML = '<div class="marp-placeholder">Rendering Slides...</div>';

    try {
        if (!marpInstance) {
            const mod = await import('./libs/marp.bundle.js');
            let MarpClass = mod.Marp || (mod.default && mod.default.Marp) || (mod.default && mod.default.default && mod.default.default.Marp) || mod.default;
            if (!MarpClass || typeof MarpClass !== 'function') {
                throw new Error("Marp class not found");
            }
            marpInstance = new MarpClass({
                html: true,
                markdown: { html: true, breaks: true },
                emoji: { unicode: true }
            });
        }

        const { html, css } = marpInstance.render(md);
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const marpitWrapper = temp.querySelector('.marpit');
        const slides = Array.from(temp.querySelectorAll('svg[data-marpit-svg]'));

        if (slides.length === 0) throw new Error('No slides found in Marp output');

        const total = slides.length;
        let currentIndex = 0;

        previewEl.innerHTML = '';
        previewEl.classList.add('marp-container');

        const shadowHost = document.createElement('div');
        shadowHost.id = 'marp-shadow-host';
        previewEl.appendChild(shadowHost);
        const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

        const styleEl = document.createElement('style');
        styleEl.textContent = css + `
            :host { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; overflow: hidden; }
            .marp-wrapper { width: 1280px; height: 720px; transform-origin: center center; display: flex; align-items: center; justify-content: center; background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.5); flex-shrink: 0; }
            .marpit { width: 100%; height: 100%; }
            svg { width: 100%; height: 100%; display: block; }
            #marp-overview { width: 100%; height: 100%; display: none; overflow-y: auto; padding: 20px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; align-content: flex-start; background: var(--bg-color); }
            #marp-overview.active { display: grid; }
            .marp-thumb { aspect-ratio: 16 / 9; background: #fff; cursor: pointer; border: 2px solid var(--border-color); border-radius: 6px; overflow: hidden; transition: transform 0.2s, border-color 0.2s; position: relative; box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
            .marp-thumb:hover { transform: translateY(-2px); border-color: var(--accent-color); }
            .marp-thumb.active { border-color: var(--accent-color); box-shadow: 0 0 0 2px var(--accent-color); }
            .marp-thumb .marpit { pointer-events: none; transform-origin: top left; width: 1280px; height: 720px; }
            .marp-thumb-num { position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.6); color: #fff; padding: 1px 6px; border-radius: 3px; font-size: 10px; z-index: 10; }
        `;
        shadowRoot.appendChild(styleEl);

        const slideWrapper = document.createElement('div');
        slideWrapper.className = 'marp-wrapper';
        shadowRoot.appendChild(slideWrapper);

        const updateScale = () => {
            const rect = shadowHost.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            const scale = Math.min(rect.width / 1280, rect.height / 720) * 0.98;
            slideWrapper.style.transform = `scale(${scale})`;
        };

        const updateSlide = () => {
            const currentMarpit = marpitWrapper.cloneNode(false);
            currentMarpit.innerHTML = slides[currentIndex].outerHTML;
            slideWrapper.innerHTML = '';
            slideWrapper.appendChild(currentMarpit);
            const counter = document.getElementById('marp-counter');
            if (counter) counter.textContent = `${currentIndex + 1} / ${total}`;
            updateScale();
            const thumbs = shadowRoot.querySelectorAll('.marp-thumb');
            thumbs.forEach((th, i) => th.classList.toggle('active', i === currentIndex));
        };

        const overview = document.createElement('div');
        overview.id = 'marp-overview';
        shadowRoot.appendChild(overview);

        const toggleOverview = () => {
            const isOverview = overview.classList.toggle('active');
            if (isOverview) {
                slideWrapper.style.display = 'none';
                shadowHost.style.aspectRatio = 'auto';
                shadowHost.style.flex = '1';
                shadowHost.style.width = '100%';
                shadowHost.style.maxHeight = 'none';
                overview.innerHTML = '';
                slides.forEach((sl, i) => {
                    const thumb = document.createElement('div');
                    thumb.className = `marp-thumb ${i === currentIndex ? 'active' : ''}`;
                    thumb.innerHTML = `<div class="marp-thumb-num">${i + 1}</div>`;
                    const thumbMarpit = marpitWrapper.cloneNode(false);
                    thumbMarpit.innerHTML = sl.outerHTML;
                    thumbMarpit.style.transform = `scale(${180 / 1280})`;
                    thumbMarpit.style.transformOrigin = 'top left';
                    thumb.appendChild(thumbMarpit);
                    thumb.onclick = () => { currentIndex = i; updateSlide(); toggleOverview(); };
                    overview.appendChild(thumb);
                });
            } else {
                slideWrapper.style.display = 'flex';
                shadowHost.style.aspectRatio = '16 / 9';
                shadowHost.style.flex = 'none';
                shadowHost.style.width = '100%';
                shadowHost.style.maxHeight = 'calc(100% - 60px)';
                updateScale();
            }
        };

        const ro = new ResizeObserver(() => updateScale());
        ro.observe(shadowHost);
        previewEl._marpResizeObserver = ro;

        const nav = document.createElement('div');
        nav.id = 'marp-nav';
        nav.innerHTML = `
            <div class="marp-nav-section left"></div>
            <div class="marp-nav-section center">
                <button id="marp-first" class="marp-nav-btn" title="First Slide">&#9194;</button>
                <button id="marp-prev" class="marp-nav-btn" title="Previous Slide">&#9664;</button>
                <span id="marp-counter" style="cursor:pointer;" title="Toggle Overview">1 / ${total}</span>
                <button id="marp-next" class="marp-nav-btn" title="Next Slide">&#9654;</button>
                <button id="marp-last" class="marp-nav-btn" title="Last Slide">&#9193;</button>
            </div>
            <div class="marp-nav-section right">
                <button id="marp-print-btn" class="marp-nav-btn" title="Save as PDF">&#128190;</button>
                <button id="marp-fullscreen-btn" class="marp-nav-btn" title="Toggle Fullscreen">&#128250;</button>
                <button id="marp-overview-btn" class="marp-nav-btn" title="Slide Sorfer">&#8862;</button>
            </div>
        `;
        previewEl.appendChild(nav);

        document.getElementById('marp-first').addEventListener('click', () => { currentIndex = 0; updateSlide(); });
        document.getElementById('marp-last').addEventListener('click', () => { currentIndex = total - 1; updateSlide(); });
        document.getElementById('marp-prev').addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; updateSlide(); } });
        document.getElementById('marp-next').addEventListener('click', () => { if (currentIndex < total - 1) { currentIndex++; updateSlide(); } });
        document.getElementById('marp-overview-btn').addEventListener('click', toggleOverview);
        document.getElementById('marp-counter').addEventListener('click', toggleOverview);

        const toggleFullscreen = () => {
            const host = document.getElementById('marp-shadow-host');
            if (!document.fullscreenElement) {
                host.requestFullscreen().catch(err => {
                    log(`Error attempting to enable full-screen mode: ${err.message}`, true);
                });
            } else document.exitFullscreen();
        };
        document.getElementById('marp-fullscreen-btn').addEventListener('click', toggleFullscreen);

        const printSlides = () => {
            const host = document.getElementById('marp-shadow-host');
            const originalTitle = document.title;
            const printStyle = document.createElement('style');
            printStyle.id = 'marp-print-style';
            printStyle.textContent = `
                @media print {
                    #marp-shadow-host { display: none !important; }
                    #marp-print-container { display: block !important; }
                }
            `;
            document.head.appendChild(printStyle);

            const printContainer = document.createElement('div');
            printContainer.id = 'marp-print-container';
            printContainer.style.display = 'none';

            const shadowRoot = host.shadowRoot;
            if (shadowRoot) {
                const styles = shadowRoot.querySelectorAll('style');
                styles.forEach(st => printContainer.appendChild(st.cloneNode(true)));
            }

            slides.forEach(sl => {
                const slWrapper = document.createElement('div');
                slWrapper.className = 'marp-print-slide';
                const mWrapper = marpitWrapper.cloneNode(false);
                mWrapper.innerHTML = sl.outerHTML;
                slWrapper.appendChild(mWrapper);
                printContainer.appendChild(slWrapper);
            });
            document.body.appendChild(printContainer);

            setTimeout(() => {
                window.print();
                document.title = originalTitle;
                printStyle.remove();
                printContainer.remove();
            }, 100);
        };
        document.getElementById('marp-print-btn').addEventListener('click', printSlides);

        const onFullscreenChange = () => {
            const isFull = !!document.fullscreenElement;
            const host = document.getElementById('marp-shadow-host');
            if (host) host.classList.toggle('is-fullscreen', isFull);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        previewEl._marpFullscreenHandler = onFullscreenChange;

        const keyHandler = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { if (currentIndex < total - 1) { currentIndex++; updateSlide(); } }
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { if (currentIndex > 0) { currentIndex--; updateSlide(); } }
        };
        window.addEventListener('keydown', keyHandler);
        previewEl._marpKeyHandler = keyHandler;

        updateSlide();

        const { generateMarpToc } = await import('./toc.js');
        generateMarpToc(slides, (index) => { currentIndex = index; updateSlide(); });

        log('Marp slide viewer ready.');
    } catch (e) {
        log(`Marp render error: ${e.message}`, true);
        console.error("Marp Detailed Error:", e);
        previewEl.innerHTML = `<div class="error-box">Marp Error: ${e.message}</div>`;
    }
}
