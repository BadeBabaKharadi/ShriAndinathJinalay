const CONFIG_URL = "data/kshamawani-2026.json";
const ACCESS_STORAGE_KEY = "kw26-coordinator-access";

document.addEventListener("DOMContentLoaded", async () => {
  const status = document.getElementById("status");
  const result = document.getElementById("result");
  const input = document.getElementById("manual-code");
  const scannerElement = document.getElementById("scanner");
  const startPanel = document.getElementById("scanner-start-panel");
  const accessPanel = document.getElementById("access-panel");
  const accessVerified = document.getElementById("access-verified");
  const accessKeyInput = document.getElementById("access-key");
  const accessButton = document.getElementById("access-button");
  const accessStatus = document.getElementById("access-status");
  let config;
  let scanner = null;
  let scannerStarting = false;
  let verificationInProgress = false;
  let accessKey = sessionStorage.getItem(ACCESS_STORAGE_KEY) || "";

  const setStatus = (text, className = "") => {
    status.textContent = text;
    status.className = "status " + className;
  };

  const esc = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

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
      throw new Error("Firebase कनेक्टिविटी में समस्या है। कृपया फिर से प्रयास करें।");
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("Firebase से सही प्रतिक्रिया नहीं मिली।");
    }

    if (!response.ok || payload.error) {
      const code = String(payload.error?.status || "")
        .toLowerCase()
        .replaceAll("_", "-");
      if (code === "permission-denied") {
        sessionStorage.removeItem(ACCESS_STORAGE_KEY);
        accessKey = "";
        throw new Error("सुरक्षा कुंजी गलत है या समाप्त हो गई है।");
      }
      throw new Error(
        payload.error?.status === "internal"
          ? "Firebase कनेक्टिविटी में समस्या है। कृपया फिर से प्रयास करें।"
          : payload.error?.message || "सत्यापन सेवा उपलब्ध नहीं है.",
      );
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
    accessStatus.textContent = "";
  };

  const hideScanner = async () => {
    if (scanner) {
      try {
        await scanner.stop();
      } catch {}
      try {
        scanner.clear();
      } catch {}
      scanner = null;
    }
    scannerStarting = false;
    scannerElement.classList.add("hidden");
    scannerElement.innerHTML = "";
  };

  const showScannerStart = () => {
    startPanel.classList.remove("hidden");
    scannerElement.classList.add("hidden");
    scannerElement.innerHTML = "";
  };

  const chooseCamera = (cameras) => {
    if (!cameras?.length) return null;
    const preferred = cameras.find((camera) =>
      /back|rear|environment|trás|tras/i.test(camera.label || ""),
    );
    return preferred || cameras[cameras.length - 1];
  };

  async function startCamera() {
    if (scannerStarting || scanner || !accessKey) return;
    scannerStarting = true;
    const button = document.getElementById("start-camera");
    if (button) {
      button.disabled = true;
      button.textContent = "कैमरा शुरू हो रहा है…";
    }
    setStatus("कैमरा अनुमति की प्रतीक्षा है…");

    try {
      const cameras = await Html5Qrcode.getCameras();
      const camera = chooseCamera(cameras);
      if (!camera) throw new Error("इस डिवाइस पर कोई कैमरा उपलब्ध नहीं मिला।");

      startPanel.classList.add("hidden");
      scannerElement.classList.remove("hidden");
      scanner = new Html5Qrcode("scanner", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });

      await scanner.start(
        { deviceId: { exact: camera.id } },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.777,
          disableFlip: true,
        },
        async (decoded) => {
          if (verificationInProgress) return;
          verificationInProgress = true;
          await hideScanner();
          await verify(decoded);
          verificationInProgress = false;
        },
        () => {},
      );
      setStatus("QR कोड कैमरे के सामने रखें।");
    } catch (error) {
      scanner = null;
      startPanel.classList.remove("hidden");
      const message =
        error?.message ||
        "कैमरा शुरू नहीं हो सका। कृपया ब्राउज़र में कैमरा अनुमति दें।";
      setStatus(message, "error");
    } finally {
      scannerStarting = false;
      if (button) {
        button.disabled = false;
        button.textContent = "📷 कैमरा शुरू करें";
      }
    }
  }

  const render = (registration, issued = false) => {
    result.className = "result" + (issued ? " issued" : "");
    result.classList.remove("hidden");
    result.innerHTML = `
      <div class="result-actions">
        <button id="scan-next" class="button secondary" type="button">अगला QR कोड स्कैन करें</button>
        ${issued ? "" : '<button id="issue-token" class="button primary" type="button">भौतिक कूपन जारी करें</button>'}
      </div>
      <div class="result-grid">
        <div class="result-item"><span>नाम</span><strong>${esc(registration.name)}</strong></div>
        <div class="result-item"><span>मोबाइल</span><strong>${esc(registration.mobile)}</strong></div>
        <div class="result-item"><span>पता</span><strong>${esc(registration.address)}</strong></div>
        <div class="result-item"><span>कूपन</span><strong>${esc(registration.coupons)}</strong></div>
        <div class="result-item"><span>आवेदन कोड</span><strong>${esc(registration.registrationId || registration.applicationCode)}</strong></div>
        <div class="result-item"><span>टोकन स्थिति</span><strong>${issued ? "भौतिक कूपन जारी हो चुके हैं" : "भौतिक कूपन जारी नहीं हुए"}</strong></div>
      </div>`;

    const issueButton = document.getElementById("issue-token");
    if (issueButton) {
      issueButton.addEventListener("click", () => issue(registration));
    }
    document.getElementById("scan-next").addEventListener("click", async () => {
      result.classList.add("hidden");
      result.innerHTML = "";
      showScannerStart();
      setStatus("कैमरा शुरू करने के लिए बटन दबाएँ।");
      startPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const issue = async (registration) => {
    const button = document.getElementById("issue-token");
    if (button) {
      button.disabled = true;
      button.textContent = "सहेजा जा रहा है…";
    }
    setStatus("भौतिक कूपन जारी होने की एंट्री सुरक्षित की जा रही है…");
    try {
      const saved = await callFirebase("kshamawaniIssue", {
        applicationCode: registration.registrationId || registration.applicationCode,
        accessKey,
        issuedBy: "COORDINATOR",
      });
      render(saved.registration, true);
      setStatus("भौतिक कूपन जारी होने की एंट्री सुरक्षित हो गई।", "success");
    } catch (error) {
      if (button) {
        button.disabled = false;
        button.textContent = "भौतिक कूपन जारी करें";
      }
      setStatus(error.message, "error");
    }
  };

  const parseQr = (value) => {
    const parts = String(value || "").trim().split("|");
    if (parts.length !== 3 || parts[0] !== "KW26") {
      throw new Error("यह क्षमावाणी २०२६ का मान्य QR कोड नहीं है।");
    }
    return { applicationCode: parts[1], mobile: parts[2] };
  };

  async function verify(decoded) {
    if (!accessKey) {
      setStatus("पहले सुरक्षा कुंजी सक्रिय करें।", "error");
      return;
    }
    try {
      const parsed = parseQr(decoded);
      setStatus("आवेदन सत्यापित किया जा रहा है…");
      const response = await callFirebase("kshamawaniCoordinatorLookup", {
        applicationCode: parsed.applicationCode,
        mobile: parsed.mobile,
        accessKey,
      });
      const registration = response.registration;
      render(registration, registration.tokensIssued === true);
      setStatus(
        registration.tokensIssued
          ? "यह आवेदन पहले ही जारी किया जा चुका है।"
          : "आवेदन सत्यापित हो गया।",
        registration.tokensIssued ? "error" : "success",
      );
      result.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setStatus(error.message, "error");
      showScannerStart();
    }
  }

  const lookupManual = async () => {
    const code = input.value.trim().toUpperCase();
    if (!/^KW26-\d{4}$/.test(code)) {
      setStatus("कृपया सही आवेदन कोड दर्ज करें।", "error");
      return;
    }
    try {
      setStatus("आवेदन सत्यापित किया जा रहा है…");
      const response = await callFirebase("kshamawaniCoordinatorLookup", {
        applicationCode: code,
        accessKey,
      });
      render(response.registration, response.registration.tokensIssued === true);
      setStatus("आवेदन सत्यापित हो गया।", "success");
      result.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setStatus(error.message, "error");
    }
  };

  const activateAccess = async () => {
    const value = accessKeyInput.value.trim();
    if (!value) {
      accessStatus.textContent = "सुरक्षा कुंजी दर्ज करें।";
      return;
    }

    accessButton.disabled = true;
    accessButton.textContent = "सत्यापित हो रहा है…";
    accessStatus.textContent = "सुरक्षा कुंजी सत्यापित की जा रही है…";
    setStatus("Firebase से सत्यापन किया जा रहा है…");

    try {
      await verifyAccessKey(value);
      accessKeyInput.value = "";
      setStatus("सत्यापन पूरा है। कैमरा शुरू करें या आवेदन कोड दर्ज करें।", "success");
      showScannerStart();
    } catch (error) {
      accessStatus.textContent = error.message;
      setStatus(error.message, "error");
      sessionStorage.removeItem(ACCESS_STORAGE_KEY);
      accessKey = "";
    } finally {
      accessButton.disabled = false;
      accessButton.textContent = "सक्रिय करें";
    }
  };

  accessButton.addEventListener("click", activateAccess);
  accessKeyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") activateAccess();
  });
  document.getElementById("start-camera").addEventListener("click", startCamera);
  document.getElementById("manual-button").addEventListener("click", lookupManual);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") lookupManual();
  });

  try {
    const response = await fetch(CONFIG_URL, { cache: "no-store" });
    if (!response.ok) throw Error();
    config = await response.json();
    if (accessKey) {
      try {
        await verifyAccessKey(accessKey, { persist: false });
        setStatus("सत्यापन पूरा है। कैमरा शुरू करें या आवेदन कोड दर्ज करें।", "success");
        showScannerStart();
      } catch (error) {
        sessionStorage.removeItem(ACCESS_STORAGE_KEY);
        accessKey = "";
        accessStatus.textContent = error.message;
        setStatus(error.message, "error");
      }
    }
  } catch {
    setStatus("कॉन्फ़िगरेशन लोड नहीं हो सका। कृपया पृष्ठ पुनः खोलें।", "error");
  }
});
