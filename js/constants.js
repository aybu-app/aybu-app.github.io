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
