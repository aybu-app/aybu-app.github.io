"use strict";

// --- MENU SYSTEM INTEGRATION ---
const MENU_CONFIG = {
    URL: 'https://aybu.edu.tr/sks/tr/sayfa/6265/',
    PROXIES: [
        { get: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`, parse: async (r) => (await r.json()).contents },
        { get: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`, parse: (r) => r.text() },
        { get: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`, parse: (r) => r.text() }
    ]
};

function initMenuSystem() {
    const modal = document.getElementById('menuModal');
    const btn = document.getElementById('openMenuBtn');
    const mobileBtn = document.getElementById('mobileMenuBtn'); // Add mobile button
    const closeBtn = document.getElementById('closeMenuBtn');

    if (!modal) return;

    const openMenu = () => {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        fetchMenuData();
    };

    if (btn) btn.onclick = openMenu;
    if (mobileBtn) mobileBtn.onclick = openMenu; // Bind mobile button

    const closeMenu = () => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    };

    if (closeBtn) closeBtn.onclick = closeMenu;
    modal.onclick = (e) => { if (e.target === modal) closeMenu(); };

    // Background Fetch Strategy
    // Trigger fetch shortly after load to populate cache/DOM
    const bgFetch = () => setTimeout(fetchMenuData, 1500);
    if (window.requestIdleCallback) window.requestIdleCallback(bgFetch);
    else bgFetch();
}

const MENU_CACHE_KEY = 'aybu_menu_cache_v2';

async function fetchMenuData() {
    const container = document.getElementById('menuContent');
    const loading = document.getElementById('menuLoading');
    const error = document.getElementById('menuError');

    const todayStr = new Date().toDateString();
    try {
        const cached = JSON.parse(localStorage.getItem(MENU_CACHE_KEY));
        if (cached && cached.date === todayStr && cached.html) {
            processMenuHtml(cached.html);
            loading.classList.add('hidden');
            return;
        }
    } catch (e) { console.log('Cache parse error'); }

    if (container.children.length > 0) return;

    loading.classList.remove('hidden');
    error.classList.add('hidden');

    const promises = MENU_CONFIG.PROXIES.map(proxy =>
        new Promise(async (resolve, reject) => {
            try {
                const res = await fetch(proxy.get(MENU_CONFIG.URL));
                if (!res.ok) throw new Error('Status ' + res.status);
                const text = await proxy.parse(res);
                if (text && text.length > 500) resolve(text);
                else reject('Empty/Short content');
            } catch (e) {
                reject(e);
            }
        })
    );

    try {
        const html = await Promise.any(promises);
        localStorage.setItem(MENU_CACHE_KEY, JSON.stringify({
            date: todayStr,
            html: html
        }));
        processMenuHtml(html);
        loading.classList.add('hidden'); // Hide loading on success
    } catch (aggregateError) {
        console.error("All proxies failed", aggregateError);
        loading.classList.add('hidden');
        error.classList.remove('hidden');
    }
}

function processMenuHtml(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const text = doc.body.innerText || "";
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    const today = new Date();
    const dateDisplay = document.getElementById('menuDateDisplay');
    if (dateDisplay) {
        dateDisplay.textContent = today.toLocaleDateString(currentLang === 'TR' ? 'tr-TR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    if (today.getDay() === 0 || today.getDay() === 6) {
        renderMenuMessage("Weekend Mode", "No service today.", "fa-couch", "text-amber-400");
        return;
    }

    const daysMap = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    const todayName = daysMap[today.getDay() - 1];

    let foundWeek = false;
    let capturing = false;
    let items = [];

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

    renderMenuItems(items);
}

function renderMenuItems(items) {
    const container = document.getElementById('menuContent');
    container.innerHTML = '';

    if (!items || items.length === 0) {
        renderMenuMessage("Menu Not Found", "Could not parse today's menu.", "fa-search", "text-slate-300");
        return;
    }

    items.forEach((item, idx) => {
        let text = item;
        let cal = '';
        const calMatch = item.match(/(\d+)\s*kkal/);
        if (calMatch) {
            text = item.replace(calMatch[0], '').trim();
            cal = calMatch[0];
        }

        let icon = 'fa-circle';
        let color = 'text-slate-300 dark:text-slate-600';
        const l = text.toLowerCase();

        for (const k of MENU_KEYWORDS) {
            if (k.keys.some(key => l.includes(key))) {
                icon = k.icon;
                color = k.color;
                break;
            }
        }

        const div = document.createElement('div');
        div.className = "glass-panel p-4 rounded-2xl flex items-center gap-4 animate-fade-in-up border border-white/60 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all hover:scale-[1.02] duration-300 shadow-sm";
        div.style.animationDelay = `${idx * 0.05}s`;
        div.innerHTML = `
            <div class="w-10 h-10 rounded-full bg-white/50 dark:bg-slate-800/50 flex items-center justify-center shrink-0 shadow-inner backdrop-blur-sm">
                <i class="fas ${icon} ${color}"></i>
            </div>
            <div class="flex-1">
                <div class="font-bold text-main text-sm leading-tight">${text}</div>
            </div>
            ${cal ? `<span class="bg-white/50 dark:bg-slate-700/50 text-muted text-[10px] font-bold px-2 py-1 rounded-lg border border-white/40 dark:border-slate-600 shadow-sm">${cal}</span>` : ''}
        `;
        container.appendChild(div);
    });
    container.classList.remove('hidden');
}

function renderMenuMessage(title, sub, icon, iconColor) {
    const container = document.getElementById('menuContent');
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 text-center glass-panel rounded-2xl border border-dashed border-white/60 dark:border-slate-700 col-span-full animate-fade-in-up">
            <i class="fas ${icon} ${iconColor} text-3xl mb-3 opacity-80"></i>
            <h3 class="font-bold text-main">${title}</h3>
            <p class="text-xs text-muted">${sub}</p>
        </div>`;
    container.classList.remove('hidden');
}
