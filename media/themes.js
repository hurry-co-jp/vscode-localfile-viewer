export function initTheme() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTheme = urlParams.get('theme');

    let initialTheme = localStorage.getItem('theme') || 'system';

    // If 'system' is passed or saved, we assume 'dark' or 'light' based on OS preference or simple default
    // Or we handle 'system' string explicitly. For simplicity, we map system -> dark/light here.
    // But user might want explicit system mode. For now, let's treat urlTheme as priority "default" 
    // IF localStorage is not set. But usually localStorage should win for persistence.
    // Wait, the requirement is "Default Theme". So if localStorage is EMPTY, use that.

    if (urlTheme && urlTheme !== 'system') {
        // If config says "dark" and localStorage is empty, use dark.
        if (!localStorage.getItem('theme')) {
            initialTheme = urlTheme;
        }
    }

    if (initialTheme === 'system') {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        initialTheme = isDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', initialTheme);

    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        updateThemeButton(themeBtn, initialTheme);
        themeBtn.onclick = () => {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeButton(themeBtn, newTheme);

            location.reload();
        };
    }
    return initialTheme;
}

function updateThemeButton(btn, theme) {
    btn.innerHTML = theme === 'light' ? '🌙' : '☀️';
    btn.title = theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';
}
