const CONFIG_URL = "data/kshamawani-2026.json";
const ACCESS_STORAGE_KEY = "kw26-admin-access";

document.addEventListener("DOMContentLoaded", async () => {
  const keyInput = document.getElementById("admin-key");
  const unlockButton = document.getElementById("unlock");
  const accessPanel = document.getElementById("access-panel");
  const accessVerified = document.getElementById("access-verified");
  const message = document.getElementById("admin-message");
  const dashboardMessage = document.getElementById("admin-dashboard-message");
  const dashboard = document.getElementById("dashboard");
  const searchMobile = document.getElementById("search-mobile");
  const searchButton = document.getElementById("search");
  const searchResult = document.getElementById("search-result");
  const deleteButton = document.getElementById("delete");
  const refreshButton = document.getElementById("refresh");
  const showRecordsButton = document.getElementById("show-records");
  const recordsPanel = document.getElementById("records-panel");
  const recordsBody = document.getElementById("records-body");
  const recordsEmpty = document.getElementById("records-empty");
  const recordsCount = document.getElementById("records-count");
  const recordsPageSize = document.getElementById("records-page-size");
  const recordsPrev = document.getElementById("records-prev");
  const recordsNext = document.getElementById("records-next");
  const recordsPageLabel = document.getElementById("records-page-label");
  const recordsMessage = document.getElementById("records-message");
  const recordsFilterInput = document.getElementById("records-filter-input");
  const recordsFilterApply = document.getElementById("records-filter-apply");
  const recordsFilterClear = document.getElementById("records-filter-clear");
  const exportCsvButton = document.getElementById("export-csv");
  const exportExcelButton = document.getElementById("export-excel");
  const trendChart = document.getElementById("trend-chart");
  const trendEmpty = document.getElementById("trend-empty");
  const trendControls = [...document.querySelectorAll("[data-trend]")];
  let config;
  let accessKey = sessionStorage.getItem(ACCESS_STORAGE_KEY) || "";
  let selectedRegistration = null;
  let bookingTrend = {
    daily: [],
    hourly: [],
    twoHourly: [],
  };
  let selectedTrend = "daily";
  let records = [];
  let recordPageCursors = [""];
  let recordPageIndex = 0;
  let recordsHasMore = false;
  let recordsFilter = "";

  const showMessage = (text) => {
    message.textContent = text;
    message.classList.remove("hidden");
    if (dashboardMessage && !dashboard.classList.contains("hidden")) {
      dashboardMessage.textContent = text;
      dashboardMessage.classList.remove("hidden");
    }
  };
  const clearMessage = () => {
    message.textContent = "";
    message.classList.add("hidden");
    if (dashboardMessage) {
      dashboardMessage.textContent = "";
      dashboardMessage.classList.add("hidden");
    }
  };

  const callService = async (functionName, data) => {
    let response;
    try {
      response = await fetch(
        `${config.registration.firebaseFunctionsBaseUrl}/${functionName}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json;charset=UTF-8" },
          body: JSON.stringify({ data }),
        },
      );
    } catch {
      throw new Error("सेवा से संपर्क नहीं हो सका।");
    }

    const payload = await response.json();
    if (!response.ok || payload.error) {
      if (String(payload.error?.status || "").toLowerCase() === "permission-denied") {
        sessionStorage.removeItem(ACCESS_STORAGE_KEY);
        accessKey = "";
        accessPanel.classList.remove("hidden");
        accessVerified.classList.add("hidden");
        dashboard.classList.add("hidden");
      }
      throw new Error(payload.error?.message || "ऑपरेशन पूरा नहीं हो सका।");
    }
    // Firebase callable HTTP responses use "data"; keep "result" support for
    // older/proxy deployments so the dashboard is tolerant of both shapes.
    const result = payload.data ?? payload.result;
    if (!result || typeof result !== "object") {
      throw new Error("आँकड़े लोड नहीं हो सके।");
    }
    return result;
  };

  const verifyAccessKey = async (candidateKey, { persist = true } = {}) => {
    if (!candidateKey) {
      throw new Error("सुरक्षा कुंजी दर्ज करें।");
    }

    await callService("kshamawaniVerifyAccess", {
      accessKey: candidateKey,
    });

    accessKey = candidateKey;
    if (persist) {
      sessionStorage.setItem(ACCESS_STORAGE_KEY, accessKey);
    }
    accessPanel.classList.add("hidden");
    accessVerified.classList.remove("hidden");
  };

  const formatTrendLabel = (period, mode) => {
    if (mode === "daily") return period;
    const [date, time] = period.split("T");
    return `${date.slice(5)} ${time}`;
  };

  const renderTrend = (mode = selectedTrend) => {
    selectedTrend = mode;
    trendControls.forEach((button) => {
      button.classList.toggle("active", button.dataset.trend === mode);
    });

    const rows = bookingTrend[mode] || [];
    trendChart.innerHTML = "";

    if (!rows.length) {
      trendChart.classList.add("hidden");
      trendEmpty.classList.remove("hidden");
      return;
    }

    trendChart.classList.remove("hidden");
    trendEmpty.classList.add("hidden");

    const width = 760;
    const height = 300;
    const padding = { top: 20, right: 24, bottom: 56, left: 46 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(...rows.map((row) => row.registrations), 1);
    const stepX = rows.length === 1 ? 0 : chartWidth / (rows.length - 1);
    const points = rows.map((row, index) => {
      const x = padding.left + index * stepX;
      const y =
        padding.top +
        chartHeight -
        (row.registrations / maxValue) * chartHeight;
      return { x, y, row };
    });
    const polyline = points.map(({ x, y }) => `${x},${y}`).join(" ");
    const labelStep = Math.max(1, Math.ceil(rows.length / 7));
    const gridLines = [0, 0.5, 1]
      .map((ratio) => {
        const y = padding.top + chartHeight * ratio;
        const value = Math.round(maxValue * (1 - ratio));
        return `
          <line class="trend-grid" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line>
          <text class="trend-axis-label" x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${value}</text>
        `;
      })
      .join("");

    const labels = points
      .map(({ x, row }, index) => {
        if (index % labelStep !== 0 && index !== points.length - 1) return "";
        return `<text class="trend-x-label" x="${x}" y="${height - 20}" text-anchor="middle">${formatTrendLabel(row.period, mode)}</text>`;
      })
      .join("");

    const dots = points
      .map(
        ({ x, y, row }) =>
          `<circle class="trend-point" cx="${x}" cy="${y}" r="4"><title>${formatTrendLabel(row.period, mode)} — ${row.registrations} पंजीकरण</title></circle>`,
      )
      .join("");

    trendChart.innerHTML = `
      <svg class="trend-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        ${gridLines}
        <polyline class="trend-line" points="${polyline}"></polyline>
        ${dots}
        ${labels}
      </svg>
    `;
  };

  const renderStats = (stats) => {
    document.getElementById("registrations").textContent = stats.registrations;
    document.getElementById("booked").textContent = stats.totalCouponsBooked;
    document.getElementById("issued").textContent = stats.totalPhysicalCouponsIssued;
    document.getElementById("pending").textContent = stats.pendingPhysicalCouponRegistrations;
    document.getElementById("average").textContent = stats.averageCouponsPerRegistration;
    document.getElementById("issuedRegistrations").textContent = stats.registrationsWithTokens;

    bookingTrend = {
      daily: stats.bookingTrend?.daily || [],
      hourly: stats.bookingTrend?.hourly || [],
      twoHourly: stats.bookingTrend?.twoHourly || [],
    };
    renderTrend();

    document.getElementById("coupon-breakdown").innerHTML =
      stats.byCouponCount.map((row) =>
        `<span class="chip">${row.coupons} कूपन: <strong>${row.count}</strong></span>`,
      ).join("");
  };

  const refresh = async () => {
    refreshButton.disabled = true;
    refreshButton.classList.add("is-loading");
    refreshButton.setAttribute("aria-busy", "true");
    refreshButton.setAttribute("aria-label", "आँकड़े ताज़ा हो रहे हैं…");
    try {
      const stats = await callService("kshamawaniAdminStats", {
        eventId: config.id,
        accessKey,
      });
      if (
        typeof stats.registrations !== "number" ||
        typeof stats.totalCouponsBooked !== "number" ||
        !Array.isArray(stats.byCouponCount)
      ) {
        throw new Error("सर्वर से आँकड़ों का प्रारूप सही नहीं मिला।");
      }
      renderStats(stats);
      clearMessage();
    } catch (error) {
      showMessage(error.message);
    } finally {
      refreshButton.disabled = false;
      refreshButton.classList.remove("is-loading");
      refreshButton.removeAttribute("aria-busy");
      refreshButton.setAttribute("aria-label", "आँकड़े ताज़ा करें");
    }
  };

  const formatRecordDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("hi-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const renderRecords = (rows) => {
    recordsBody.innerHTML = rows
      .map((row) => {
        const status = row.tokensIssued
          ? "<span class=\"record-status issued\">कूपन जारी</span>"
          : "<span class=\"record-status pending\">जारी होना बाकी</span>";
        return [
          "<tr>",
          "<td><strong>" + escapeHtml(row.applicationCode) + "</strong></td>",
          "<td>" + escapeHtml(row.name) + "</td>",
          "<td>" + escapeHtml(row.mobile) + "</td>",
          "<td>" + escapeHtml(row.address) + "</td>",
          "<td>" + escapeHtml(row.coupons) + "</td>",
          "<td>" + status + "</td>",
          "<td>" + escapeHtml(formatRecordDate(row.createdAt)) + "</td>",
          "<td>" + escapeHtml(formatRecordDate(row.issuedAt)) + "</td>",
          "</tr>",
        ].join("");
      })
      .join("");

    recordsEmpty.classList.toggle("hidden", rows.length > 0);
    recordsBody.classList.toggle("hidden", rows.length === 0);
    recordsCount.textContent = rows.length
      ? rows.length + " रिकॉर्ड इस पृष्ठ पर"
      : "कोई रिकॉर्ड नहीं";
    recordsPageLabel.textContent = "पृष्ठ " + (recordPageIndex + 1);
    recordsPrev.disabled = recordPageIndex === 0;
    recordsNext.disabled = !recordsHasMore;
    exportCsvButton.disabled = rows.length === 0;
    exportExcelButton.disabled = rows.length === 0;
  };

  const showRecordsMessage = (text) => {
    recordsMessage.textContent = text;
    recordsMessage.classList.remove("hidden");
  };

  const clearRecordsMessage = () => {
    recordsMessage.textContent = "";
    recordsMessage.classList.add("hidden");
  };

  const fetchRecordPage = async (cursor = "") =>
    callService("kshamawaniAdminRegistrations", {
      eventId: config.id,
      accessKey,
      pageSize: Number(recordsPageSize.value),
      cursor,
      filter: recordsFilter,
    });

  const loadRecordPage = async (pageIndex = recordPageIndex) => {
    const cursor = recordPageCursors[pageIndex] || "";
    recordsPrev.disabled = true;
    recordsNext.disabled = true;
    clearRecordsMessage();

    try {
      const response = await fetchRecordPage(cursor);
      records = response.records || [];
      recordsHasMore = response.hasMore === true;
      recordPageIndex = pageIndex;
      if (recordsHasMore && response.nextCursor) {
        recordPageCursors[pageIndex + 1] = response.nextCursor;
      }
      renderRecords(records);
    } catch (error) {
      records = [];
      recordsHasMore = false;
      renderRecords([]);
      showRecordsMessage(error.message);
    }
  };

  const openRecords = async () => {
    recordsPanel.classList.remove("hidden");
    showRecordsButton.classList.add("hidden");
    exportCsvButton.classList.remove("hidden");
    exportExcelButton.classList.remove("hidden");
    recordPageCursors = [""];
    recordPageIndex = 0;
    await loadRecordPage(0);
  };

  const applyRecordsFilter = async () => {
    recordsFilter = recordsFilterInput.value.trim();
    recordPageCursors = [""];
    recordPageIndex = 0;
    await loadRecordPage(0);
  };

  const clearRecordsFilter = async () => {
    recordsFilterInput.value = "";
    recordsFilter = "";
    recordPageCursors = [""];
    recordPageIndex = 0;
    await loadRecordPage(0);
  };

  const changeRecordPageSize = async () => {
    recordPageCursors = [""];
    recordPageIndex = 0;
    await loadRecordPage(0);
  };

  const csvSafe = (value) => {
    const text = String(value ?? "");
    return /^[=+\-@]/.test(text) ? "'" + text : text;
  };

  const recordRowsForExport = (rows) =>
    rows.map((row) => [
      row.applicationCode,
      row.name,
      row.mobile,
      row.address,
      row.coupons,
      row.tokensIssued ? "कूपन जारी" : "जारी होना बाकी",
      formatRecordDate(row.createdAt),
      formatRecordDate(row.issuedAt),
      row.issuedBy,
    ]);

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const fetchAllRecords = async () => {
    const all = [];
    let cursor = "";

    do {
      const response = await callService("kshamawaniAdminRegistrations", {
        eventId: config.id,
        accessKey,
        pageSize: 100,
        cursor,
      });
      all.push(...(response.records || []));
      cursor = response.hasMore ? response.nextCursor || "" : "";
    } while (cursor);

    return all;
  };

  const exportRecords = async (format) => {
    exportCsvButton.disabled = true;
    exportExcelButton.disabled = true;
    showRecordsMessage("सभी रिकॉर्ड तैयार किए जा रहे हैं…");

    try {
      const allRecords = await fetchAllRecords();
      if (!allRecords.length) {
        throw new Error("डाउनलोड करने के लिए कोई रिकॉर्ड नहीं है।");
      }

      const headers = [
        "Application",
        "Name",
        "Mobile",
        "Address",
        "Coupons",
        "Status",
        "Registered At",
        "Issued At",
        "Issued By",
      ];
      const rows = recordRowsForExport(allRecords);
      const dateSuffix = new Date().toISOString().slice(0, 10);

      if (format === "csv") {
        const csv = [headers, ...rows]
          .map((row) =>
            row
              .map((value) => '"' + csvSafe(value).replaceAll('"', '""') + '"' )
              .join(","),
          )
          .join("\r\n");
        downloadBlob(
          new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
          "kshamawani-2026-registrations-" + dateSuffix + ".csv",
        );
      } else {
        const headerHtml = headers
          .map((header) => "<th>" + escapeHtml(header) + "</th>")
          .join("");
        const bodyHtml = rows
          .map(
            (row) =>
              "<tr>" +
              row.map((value) => "<td>" + escapeHtml(value) + "</td>").join("") +
              "</tr>",
          )
          .join("");
        const excelHtml =
          '<html><head><meta charset="utf-8"></head><body><table><thead><tr>' +
          headerHtml +
          "</tr></thead><tbody>" +
          bodyHtml +
          "</tbody></table></body></html>";
        downloadBlob(
          new Blob([excelHtml], { type: "application/vnd.ms-excel" }),
          "kshamawani-2026-registrations-" + dateSuffix + ".xls",
        );
      }

      clearRecordsMessage();
    } catch (error) {
      showRecordsMessage(error.message);
    } finally {
      exportCsvButton.disabled = records.length === 0;
      exportExcelButton.disabled = records.length === 0;
    }
  };

  const clearSearch = () => {
    selectedRegistration = null;
    searchMobile.value = "";
    searchResult.innerHTML = "";
    searchResult.classList.add("hidden");
    deleteButton.disabled = true;
  };

  const renderRegistration = (registration) => {
    selectedRegistration = registration;
    searchResult.classList.remove("hidden");
    searchResult.innerHTML = `
      <div><strong>${registration.name}</strong></div>
      <div>मोबाइल: ${registration.mobile}</div>
      <div>पता: ${registration.address}</div>
      <div>आवेदन: <strong>${registration.applicationCode}</strong></div>
      <div>कूपन: <strong>${registration.coupons}</strong></div>
      <div>स्थिति: ${registration.tokensIssued ? "भौतिक कूपन जारी हो चुके हैं" : "भौतिक कूपन जारी नहीं हुए"}</div>
    `;
    deleteButton.disabled = registration.tokensIssued === true;
  };

  const activate = async () => {
    const value = keyInput.value.trim();
    if (!value) {
      showMessage("सुरक्षा कुंजी दर्ज करें।");
      return;
    }

    unlockButton.disabled = true;
    unlockButton.textContent = "सत्यापित हो रहा है…";
    clearMessage();

    try {
      await verifyAccessKey(value);
      keyInput.value = "";
      dashboard.classList.remove("hidden");
      await refresh();
    } catch (error) {
      sessionStorage.removeItem(ACCESS_STORAGE_KEY);
      accessKey = "";
      showMessage(error.message);
    } finally {
      unlockButton.disabled = false;
      unlockButton.textContent = "सक्रिय करें";
    }
  };

  unlockButton.addEventListener("click", activate);
  keyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") activate();
  });
  refreshButton.addEventListener("click", refresh);
  trendControls.forEach((button) => {
    button.addEventListener("click", () => renderTrend(button.dataset.trend));
  });

  showRecordsButton.addEventListener("click", openRecords);
  recordsFilterApply.addEventListener("click", applyRecordsFilter);
  recordsFilterClear.addEventListener("click", clearRecordsFilter);
  recordsFilterInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") applyRecordsFilter();
  });
  recordsPageSize.addEventListener("change", changeRecordPageSize);
  recordsPrev.addEventListener("click", async () => {
    if (recordPageIndex > 0) {
      await loadRecordPage(recordPageIndex - 1);
    }
  });
  recordsNext.addEventListener("click", async () => {
    if (recordsHasMore) {
      await loadRecordPage(recordPageIndex + 1);
    }
  });
  exportCsvButton.addEventListener("click", () => exportRecords("csv"));
  exportExcelButton.addEventListener("click", () => exportRecords("excel"));

  searchButton.addEventListener("click", async () => {
    const mobile = searchMobile.value.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      showMessage("कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।");
      return;
    }
    clearMessage();
    try {
      const response = await callService("kshamawaniAdminLookup", {
        mobile,
        accessKey,
      });
      renderRegistration(response.registration);
    } catch (error) {
      clearSearch();
      showMessage(error.message);
    }
  });

  deleteButton.addEventListener("click", async () => {
    if (!selectedRegistration) return;
    const confirmed = window.confirm(
      `${selectedRegistration.applicationCode} का पंजीकरण हटाएँ? यह केवल तब संभव है जब भौतिक कूपन जारी नहीं हुए हैं।`,
    );
    if (!confirmed) return;

    deleteButton.disabled = true;
    try {
      await callService("kshamawaniAdminDelete", {
        registrationId: selectedRegistration.applicationCode,
        accessKey,
      });
      clearSearch();
      showMessage("पंजीकरण हटा दिया गया।");
      await refresh();
    } catch (error) {
      showMessage(error.message);
      deleteButton.disabled = false;
    }
  });

  try {
    const response = await fetch(CONFIG_URL, { cache: "no-store" });
    if (!response.ok) throw Error();
    config = await response.json();
    if (accessKey) {
      try {
        await verifyAccessKey(accessKey, { persist: false });
        dashboard.classList.remove("hidden");
        await refresh();
      } catch (error) {
        sessionStorage.removeItem(ACCESS_STORAGE_KEY);
        accessKey = "";
        accessPanel.classList.remove("hidden");
        accessVerified.classList.add("hidden");
        dashboard.classList.add("hidden");
        showMessage(error.message);
      }
    }
  } catch {
    showMessage("कॉन्फ़िगरेशन लोड नहीं हो सका।");
  }
});
