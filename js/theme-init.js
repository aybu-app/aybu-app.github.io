(function() {
    try {
        const savedTheme = localStorage.getItem('aybu_theme_v1');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
            document.documentElement.classList.add('dark');
        }
    } catch(e){}
})();
