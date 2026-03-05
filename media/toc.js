export function generateToc(previewEl) {
    const tocNav = document.getElementById('toc-nav');
    const sidebar = document.querySelector('.toc-sidebar');

    if (!tocNav || !sidebar) return;

    // Clear previous ToC
    tocNav.innerHTML = '';

    // Find headers in preview
    const headers = previewEl.querySelectorAll('h1, h2, h3');
    if (headers.length === 0) {
        sidebar.classList.remove('active');
        return;
    }

    sidebar.classList.add('active');

    const ul = document.createElement('ul');

    headers.forEach((header, index) => {
        // Ensure header has an ID
        if (!header.id) {
            // Generate ID from text or fallback to index
            const idText = header.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            header.id = idText || `header-${index}`;
        }

        const li = document.createElement('li');
        const a = document.createElement('a');

        a.textContent = header.textContent;
        a.href = `#${header.id}`;
        a.className = `toc-${header.tagName.toLowerCase()}`;

        // Smooth scroll implementation
        a.onclick = (e) => {
            e.preventDefault();
            header.scrollIntoView({ behavior: 'smooth' });

            // Update URL hash without jumping
            history.pushState(null, null, `#${header.id}`);
        };

        li.appendChild(a);
        ul.appendChild(li);
    });

    tocNav.appendChild(ul);
}

export function generateMarpToc(slides, onSelect) {
    const tocNav = document.getElementById('toc-nav');
    const sidebar = document.querySelector('.toc-sidebar');

    if (!tocNav || !sidebar) return;

    // Clear previous ToC
    tocNav.innerHTML = '';

    if (slides.length === 0) {
        sidebar.classList.remove('active');
        return;
    }

    sidebar.classList.add('active');

    const ul = document.createElement('ul');

    slides.forEach((slide, index) => {
        // Find the first heading (h1, h2, or h3) in the slide
        const header = slide.querySelector('h1, h2, h3');
        const pageNum = index + 1;
        const title = header ? header.textContent : `Slide ${pageNum}`;

        const li = document.createElement('li');
        const a = document.createElement('a');

        a.textContent = `${pageNum}. ${title}`;
        a.href = '#';
        a.className = `toc-${header ? header.tagName.toLowerCase() : 'h1'}`;

        a.onclick = (e) => {
            e.preventDefault();
            onSelect(index);
        };

        li.appendChild(a);
        ul.appendChild(li);
    });

    tocNav.appendChild(ul);
}
