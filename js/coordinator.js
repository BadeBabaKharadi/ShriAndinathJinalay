const CONFIG_URL = "data/kshamawani-2026.json";

document.addEventListener("DOMContentLoaded", async () => {
  const status = document.getElementById("status");
  const result = document.getElementById("result");
  const input = document.getElementById("manual-code");
  const scannerElement = document.getElementById("scanner");
  let config;
  let scanner = null;

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

  const hideScanner = async () => {
    if (scanner) {
      try {
        await scanner.clear();
      } catch {
        // The camera may already have stopped after a successful scan.
      }
      scanner = null;
    }
    scannerElement.classList.add("hidden");
  };

  const render = (registration, issued = false) => {
    result.className = "result" + (issued ? " issued" : "");
    result.classList.remove("hidden");
    result.innerHTML = \`
      \${issued ? "" : '<div class="token-actions"><button id="issue-token" class="button primary" type="button">भौतिक टोकन जारी करें</button></div>'}
      <div class="result-grid">
        <div class="result-item"><span>नाम</span><strong>\${esc(registration.name)}</strong></div>
        <div class="result-item"><span>मोबाइल</span><strong>\${esc(registration.mobile)}</strong></div>
        <div class="result-item"><span>पता</span><strong>\${esc(registration.address)}</strong></div>
        <div class="result-item"><span>कूपन</span><strong>\${esc(registration.coupons)}</strong></div>
        <div class="result-item"><span>आवेदन कोड</span><strong>\${esc(registration.registrationId || registration.applicationCode)}</strong></div>
        <div class="result-item"><span>टोकन स्थिति</span><strong>\${issued ? "टोकन पहले जारी हो चुके हैं" : "टोकन जारी नहीं हुए"}</strong></div>
      </div>\`;

    if (!issued) {
      document
        .getElementById("issue-token")
        .addEventListener("click", () => issue(registration));
    }
  };

  const lookupByMobile = (mobile) =>
    new Promise((resolve, reject) => {
      const callbackName =
        "kwCoord_" +
        Date.now() +
        "_" +
        Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      const timeout = setTimeout(() => {
        cleanup();
        reject(Error("सत्यापन सेवा से प्रतिक्रिया नहीं मिली।"));
      }, 15000);

      function cleanup() {
        clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }

      window[callbackName] = (response) => {
        cleanup();
        resolve(response);
      };
      script.onerror = () => {
        cleanup();
        reject(Error("सत्यापन सेवा से संपर्क नहीं हो सका।"));
      };
      script.src =
        \`\${config.registration.apiUrl}?api=lookupRegistration&eventId=\${encodeURIComponent(config.id)}&mobile=\${encodeURIComponent(mobile)}&callback=\${callbackName}\`;
      document.body.appendChild(script);
    });

  const lookupByCode = (code) =>
    new Promise((resolve, reject) => {
      const callbackName =
        "kwCoordCode_" +
        Date.now() +
        "_" +
        Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      const timeout = setTimeout(() => {
        cleanup();
        reject(Error("सत्यापन सेवा से प्रतिक्रिया नहीं मिली।"));
      }, 15000);

      function cleanup() {
        clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }

      window[callbackName] = (response) => {
        cleanup();
        resolve(response);
      };
      script.onerror = () => {
        cleanup();
        reject(Error("सत्यापन सेवा से संपर्क नहीं हो सका।"));
      };
      script.src =
        \`\${config.registration.apiUrl}?api=lookupRegistration&eventId=\${encodeURIComponent(config.id)}&code=\${encodeURIComponent(code)}&callback=\${callbackName}\`;
      document.body.appendChild(script);
    });

  const issue = (registration) => {
    setStatus("टोकन जारी करने की एंट्री सुरक्षित की जा रही है…");

    const iframeName = "kwIssue_" + Date.now();
    const iframe = document.createElement("iframe");
    const form = document.createElement("form");

    iframe.name = iframeName;
    iframe.hidden = true;
    document.body.appendChild(iframe);

    form.method = "POST";
    form.action = config.registration.apiUrl;
    form.target = iframeName;
    form.hidden = true;

    const payload = document.createElement("input");
    payload.type = "hidden";
    payload.name = "payload";
    payload.value = JSON.stringify({
      action: "markTokensIssued",
      data: {
        eventId: config.id,
        registrationId: registration.registrationId,
        mobile: registration.mobile,
        coupons: Number(registration.coupons),
      },
    });
    form.appendChild(payload);
    document.body.appendChild(form);

    const timeout = setTimeout(() => {
      cleanup();
      setStatus("टोकन एंट्री की पुष्टि नहीं हो सकी।", "error");
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      form.remove();
      iframe.remove();
    }

    iframe.onload = () => {
      cleanup();
      setStatus("टोकन जारी करने की एंट्री सुरक्षित हो गई।");
      render(registration, true);
      result.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    form.submit();
  };

  const verify = async (raw) => {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    let code = parsed?.applicationCode || "";
    let mobile = parsed?.mobile || "";
    const compact = String(raw || "")
      .trim()
      .split("|");

    if (!code && compact.length === 3 && compact[0] === "KW26") {
      code = compact[1];
      mobile = compact[2];
    }

    if (!code) code = String(raw || "").trim();

    if (
      parsed &&
      (parsed.eventId !== config.id ||
        !code ||
        !/^[6-9]\d{9}$/.test(String(mobile)))
    ) {
      setStatus("अमान्य QR कोड।", "error");
      return;
    }

    setStatus("आवेदन की जाँच हो रही है…");
    try {
      const response = mobile
        ? await lookupByMobile(mobile)
        : await lookupByCode(code);

      if (!response?.success || !response.exists) {
        throw Error("यह आवेदन नहीं मिला।");
      }

      const registration = response.registration || {};
      const actualCode = String(
        registration.registrationId || registration.applicationCode || "",
      );

      if (actualCode !== code || registration.eventId !== config.id) {
        throw Error("आवेदन कोड रिकॉर्ड से मेल नहीं खाता।");
      }

      await hideScanner();
      render(registration, Boolean(registration.tokensIssued));
      setStatus("आवेदन सत्यापित है।");
      result.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setStatus(error.message || "सत्यापन असफल रहा।", "error");
    }
  };

  try {
    const response = await fetch(CONFIG_URL, { cache: "no-store" });
    if (!response.ok) throw Error();
    config = await response.json();
  } catch {
    setStatus("कॉन्फ़िगरेशन लोड नहीं हो सकी।", "error");
    return;
  }

  document
    .getElementById("manual-button")
    .addEventListener("click", () => verify(input.value));

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") verify(input.value);
  });

  if (window.Html5QrcodeScanner) {
    scanner = new Html5QrcodeScanner(
      "scanner",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
      },
      false,
    );
    scanner.render((decoded) => verify(decoded), () => {});
  } else {
    setStatus(
      "कैमरा स्कैनर लोड नहीं हुआ। आवेदन कोड हाथ से दर्ज करें।",
      "error",
    );
  }
});
