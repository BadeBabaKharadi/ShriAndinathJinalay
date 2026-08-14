document.addEventListener("DOMContentLoaded", async () => {
  const rulesBox = document.getElementById("rules-box");
  const rulesAccepted = document.getElementById("rules-accepted");
  const acceptButton = document.getElementById("accept-button");
  const continueButton = document.getElementById("continue-button");
  const scrollStatus = document.getElementById("scroll-status");

  const rulesSection = document.querySelector(".registration-panel");
  const mobileSection = document.getElementById("mobile-section");
  const placeholderSection = document.getElementById("placeholder-section");

  const mobileInput = document.getElementById("mobile");
  const mobileMessage = document.getElementById("mobile-message");
  const mobileContinue = document.getElementById("mobile-continue");
  const backButton = document.getElementById("back-button");

  let reachedBottom = false;

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(dateString) {
    const [year, month, day] = dateString.split("-");
    const months = [
      "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून",
      "जुलाई", "अगस्त", "सितम्बर", "अक्टूबर", "नवम्बर", "दिसम्बर"
    ];
    return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
  }

  function renderEvent(event) {
    document.title = `${event.name} २०२६ - पंजीकरण`;

    document.querySelector(".page-title").textContent = event.name;
    document.getElementById("venue-summary").textContent =
      `${event.venue.name} · ${event.venue.place}`;

    document.getElementById("event-details").innerHTML = `
      <div class="event-info-title">२०२६ शिविर की महत्वपूर्ण जानकारी</div>

      <div class="event-item">
        <span class="label">📅 शिविर की अवधि</span>
        <strong class="value">
          ${escapeHtml(formatDate(event.dates.start))}
          से
          ${escapeHtml(formatDate(event.dates.end))}
        </strong>
      </div>

      <div class="event-item">
        <span class="label">📋 पंजीकरण की अंतिम तिथि</span>
        <strong class="value">
          ${escapeHtml(formatDate(event.registration.deadline))}
        </strong>
      </div>

      <div class="event-item">
        <span class="label">📍 शिविर स्थान</span>
        <strong class="value">
          ${escapeHtml(event.venue.name)}<br>
          ${escapeHtml(event.venue.place)}
        </strong>
      </div>
    `;
  }

  function renderRules(event) {
    document.getElementById("rules-list").innerHTML =
      event.rules.map(rule => `
        <div class="rule">
          <span class="rule-number">${escapeHtml(rule.number)}.</span>
          <p>${escapeHtml(rule.text)}</p>
        </div>
      `).join("");
  }

  try {
    const response = await fetch("data/event.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Could not load event data: ${response.status}`);
    }

    const event = await response.json();

    renderEvent(event);
    renderRules(event);
  } catch (error) {
    console.error(error);
    document.getElementById("rules-list").innerHTML =
      `<p class="data-error">
        नियम लोड नहीं हो सके। कृपया पृष्ठ पुनः खोलें।
      </p>`;
    return;
  }

  function checkRulesScroll() {
    const reached =
      rulesBox.scrollTop + rulesBox.clientHeight >=
      rulesBox.scrollHeight - 10;

    if (reached && !reachedBottom) {
      reachedBottom = true;
      rulesAccepted.disabled = false;
      scrollStatus.textContent = "✓ आपने सभी नियम पढ़ लिए हैं";
    }
  }

  rulesBox.addEventListener("scroll", checkRulesScroll);
  checkRulesScroll();

  rulesAccepted.addEventListener("change", () => {
    acceptButton.disabled = !rulesAccepted.checked;
  });

  acceptButton.addEventListener("click", () => {
    if (!rulesAccepted.checked) return;

    acceptButton.textContent = "✓ नियम स्वीकार किए गए";
    acceptButton.disabled = true;
    continueButton.disabled = false;
  });

  continueButton.addEventListener("click", () => {
    if (!rulesAccepted.checked) return;

    rulesSection.classList.add("hidden");
    mobileSection.classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  mobileContinue.addEventListener("click", () => {
    const mobile = mobileInput.value.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      mobileMessage.textContent =
        "कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।";
      mobileMessage.classList.remove("hidden");
      mobileInput.focus();
      return;
    }

    mobileMessage.classList.add("hidden");

    mobileSection.classList.add("hidden");
    placeholderSection.classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  backButton.addEventListener("click", () => {
    placeholderSection.classList.add("hidden");
    mobileSection.classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});
