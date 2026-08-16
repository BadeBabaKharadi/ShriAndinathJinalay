/*
 * CHOWKA PAGE - Phase 2
 *
 * The Chowka list and Maharaj details now come from Google Apps Script.
 *
 * IMPORTANT:
 * Replace API_URL after deploying the Apps Script web app.
 */
document.addEventListener("DOMContentLoaded", () => {

  const API_URL =
    "https://script.google.com/macros/s/AKfycbxuy_L9ibu_lH0LzGC_skh3p8aBNpzfc_Zaa-A2AejiuLu2kdM5ISkWNa9VylRXGAO6IQ/exec";

  const dateInput =
    document.getElementById("chowka-date");

  const title =
    document.getElementById("selected-date-title");

  const subtitle =
    document.getElementById("selected-date-subtitle");

  const tableSection =
    document.getElementById("chowka-table-section");

  const tbody =
    document.getElementById("chowka-table-body");

  const tableDate =
    document.getElementById("table-date-label");

  const count =
    document.getElementById("chowka-count");

  const empty =
    document.getElementById("chowka-empty");

  const emptyMsg =
    document.getElementById("empty-message");

  const status =
    document.getElementById("chowka-status");

  const buttons =
    document.querySelectorAll(".maharaj-card");

  const closeDetailsButton =
    document.getElementById("close-maharaj-details");

  const maharajDetailsPanel =
    document.getElementById("maharaj-details");

  const detailName =
    document.getElementById("details-maharaj-name");

  const padgahan =
    document.getElementById("detail-padgahan");

  const tyaag =
    document.getElementById("detail-tyaag");

  const kram =
    document.getElementById("detail-kram");


  const today =
    startOfDay(new Date());

  const minDate =
    addDays(today, -30);

  dateInput.max =
    toInputDate(today);

  dateInput.min =
    toInputDate(minDate);

  dateInput.value =
    toInputDate(today);


  renderDate(
    dateInput.value
  );


  dateInput.addEventListener(
    "change",
    () => {

      if (!dateInput.value) {
        dateInput.value =
          toInputDate(today);
        return;
      }

      const selected =
        parseInputDate(
          dateInput.value
        );

      if (
        selected < minDate ||
        selected > today
      ) {

        showStatus(
          "कृपया पिछले 1 माह के भीतर की तिथि चुनें।",
          "error"
        );

        dateInput.value =
          toInputDate(today);

        renderDate(
          dateInput.value
        );

        return;
      }

      renderDate(
        dateInput.value
      );
    }
  );


  buttons.forEach(button => {

    button.addEventListener(
      "click",
      () => {
        selectMaharaj(
          button.dataset.maharaj
        );
      }
    );
  });


  closeDetailsButton.addEventListener(
    "click",
    closeMaharajDetails
  );


  async function renderDate(key) {

    const d =
      parseInputDate(key);

    const isToday =
      key === toInputDate(today);

    title.textContent =
      isToday
        ? "आज के चौके"
        : `${formatHindiDate(d)} के चौके`;

    subtitle.textContent =
      isToday
        ? "आज के लिए उपलब्ध चौका जानकारी"
        : `${formatHindiDate(d)} की चौका जानकारी`;

    tableSection.classList.add("hidden");
    empty.classList.add("hidden");

    showStatus(
      "चौका जानकारी लोड हो रही है…",
      "loading"
    );

    try {

      const result =
        await callApi(
          "chowka",
          { date: key }
        );

      if (!result.success) {
        throw new Error(
          result.error ||
          "चौका जानकारी प्राप्त नहीं हो सकी।"
        );
      }

      hideStatus();

      if (
        !result.available ||
        !result.rows ||
        !result.rows.length
      ) {

        empty.classList.remove(
          "hidden"
        );

        emptyMsg.textContent =
          result.message ||
          (
            isToday
              ? "आज के लिए अभी चौका जानकारी उपलब्ध नहीं है।"
              : `${formatHindiDate(d)} के लिए चौका जानकारी उपलब्ध नहीं है।`
          );

        return;
      }

      tableSection.classList.remove(
        "hidden"
      );

      tableDate.textContent =
        `${formatHindiDate(d)}${isToday ? " · आज" : ""}`;

      count.textContent =
        `${result.rows.length} चौके`;


      /*
       * =====================================================
       * MAHARAJ UPDATE STATUS
       * =====================================================
       *
       * We only use the values coming from the Sheet to
       * determine whether both Maharaj Ji have been updated.
       *
       * IMPORTANT:
       * We DO NOT modify, translate, or map row.maharaj.
       *
       * Whatever value you put in the Sheet will continue to
       * be displayed exactly as returned by the API.
       *
       * Example:
       *
       * AjitSagarJi
       * VivekanandSagarJi
       *
       * Once two distinct non-empty Maharaj values exist,
       * the temporary "पड़गाहन के बाद अपडेट होगा" message
       * disappears from all remaining blank rows.
       *
       * Multiple rows for the same Maharaj count only once.
       */

      const updatedMaharajNames =
        new Set(
          result.rows
            .map(row =>
              String(row.maharaj || "").trim()
            )
            .filter(Boolean)
        );

      const bothMaharajUpdated =
        updatedMaharajNames.size >= 2;


      tbody.innerHTML =
        result.rows
          .map(
            (row, index) => {

              const confirmed =
                Boolean(
                  row.maharaj &&
                  row.maharaj.trim()
                );

              return `
                <tr class="${confirmed ? "maharaj-confirmed" : ""}">

                  <td>
                    ${index + 1}
                  </td>

                  <td>
                    <strong>
                      ${esc(row.name)}
                    </strong>
                  </td>

                  <td>
                    ${esc(row.address)}
                  </td>

                  <td>
                    ${
                      confirmed
                        ? `
                          <span class="maharaj-name-cell">
                            <span class="maharaj-dot"></span>
                            ${esc(row.maharaj)}
                          </span>
                        `
                        : bothMaharajUpdated
                          ? ""
                          : `
                            <span class="not-confirmed">
                              पड़गाहन के बाद अपडेट होगा
                            </span>
                          `
                    }
                  </td>

                </tr>
              `;
            }
          )
          .join("");


    } catch (error) {

      console.error(
        "Chowka API error:",
        error
      );

      showStatus(
        "चौका जानकारी प्राप्त करने में समस्या हुई। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
        "error"
      );

      empty.classList.remove(
        "hidden"
      );

      emptyMsg.textContent =
        "चौका जानकारी अभी उपलब्ध नहीं हो सकी।";
    }
  }


  async function selectMaharaj(key) {

    buttons.forEach(button => {

      const active =
        button.dataset.maharaj === key;

      button.classList.toggle(
        "active",
        active
      );

      button.setAttribute(
        "aria-selected",
        active ? "true" : "false"
      );
    });

    try {

      const result =
        await callApi(
          "maharajDetails",
          { key: key }
        );

      if (
        !result.success ||
        !result.available ||
        !result.data
      ) {

        detailName.textContent =
          key === "AjitSagarJi"
            ? "१०८ मुनि श्री अजित सागर जी"
            : "१०५ ऐलक श्री विवेकानंद सागर जी";

        padgahan.innerHTML =
          placeholder();

        tyaag.innerHTML =
          placeholder();

        kram.innerHTML =
          placeholder();

      } else {

        detailName.textContent =
          result.data.name;

        padgahan.innerHTML =
          renderList(
            result.data.padgahan
          );

        tyaag.innerHTML =
          renderList(
            result.data.tyaag
          );

        kram.innerHTML =
          renderList(
            result.data.kram
          );
      }

      maharajDetailsPanel.classList.remove(
        "hidden"
      );

      maharajDetailsPanel.setAttribute(
        "aria-hidden",
        "false"
      );

      requestAnimationFrame(
        () => {
          maharajDetailsPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      );

    } catch (error) {

      console.error(
        "Maharaj API error:",
        error
      );

      alert(
        "महाराज श्री की जानकारी प्राप्त नहीं हो सकी।"
      );
    }
  }


  function closeMaharajDetails() {

    maharajDetailsPanel.classList.add(
      "hidden"
    );

    maharajDetailsPanel.setAttribute(
      "aria-hidden",
      "true"
    );

    buttons.forEach(button => {

      button.classList.remove(
        "active"
      );

      button.setAttribute(
        "aria-selected",
        "false"
      );
    });
  }


  async function callApi(
    api,
    params = {}
  ) {

    if (
      API_URL.includes(
        "PASTE_YOUR_CHOWKA"
      )
    ) {
      throw new Error(
        "CHOWKA API URL is not configured."
      );
    }

    const query =
      new URLSearchParams({
        api,
        ...params
      });

    const response =
      await fetch(
        `${API_URL}?${query.toString()}`,
        {
          method: "GET",
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    return await response.json();
  }


  function showStatus(
    message,
    type
  ) {

    status.textContent =
      message;

    status.className =
      `chowka-status ${type}`;
  }


  function hideStatus() {

    status.textContent =
      "";

    status.className =
      "chowka-status hidden";
  }


  function renderList(items) {

    if (
      !Array.isArray(items) ||
      !items.length
    ) {
      return placeholder();
    }

    return `
      <ul>
        ${items
          .map(
            item =>
              `<li>${esc(item)}</li>`
          )
          .join("")}
      </ul>
    `;
  }


  function placeholder() {

    return `
      <span class="detail-placeholder">
        जानकारी शीघ्र उपलब्ध कराई जाएगी।
      </span>
    `;
  }


  function toInputDate(date) {

    return [
      date.getFullYear(),
      String(
        date.getMonth() + 1
      ).padStart(2, "0"),
      String(
        date.getDate()
      ).padStart(2, "0")
    ].join("-");
  }


  function parseInputDate(value) {

    const [
      year,
      month,
      day
    ] =
      value
        .split("-")
        .map(Number);

    return new Date(
      year,
      month - 1,
      day
    );
  }


  function startOfDay(date) {

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
  }


  function addDays(
    date,
    days
  ) {

    const result =
      new Date(date);

    result.setDate(
      result.getDate() + days
    );

    return startOfDay(
      result
    );
  }


  function formatHindiDate(date) {

    const months = [
      "जनवरी",
      "फरवरी",
      "मार्च",
      "अप्रैल",
      "मई",
      "जून",
      "जुलाई",
      "अगस्त",
      "सितम्बर",
      "अक्टूबर",
      "नवम्बर",
      "दिसम्बर"
    ];

    const weekdays = [
      "रविवार",
      "सोमवार",
      "मंगलवार",
      "बुधवार",
      "गुरुवार",
      "शुक्रवार",
      "शनिवार"
    ];

    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} · ${weekdays[date.getDay()]}`;
  }


  function esc(value) {

    return String(
      value ?? ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }

});