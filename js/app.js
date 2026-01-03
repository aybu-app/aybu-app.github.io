"use strict";

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
        if (!workbookData) {
            workbookData = generateMockData();
            completeInit();
            const toast = document.createElement('div');
            toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full shadow-lg text-xs font-bold z-50 animate-fade-in-up border border-amber-200 pointer-events-none";
            toast.innerHTML = "<i class='fas fa-info-circle mr-2'></i>Demo Mode: Using Mock Data";
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
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

function setLanguage(lang, shouldProcess = true) {
    currentLang = lang;
    localStorage.setItem(CONFIG.STORAGE_KEYS.LANG, lang);
    const trBtn = document.getElementById('lang-tr');
    const enBtn = document.getElementById('lang-en');
    const active = "px-1.5 md:px-2.5 py-1 rounded-md text-[10px] font-bold bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm transition-all";
    const inactive = "px-1.5 md:px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-400 dark:text-slate-500 transition-all hover:text-slate-600 dark:hover:text-slate-300";

    if (lang === 'EN') { enBtn.className = active; trBtn.className = inactive; }
    else { trBtn.className = active.replace('text-blue-600', 'text-red-600 dark:text-red-400'); enBtn.className = inactive; }

    const t = TRANSLATIONS[lang];
    ['txt-title', 'txt-subtitle', 'txt-loading', 'txt-install-banner-title', 'txt-install-banner-desc', 'txt-install-title', 'txt-install-close',
        'txt-btn-theme', 'txt-btn-menu', 'txt-btn-view', 'txt-btn-search',
        'txt-mobile-search', 'txt-mobile-menu', 'txt-mobile-view', 'txt-mobile-theme',
        'txt-menu-title', 'txt-menu-fetching', 'txt-menu-offline', 'txt-menu-open',
        'txt-no-results-title', 'txt-no-results-desc', 'txt-day-progress', 'txt-install-action'].forEach(id => {
            const el = document.getElementById(id);
            const key = id.replace('txt-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            if (el) {
                if (t[key]) el.textContent = t[key];
                else if (t[id.replace('txt-', '')]) el.textContent = t[id.replace('txt-', '')];
            }
        });
    document.getElementById('phase-icon').textContent = t.logoText;
    document.getElementById('txt-install-ios').innerHTML = t.installIOS;
    document.getElementById('txt-install-android').innerHTML = t.installAndroid;
    document.getElementById('searchInput').placeholder = t.searchPlaceholder;
    document.getElementById('todayBtn').title = t.tooltipToday;
    document.getElementById('viewToggleBtn').title = t.tooltipView;

    const currentTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
    updateThemeIcon(currentTheme || 'auto', false);

    const pickerDate = document.getElementById('datePicker').value;
    if (pickerDate) updateDateDisplay(DateUtils.parse(pickerDate));
    if (shouldProcess && workbookData) refreshView();
}

function updateDateDisplay(dateObj) {
    const displayEl = document.getElementById('dateDisplay');

    if (viewMode === 'week') {
        const current = new Date(dateObj);
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(current);
        monday.setDate(diff);

        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);

        const locale = currentLang === 'TR' ? 'tr-TR' : 'en-US';
        const startStr = monday.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
        const endStr = friday.toLocaleDateString(locale, { month: 'short', day: 'numeric' });

        displayEl.innerHTML = `<span class="text-sm font-bold text-slate-700 dark:text-slate-200">${startStr} - ${endStr}</span>`;
        return;
    }

    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

    const dStr = dateObj.toDateString();
    const locale = currentLang === 'TR' ? 'tr-TR' : 'en-US';
    const datePart = dateObj.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });

    let label = null;
    if (dStr === today.toDateString()) label = TRANSLATIONS[currentLang].today;
    else if (dStr === tomorrow.toDateString()) label = TRANSLATIONS[currentLang].tomorrow;
    else if (dStr === yesterday.toDateString()) label = TRANSLATIONS[currentLang].yesterday;

    if (label) {
        displayEl.innerHTML = `<div class="flex flex-col items-center leading-none animate-fade-in-up"><span class="text-[9px] text-blue-400 dark:text-blue-300 font-bold uppercase tracking-widest mb-0.5">${label}</span><span class="text-sm font-bold text-slate-800 dark:text-slate-200">${datePart}</span></div>`;
    } else {
        displayEl.innerHTML = `<span class="text-sm font-bold text-slate-700 dark:text-slate-200 animate-fade-in-up">${datePart}</span>`;
    }
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
        const headerBg = isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur text-slate-700 dark:text-slate-200';

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
                let cardClass = "bg-white/80 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700 backdrop-blur-sm";

                if (STYLE_CONFIG.HOLIDAY.keywords.includes(cls.type)) cardClass = STYLE_CONFIG.HOLIDAY.classes;
                else if (cls.isLab) cardClass = STYLE_CONFIG.LAB.classes;
                else if (cls.isClinical) cardClass = STYLE_CONFIG.CLINICAL.classes;
                else if (cls.type === 'freelance') cardClass = STYLE_CONFIG.FREELANCE.classes;
                else if (cls.type === 'lunch') cardClass = STYLE_CONFIG.LUNCH.classes;
                else {
                    const theme = getSubjectTheme(cls.lines[0]);
                    if (theme.bg) cardClass = `${theme.bg} dark:bg-opacity-10 border-slate-100 dark:border-slate-700 border-l-4 ${theme.border}`;
                    else cardClass = `bg-white/80 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700 border-l-4 ${theme.border}`;
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
                timeBadge = `<span class="opacity-80 font-normal ml-1 border-l border-white/30 pl-1 text-[10px] tracking-wide">${diff} ${t.minLeft}</span>`;
            } else if (currentMinutes < startMins && (startMins - currentMinutes) <= 60 && !isUpcoming) {
                const diff = startMins - currentMinutes;
                isUpcoming = true;
                timeBadge = `<span class="bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ml-2 border border-indigo-100 dark:border-indigo-500/30">${t.startsIn} ${diff}m</span>`;
            }
        }

        const isLunch = cls.type === 'lunch';
        const isLast = index === classes.length - 1;
        const card = document.createElement('div');

        card.className = `relative animate-fade-in-up ${isLast ? 'last-item' : ''} mb-0`;
        card.style.animationDelay = `${index * 0.05}s`;

        // Default Icon Circle (Glassy)
        let circleClass = "bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700 shadow-sm z-20 relative";
        let iconClass = "text-slate-300 dark:text-slate-500";
        let icon = "fa-clock";

        // Default Card (Glassy)
        let cardBg = "bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/50 dark:border-slate-700/50 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-slate-600 transition-all duration-300";
        let timeColor = "text-slate-400 dark:text-slate-500";
        let badgeHtml = '';

        if (isNow) {
            circleClass = "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/40 border-2 border-white dark:border-slate-800 scale-125 z-30";
            iconClass = "text-white animate-pulse";
            cardBg = "glow-border bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-blue-200 dark:border-blue-500/30 shadow-xl transform md:scale-[1.03]";
            timeColor = "text-blue-600 dark:text-blue-400 font-black scale-105 origin-right transition-transform";
        } else if (isLunch) {
            circleClass = "bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/50";
            iconClass = "text-amber-400 dark:text-amber-500"; icon = "fa-utensils";
            cardBg = "bg-amber-50/40 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 border-dashed";
        } else if (cls.type === 'freelance') {
            circleClass = "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700";
            iconClass = "text-slate-300 dark:text-slate-600"; icon = "fa-book-open";
            cardBg = "bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800 border-dashed opacity-75 grayscale-[0.5] hover:grayscale-0 hover:opacity-100";
        } else if (cls.isLab) {
            circleClass = "bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800";
            iconClass = "text-rose-500 dark:text-rose-400"; icon = "fa-flask";
            cardBg = "bg-rose-50/30 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30";
        } else if (cls.isClinical) {
            circleClass = "bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800";
            iconClass = "text-violet-500 dark:text-violet-400"; icon = "fa-heart-pulse";
            cardBg = "bg-violet-50/30 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30";
        } else {
            const theme = getSubjectTheme(cls.lines[0]);
            // Use subtle colored backgrounds for normal classes too
            if (theme.bg) cardBg = `${theme.bg} dark:bg-opacity-10 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 backdrop-blur-sm shadow-sm transition-all`;
            else cardBg = `bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 backdrop-blur-sm shadow-sm hover:border-slate-300 transition-all`;

            // Icon color from palette
            if (theme.icon) {
                // Parse the color from the class (e.g., text-sky-500) to apply to circle bg lightly
                // Simplified: just use white/dark circle, icon has color
                iconClass = theme.icon;
            }
        }

        // --- BADGES (New Pill Design) ---
        const badgeBase = "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-sm border ml-2";

        if (cls.isLab) badgeHtml = `<span class="${badgeBase} bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30"><span class="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse"></span>${t.badgeLab}</span>`;
        else if (cls.isClinical) badgeHtml = `<span class="${badgeBase} bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30"><span class="w-1.5 h-1.5 rounded-full bg-violet-500 mr-1.5 animate-pulse"></span>${t.badgeClinical}</span>`;

        if (isNow) {
            badgeHtml += `<span class="${badgeBase} bg-blue-600 text-white border-blue-500 shadow-blue-500/30"><i class="fas fa-play text-[8px] mr-1.5"></i>${t.now} ${timeBadge}</span>`;
        } else if (isUpcoming && timeBadge) {
            badgeHtml += timeBadge;
        }

        // --- CONTENT LINES ---
        let linesHtml = '';
        cls.lines.forEach((line, idx) => {
            if (isLunch) linesHtml += `<div class="font-bold text-amber-600/80 dark:text-amber-500/80 text-sm italic tracking-wide">${line}</div>`;
            else if (cls.type === 'freelance') linesHtml += `<div class="font-medium text-slate-400 dark:text-slate-500 italic text-sm">${line}</div>`;
            else {
                if (idx === 0) linesHtml += `<div class="font-extrabold text-slate-800 dark:text-slate-100 text-[17px] leading-tight mb-1 tracking-tight">${line}</div>`;
                else if (idx === 1) linesHtml += `<div class="font-semibold text-slate-500 dark:text-slate-400 text-xs leading-snug mb-2 uppercase tracking-wide opacity-80">${line}</div>`;
                else linesHtml += `<div class="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[11px] font-medium mt-1 bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded w-fit"><i class="fas fa-user-circle text-xs opacity-70"></i><span>${line}</span></div>`;
            }
        });

        card.innerHTML = `
            <div class="flex flex-row md:grid md:grid-cols-[80px_48px_1fr] md:gap-4 group">
                <!-- Time Column -->
                <div class="flex flex-col items-end pt-5 pr-2 w-14 shrink-0 md:w-auto md:pt-6">
                    <span class="text-sm md:text-lg ${timeColor} font-bold tracking-tighter font-mono transition-colors duration-300">${cls.time}</span>
                </div>
                
                <!-- Timeline Axis -->
                <div class="relative flex flex-col items-center shrink-0 md:pt-4">
                     <div class="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-500 ${circleClass} group-hover:scale-110 group-hover:shadow-md">
                        <i class="fas ${icon} ${iconClass} text-xs md:text-sm transition-colors duration-300"></i>
                     </div>
                     <!-- Connector Line -->
                     <div class="time-connector mobile-connector md:hidden absolute top-9 bottom-[-16px] left-[19px] w-[2px] bg-slate-200 dark:bg-slate-700/50"></div>
                     <div class="time-connector desktop-connector hidden md:block absolute top-[3rem] bottom-[-2rem] left-1/2 -translate-x-1/2 w-[2px] bg-slate-200 dark:bg-slate-700/50"></div>
                </div>

                <!-- Content Card -->
                <div class="flex-1 min-w-0 pl-3 md:pl-0 pb-6 md:pb-6 relative z-10">
                    <div class="p-5 rounded-[1.5rem] ${cardBg} h-full flex flex-col justify-center relative overflow-hidden group-hover:translate-x-1 transition-transform duration-300">
                        <!-- Decorative bg blob for cards -->
                        <div class="absolute -right-4 -top-4 w-20 h-20 bg-current opacity-[0.03] rounded-full blur-2xl pointer-events-none text-blue-500 dark:text-white"></div>
                        
                        <div class="flex flex-wrap justify-between items-start gap-2 mb-1">
                             <div class="flex-1 min-w-0">${linesHtml}</div>
                             ${badgeHtml ? `<div class="shrink-0 pt-0.5">${badgeHtml}</div>` : ''}
                        </div>
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
                if (d.getDay() === 0 || d.getDay() === 6) continue;
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
