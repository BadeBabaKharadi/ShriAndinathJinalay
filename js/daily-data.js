// ==========================================
// DAILY DATA HELPERS
// ==========================================


// ==========================================
// DATA SOURCES
// ==========================================

// Gallery is now the source of truth for
// Shravak Shreshthi information.

const GALLERY_DATA_URL =
    "./data/gallery.json";

const ANNOUNCEMENT_DATA_URL =
    "./data/announcements.json";

const HINDU_CALENDAR_DATA_URL =
    "./data/hindu-calendar.json";


// ==========================================
// CACHES
// ==========================================

let galleryDataCache = null;

let announcementDataCache = null;

let hinduCalendarDataCache = null;


// ==========================================
// NORMALIZE DATE
// ==========================================

function normalizeDate(value) {

    if (!value) {
        return null;
    }


    const text =
        String(value).trim();


    // ------------------------------------------
    // Already YYYY-MM-DD
    // ------------------------------------------

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(text)
    ) {

        return text;

    }


    // ------------------------------------------
    // ISO date/time
    //
    // Example:
    // 2026-08-08T00:00:00
    // ------------------------------------------

    if (
        /^\d{4}-\d{2}-\d{2}T/.test(text)
    ) {

        return text.substring(0, 10);

    }


    // ------------------------------------------
    // Try JavaScript Date
    // ------------------------------------------

    const date =
        new Date(text);


    if (
        Number.isNaN(date.getTime())
    ) {

        return null;

    }


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


// ==========================================
// LOAD GALLERY DATA
//
// Gallery JSON is the ONLY source for
// Shravak Shreshthi information.
// ==========================================

async function loadShravakData() {

    if (galleryDataCache) {

        return galleryDataCache;

    }


    const response =
        await fetch(
            GALLERY_DATA_URL +
            "?v=" +
            Date.now()
        );


    if (!response.ok) {

        throw new Error(
            `Unable to load gallery data (${response.status})`
        );

    }


    const data =
        await response.json();


    if (!Array.isArray(data)) {

        throw new Error(
            "gallery.json must contain an array"
        );

    }


    // ------------------------------------------
    // Convert gallery records into the format
    // expected by the existing application.
    //
    // gallery.json:
    //
    // {
    //   "date": "...",
    //   "title": "...",
    //   "fileName": "..."
    // }
    //
    // becomes:
    //
    // {
    //   date: "...",
    //   name: "...",
    //   title: "...",
    //   fileName: "...",
    //   normalizedDate: "..."
    // }
    // ------------------------------------------

    galleryDataCache =
        data
            .filter(
                item =>
                    item &&
                    typeof item.title === "string" &&
                    item.title.trim() !== ""
            )
            .map(item => ({

                ...item,

                name:
                    String(
                        item.title
                    ).trim(),

                normalizedDate:
                    normalizeDate(
                        item.date
                    )

            }));


    console.log(
        "Shravak data loaded from gallery.json:",
        galleryDataCache.length
    );


    return galleryDataCache;

}


// ==========================================
// FIND SHARAVAK BY DATE
//
// IMPORTANT:
// Returns ALL matching Shravak records.
//
// If two gallery.json records have the same
// date, both are returned.
// ==========================================

async function getShravakByDate(date) {

    const data =
        await loadShravakData();


    const normalizedDate =
        normalizeDate(date);


    if (!normalizedDate) {

        return [];

    }


    const entries =
        data.filter(
            item =>
                item.normalizedDate ===
                normalizedDate
        );


    return entries;

}


// ==========================================
// GET TODAY
// ==========================================

function getTodayDate() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            now.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


// ==========================================
// DISPLAY NAME
//
// Accepts:
//   - one entry
//   - an array of entries
//
// Multiple Shravak entries are displayed
// together.
// ==========================================

function getShravakDisplayName(entries) {

    // ------------------------------------------
    // No data
    // ------------------------------------------

    if (!entries) {

        return "नाम उपलब्ध नहीं है";

    }


    // ------------------------------------------
    // Normalize to array
    // ------------------------------------------

    const list =
        Array.isArray(entries)
            ? entries
            : [entries];


    // ------------------------------------------
    // No matching entries
    // ------------------------------------------

    if (
        list.length === 0
    ) {

        return "नाम उपलब्ध नहीं है";

    }


    // ------------------------------------------
    // Extract titles/names
    // ------------------------------------------

    const names =
        list
            .map(entry => {

                if (!entry) {
                    return "";
                }


                // Prefer gallery title.
                if (
                    entry.title &&
                    String(
                        entry.title
                    ).trim()
                ) {

                    return String(
                        entry.title
                    ).trim();

                }


                // Compatibility with normalized
                // gallery records.
                if (
                    entry.name &&
                    String(
                        entry.name
                    ).trim()
                ) {

                    return String(
                        entry.name
                    ).trim();

                }


                return "";

            })
            .filter(
                name =>
                    name !== ""
            );


    // ------------------------------------------
    // No usable names
    // ------------------------------------------

    if (
        names.length === 0
    ) {

        return "नाम उपलब्ध नहीं है";

    }


    // ------------------------------------------
    // Remove duplicates
    // ------------------------------------------

    const uniqueNames =
        [...new Set(names)];


    // ------------------------------------------
    // Multiple Shravak Shreshthi
    //
    // Example:
    //
    // श्रीमान अरुण जैन / श्रीमती सीमा जैन
    // ------------------------------------------

    return uniqueNames.join(" / ");

}


// ==========================================
// SYNCHRONOUS SHARAVAK LOOKUP
//
// Uses already-loaded gallery data.
//
// IMPORTANT:
// Returns ALL matching records.
// ==========================================

function getShravakNameByDateSync(date) {

    if (!galleryDataCache) {

        return [];

    }


    const normalizedDate =
        normalizeDate(date);


    if (!normalizedDate) {

        return [];

    }


    return galleryDataCache.filter(
        item =>
            item.normalizedDate ===
            normalizedDate
    );

}


// ==========================================
// LOAD ANNOUNCEMENT DATA
// ==========================================

async function loadAnnouncementData() {

    if (announcementDataCache) {

        return announcementDataCache;

    }


    const response =
        await fetch(
            ANNOUNCEMENT_DATA_URL +
            "?v=" +
            Date.now()
        );


    if (!response.ok) {

        throw new Error(
            `Unable to load announcements data (${response.status})`
        );

    }


    const data =
        await response.json();


    if (!Array.isArray(data)) {

        throw new Error(
            "announcements.json must contain an array"
        );

    }


    announcementDataCache =
        data.map(item => ({

            ...item,

            normalizedDate:
                normalizeDate(
                    item.date
                )

        }));


    console.log(
        "Announcement data loaded:",
        announcementDataCache.length
    );


    return announcementDataCache;

}


// ==========================================
// GET ANNOUNCEMENT BY DATE
// ==========================================

async function getAnnouncementByDate(date) {

    const data =
        await loadAnnouncementData();


    const normalizedDate =
        normalizeDate(date);


    if (!normalizedDate) {

        return null;

    }


    const entry =
        data.find(
            item =>
                item.normalizedDate ===
                normalizedDate
        );


    return entry || null;

}


// ==========================================
// GET ANNOUNCEMENT TEXT
// ==========================================

function getAnnouncementText(entry) {

    if (!entry) {

        return "";

    }


    const text =
        entry.text ||
        entry.announcement ||
        entry.message ||
        entry.title ||
        "";


    return String(
        text
    ).trim();

}


// ==========================================
// SYNCHRONOUS ANNOUNCEMENT LOOKUP
// ==========================================

function getAnnouncementTextByDateSync(date) {

    if (!announcementDataCache) {

        return null;

    }


    const normalizedDate =
        normalizeDate(date);


    const entry =
        announcementDataCache.find(
            item =>
                item.normalizedDate ===
                normalizedDate
        );


    return entry || null;

}


// ==========================================
// LOAD HINDU CALENDAR DATA
// ==========================================

async function loadHinduCalendarData() {

    if (hinduCalendarDataCache) {

        return hinduCalendarDataCache;

    }


    const response =
        await fetch(
            HINDU_CALENDAR_DATA_URL +
            "?v=" +
            Date.now()
        );


    if (!response.ok) {

        throw new Error(
            `Unable to load Hindu calendar data (${response.status})`
        );

    }


    const data =
        await response.json();


    if (!Array.isArray(data)) {

        throw new Error(
            "hindu-calendar.json must contain an array"
        );

    }


    hinduCalendarDataCache =
        data.map(item => ({

            ...item,

            normalizedDate:
                normalizeDate(
                    item.date
                )

        }));


    console.log(
        "Hindu calendar data loaded:",
        hinduCalendarDataCache.length
    );


    return hinduCalendarDataCache;

}


// ==========================================
// GET HINDU CALENDAR BY DATE
// ==========================================

async function getHinduCalendarByDate(date) {

    const data =
        await loadHinduCalendarData();


    const normalizedDate =
        normalizeDate(date);


    if (!normalizedDate) {

        return null;

    }


    const entry =
        data.find(
            item =>
                item.normalizedDate ===
                normalizedDate
        );


    return entry || null;

}