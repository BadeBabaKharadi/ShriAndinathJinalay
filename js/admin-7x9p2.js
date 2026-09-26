const CONFIG_URL = "data/kshamawani-2026.json";
const ACCESS_STORAGE_KEY = "kw26-admin-access";

document.addEventListener("DOMContentLoaded", async () => {
  const keyInput = document.getElementById("admin-key");
  const unlockButton = document.getElementById("unlock");
  const accessPanel = document.getElementById("access-panel");
  const accessVerified = document.getElementById("access-verified");
  const message = document.getElementById("admin-message");
  const dashboard = document.getElementById("dashboard");
  const searchMobile = document.getElementById("search-mobile");
  const searchButton = document.getElementById("search");
  const searchResult = document.getElementById("search-result");
  const deleteButton = document.getElementById("delete");
  const refreshButton = document.getElementById("refresh");
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

  const showMessage = (text) => {
    message.textContent = text;
    message.classList.remove("hidden");
  };
  const clearMessage = () => {
    message.textContent = "";
    message.classList.add("hidden");
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
      renderStats(stats);
    } catch (error) {
      showMessage(error.message);
    } finally {
      refreshButton.disabled = false;
      refreshButton.classList.remove("is-loading");
      refreshButton.removeAttribute("aria-busy");
      refreshButton.setAttribute("aria-label", "आँकड़े ताज़ा करें");
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
