const KSHAMAWANI_CONFIG = "data/kshamawani-2026.json";

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("kshamawani-form");
  const lookupMobile = document.getElementById("lookup-mobile");
  const lookupButton = document.getElementById("lookup-button");
  const lookupMessage = document.getElementById("lookup-message");
  const lookupPanel = document.getElementById("mobile-lookup-panel");
  const details = document.getElementById("details-section");
  const message = document.getElementById("form-message");
  const button = document.getElementById("submit-button");
  const success = document.getElementById("success-section");
  const intro = document.getElementById("intro");
  const instruction = document.getElementById("venue-instruction");
  const editButton = document.getElementById("edit-button");
  const openingOverlay = document.getElementById(
    "registration-opening-overlay",
  );
  const openingClose = document.getElementById("registration-opening-close");
  let config;
  let existingRegistration = null;

  const cleanMobile = (value) => String(value || "").replace(/\D/g, "");

  const showMessage = (element, text) => {
    element.textContent = text;
    element.classList.remove("hidden");
  };

  const clearMessage = (element) => {
    element.textContent = "";
    element.classList.add("hidden");
  };

  const setRegistrationAvailability = () => {
    const opensAt = new Date(config.registration.opensAt);
    const isOpen =
      !Number.isNaN(opensAt.getTime()) && Date.now() >= opensAt.getTime();

    openingOverlay.classList.toggle("hidden", isOpen);
    lookupMobile.disabled = !isOpen;
    lookupButton.disabled = !isOpen;

    if (!isOpen) {
      showMessage(
        lookupMessage,
        "क्षमावाणी २०२६ का भोजन पंजीकरण आज शाम ४:३० बजे खुलेगा। कृपया ४:३० बजे के बाद इस पृष्ठ पर पुनः आएँ।",
      );
    } else {
      clearMessage(lookupMessage);
    }

    return isOpen;
  };

  const validateMobile = (mobile) =>
    /^[6-9]\d{9}$/.test(cleanMobile(mobile));

  const validateDetails = (data) => {
    if (!data.name.trim()) return "कृपया नाम दर्ज करें।";
    if (!data.address.trim()) return "कृपया पूरा पता दर्ज करें।";
    if (!validateMobile(data.mobile)) {
      return "कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।";
    }
    if (
      !Number.isInteger(data.coupons) ||
      data.coupons < 1 ||
      data.coupons > Number(config.registration.maxCoupons)
    ) {
      return `एक पंजीकरण में अधिकतम ${Number(config.registration.maxCoupons)} भोजन कूपन लिए जा सकते हैं।`;
    }
    return null;
  };

  const qr = (code, mobile) => {
    const holder = document.getElementById("qr-code");
    holder.innerHTML = "";

    if (typeof window.qrcode !== "function") {
      showMessage(message, "QR कोड तैयार नहीं हो सका। कृपया पुनः प्रयास करें।");
      return;
    }

    // Keep the QR payload deliberately short so generation and scanning are fast.
    const payload = `KW26|${code}|${mobile}`;
    const generator = window.qrcode(0, "L");
    generator.addData(payload);
    generator.make();
    holder.innerHTML = generator.createSvgTag({
      scalable: true,
      margin: 3,
    });
  };

  const showSuccess = (registration, status = "created") => {
    const code =
      registration.registrationId || registration.applicationCode || "";
    const title = document.getElementById("success-title");
    const summary = document.getElementById("success-summary");

    if (status === "existing") {
      title.textContent = "आपका पंजीकरण पहले से दर्ज है";
      summary.textContent =
        `${registration.name || "आवेदक"} के लिए ${registration.coupons || 1} भोजन कूपन पहले से दर्ज हैं।`;
    } else if (status === "updated") {
      title.textContent = "पंजीकरण सफलतापूर्वक अपडेट हुआ";
      summary.textContent =
        `${registration.name || "आवेदक"} के लिए ${registration.coupons || 1} भोजन कूपन अपडेट किए गए हैं।`;
    } else {
      title.textContent = "पंजीकरण सफल रहा";
      summary.textContent =
        `${registration.name || "आवेदक"} के लिए ${registration.coupons || 1} भोजन कूपन दर्ज किए गए हैं।`;
    }

    document.getElementById("application-code").textContent = code || "—";
    qr(code, registration.mobile);
    instruction.textContent = config.messages.venueInstruction;

    const tokensIssued =
      registration.tokensIssued === true ||
      String(registration.tokensIssued || "").toUpperCase() === "YES";
    const canEdit = !tokensIssued;
    editButton.classList.toggle("hidden", !canEdit);
    editButton.disabled = !canEdit;
    lookupPanel.classList.add("hidden");
    details.classList.add("hidden");
    success.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showDetails = (registration) => {
    if (registration?.tokensIssued) {
      showMessage(
        lookupMessage,
        "इस पंजीकरण के लिए टोकन पहले ही जारी हो चुके हैं। अब पंजीकरण अपडेट नहीं किया जा सकता।",
      );
      return;
    }
    existingRegistration = registration || null;
    document.getElementById("name").value = registration?.name || "";
    document.getElementById("address").value = registration?.address || "";
    document.getElementById("mobile").value =
      registration?.mobile || cleanMobile(lookupMobile.value);
    document.getElementById("coupons").value = registration?.coupons || "";
    lookupPanel.classList.add("hidden");
    success.classList.add("hidden");
    details.classList.remove("hidden");
    clearMessage(message);
    document.getElementById("name").focus();
  };

  const resetToMobileLookup = () => {
    existingRegistration = null;
    success.classList.add("hidden");
    details.classList.add("hidden");
    lookupPanel.classList.remove("hidden");
    clearMessage(message);
    clearMessage(lookupMessage);
    lookupMobile.focus();
  };

  const callFirebase = async (functionName, data) => {
    const url =
      `${config.registration.firebaseFunctionsBaseUrl}/${functionName}`;
    let response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({ data }),
      });
    } catch {
      throw new Error("पंजीकरण सेवा से संपर्क नहीं हो सका।");
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("पंजीकरण सेवा से सही प्रतिक्रिया नहीं मिली।");
    }

    if (!response.ok || payload.error) {
      const code = String(payload.error?.status || "").toLowerCase();
      const serverMessage = payload.error?.message || "";

      if (code === "already-exists") {
        throw new Error(
          "यह मोबाइल नंबर अभी-अभी पंजीकृत हुआ है। कृपया पंजीकरण जाँचें।",
        );
      }
      if (code === "failed-precondition") {
        throw new Error(serverMessage || "पंजीकरण इस समय उपलब्ध नहीं है।");
      }
      if (code === "not-found") {
        throw new Error("पंजीकरण नहीं मिला।");
      }
      throw new Error(serverMessage || "पंजीकरण सेवा उपलब्ध नहीं है।");
    }

    return payload.result;
  };

  const lookup = (mobile) =>
    callFirebase("kshamawaniLookup", {
      eventId: config.id,
      mobile,
    });

  try {
    const response = await fetch(KSHAMAWANI_CONFIG, { cache: "no-store" });
    if (!response.ok) throw Error();
    config = await response.json();
    intro.textContent = config.messages.intro;
    setRegistrationAvailability();
    window.setInterval(setRegistrationAvailability, 1000);
    openingClose.addEventListener("click", () => {
      openingOverlay.classList.add("hidden");
    });
  } catch {
    showMessage(
      lookupMessage,
      "फॉर्म की जानकारी लोड नहीं हो सकी। कृपया पृष्ठ पुनः खोलें।",
    );
    return;
  }

  lookupButton.addEventListener("click", async () => {
    if (!setRegistrationAvailability()) return;
    clearMessage(lookupMessage);
    const mobile = cleanMobile(lookupMobile.value);

    if (!validateMobile(mobile)) {
      showMessage(lookupMessage, "कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।");
      return;
    }

    lookupButton.disabled = true;
    lookupButton.textContent = "जाँच हो रही है...";

    try {
      const response = await lookup(mobile);
      if (response?.exists) {
        existingRegistration = response.registration;
        showSuccess(response.registration, "existing");
      } else {
        showDetails(null);
      }
    } catch (error) {
      showMessage(
        lookupMessage,
        error.message || "पंजीकरण की जाँच नहीं हो सकी।",
      );
    } finally {
      lookupButton.disabled = false;
      lookupButton.textContent = "पंजीकरण जाँचें";
    }
  });

  lookupMobile.addEventListener("keydown", (event) => {
    if (event.key === "Enter") lookupButton.click();
  });

  editButton.addEventListener("click", () => {
    if (existingRegistration?.tokensIssued) {
      showMessage(
        lookupMessage,
        "इस पंजीकरण के लिए टोकन पहले ही जारी हो चुके हैं। अब पंजीकरण अपडेट नहीं किया जा सकता।",
      );
      return;
    }
    if (existingRegistration) showDetails(existingRegistration);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage(message);

    const data = {
      name: document.getElementById("name").value,
      address: document.getElementById("address").value,
      mobile: cleanMobile(document.getElementById("mobile").value),
      coupons: Number(document.getElementById("coupons").value),
    };

    const error = validateDetails(data);
    if (error) {
      showMessage(message, error);
      return;
    }

    button.disabled = true;
    button.textContent = existingRegistration
      ? "पंजीकरण अपडेट हो रहा है..."
      : "पंजीकरण दर्ज हो रहा है...";

    try {
      const action = existingRegistration
        ? "kshamawaniUpdate"
        : "kshamawaniCreate";
      const payload = {
        ...data,
        eventId: config.id,
        foodRequired: true,
        consentAccepted: true,
      };

      if (existingRegistration) {
        payload.registrationId =
          existingRegistration.registrationId ||
          existingRegistration.applicationCode;
      }

      const saved = await callFirebase(action, payload);
      existingRegistration = saved.registration;
      showSuccess(
        saved.registration,
        action === "kshamawaniUpdate" ? "updated" : "created",
      );
    } catch (saveError) {
      showMessage(
        message,
        saveError.message ||
          "पंजीकरण सुरक्षित नहीं हो सका। कृपया पुनः प्रयास करें।",
      );
    } finally {
      button.disabled = false;
      button.textContent = "पंजीकरण करें";
    }
  });

  document
    .getElementById("print-button")
    .addEventListener("click", () => window.print());
});
