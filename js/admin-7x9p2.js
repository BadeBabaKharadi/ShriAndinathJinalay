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
  let config;
  let accessKey = sessionStorage.getItem(ACCESS_STORAGE_KEY) || "";
  let selectedRegistration = null;

  const showMessage = (text) => {
    message.textContent = text;
    message.classList.remove("hidden");
  };
  const clearMessage = () => {
    message.textContent = "";
    message.classList.add("hidden");
  };

  const callFirebase = async (functionName, data) => {
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
    return payload.result;
  };

  const verifyAccessKey = async (candidateKey, { persist = true } = {}) => {
    if (!candidateKey) {
      throw new Error("सुरक्षा कुंजी दर्ज करें।");
    }

    await callFirebase("kshamawaniVerifyAccess", {
      accessKey: candidateKey,
    });

    accessKey = candidateKey;
    if (persist) {
      sessionStorage.setItem(ACCESS_STORAGE_KEY, accessKey);
    }
    accessPanel.classList.add("hidden");
    accessVerified.classList.remove("hidden");
  };

  const renderStats = (stats) => {
    document.getElementById("registrations").textContent = stats.registrations;
    document.getElementById("booked").textContent = stats.totalCouponsBooked;
    document.getElementById("issued").textContent = stats.totalPhysicalCouponsIssued;
    document.getElementById("pending").textContent = stats.pendingPhysicalCouponRegistrations;
    document.getElementById("average").textContent = stats.averageCouponsPerRegistration;
    document.getElementById("issuedRegistrations").textContent = stats.registrationsWithTokens;

    document.getElementById("date-rows").innerHTML =
      stats.byDate.length
        ? stats.byDate.map((row) => `
            <tr><td>${row.date}</td><td>${row.registrations}</td><td>${row.coupons}</td><td>${row.physicalCouponsIssued}</td></tr>
          `).join("")
        : '<tr><td colspan="4">अभी कोई पंजीकरण नहीं है।</td></tr>';

    document.getElementById("coupon-breakdown").innerHTML =
      stats.byCouponCount.map((row) =>
        `<span class="chip">${row.coupons} कूपन: <strong>${row.count}</strong></span>`,
      ).join("");
  };

  const refresh = async () => {
    try {
      const stats = await callFirebase("kshamawaniAdminStats", {
        eventId: config.id,
        accessKey,
      });
      renderStats(stats);
    } catch (error) {
      showMessage(error.message);
    }
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
  document.getElementById("refresh").addEventListener("click", refresh);

  searchButton.addEventListener("click", async () => {
    const mobile = searchMobile.value.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      showMessage("कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।");
      return;
    }
    clearMessage();
    try {
      const response = await callFirebase("kshamawaniAdminLookup", {
        mobile,
        accessKey,
      });
      renderRegistration(response.registration);
    } catch (error) {
      selectedRegistration = null;
      deleteButton.disabled = true;
      searchResult.classList.add("hidden");
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
      await callFirebase("kshamawaniAdminDelete", {
        registrationId: selectedRegistration.applicationCode,
        accessKey,
      });
      selectedRegistration = null;
      searchResult.classList.add("hidden");
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
