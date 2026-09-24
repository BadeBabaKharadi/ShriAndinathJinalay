const KSHAMAWANI_CONFIG = "data/kshamawani-2026.json";

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("kshamawani-form");
  const message = document.getElementById("form-message");
  const button = document.getElementById("submit-button");
  const success = document.getElementById("success-section");
  const intro = document.getElementById("intro");
  const instruction = document.getElementById("venue-instruction");
  let config;

  const showMessage = (text) => {
    message.textContent = text;
    message.classList.remove("hidden");
  };

  const clearMessage = () => {
    message.textContent = "";
    message.classList.add("hidden");
  };

  const cleanMobile = (value) => String(value || "").replace(/\D/g, "");

  const validate = (data) => {
    if (!data.name.trim()) return "कृपया नाम दर्ज करें।";
    if (!data.address.trim()) return "कृपया पूरा पता दर्ज करें।";
    if (!/^[6-9]\d{9}$/.test(data.mobile)) {
      return "कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।";
    }
    if (
      !Number.isInteger(data.coupons) ||
      data.coupons < 1 ||
      data.coupons > config.registration.maxCoupons
    ) {
      return "कृपया कूपन की सही संख्या दर्ज करें।";
    }
    return null;
  };

  const qr = (code, mobile) => {
    const holder = document.getElementById("qr-code");
    holder.innerHTML = "";

    if (typeof window.qrcode !== "function") {
      showMessage("QR कोड तैयार नहीं हो सका। कृपया पुनः प्रयास करें।");
      return;
    }

    const generator = window.qrcode(0, "M");
    generator.addData(
      JSON.stringify({
        v: 1,
        eventId: config.id,
        applicationCode: code,
        mobile,
      }),
    );
    generator.make();
    holder.innerHTML = generator.createSvgTag({ scalable: true, margin: 4 });
  };

  const showSuccess = (registration, updated) => {
    const code = registration.registrationId || registration.applicationCode;
    document.getElementById("application-code").textContent = code || "—";
    document.getElementById("success-summary").textContent =
      `${registration.name || "आवेदक"} के लिए ${registration.coupons || 1} भोजन कूपन ${updated ? "अपडेट" : "दर्ज"} किए गए हैं।`;
    qr(code, registration.mobile);
    instruction.textContent = config.messages.venueInstruction;
    form.classList.add("hidden");
    success.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const lookup = (mobile) =>
    new Promise((resolve, reject) => {
      const callbackName =
        "kwLookup_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("सर्वर से प्रतिक्रिया नहीं मिली।"));
      }, 15000);

      function cleanup() {
        clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }

      window[callbackName] = (result) => {
        cleanup();
        resolve(result);
      };
      script.onerror = () => {
        cleanup();
        reject(new Error("पंजीकरण सेवा से संपर्क नहीं हो सका।"));
      };
      script.src =
        `${config.registration.apiUrl}?api=lookupRegistration&eventId=${encodeURIComponent(config.id)}&mobile=${encodeURIComponent(mobile)}&callback=${callbackName}`;
      document.body.appendChild(script);
    });

  const post = (action, data) =>
    new Promise((resolve, reject) => {
      const iframeName = "kwSubmit_" + Date.now();
      const iframe = document.createElement("iframe");
      iframe.name = iframeName;
      iframe.hidden = true;
      document.body.appendChild(iframe);

      const node = document.createElement("form");
      node.method = "POST";
      node.action = config.registration.apiUrl;
      node.target = iframeName;
      node.hidden = true;

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "payload";
      input.value = JSON.stringify({ action, data });
      node.appendChild(input);
      document.body.appendChild(node);

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("सर्वर से प्रतिक्रिया मिलने में अधिक समय लग रहा है।"));
      }, 20000);

      function cleanup() {
        clearTimeout(timeout);
        node.remove();
        iframe.remove();
      }

      iframe.onload = () => {
        cleanup();
        resolve({ success: true });
      };
      node.submit();
    });

  try {
    const response = await fetch(KSHAMAWANI_CONFIG, { cache: "no-store" });
    if (!response.ok) throw Error();
    config = await response.json();
    intro.textContent = config.messages.intro;
  } catch {
    showMessage("फॉर्म की जानकारी लोड नहीं हो सकी। कृपया पृष्ठ पुनः खोलें।");
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const data = {
      name: document.getElementById("name").value,
      address: document.getElementById("address").value,
      mobile: cleanMobile(document.getElementById("mobile").value),
      coupons: Number(document.getElementById("coupons").value),
    };

    const error = validate(data);
    if (error) {
      showMessage(error);
      return;
    }

    button.disabled = true;
    button.textContent = "जाँच हो रही है...";

    try {
      // Mobile number is the unique key. Always check the server first:
      // existing -> update the same application; missing -> create a new one.
      const existingResponse = await lookup(data.mobile);

      if (!existingResponse?.success) {
        throw new Error(
          existingResponse?.error || "पंजीकरण की जाँच नहीं हो सकी।",
        );
      }

      const existing = existingResponse.exists
        ? existingResponse.registration
        : null;

      button.textContent = existing
        ? "पंजीकरण अपडेट हो रहा है..."
        : "पंजीकरण दर्ज हो रहा है...";

      const action = existing ? "updateRegistration" : "createRegistration";
      const payload = {
        eventId: config.id,
        mobile: data.mobile,
        name: data.name.trim(),
        address: data.address.trim(),
        coupons: data.coupons,
        foodRequired: true,
        consentAccepted: true,
      };

      if (existing) {
        payload.registrationId =
          existing.registrationId || existing.applicationCode;
      }

      const saveResponse = await post(action, payload);

      // POST is intentionally fire-and-forget because the browser submits
      // to a hidden iframe. Re-read the record to verify the actual sheet state.
      if (saveResponse?.success === false) {
        throw new Error(saveResponse.error || "पंजीकरण सुरक्षित नहीं हो सका।");
      }

      const saved = await lookup(data.mobile);
      if (!saved?.success || !saved.exists) {
        throw new Error("पंजीकरण सुरक्षित होने की पुष्टि नहीं हो सकी।");
      }

      showSuccess(saved.registration, Boolean(existing));
    } catch (saveError) {
      showMessage(
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
