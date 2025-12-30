(function () {
    "use strict";

    // --- 1. CONFIGURATION ---
    const CONFIG = {
        SCHEDULE_FILENAME: 'schedule.xlsx',
        SPLIT_COLUMN_INDEX: 8,
        STORAGE_KEYS: { DATA: 'aybu_data_v48', LANG: 'aybu_lang_v48', THEME: 'aybu_theme_v1' }
    };

    const CONSTANTS = {
        HOLIDAYS: ["holiday", "tatil", "sömestr", "semester", "yarıyıl", "break", "resmi", "ara tatil", "ulusal", "cumhuriyet", "zafer", "emek", "demokrasi"],
        NEW_YEAR: ["yılbaşı", "yilbasi", "new year", "noel", "happy new year", "yeni yıl", "yeniyıl", "yeni yil"],
        EID: ["ramazan", "ramadan", "eid", "bayram", "kurban", "seker", "şeker"],
        CLINICAL: ["clinical skills", "clinical skill", "klinik beceri", "cst", "beceri eğitimi"],
        LAB_EXCLUDES: ["inkılab", "history"]
    };

    const SUBJECT_PALETTE = [
        { border: 'border-l-sky-500 dark:border-l-sky-400', icon: 'text-sky-500 dark:text-sky-400' },
        { border: 'border-l-emerald-500 dark:border-l-emerald-400', icon: 'text-emerald-500 dark:text-emerald-400' },
        { border: 'border-l-indigo-500 dark:border-l-indigo-400', icon: 'text-indigo-500 dark:text-indigo-400' },
        { border: 'border-l-teal-500 dark:border-l-teal-400', icon: 'text-teal-500 dark:text-teal-400' },
        { border: 'border-l-fuchsia-500 dark:border-l-fuchsia-400', icon: 'text-fuchsia-500 dark:text-fuchsia-400' },
    ];

    // --- 2. UTILITIES ---
    const DateUtils = {
        _cachedToday: null,
        normalize: (cellVal) => {
            if (!cellVal) return null;
            if (cellVal instanceof Date) {
                const safeDate = new Date(cellVal.getTime() + (12 * 60 * 60 * 1000));
                return `${safeDate.getUTCFullYear()}-${String(safeDate.getUTCMonth() + 1).padStart(2, '0')}-${String(safeDate.getUTCDate()).padStart(2, '0')}`;
            }
            if (typeof cellVal === 'string') {
                const s = cellVal.trim();
                // STRICT YYYY-MM-DD REGEX check to prevent garbage
                if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
                if (s.includes('T')) {
                    const part = s.split('T')[0];
                    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
                }
            }
            return null;
        },
        parse: (dateStr) => {
            if (!dateStr) return null;
            const parts = dateStr.split('-');
            if (parts.length !== 3) return null;
            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]) - 1;
            const d = parseInt(parts[2]);
            const date = new Date(y, m, d);
            if (isNaN(date.getTime())) return null;
            return date;
        },
        getTodayString: () => {
            if (DateUtils._cachedToday) return DateUtils._cachedToday;
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            DateUtils._cachedToday = `${y}-${m}-${d}`;
            return DateUtils._cachedToday;
        }
    };

    function getSubjectTheme(title) {
        if (!title) return SUBJECT_PALETTE[0];
        let hash = 0;
        for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
        const index = Math.abs(hash) % SUBJECT_PALETTE.length;
        return SUBJECT_PALETTE[index];
    }

    // --- 3. STATE ---
    let workbookData = null;
    let searchIndexes = { EN: [], TR: [] };
    let currentLang = 'EN';
    let viewMode = 'day';

    const TRANSLATIONS = {
        EN: {
            title: "Phase I", subtitle: "AYBU Medicine",
            emptyTitle: "No Classes Found", emptyDesc: "Nothing scheduled.", loading: "Loading Schedule...",
            now: "NOW", lunch: "Lunch Break", freelance: "Freelance / Self Study", today: "Today", tomorrow: "Tomorrow",
            yesterday: "Yesterday", dateNotFound: "Date not found in English section.", weekendTitle: "Weekend Vibes",
            freelanceTitle: "Self-Study Day", holidayTitle: "Semester Break", newYearTitle: "Happy New Year!",
            eidTitle: "Eid Mubarak!", logoText: "P1", badgeLab: "LAB", badgeClinical: "SKILLS",
            fetchError: "Could not auto-load 'schedule.xlsx'.",
            installBannerTitle: "Install App", installBannerDesc: "Get offline access & faster loading",
            installTitle: "Install App 🚀",
            installIOS: "1. Tap the Share icon <i class='fas fa-share-square mx-1'></i><br>2. Scroll down & tap 'Add to Home Screen'",
            installAndroid: "1. Tap menu icon <i class='fas fa-ellipsis-v mx-1'></i><br>2. Tap 'Add to Home Screen' or 'Install App'",
            installClose: "Got it",
            minLeft: "m left", startsIn: "Starts in",
            btnTheme: "Theme", btnMenu: "Menu", btnView: "View", btnSearch: "Search",
            mobileSearch: "Search", mobileMenu: "Menu", mobileView: "View", mobileTheme: "Theme",
            menuTitle: "Dining Menu", menuFetching: "Fetching...", menuOffline: "Menu unavailable offline.", menuOpen: "Open Website",
            searchPlaceholder: "Search entire semester...",
            noResultsTitle: "No matching classes", noResultsDesc: "Try searching for a subject name or room.",
            dayProgress: "Day Progress",
            installAction: "Install",
            themeAuto: "Auto", themeLight: "Light", themeDark: "Dark",
            tooltipToday: "Go to Today", tooltipView: "Switch View"
        },
        TR: {
            title: "Dönem I", subtitle: "AYBÜ Tıp Fakültesi",
            emptyTitle: "Ders Bulunamadı", emptyDesc: "Ders yok.", loading: "Yükleniyor...",
            now: "ŞU AN", lunch: "Öğle Arası", freelance: "Bireysel Çalışma", today: "Bugün", tomorrow: "Yarın",
            yesterday: "Dün", dateNotFound: "Türkçe bölümünde tarih bulunamadı.", weekendTitle: "Hafta Sonu Modu",
            freelanceTitle: "Bireysel Çalışma Günü", holidayTitle: "İyi Tatiller!", newYearTitle: "Mutlu Yıllar!",
            eidTitle: "İyi Bayramlar!", logoText: "D1", badgeLab: "LAB", badgeClinical: "BECERİ",
            fetchError: "'schedule.xlsx' bulunamadı.",
            installBannerTitle: "Uygulamayı Yükle", installBannerDesc: "Çevrimdışı erişim ve hızlı yükleme",
            installTitle: "Uygulamayı Yükle 🚀",
            installIOS: "1. Paylaş simgesine dokunun <i class='fas fa-share-square mx-1'></i><br>2. Aşağı inip 'Ana Ekrana Ekle'yi seçin",
            installAndroid: "1. Menü simgesine dokunun <i class='fas fa-ellipsis-v mx-1'></i><br>2. 'Ana Ekrana Ekle' veya 'Yükle'yi seçin",
            installClose: "Tamam",
            minLeft: "dk kaldı", startsIn: "Başlıyor:",
            btnTheme: "Tema", btnMenu: "Yemek", btnView: "Görünüm", btnSearch: "Ara",
            mobileSearch: "Ara", mobileMenu: "Yemek", mobileView: "Görünüm", mobileTheme: "Tema",
            menuTitle: "Yemek Listesi", menuFetching: "Yükleniyor...", menuOffline: "Menü çevrimdışı kullanılamaz.", menuOpen: "Siteyi Aç",
            searchPlaceholder: "Tüm dönemde ara...",
            noResultsTitle: "Eşleşen ders yok", noResultsDesc: "Ders adı veya sınıf aramayı deneyin.",
            dayProgress: "Gün İlerlemesi",
            installAction: "Yükle",
            themeAuto: "Otomatik", themeLight: "Açık", themeDark: "Koyu",
            tooltipToday: "Bugüne Git", tooltipView: "Görünümü Değiştir"
        }
    };

    const MESSAGES = {
        WEEKEND: { EN: ["It's the weekend! Time to recharge 🔋", "No classes today. Go touch some grass 🌱"], TR: ["Hafta sonu geldi! Şarj olma zamanı 🔋", "Bugün ders yok. Çimlere basma vakti 🌱"] },
        FREELANCE: { EN: ["Focus mode: ON. You got this! 💡", "Library day? Or coffee shop? ☕"], TR: ["Odaklanma modu: AÇIK. Yapabilirsin! 💡", "Kütüphane mi, kafe mi? ☕"] },
        HOLIDAY: { EN: ["Enjoy your holidays! ✈️"], TR: ["Tatilin tadını çıkar! ✈️"] },
        NEW_YEAR: { EN: ["Happy New Year! 🎉"], TR: ["Mutlu Yıllar! 🎉"] },
        EID: { EN: ["Eid Mubarak! 🍬"], TR: ["İyi Bayramlar! 🍬"] }
    };

    // --- 4. INITIALIZATION ---

    document.addEventListener('DOMContentLoaded', () => {
        setupEventListeners();
        initTheme();
        initLang();
        initDate();

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(err => console.log('SW fail', err));
        }
        initMenuSystem();

        setInterval(updateDayProgress, 30000);
        // Auto refresh view every minute to update "X min left"
        setInterval(() => {
            if (viewMode === 'day' && document.getElementById('datePicker').value === DateUtils.getTodayString()) {
                refreshView();
            }
        }, 60000);

        initApp();
        checkInstallBanner();
    });
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
        // Use requestIdleCallback if available for performance
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
            // Don't hide loading here if we want to show error state, 
            // but since it's background fetch, we should probably set error state in DOM
            // so it's ready when user opens.
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
            if (l.includes('çorba')) { icon = 'fa-mug-hot'; color = 'text-amber-500'; }
            else if (l.includes('pilav') || l.includes('makarna')) { icon = 'fa-bowl-rice'; color = 'text-yellow-500'; }
            else if (l.includes('tavuk') || l.includes('et') || l.includes('köfte') || l.includes('kebab')) { icon = 'fa-drumstick-bite'; color = 'text-rose-500'; }
            else if (l.includes('tatlı') || l.includes('baklava') || l.includes('puding') || l.includes('helva')) { icon = 'fa-cookie'; color = 'text-pink-500'; }
            else if (l.includes('salata') || l.includes('meyve') || l.includes('cacık')) { icon = 'fa-leaf'; color = 'text-green-500'; }
            else if (l.includes('yoğurt') || l.includes('ayran')) { icon = 'fa-bottle-water'; color = 'text-blue-400'; }

            const div = document.createElement('div');
            div.className = "bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex items-center gap-4 animate-fade-in-up border border-slate-100 dark:border-slate-700/50 hover:border-blue-100 dark:hover:border-slate-600 transition-all hover:scale-[1.02] duration-300";
            div.style.animationDelay = `${idx * 0.05}s`;
            div.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center shrink-0 shadow-sm">
                    <i class="fas ${icon} ${color}"></i>
                </div>
                <div class="flex-1">
                    <div class="font-bold text-slate-700 dark:text-slate-200 text-sm leading-tight">${text}</div>
                </div>
                ${cal ? `<span class="bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-400 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-600">${cal}</span>` : ''}
            `;
            container.appendChild(div);
        });
        container.classList.remove('hidden');
    }

    function renderMenuMessage(title, sub, icon, iconColor) {
        const container = document.getElementById('menuContent');
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 border-dashed col-span-full animate-fade-in-up">
                <i class="fas ${icon} ${iconColor} text-3xl mb-3"></i>
                <h3 class="font-bold text-slate-700 dark:text-slate-200">${title}</h3>
                <p class="text-xs text-slate-400">${sub}</p>
            </div>`;
        container.classList.remove('hidden');
    }

    function setupEventListeners() {
        document.getElementById('installBanner').onclick = openInstallModal;
        document.getElementById('closeInstallBtn').onclick = (e) => { e.stopPropagation(); closeInstallBanner(); };

        // Header Buttons
        document.getElementById('langToggleBtn').onclick = toggleLanguage;

        const themeBtn = document.getElementById('themeToggleBtn');
        if (themeBtn) themeBtn.onclick = toggleDarkMode;
        const viewBtn = document.getElementById('viewToggleBtn');
        if (viewBtn) viewBtn.onclick = toggleViewMode;
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) searchBtn.onclick = toggleSearch;

        // Mobile Bottom Nav Buttons
        document.getElementById('mobileThemeBtn').onclick = toggleDarkMode;
        document.getElementById('mobileViewBtn').onclick = toggleViewMode;
        document.getElementById('mobileSearchBtn').onclick = toggleSearch;
        // Note: Mobile Menu Btn handled in initMenuSystem

        document.getElementById('prevDayBtn').onclick = () => changeDay(-1);
        document.getElementById('nextDayBtn').onclick = () => changeDay(1);
        document.getElementById('datePicker').addEventListener('change', (e) => {
            const d = DateUtils.parse(e.target.value);
            updateDateDisplay(d);
            document.getElementById('searchContainer').classList.contains('open') ? toggleSearch() : refreshView();
        });
        document.getElementById('searchInput').addEventListener('input', (e) => handleGlobalSearch(e.target.value));
        document.getElementById('closeSearchBtn').onclick = toggleSearch;
        document.getElementById('closeInstallModalBtn').onclick = closeInstallModal;
        document.getElementById('txt-install-close').onclick = closeInstallModal;
        document.getElementById('todayBtn').onclick = goToToday;
    }

    // --- THEME & NAV LOGIC ---
    let themeTooltipTimeout;
    function initTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const apply = () => {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
            const isDark = saved === 'dark' || (!saved && mediaQuery.matches);
            document.documentElement.classList.toggle('dark', isDark);
            updateThemeIcon(saved, false);
        };
        apply();
        mediaQuery.addEventListener('change', () => !localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) && apply());
    }

    function toggleDarkMode() {
        if (navigator.vibrate) navigator.vibrate(5);
        const current = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
        let next = current === null ? 'light' : (current === 'light' ? 'dark' : null);
        if (next) localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, next);
        else localStorage.removeItem(CONFIG.STORAGE_KEYS.THEME);
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const isDark = next === 'dark' || (!next && mediaQuery.matches);
        document.documentElement.classList.toggle('dark', isDark);
        updateThemeIcon(next, true);
    }

    function updateThemeIcon(state, showFeedback = false) {
        // Update Desktop Icon
        const icon = document.getElementById('darkModeIcon');
        const tooltip = document.getElementById('themeTooltip');

        // Update Mobile Icon
        const mobileIcon = document.querySelector('#mobileThemeBtn i');

        let labelKey = 'themeAuto';
        let iconClass = 'fas fa-circle-half-stroke';
        let colorClass = 'text-slate-400 dark:text-slate-500';

        if (state === 'light') {
            iconClass = 'fas fa-sun'; colorClass = 'text-yellow-500'; labelKey = 'themeLight';
        } else if (state === 'dark') {
            iconClass = 'fas fa-moon'; colorClass = 'text-blue-400'; labelKey = 'themeDark';
        }

        if (icon) icon.className = `${iconClass} ${colorClass} text-xs transition-transform duration-500`;
        if (mobileIcon) mobileIcon.className = `${iconClass} text-xl mb-0.5 transition-transform duration-500`;

        if (tooltip) {
            tooltip.textContent = TRANSLATIONS[currentLang][labelKey];
            if (showFeedback) {
                tooltip.classList.remove('opacity-0'); tooltip.classList.add('opacity-100');
                clearTimeout(themeTooltipTimeout);
                themeTooltipTimeout = setTimeout(() => { tooltip.classList.remove('opacity-100'); tooltip.classList.add('opacity-0'); }, 1500);
            } else { tooltip.classList.remove('opacity-100'); tooltip.classList.add('opacity-0'); }
        }
    }

    function initLang() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.LANG);
        setLanguage(saved || 'EN', false);
    }

    function initDate() {
        const now = new Date();
        document.getElementById('datePicker').value = DateUtils.getTodayString();
        updateDateDisplay(now);
        updateDayProgress();
    }

    function checkInstallBanner() {
        if (!window.matchMedia('(display-mode: standalone)').matches && !localStorage.getItem('installBannerDismissed')) {
            document.getElementById('installBanner').classList.remove('hidden');
        }
    }

    function toggleLanguage() {
        if (navigator.vibrate) navigator.vibrate(5);
        const newLang = currentLang === 'EN' ? 'TR' : 'EN';
        setLanguage(newLang);
    }

    function toggleViewMode() {
        if (viewMode === 'search') { viewMode = 'day'; toggleSearch(); return; }

        // Simple transition for view mode
        const wrapper = document.getElementById('mainContentWrapper');
        wrapper.classList.add('opacity-0', 'scale-95');

        setTimeout(() => {
            viewMode = viewMode === 'day' ? 'week' : 'day';
            const iconClass = viewMode === 'day' ? 'fas fa-columns' : 'fas fa-calendar-day';

            const dBtn = document.getElementById('viewToggleBtn');
            if (dBtn) dBtn.querySelector('i').className = `${iconClass} text-xs`;

            const mBtn = document.getElementById('mobileViewBtn');
            if (mBtn) mBtn.querySelector('i').className = `${iconClass} text-xl mb-0.5`;

            const pickerVal = document.getElementById('datePicker').value;
            if (pickerVal) updateDateDisplay(DateUtils.parse(pickerVal));

            refreshView();

            wrapper.classList.remove('opacity-0', 'scale-95');
        }, 200);
    }

    function refreshView() {
        const pickerVal = document.getElementById('datePicker').value;
        if (!pickerVal || !workbookData) return;

        checkTodayFabVisibility(); // Check if FAB should be shown

        document.getElementById('searchResultsContainer').classList.add('hidden');
        document.getElementById('noSearchResults').classList.add('hidden');
        document.getElementById('dateControls').classList.remove('hidden');

        if (viewMode === 'day') {
            document.getElementById('scheduleContainer').classList.remove('hidden');
            document.getElementById('weekContainer').classList.add('hidden');
            document.getElementById('emptyState').classList.add('hidden');
            processSchedule(pickerVal);
        } else if (viewMode === 'week') {
            document.getElementById('scheduleContainer').classList.add('hidden');
            document.getElementById('weekContainer').classList.remove('hidden');
            document.getElementById('emptyState').classList.add('hidden');
            renderWeekView(pickerVal);
        }
    }

    function checkTodayFabVisibility() {
        const pickerVal = document.getElementById('datePicker').value;
        const todayStr = DateUtils.getTodayString();
        const btn = document.getElementById('todayBtn');

        if (pickerVal === todayStr) {
            // Hide FAB if viewing today
            btn.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
        } else {
            // Show FAB if viewing another day
            btn.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
        }
    }

    function toggleSearch() {
        const container = document.getElementById('searchContainer');
        const input = document.getElementById('searchInput');
        container.classList.toggle('open');

        if (container.classList.contains('open')) {
            input.focus();
            viewMode = 'search';
            document.getElementById('scheduleContainer').classList.add('hidden');
            document.getElementById('weekContainer').classList.add('hidden');
            document.getElementById('emptyState').classList.add('hidden');
            document.getElementById('dateControls').classList.add('hidden');
            handleGlobalSearch(input.value);
        } else {
            input.value = '';
            viewMode = 'day';
            document.getElementById('searchResultsContainer').innerHTML = '';
            document.getElementById('searchResultsContainer').classList.add('hidden');
            document.getElementById('noSearchResults').classList.add('hidden');
            refreshView();
            input.blur();
        }
    }

    // --- DATA ENGINE ---

    function buildSearchIndexes() {
        if (!workbookData) return;
        searchIndexes = { EN: [], TR: [] };
        for (let r = 0; r < workbookData.length; r++) {
            const row = workbookData[r];
            for (let c = 0; c < row.length; c++) {
                const dateStr = DateUtils.normalize(row[c]);
                if (dateStr) {
                    const langKey = c <= CONFIG.SPLIT_COLUMN_INDEX ? 'TR' : 'EN';
                    const classes = extractClassesForColumn(r, c, langKey).filter(c => c.type !== 'lunch');
                    if (classes.length > 0) {
                        searchIndexes[langKey].push({ date: dateStr, items: classes });
                    }
                }
            }
        }
    }

    function extractClassesForColumn(dateRowIndex, targetColIndex, langOverride = null) {
        const classes = [];
        const isEnglish = langOverride ? (langOverride === 'EN') : (currentLang === 'EN');

        // PRIORITY: Check known time columns first (1 for TR, 9 for EN)
        let timeColIndex = -1;
        const candidates = isEnglish ? [9, 10, 0, 1] : [1, 0];

        // 1. Check priority columns
        for (let offset = 1; offset <= 4; offset++) {
            const checkRow = workbookData[dateRowIndex + offset];
            if (!checkRow) continue;

            for (const c of candidates) {
                const val = String(checkRow[c] || "").trim();
                // Strict regex
                if (val.match(/^\d{1,2}[:.]\d{2}/)) {
                    timeColIndex = c;
                    break;
                }
            }
            if (timeColIndex !== -1) break;
        }

        // 2. If not found, scan locally (legacy behavior, but safer now)
        if (timeColIndex === -1) {
            for (let offset = 1; offset <= 4; offset++) {
                const checkRow = workbookData[dateRowIndex + offset];
                if (checkRow) {
                    for (let c = targetColIndex; c >= 0; c--) {
                        const val = String(checkRow[c] || "").trim();
                        if (val.match(/^\d{1,2}[:.]\d{2}/)) {
                            timeColIndex = c;
                            break;
                        }
                    }
                }
                if (timeColIndex !== -1) break;
            }
        }

        // Fallback default
        if (timeColIndex === -1) timeColIndex = isEnglish ? 9 : 1;

        let r = dateRowIndex + 1;
        const maxRows = Math.min(workbookData.length, dateRowIndex + 60);

        while (r < maxRows) {
            const row = workbookData[r];
            // Calculate time FIRST to determine if it's a lesson row
            const timeVal = timeColIndex !== -1 ? String(row[timeColIndex]).trim() : "";
            const timeMatch = timeVal.match(/(\d{1,2})[:.](\d{2})/);

            // CRITICAL FIX: Only check for barrier if this is NOT a lesson row (no time).
            // This prevents lessons with "Komite" in the title from being treated as barriers.
            if (!timeMatch) {
                if (isRowBarrier(row)) break;
            }

            if (timeMatch) {
                let timeSlot = `${timeMatch[1]}:${timeMatch[2]}`;
                const hour = parseInt(timeMatch[1]);
                const isLunchTime = (hour === 12 || hour === 13);
                let contentLines = [];
                const cellVal = row[targetColIndex];
                if (cellVal && !isGarbageContent(cellVal)) {
                    const s = String(cellVal).trim();
                    if (s.length > 2) contentLines.push(s);
                }

                let subR = r + 1;
                while (subR < maxRows) {
                    const subRow = workbookData[subR];
                    // Check if next row has time (is next lesson)
                    const nextTime = String(subRow[timeColIndex] || "").trim();
                    if (nextTime.match(/\d{1,2}[:.]\d{2}/)) break;

                    // Check if next row is barrier (only if no time, implicit)
                    if (isRowBarrier(subRow)) break;

                    const nextVal = subRow[targetColIndex];
                    if (nextVal && !isGarbageContent(nextVal)) {
                        const s = String(nextVal).trim();
                        if (s.length > 2 && !contentLines.includes(s)) contentLines.push(s);
                    }
                    subR++;
                }
                r = subR - 1;
                if (contentLines.length > 0) {
                    const rawJoined = contentLines.join(" ");
                    const joinedLower = rawJoined.toLocaleLowerCase('tr-TR');
                    let isLab = rawJoined.toUpperCase().includes("LAB") && !CONSTANTS.LAB_EXCLUDES.some(ex => joinedLower.includes(ex));
                    const isClinical = CONSTANTS.CLINICAL.some(kw => joinedLower.includes(kw));
                    const isFreelance = joinedLower.includes("freelance") || joinedLower.includes("bireysel");
                    const isLunchText = joinedLower.includes("lunch") || joinedLower.includes("öğle arası");

                    let type = 'normal';
                    if (CONSTANTS.NEW_YEAR.some(kw => joinedLower.includes(kw))) type = 'new_year_item';
                    else if (CONSTANTS.EID.some(kw => joinedLower.includes(kw))) type = 'eid_item';
                    else if (CONSTANTS.HOLIDAYS.some(kw => joinedLower.includes(kw))) type = 'holiday_item';
                    else if (isLunchText) type = 'lunch';
                    else if (isFreelance) type = 'freelance';

                    const finalType = type === 'lunch' ? 'lunch' : type;
                    classes.push({ time: timeSlot, lines: finalType === 'lunch' ? [TRANSLATIONS[isEnglish ? 'EN' : 'TR'].lunch] : contentLines, raw: rawJoined, isLab, isClinical, type: finalType });
                } else if (isLunchTime) {
                    classes.push({ time: timeSlot, lines: [TRANSLATIONS[isEnglish ? 'EN' : 'TR'].lunch], raw: "Lunch", isLab: false, isClinical: false, type: 'lunch' });
                }
            }
            r++;
        }

        return classes.filter((cls, index, self) =>
            cls.type !== 'lunch' || index === self.findIndex((t) => t.type === 'lunch')
        );
    }

    // --- SEARCH & RENDERING ---

    let debounceTimer;
    function handleGlobalSearch(query) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const term = query.toLowerCase().trim();
            const container = document.getElementById('searchResultsContainer');
            const noRes = document.getElementById('noSearchResults');

            if (term.length < 2) {
                container.innerHTML = ''; container.classList.add('hidden'); noRes.classList.add('hidden'); return;
            }

            container.classList.remove('hidden'); container.innerHTML = '';

            let count = 0;
            const fragment = document.createDocumentFragment();
            const currentIndex = searchIndexes[currentLang];

            if (currentIndex) {
                for (const day of currentIndex) {
                    const matches = day.items.filter(item => item.raw.toLowerCase().includes(term));
                    if (matches.length > 0) {
                        const dateObj = DateUtils.parse(day.date);
                        if (!dateObj) continue; // Skip invalid dates

                        const dateHeader = document.createElement('div');
                        dateHeader.className = "flex items-center gap-2 mt-6 mb-2 px-2 animate-fade-in-up";
                        dateHeader.innerHTML = `
                            <div class="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">${dateObj.toLocaleDateString(currentLang === 'TR' ? 'tr-TR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            <div class="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                        `;
                        fragment.appendChild(dateHeader);

                        matches.forEach((item, idx) => {
                            const card = document.createElement('div');
                            card.className = "bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer hover:border-blue-300 dark:hover:border-blue-500 transition-all active:scale-[0.98] animate-fade-in-up hover:shadow-md";
                            card.style.animationDelay = `${idx * 0.05}s`;
                            card.onclick = () => jumpToDate(day.date);

                            let highlightClass = "text-slate-800 dark:text-slate-200";
                            if (item.isLab) highlightClass = "text-rose-600 dark:text-rose-400";
                            if (item.isClinical) highlightClass = "text-violet-600 dark:text-violet-400";

                            const line0 = highlightMatch(item.lines[0], term);
                            const line1 = item.lines.length > 1 ? highlightMatch(item.lines[1], term) : '';

                            card.innerHTML = `
                                <div class="flex justify-between items-start">
                                    <div class="flex-1">
                                        <div class="font-bold text-sm ${highlightClass}">${line0}</div>
                                        ${item.lines.length > 1 ? `<div class="text-xs text-slate-500 mt-1">${line1}</div>` : ''}
                                    </div>
                                    <span class="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-lg ml-3">${item.time}</span>
                                </div>
                            `;
                            fragment.appendChild(card);
                            count++;
                        });
                    }
                    if (count >= 50) break;
                }
            }

            container.appendChild(fragment);
            noRes.classList.toggle('hidden', count > 0);
        }, 250);
    }

    function jumpToDate(dateStr) {
        toggleSearch();
        document.getElementById('datePicker').value = dateStr;
        updateDateDisplay(DateUtils.parse(dateStr));
        refreshView();
    }

    // --- APP LOADING ---
    async function initApp() {
        setLoading(true);
        let cachedData = null;

        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.DATA);
            if (stored) {
                cachedData = JSON.parse(stored);
                workbookData = cachedData;
                refreshView();
                setLoading(false);
                setTimeout(() => buildSearchIndexes(), 50);
            }
        } catch (e) { console.error("Cache load error:", e); }

        try {
            const response = await fetch(CONFIG.SCHEDULE_FILENAME + '?v=' + new Date().getTime());
            if (!response.ok) throw new Error("Auto-fetch failed");

            const arrayBuffer = await response.arrayBuffer();
            const waitForXLSX = () => new Promise(resolve => {
                if (window.XLSX) resolve();
                else document.querySelector('script[src*="xlsx"]').addEventListener('load', resolve);
            });
            await waitForXLSX();

            const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            let rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
            const freshData = rawData.map(row => row.map(cell => {
                if (cell instanceof Date) return DateUtils.normalize(cell);
                return cell;
            }));
            const freshString = JSON.stringify(freshData);
            const cachedString = cachedData ? JSON.stringify(cachedData) : "";
            if (freshString !== cachedString) {
                workbookData = freshData;
                localStorage.setItem(CONFIG.STORAGE_KEYS.DATA, freshString);
                completeInit();
            } else if (!cachedData) {
                completeInit();
            }
        } catch (err) {
            console.warn("Fetch failed (Demo Mode):", err);
            try {
                if (!workbookData) {
                    workbookData = generateMockData();
                    completeInit();
                    const toast = document.createElement('div');
                    toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full shadow-lg text-xs font-bold z-50 animate-fade-in-up border border-amber-200 pointer-events-none";
                    toast.innerHTML = "<i class='fas fa-info-circle mr-2'></i>Demo Mode: Using Mock Data";
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 4000);
                }
            } catch (mockErr) {
                console.error("Critical Init Error:", mockErr);
                const loadingEl = document.getElementById('txt-loading');
                if (loadingEl) {
                    loadingEl.innerHTML = `<span class='text-rose-500'>Error: ${mockErr.message}</span><br><span class='text-[9px] opacity-70'>Try: python3 -m http.server</span>`;
                    loadingEl.classList.remove('animate-pulse');
                }
            }
        }
    }

    function completeInit() {
        setLoading(false);
        buildSearchIndexes();
        refreshView();
    }

    function updateDayProgress() {
        const now = new Date();
        const start = new Date(now); start.setHours(8, 30, 0, 0);
        const end = new Date(now); end.setHours(17, 30, 0, 0);
        const total = end - start;
        const current = now - start;

        let percent = 0;
        if (now < start) percent = 0;
        else if (now > end) percent = 100;
        else percent = (current / total) * 100;

        const bar = document.getElementById('dayProgressBar');
        const bead = document.getElementById('progressBead');
        if (bar) {
            bar.classList.remove('animate-pulse');
            bar.style.width = `${percent}%`;
            if (bead) bead.classList.remove('hidden');
        }
    }

    function goToToday() {
        if (navigator.vibrate) navigator.vibrate(5);

        // Animation logic
        const wrapper = document.getElementById('mainContentWrapper');
        wrapper.classList.add('opacity-0', 'translate-y-4');

        setTimeout(() => {
            const todayStr = DateUtils.getTodayString();
            document.getElementById('datePicker').value = todayStr;
            updateDateDisplay(new Date());
            if (viewMode === 'search') toggleSearch();

            refreshView();

            wrapper.classList.remove('opacity-0', 'translate-y-4');
        }, 250);
    }

    function changeDay(offset) {
        if (navigator.vibrate) navigator.vibrate(5);
        const picker = document.getElementById('datePicker');
        if (!picker.value) return;

        if (viewMode === 'search') toggleSearch();

        // Animation Phase 1: Slide Out
        const wrapper = document.getElementById('mainContentWrapper');
        const slideOutClass = offset > 0 ? 'slide-out-left' : 'slide-out-right';
        const slideInClass = offset > 0 ? 'slide-out-right' : 'slide-out-left'; // Prepare for entry

        wrapper.classList.add(slideOutClass);

        setTimeout(() => {
            // Logic Phase
            const currentDate = DateUtils.parse(picker.value);
            const jump = viewMode === 'week' ? (offset * 7) : offset;
            currentDate.setDate(currentDate.getDate() + jump);
            if (viewMode === 'day') {
                while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                    currentDate.setDate(currentDate.getDate() + (offset > 0 ? 1 : -1));
                }
            }
            picker.value = DateUtils.normalize(currentDate);
            updateDateDisplay(currentDate);
            refreshView();

            // Animation Phase 2: Instant Move to Start Position
            wrapper.classList.remove(slideOutClass);
            wrapper.classList.add(slideInClass);

            // Force Reflow
            void wrapper.offsetWidth;

            // Animation Phase 3: Slide In
            wrapper.classList.remove(slideInClass);

        }, 150); // Matches CSS transition duration
    }

    function isRowBarrier(row) {
        if (!row || !Array.isArray(row)) return false;
        for (let i = 0; i < row.length; i++) {
            const val = row[i];
            if (!val) continue;
            if (typeof val === 'string' && val.length > 5) {
                // Date check (YYYY-MM-DD)
                if (val[4] === '-' && val.length === 10) return true;

                const s = val.toLocaleLowerCase('tr-TR').trim();

                // Week/Hafta headers
                if (s === 'week' || s === 'hafta') return true;

                // Committee/Phase headers
                if (s.startsWith('committee') || s.startsWith('komite') || s.startsWith('phase') || s.startsWith('dönem')) {
                    // FIX: Stricter barrier detection.
                    // 1. Length must be short (e.g. "Committee 1" is short, "Committee 1 Assessment Hour" is long)
                    // 2. Should not contain lesson-specific keywords
                    if (s.length < 30 &&
                        !s.includes('saati') &&
                        !s.includes('değerlendirme') &&
                        !s.includes('introduction') &&
                        !s.includes('panel') // Added for Oct 15 issue
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function isGarbageContent(val) {
        if (!val) return false;
        const s = String(val).trim();
        if (s.length === 0 || s.includes("GMT") || /^\d+$/.test(s)) return true;
        if (['mon', 'tue', 'wed', 'thu', 'fri'].some(d => s.toLowerCase().startsWith('(' + d))) return true;
        const lower = s.toLocaleLowerCase('tr-TR');
        // FIX: Removed 'komite'/'committee' from garbage filter
        if (lower === 'week' || lower === 'hafta') return true;
        return false;
    }

    function getClassesForDate(targetDateString) {
        if (!workbookData) return [];
        let dateRowIndex = -1;
        let targetColIndex = -1;
        const isEnglish = currentLang === 'EN';

        outerLoop:
        for (let r = 0; r < workbookData.length; r++) {
            const row = workbookData[r];
            for (let c = 0; c < row.length; c++) {
                if (String(row[c]).trim() === targetDateString) {
                    if ((isEnglish && c > CONFIG.SPLIT_COLUMN_INDEX) || (!isEnglish && c <= CONFIG.SPLIT_COLUMN_INDEX)) {
                        dateRowIndex = r;
                        targetColIndex = c;
                        break outerLoop;
                    }
                }
            }
        }

        if (dateRowIndex === -1) return [];
        return extractClassesForColumn(dateRowIndex, targetColIndex);
    }

    // --- RENDER LOGIC ---

    function processSchedule(targetDateString) {
        const container = document.getElementById('scheduleContainer');
        const emptyState = document.getElementById('emptyState');
        container.innerHTML = '';
        emptyState.classList.add('hidden');

        const dateObj = DateUtils.parse(targetDateString);
        const dayOfWeek = dateObj.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            showEmptyState(TRANSLATIONS[currentLang].weekendTitle, MESSAGES.WEEKEND[currentLang], '<i class="fas fa-couch text-amber-300 animate-bounce-slight"></i>');
            return;
        }

        document.getElementById('emptyIcon').innerHTML = '<i class="fas fa-calendar-times"></i>';
        document.getElementById('txt-empty-title').textContent = TRANSLATIONS[currentLang].emptyTitle;

        const classes = getClassesForDate(targetDateString);

        if (classes.length === 0) {
            showEmptyState(TRANSLATIONS[currentLang].emptyTitle, [TRANSLATIONS[currentLang].emptyDesc], '<i class="fas fa-calendar-check"></i>');
            return;
        }

        const checkType = (type, title, msgs, icon) => {
            if (classes.some(c => c.type === type)) {
                showEmptyState(title, msgs, icon);
                return true;
            }
            return false;
        };

        if (checkType('new_year_item', TRANSLATIONS[currentLang].newYearTitle, MESSAGES.NEW_YEAR[currentLang], '<i class="fas fa-glass-cheers text-pink-400 animate-bounce-slight"></i>')) return;
        if (checkType('eid_item', TRANSLATIONS[currentLang].eidTitle, MESSAGES.EID[currentLang], '<i class="fas fa-moon text-yellow-400 animate-bounce-slight"></i>')) return;
        if (checkType('holiday_item', TRANSLATIONS[currentLang].holidayTitle, MESSAGES.HOLIDAY[currentLang], '<i class="fas fa-umbrella-beach text-cyan-400 animate-bounce-slight"></i>')) return;

        const actualLessons = classes.filter(c => c.type !== 'lunch');
        if (actualLessons.length > 0 && actualLessons.every(c => c.type === 'freelance')) {
            showEmptyState(TRANSLATIONS[currentLang].freelanceTitle, MESSAGES.FREELANCE[currentLang], '<i class="fas fa-laptop-house text-indigo-400 animate-bounce-slight"></i>');
        } else {
            renderClasses(classes, targetDateString);
        }
    }

    function renderWeekView(targetDateString) {
        const container = document.getElementById('weekContainer');
        container.innerHTML = '';

        const dateObj = DateUtils.parse(targetDateString);
        const day = dateObj.getDay();
        const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(dateObj.setDate(diff));
        const fragment = document.createDocumentFragment();
        const todayStr = DateUtils.getTodayString();

        for (let i = 0; i < 5; i++) {
            const currentDay = new Date(monday);
            currentDay.setDate(monday.getDate() + i);
            const dateStr = DateUtils.normalize(currentDay);
            const classes = getClassesForDate(dateStr);

            const col = document.createElement('div');
            col.className = "flex flex-col gap-2 min-h-[200px] animate-fade-in-up";
            col.style.animationDelay = `${i * 0.1}s`;

            const isToday = dateStr === todayStr;
            const headerBg = isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200';

            const locale = currentLang === 'TR' ? 'tr-TR' : 'en-US';
            const dayName = currentDay.toLocaleDateString(locale, { weekday: 'short' });
            const dayNum = currentDay.getDate();

            let colContent = `
                <div class="p-3 rounded-xl ${headerBg} shadow-sm border border-slate-100 dark:border-slate-700 mb-2 text-center sticky top-20 z-10 md:static md:z-auto transition-transform hover:scale-105 duration-300">
                    <div class="text-xs uppercase font-bold opacity-80">${dayName}</div>
                    <div class="text-lg font-bold">${dayNum}</div>
                </div>
            `;

            if (classes.length === 0) {
                colContent += `<div class="text-center text-slate-300 dark:text-slate-600 text-xs py-10 font-bold uppercase tracking-wider">Empty</div>`;
            } else {
                classes.forEach(cls => {
                    let cardClass = "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700";
                    if (['holiday_item', 'new_year_item', 'eid_item'].includes(cls.type)) cardClass = "bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-900/50";
                    else if (cls.isLab) cardClass = "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50";
                    else if (cls.isClinical) cardClass = "bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-900/50";
                    else if (cls.type === 'freelance') cardClass = "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60";
                    else if (cls.type === 'lunch') cardClass = "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 border-dashed opacity-80";
                    else {
                        const theme = getSubjectTheme(cls.lines[0]);
                        cardClass = `bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 border-l-4 ${theme.border}`;
                    }

                    colContent += `
                        <div class="p-3 rounded-xl border ${cardClass} shadow-sm text-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                            <div class="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">${cls.time}</div>
                            <div class="font-bold text-slate-700 dark:text-slate-200 leading-tight line-clamp-3">${cls.lines[0]}</div>
                        </div>
                    `;
                });
            }
            col.innerHTML = colContent;
            fragment.appendChild(col);
        }
        container.appendChild(fragment);
    }

    function renderClasses(classes, targetDateStr) {
        const container = document.getElementById('scheduleContainer');
        const t = TRANSLATIONS[currentLang];
        const fragment = document.createDocumentFragment();

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const isToday = targetDateStr === DateUtils.getTodayString();

        classes.forEach((cls, index) => {
            let isNow = false;
            let isUpcoming = false;
            let timeBadge = '';

            const [h, m] = cls.time.split(':').map(Number);
            const startMins = h * 60 + m;
            const endMins = startMins + 50; // Lesson is 50 minutes

            if (isToday) {
                if (currentMinutes >= startMins && currentMinutes < endMins) {
                    isNow = true;
                    const diff = endMins - currentMinutes;
                    timeBadge = `<span class="opacity-80 font-normal ml-1 border-l border-white/30 pl-1">${diff} ${t.minLeft}</span>`;
                } else if (currentMinutes < startMins && (startMins - currentMinutes) <= 60 && !isUpcoming) {
                    // Find the first upcoming class within 60 mins
                    // Simple check: is this upcoming?
                    const diff = startMins - currentMinutes;
                    isUpcoming = true; // Use this to style if needed, or just add badge
                    timeBadge = `<span class="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-bold px-1.5 py-0.5 rounded ml-2">${t.startsIn} ${diff}m</span>`;
                }
            }

            const isLunch = cls.type === 'lunch';
            const isLast = index === classes.length - 1;
            const card = document.createElement('div');

            card.className = `relative animate-fade-in-up ${isLast ? 'last-item' : ''} mb-0`;
            // Refined stagger for smoother wave
            card.style.animationDelay = `${index * 0.07}s`;

            let circleClass = "bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600";
            let iconClass = "text-slate-300 dark:text-slate-500";
            let icon = "fa-clock";
            let cardBg = "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm hover:border-blue-200 dark:hover:border-blue-700";
            let timeColor = "text-slate-400 dark:text-slate-500";
            let badgeHtml = '';

            if (isNow) {
                circleClass = "bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-900 scale-110 shadow-lg shadow-blue-200/50 dark:shadow-none";
                iconClass = "text-white";
                cardBg = "glow-border shadow-lg transform md:scale-[1.02] border-blue-200 dark:border-blue-800";
                timeColor = "text-blue-600 dark:text-blue-400 font-extrabold scale-110 origin-right transition-transform";
            } else if (isLunch) {
                circleClass = "bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-200 dark:border-amber-800";
                iconClass = "text-amber-500 dark:text-amber-400"; icon = "fa-utensils";
                cardBg = "bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 border-dashed opacity-80";
            } else if (cls.type === 'freelance') {
                circleClass = "bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600";
                iconClass = "text-slate-400 dark:text-slate-500"; icon = "fa-book-reader";
                cardBg = "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 border-dashed opacity-80";
            } else if (cls.isLab) {
                circleClass = "bg-rose-100 dark:bg-rose-900/30 border-2 border-rose-200 dark:border-rose-800";
                iconClass = "text-rose-500 dark:text-rose-400"; icon = "fa-flask";
                cardBg = "bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/30 shadow-md border-l-4 border-l-rose-500 dark:border-l-rose-600";
            } else if (cls.isClinical) {
                circleClass = "bg-violet-100 dark:bg-violet-900/30 border-2 border-violet-200 dark:border-violet-800";
                iconClass = "text-violet-500 dark:text-violet-400"; icon = "fa-stethoscope";
                cardBg = "bg-violet-50/50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-900/30 shadow-md border-l-4 border-l-violet-500 dark:border-l-violet-600";
            } else {
                const theme = getSubjectTheme(cls.lines[0]);
                cardBg = `bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm border-l-4 ${theme.border}`;
                iconClass = theme.icon;
            }

            if (cls.isLab) badgeHtml = `<span class="bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 ml-2 shadow-sm">${t.badgeLab}</span>`;
            else if (cls.isClinical) badgeHtml = `<span class="bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 text-[10px] font-bold px-2 py-0.5 rounded border border-violet-200 dark:border-violet-800 ml-2 shadow-sm">${t.badgeClinical}</span>`;

            if (isNow) {
                badgeHtml += `<span class="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse shadow-sm shadow-blue-200 dark:shadow-none ml-2 inline-flex items-center">${t.now} ${timeBadge}</span>`;
            } else if (isUpcoming && timeBadge) {
                badgeHtml += timeBadge;
            }

            let linesHtml = '';
            cls.lines.forEach((line, idx) => {
                if (isLunch) linesHtml += `<div class="font-bold text-amber-700/80 dark:text-amber-500 text-base leading-tight italic">${line}</div>`;
                else if (cls.type === 'freelance') linesHtml += `<div class="font-medium text-slate-500 dark:text-slate-400 italic text-base">${line}</div>`;
                else {
                    if (idx === 0) linesHtml += `<div class="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight mb-1">${line}</div>`;
                    else if (idx === 1) linesHtml += `<div class="font-medium text-slate-600 dark:text-slate-400 text-sm leading-snug mb-2">${line}</div>`;
                    else linesHtml += `<div class="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs mt-1"><i class="fas fa-user-circle"></i><span>${line}</span></div>`;
                }
            });

            card.innerHTML = `
                <div class="flex flex-row md:grid md:grid-cols-[100px_60px_1fr] md:gap-2">
                    <div class="flex flex-col items-end pt-4 pr-3 w-14 shrink-0 md:w-auto md:pt-6 md:pr-2"><span class="text-xs md:text-xl ${timeColor} font-bold tracking-tight font-mono">${cls.time}</span></div>
                    <div class="relative flex flex-col items-center shrink-0 md:pt-4">
                        <div class="w-12 h-12 rounded-full flex items-center justify-center z-10 ${circleClass} transition-all duration-300 group-hover:scale-110"><i class="fas ${icon} ${iconClass} text-sm"></i></div>
                        <div class="time-connector mobile-connector md:hidden"></div>
                        <div class="time-connector desktop-connector hidden md:block"></div>
                    </div>
                    <div class="flex-1 min-w-0 pl-3 md:pl-0 pb-8 md:pb-6">
                        <div class="p-5 rounded-2xl border ${cardBg} md:hover:scale-[1.01] md:hover:shadow-lg transition-all duration-300 h-full flex flex-col justify-center">
                            <div class="flex justify-between items-center ${badgeHtml ? 'mb-2' : ''} md:mb-1"><div class="flex items-center">${badgeHtml}</div></div>
                            <div>${linesHtml}</div>
                        </div>
                    </div>
                </div>
            `;
            fragment.appendChild(card);
        });
        container.appendChild(fragment);

        setTimeout(() => {
            const active = container.querySelector('.glow-border');
            if (active) active.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }, 600);
    }

    // --- 9. MOCK DATA ---
    function generateMockData() {
        const rows = [];
        const dateRow = new Array(20).fill("");
        const today = new Date();
        for (let i = 0; i < 20; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + (i - 2));
            dateRow[i] = DateUtils.normalize(d);
        }
        rows.push(dateRow);
        for (let i = 0; i < 4; i++) rows.push(new Array(20).fill(""));

        const times = ["08:30", "09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:30"];
        const subjsEN = ["Anatomy", "Histology", "Physiology", "Biochemistry", "Public Health", "Biophysics"];
        const subjsTR = ["Anatomi", "Histoloji", "Fizyoloji", "Biyokimya", "Halk Sağlığı", "Biyofizik"];
        times.forEach(t => {
            const row = new Array(20).fill("");
            row[0] = t; row[9] = t;
            for (let c = 0; c < 20; c++) {
                if (c === 0 || c === 9) continue;
                const dStr = dateRow[c];
                if (dStr) {
                    const d = DateUtils.parse(dStr);
                    if (d && (d.getDay() === 0 || d.getDay() === 6)) continue;
                }
                if (Math.random() > 0.4) {
                    if (t === "12:30" || t === "13:30") row[c] = (c < 8) ? "Öğle Arası" : "Lunch";
                    else {
                        const pool = (c < 8) ? subjsTR : subjsEN;
                        row[c] = pool[Math.floor(Math.random() * pool.length)] + (Math.random() > 0.7 ? " (Lab)" : "");
                    }
                }
            }
            rows.push(row);
        });
        return rows;
    }

    function highlightMatch(text, term) {
        if (!term) return text;
        try {
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escapedTerm})`, 'gi');
            return text.replace(regex, '<span class="bg-yellow-200 dark:bg-yellow-900/60 text-slate-900 dark:text-yellow-100 rounded px-0.5 box-decoration-clone">$1</span>');
        } catch (e) { return text; }
    }

    function showEmptyState(title, messages, iconHtml) {
        const emptyState = document.getElementById('emptyState');
        emptyState.classList.remove('hidden');
        document.getElementById('txt-empty-title').textContent = title;
        document.getElementById('emptyIcon').innerHTML = iconHtml;
        document.getElementById('txt-empty-desc').textContent = Array.isArray(messages) ? messages[Math.floor(Math.random() * messages.length)] : messages;
    }

    function closeInstallModal() { document.getElementById('installModal').classList.add('hidden'); }
    function closeInstallBanner() { document.getElementById('installBanner').classList.add('hidden'); localStorage.setItem('installBannerDismissed', 'true'); }
    function openInstallModal() { document.getElementById('installModal').classList.remove('hidden'); }
    function setLoading(isLoading) { document.getElementById('loadingState').classList.toggle('hidden', !isLoading); }
})();
