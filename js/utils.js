"use strict";

/**
 * Utility for Date operations.
 * @namespace
 */
const DateUtils = {
    _cachedToday: null,
    /**
     * Normalizes a cell value to YYYY-MM-DD string.
     * @param {any} cellVal - The value from Excel cell
     * @returns {string|null} - YYYY-MM-DD string or null
     */
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
    /**
     * Parses YYYY-MM-DD string to Date object.
     * @param {string} dateStr 
     * @returns {Date|null}
     */
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
    /**
     * Returns today's date as YYYY-MM-DD string (cached).
     * @returns {string}
     */
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

/**
 * Gets a consistent theme (color palette) for a subject based on its title.
 * @param {string} title 
 * @returns {object} Theme object
 */
function getSubjectTheme(title) {
    if (!title) return SUBJECT_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % SUBJECT_PALETTE.length;
    return SUBJECT_PALETTE[index];
}

/**
 * Highlights a search term within text.
 * @param {string} text 
 * @param {string} term 
 * @returns {string} HTML string with highlighted term
 */
function highlightMatch(text, term) {
    if (!term) return text;
    try {
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        return text.replace(regex, '<span class="bg-yellow-200 dark:bg-yellow-900/60 text-slate-900 dark:text-yellow-100 rounded px-0.5 box-decoration-clone">$1</span>');
    } catch (e) { return text; }
}

/**
 * Checks if a row represents a visual barrier/header in the schedule.
 * @param {Array} row 
 * @returns {boolean}
 */
function isRowBarrier(row) {
    if (!row || !Array.isArray(row)) return false;
    for (let i = 0; i < row.length; i++) {
        const val = row[i];
        if (!val) continue;
        if (typeof val === 'string' && val.length > 5) {
            // Date check (YYYY-MM-DD)
            if (val[4] === '-' && val.length === 10) return true;

            const s = val.toLocaleLowerCase('tr-TR').trim();

            // Use Constants
            if (CONSTANTS.BARRIER_KEYWORDS.TR.includes(s) || CONSTANTS.BARRIER_KEYWORDS.EN.includes(s)) return true;

            // Committee/Phase headers
            if (s.startsWith('committee') || s.startsWith('komite') || s.startsWith('phase') || s.startsWith('dönem')) {
                // FIX: Stricter barrier detection.
                if (s.length < 30 &&
                    !s.includes(CONSTANTS.BARRIER_KEYWORDS.TR[3]) && // saati
                    !s.includes(CONSTANTS.BARRIER_KEYWORDS.TR[4]) && // değerlendirme
                    !s.includes(CONSTANTS.BARRIER_KEYWORDS.EN[3]) && // introduction
                    !s.includes(CONSTANTS.BARRIER_KEYWORDS.TR[5])    // panel
                ) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Checks if a value is considered garbage/metadata content.
 * @param {any} val 
 * @returns {boolean}
 */
function isGarbageContent(val) {
    if (!val) return false;
    const s = String(val).trim();
    if (s.length === 0 || s.includes("GMT") || /^\d+$/.test(s)) return true;

    // Check Constants
    const lower = s.toLocaleLowerCase('tr-TR');
    if (CONSTANTS.GARBAGE_KEYWORDS.some(k => lower.includes(k))) return true;
    if (lower.startsWith('(')) return true; // (mon etc

    if (CONSTANTS.BARRIER_KEYWORDS.TR.includes(lower) || CONSTANTS.BARRIER_KEYWORDS.EN.includes(lower)) return true;

    return false;
}
