(function () {
    const MENU_URL = 'https://aybu.edu.tr/sks/tr/sayfa/6265/';

    // --- Theme Logic ---
    function initTheme() {
        const saved = localStorage.getItem('aybu_theme_v1');
        const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (saved === 'dark' || (!saved && sysDark)) {
            document.documentElement.classList.add('dark');
        }
    }

    function toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('aybu_theme_v1', isDark ? 'dark' : 'light');
    }

    // --- Date Logic ---
    function initDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('dateDisplay').textContent = now.toLocaleDateString('en-US', options);
    }

    // --- Scraping Logic ---
    async function fetchMenu() {
        const loading = document.getElementById('loading');
        const content = document.getElementById('content');
        const error = document.getElementById('error');

        // Proxies list (Redundancy)
        const proxies = [
            {
                name: 'AllOrigins',
                getUrl: (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
                parse: async (res) => (await res.json()).contents
            },
            {
                name: 'CodeTabs',
                getUrl: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
                parse: (res) => res.text()
            },
            {
                name: 'CorsProxy',
                getUrl: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
                parse: (res) => res.text()
            }
        ];

        let html = null;

        for (const proxy of proxies) {
            try {
                const res = await fetch(proxy.getUrl(MENU_URL));
                if (!res.ok) throw new Error('Status ' + res.status);
                const text = await proxy.parse(res);
                if (text && text.length > 500) {
                    html = text;
                    break;
                }
            } catch (e) { console.warn(proxy.name + ' failed'); }
        }

        if (!html) {
            loading.classList.add('hidden');
            error.classList.remove('hidden');
            return;
        }

        const data = parseHtml(html);
        render(data);
        loading.classList.add('hidden');
    }

    function parseHtml(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const text = doc.body.innerText || "";
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

        const today = new Date();
        if (today.getDay() === 0 || today.getDay() === 6) return { isWeekend: true };

        const daysMap = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
        const todayName = daysMap[today.getDay() - 1];

        let foundWeek = false;
        let capturing = false;
        let items = [];

        // Regex for date range DD.MM.YYYY
        const dateRegex = /(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/;

        for (const line of lines) {
            const match = line.match(dateRegex);
            if (match) {
                const [d1, m1, y1] = match[1].split('.');
                const [d2, m2, y2] = match[2].split('.');
                const start = new Date(`${y1}-${m1}-${d1}`);
                const end = new Date(`${y2}-${m2}-${d2}`);
                end.setHours(23, 59, 59);

                if (today >= start && today <= end) foundWeek = true;
                else foundWeek = false;

                capturing = false;
                continue;
            }

            if (foundWeek) {
                if (daysMap.includes(line)) {
                    capturing = (line === todayName);
                    continue;
                }
                if (capturing) {
                    if (line.includes("HIZLI ERİŞİM") || line.includes("İLETİŞİM") || line.includes("Kalite")) break;
                    items.push(line);
                }
            }
        }

        return { items };
    }

    function render(data) {
        const content = document.getElementById('content');
        const error = document.getElementById('error');

        if (data.isWeekend) {
            content.innerHTML = `<div class="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl text-center border border-amber-100 dark:border-amber-900/50"><i class="fas fa-couch text-amber-400 text-3xl mb-2"></i><h3 class="font-bold text-amber-800 dark:text-amber-200">Weekend</h3><p class="text-xs text-amber-600 dark:text-amber-300">No service today.</p></div>`;
            content.classList.remove('hidden');
            return;
        }

        if (!data.items || data.items.length === 0) {
            error.classList.remove('hidden');
            return;
        }

        let html = '';
        data.items.forEach((item, idx) => {
            let text = item;
            let cal = '';
            const calMatch = item.match(/(\d+)\s*kkal/);
            if (calMatch) {
                text = item.replace(calMatch[0], '').trim();
                cal = calMatch[0];
            }

            // Icons
            let icon = 'fa-circle';
            let color = 'text-slate-300';
            const l = text.toLowerCase();
            if (l.includes('çorba')) { icon = 'fa-mug-hot'; color = 'text-amber-500'; }
            else if (l.includes('pilav') || l.includes('makarna')) { icon = 'fa-bowl-rice'; color = 'text-yellow-500'; }
            else if (l.includes('tavuk') || l.includes('et') || l.includes('köfte') || l.includes('kebab')) { icon = 'fa-drumstick-bite'; color = 'text-rose-500'; }
            else if (l.includes('tatlı') || l.includes('baklava') || l.includes('puding')) { icon = 'fa-cookie'; color = 'text-pink-500'; }
            else if (l.includes('salata') || l.includes('meyve')) { icon = 'fa-leaf'; color = 'text-green-500'; }
            else if (l.includes('yoğurt') || l.includes('ayran')) { icon = 'fa-bottle-water'; color = 'text-blue-400'; }

            html += `
                <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 animate-fade-in-up" style="animation-delay: ${idx * 0.1}s">
                    <div class="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center shrink-0">
                        <i class="fas ${icon} ${color}"></i>
                    </div>
                    <div class="flex-1">
                        <div class="font-bold text-slate-700 dark:text-slate-200 text-sm">${text}</div>
                    </div>
                    ${cal ? `<span class="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-1 rounded-full">${cal}</span>` : ''}
                </div>
            `;
        });

        content.innerHTML = html;
        content.classList.remove('hidden');
    }

    // Init
    document.getElementById('themeToggleBtn').onclick = toggleTheme;
    initTheme();
    initDate();
    fetchMenu();

})();
