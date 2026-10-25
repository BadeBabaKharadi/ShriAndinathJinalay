const siteContent = {
  announce: 'announce-text',
  date: 'todays-date',
  kalash: 'todays-kalash',
  announcement: 'todays-announcement',
  location: 'footer-location'
};

async function getTodayDisplayDate() {
  const today = getTodayDate();

  let englishDate = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  let hinduLabel = 'हिन्दू-दिनांक उपलब्ध नहीं है';

  if (typeof getHinduCalendarByDate === 'function') {
    const calendarEntry = await getHinduCalendarByDate(today);

    if (calendarEntry) {
      if (calendarEntry.englishDate) {
        englishDate = calendarEntry.englishDate;
      }

      if (calendarEntry.hindiDate) {
        hinduLabel = calendarEntry.hindiDate;
      }
    }
  }

  return `${englishDate} / ${hinduLabel}`;
}

async function loadHomeData() {
  const announceText = document.getElementById(siteContent.announce);
  const todayDate = document.getElementById(siteContent.date);
  const kalash = document.getElementById(siteContent.kalash);
  const announcement = document.getElementById(siteContent.announcement);
  const footerLocation = document.getElementById(siteContent.location);
  const today = getTodayDate();

  // Render the date immediately so an optional calendar/data-file failure
  // cannot leave the entire daily-highlights card blank.
  if (todayDate) {
    todayDate.textContent = new Intl.DateTimeFormat('hi-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  }

  let homeData = {};
  try {
    const response = await fetch('data/home.json');
    if (!response.ok) throw new Error(`Unable to load home data (HTTP ${response.status})`);
    homeData = await response.json();
  } catch (error) {
    console.warn('Home configuration could not be loaded:', error);
  }

  if (kalash) kalash.textContent = homeData.kalash || 'कलश स्थापना';
  if (footerLocation) {
    footerLocation.textContent = homeData.location || 'आदिनाथ जिनालय, खराड़ी, पुणे';
  }

  const fallbackAnnouncement =
    homeData.announcement || 'जिनधर्म आराधना चातुर्मास में आपका स्वागत है';
  let headerAnnouncement = fallbackAnnouncement;
  let dailyAnnouncement = fallbackAnnouncement;

  try {
    if (typeof getAnnouncementByDate === 'function') {
      const entry = await getAnnouncementByDate(today);
      const text = getAnnouncementText(entry);
      if (text) {
        headerAnnouncement = text;
        dailyAnnouncement = text;
      }
    }
  } catch (error) {
    console.warn('Daily announcement data could not be loaded:', error);
  }

  try {
    if (typeof getHinduCalendarByDate === 'function') {
      const entry = await getHinduCalendarByDate(today);
      if (entry?.englishDate && todayDate) {
        todayDate.textContent = entry.englishDate;
      }
      if (entry?.hindiDate && todayDate) {
        todayDate.textContent = `${todayDate.textContent} / ${entry.hindiDate}`;
      }
      if (entry?.special && String(entry.special).trim()) {
        dailyAnnouncement = String(entry.special).trim();
      }
    }
  } catch (error) {
    console.warn('Hindu calendar data could not be loaded:', error);
  }

  if (announceText) announceText.textContent = headerAnnouncement;
  if (announcement) {
    announcement.textContent = dailyAnnouncement || 'आज के लिए कोई विशेष सूचना नहीं है।';
  }
}

async function loadTodayShravak() {

    const element =
        document.getElementById("todays-shrav");

    if (!element) {
        return;
    }

    try {

        if (typeof loadShravakData === "function") {
            await loadShravakData();
        } else {
            const response = await fetch('./data/shravak-shresthi.json?v=' + Date.now());

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            shravakDataCache = data.map(item => ({
                ...item,
                normalizedDate: normalizeDate(item.date)
            }));
        }

        const today = getTodayDate();
        const entry = getShravakNameByDateSync(today);
        const displayName = getShravakDisplayName(entry);

        element.textContent = displayName;

    } catch (error) {

        console.error(
            "Shravak Shresthi error:",
            error
        );

        element.textContent =
            "जानकारी उपलब्ध नहीं है";

    }
}

// Dynamic content is now refreshed after footer markup is inserted by the component loader.
// The page fragments are injected during DOMContentLoaded, so the JSON bindings run there.

function setupRegistrationClosedDialog() {
  const trigger = document.getElementById("registration-closed-button");
  const overlay = document.getElementById("registration-closed-modal");
  const closeButton = document.getElementById("registration-closed-close");
  const okButton = document.getElementById("registration-closed-ok");

  if (!trigger || !overlay || !closeButton || !okButton) {
    return;
  }

  const close = () => {
    overlay.classList.add("hidden");
    document.body.classList.remove("modal-open");
  };

  const open = () => {
    overlay.classList.remove("hidden");
    document.body.classList.add("modal-open");
    closeButton.focus();
  };

  trigger.addEventListener("click", open);
  closeButton.addEventListener("click", close);
  okButton.addEventListener("click", close);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.classList.contains("hidden")) {
      close();
    }
  });
}

document.addEventListener("DOMContentLoaded", setupRegistrationClosedDialog);
