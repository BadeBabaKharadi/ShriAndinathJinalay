(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const BASE = "https://asia-south1-jain-community-platform.cloudfunctions.net";
  let kind = "food", selectedAadhaar = null, existingAadhaar = false, legacyStayWithoutIdentity = false, removeAadhaar = false, previewUrl = null;


  function renderSubmittedSummary(data) {
    const summary = $("submittedSummary");
    summary.replaceChildren();
    const fields = kind === "food"
      ? [["नाम", data.name ?? $("name").value], ["मोबाइल नंबर", data.mobile ?? $("mobile").value], ["पता", data.address ?? $("address").value], ["शहर", data.city ?? $("city").value], ["राज्य", data.state ?? $("state").value], ["भोजन कूपन", data.coupons ?? $("coupons").value]]
      : [["नाम", data.name ?? $("name").value], ["मोबाइल नंबर", data.mobile ?? $("mobile").value], ["पता", data.address ?? $("address").value], ["कहाँ से आ रहे हैं?", data.city ?? data.comingFrom ?? $("city").value], ["राज्य", data.state ?? $("state").value], ["पिन कोड", data.pincode ?? $("pincode").value], ["आगमन", (data.checkInDate ?? $("checkInDate").value) + " " + (data.checkInTime ?? $("checkInTime").value)], ["प्रस्थान", (data.checkOutDate ?? $("checkOutDate").value) + " " + (data.checkOutTime ?? $("checkOutTime").value)], ["पुरुष", data.male ?? $("male").value], ["महिलाएँ", data.female ?? $("female").value], ["बच्चे", data.children ?? $("children").value]];
    fields.forEach(([label, value]) => {
      const row = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = label + ": ";
      row.append(strong, document.createTextNode(String(value ?? "—")));
      summary.appendChild(row);
    });
  }
  function renderRegistrationQr(registrationId) {
    $("confirmCode").textContent = registrationId;
    if (!window.QRCode) throw new Error("QR कोड लोड नहीं हो पाया। पृष्ठ रीफ़्रेश करके पुनः प्रयास करें।");
    $("qr").replaceChildren();
    new QRCode($("qr"), { text: JSON.stringify({ event: "october-2026", kind, registrationId }), width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
  }

  function setSubmitting(active) {
    const button = $("submit");
    button.disabled = active;
    button.setAttribute("aria-busy", String(active));
    button.innerHTML = active ? '<span class="event-spinner" aria-hidden="true"></span>कृपया प्रतीक्षा करें…' : "पंजीकरण सुरक्षित करें";
    $("aadhaarUploadStatus").classList.toggle("event-hidden", !(active && kind === "stay" && (selectedAadhaar || removeAadhaar)));
    $("aadhaarUploadStatus").setAttribute("aria-busy", String(active));
  }
  function message(text, error = false) {
    $("message").textContent = text;
    $("message").className = "event-msg";
    $("message").style.color = error ? "#a11" : "#164d22";
  }
  function friendlyError(error) {
    const text = String(error?.message || "");
    if (text === "Failed to fetch" || text.includes("NetworkError")) return "सर्वर से संपर्क नहीं हो पा रहा है। इंटरनेट कनेक्शन जाँचें और कुछ देर बाद फिर प्रयास करें।";
    return text || "सेवा अभी उपलब्ध नहीं है। कृपया दोबारा प्रयास करें।";
  }
  async function call(name, data) {
    const response = await fetch(BASE + "/" + name, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error?.message || "सेवा उपलब्ध नहीं है।");
    return payload.result ?? payload.data;
  }
  function setupAadhaarControls() {
    const input = $("aadhaar");
    const label = input.closest("label");
    const controls = document.createElement("div");
    controls.id = "aadhaarControls";
    controls.innerHTML = '<div id="aadhaarPreview" class="event-aadhaar-preview event-hidden" aria-live="polite"></div><div class="event-aadhaar-actions"><button class="event-btn" type="button" id="replaceAadhaar">दूसरी फ़ाइल चुनें</button><button class="event-btn event-aadhaar-remove" type="button" id="removeAadhaar">फ़ाइल हटाएँ</button></div><div id="aadhaarUploadStatus" class="event-aadhaar-upload event-hidden" role="status" aria-live="polite"><span class="event-spinner" aria-hidden="true"></span><span>आधार अपलोड हो रहा है… कृपया पृष्ठ बंद न करें।</span></div>';
    label.insertAdjacentElement("afterend", controls);
    const style = document.createElement("style");
    style.textContent = '.event-aadhaar-preview{margin:.7rem 0;padding:.8rem;border:1px solid #d9c8b2;border-radius:10px;background:#fffaf3;overflow:hidden}.event-aadhaar-preview img,.event-aadhaar-preview iframe{display:block;width:100%;max-width:440px;max-height:360px;min-height:180px;margin:.6rem auto 0;border:0;object-fit:contain}.event-aadhaar-file{font-weight:700;overflow-wrap:anywhere}.event-aadhaar-actions{display:flex;gap:.4rem;flex-wrap:wrap}.event-aadhaar-remove{background:#8c2e27}.event-aadhaar-upload{display:flex;align-items:center;gap:.6rem;padding:.8rem;margin:.6rem 0;border-radius:10px;background:#fff3d8;color:#70401e;font-weight:700}.event-aadhaar-upload .event-spinner{width:1.2em;height:1.2em;flex:0 0 auto}.event-aadhaar-actions button{margin:.3rem 0}';
    document.head.appendChild(style);
    $("replaceAadhaar").addEventListener("click", () => input.click());
    $("removeAadhaar").addEventListener("click", () => {
      selectedAadhaar = null;
      input.value = "";
      removeAadhaar = existingAadhaar;
      existingAadhaar = false;
      renderAadhaarPreview();
      message("आधार फ़ाइल हटाने के लिए पंजीकरण सुरक्षित करें।");
    });
    input.addEventListener("change", () => {
      selectedAadhaar = input.files[0] || null;
      if (selectedAadhaar) removeAadhaar = false;
      renderAadhaarPreview();
    });
    renderAadhaarPreview();
  }
  function renderAadhaarPreview() {
    const preview = $("aadhaarPreview");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    preview.replaceChildren();
    preview.classList.remove("event-hidden");
    const actions = $("aadhaarControls").querySelector(".event-aadhaar-actions");
    if (selectedAadhaar) {
      const name = document.createElement("div");
      name.className = "event-aadhaar-file";
      name.textContent = "चुनी गई पहचान दस्तावेज़ फ़ाइल: " + selectedAadhaar.name;
      preview.appendChild(name);
      const size = document.createElement("small");
      size.textContent = (selectedAadhaar.size / (1024 * 1024)).toFixed(2) + " MB";
      preview.appendChild(size);
      if (selectedAadhaar.type === "application/pdf" || selectedAadhaar.type.startsWith("image/")) {
        previewUrl = URL.createObjectURL(selectedAadhaar);
        const media = document.createElement(selectedAadhaar.type === "application/pdf" ? "iframe" : "img");
        media.src = previewUrl;
        media.title = "आधार फ़ाइल पूर्वावलोकन";
        if (media.tagName === "IMG") media.alt = "आधार कार्ड का पूर्वावलोकन";
        preview.appendChild(media);
      }
      actions.classList.remove("event-hidden");
      $("removeAadhaar").classList.remove("event-hidden");
    } else if (existingAadhaar && !removeAadhaar) {
      const status = document.createElement("div");
      status.className = "event-aadhaar-file";
      status.textContent = "✓ आधार पहले से अपलोड है। नई फ़ाइल चुनकर इसे बदल सकते हैं।";
      preview.appendChild(status);
      actions.classList.remove("event-hidden");
      $("removeAadhaar").classList.remove("event-hidden");
    } else if (removeAadhaar) {
      const status = document.createElement("div");
      status.textContent = "आधार फ़ाइल हटाने के लिए चुनी गई है। बदलाव सुरक्षित करने पर हटेगी।";
      preview.appendChild(status);
      actions.classList.remove("event-hidden");
      $("removeAadhaar").classList.add("event-hidden");
    } else {
      preview.classList.add("event-hidden");
      actions.classList.add("event-hidden");
    }
    // A previously uploaded file satisfies the required-document rule when editing.
    $("aadhaar").required =
      kind === "stay" && !selectedAadhaar && !(existingAadhaar && !removeAadhaar);
  }
  function setKind(next) {
    kind = next;
    $("kind").value = next;
    ["checkInDate", "checkInTime", "checkOutDate", "checkOutTime", "male", "female", "children", "identityDocumentType", "identityDocumentNumber", "aadhaar"].forEach(id => { const field = $(id); if (field) field.required = next === "stay"; });
    $("cityField").classList.remove("event-hidden"); $("stateField").classList.remove("event-hidden"); $("city").required = true; $("cityLabel").textContent = next === "stay" ? "कहाँ से आ रहे हैं? *" : "शहर *"; $("city").placeholder = next === "stay" ? "जिस शहर से यात्रा शुरू कर रहे हैं" : "शहर का नाम दर्ज करें"; $("state").required = true; $("pincode").required = next === "stay"; $("pinField").classList.toggle("event-hidden", next !== "stay"); $("registrationCard").classList.remove("event-hidden");
    $("lookupSection").classList.remove("event-hidden");
    $("formFields").classList.add("event-hidden");
    $("foodFields").classList.toggle("event-hidden", next !== "food");
    $("stayFields").classList.toggle("event-hidden", next !== "stay");
    $("confirmation").classList.add("event-hidden");
    $("lookupSection").classList.remove("event-hidden");
    $("message").textContent = "";
    $("mobile").value = "";
    selectedAadhaar = null; existingAadhaar = false; legacyStayWithoutIdentity = false; removeAadhaar = false; $("aadhaar").value = "";
    renderAadhaarPreview();
    $("submit").classList.add("event-hidden");
    $("registrationCard").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  document.querySelectorAll("[data-kind]").forEach(button => button.addEventListener("click", () => setKind(button.dataset.kind)));
  $("lookup").addEventListener("click", async () => {
    try {
      const result = await call("octoberEventLookup", { kind, mobile: $("mobile").value });
      if (!result.exists) {
        selectedAadhaar = null; existingAadhaar = false; legacyStayWithoutIdentity = false; removeAadhaar = false; $("aadhaar").value = ""; renderAadhaarPreview();
        $("formFields").classList.remove("event-hidden");
        $("submit").classList.remove("event-hidden");
        message("इस मोबाइल नंबर से पंजीकरण नहीं मिला। नई जानकारी भरकर सुरक्षित करें।");
        return;
      }
      const r = result.registration;
      ["name", "address", "city", "state", "pincode", "checkInDate", "checkInTime", "checkOutDate", "checkOutTime", "male", "female", "children", "coupons"].forEach(key => { if ($(key) && r[key] !== undefined) $(key).value = r[key]; });
      if (kind === "stay" && !r.city && r.comingFrom) $("city").value = r.comingFrom;
      if (kind === "stay") {
        ["checkInTime", "checkOutTime"].forEach(key => {
          const field = $(key);
          const time = String(r[key] ?? "");
          if (!field || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return;
          if (!Array.from(field.options).some(option => option.value === time)) {
            const option = document.createElement("option");
            option.value = time;
            option.textContent = time + " (पहले से दर्ज)";
            field.appendChild(option);
          }
          field.value = time;
        });
      }
      selectedAadhaar = null; $("aadhaar").value = "";
      existingAadhaar = kind === "stay" && Boolean(r.aadhaarUploaded); legacyStayWithoutIdentity = kind === "stay" && !r.identityDocumentNumber; removeAadhaar = false;
      renderAadhaarPreview();
      renderSubmittedSummary(r);
      renderRegistrationQr(r.registrationId);
      $("confirmationHeading").textContent = "आपका मौजूदा पंजीकरण";
      $("confirmText").textContent = "नीचे आपकी पहले से जमा जानकारी और QR कोड दिया गया है। बदलाव करने के लिए संशोधन चुनें।";
      $("editRegistration").classList.remove("event-hidden");
      $("confirmation").classList.remove("event-hidden");
      $("lookupSection").classList.add("event-hidden");
      $("formFields").classList.add("event-hidden");
      $("submit").classList.add("event-hidden");
      window.scrollTo({ top: $("confirmation").offsetTop, behavior: "smooth" });
    } catch (e) { message(friendlyError(e), true); }
  });
  $("eventForm").addEventListener("submit", async event => {
    event.preventDefault();
    if ($("submit").disabled) return;
    setSubmitting(true);
    try {
      const data = { kind, mobile: $("mobile").value, name: $("name").value, address: $("address").value, city: $("city").value.trim(), state: $("state").value.trim() };
      if (kind === "food") data.coupons = Number($("coupons").value);
      else {
        const documentType = $("identityDocumentType").value;
        const documentNumber = $("identityDocumentNumber").value.trim().toUpperCase();
        const normalizedNumber = documentNumber.replace(/\s+/g, "");
        const patterns = { aadhaar: /^[2-9][0-9]{11}$/, pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/, driving_license: /^[A-Z0-9 -]{5,20}$/, voter_id: /^[A-Z]{3}[0-9]{7}$/ };
        if (normalizedNumber) {
          if (!patterns[documentType].test(normalizedNumber)) throw new Error(documentType === "aadhaar" ? "आधार नंबर 12 अंकों का होना चाहिए और 0 या 1 से शुरू नहीं होना चाहिए।" : documentType === "pan" ? "पैन नंबर का प्रारूप ABCDE1234F जैसा होना चाहिए।" : documentType === "voter_id" ? "वोटर आईडी का प्रारूप ABC1234567 जैसा होना चाहिए।" : "कृपया सही ड्राइविंग लाइसेंस नंबर दर्ज करें।");
          data.identityDocumentType = documentType;
          data.identityDocumentNumber = normalizedNumber;
        } else if (!legacyStayWithoutIdentity) {
          throw new Error("कृपया पहचान दस्तावेज़ संख्या दर्ज करें।");
        }
        Object.assign(data, { pincode: $("pincode").value.trim(), comingFrom: data.city, checkInDate: $("checkInDate").value, checkInTime: $("checkInTime").value, checkOutDate: $("checkOutDate").value, checkOutTime: $("checkOutTime").value, male: Number($("male").value), female: Number($("female").value), children: Number($("children").value) });
        if (selectedAadhaar) {
          if (selectedAadhaar.size > 5 * 1024 * 1024) throw new Error("दस्तावेज़ फ़ाइल 5 MB से छोटी होनी चाहिए।");
          if (!["application/pdf", "image/jpeg", "image/png"].includes(selectedAadhaar.type)) throw new Error("दस्तावेज़ के लिए PDF, JPG या PNG फ़ाइल चुनें।");
          data.aadhaarFileName = selectedAadhaar.name;
          data.aadhaarMime = selectedAadhaar.type;
          data.aadhaarBase64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(selectedAadhaar); });
        } else if (removeAadhaar) data.removeAadhaar = true;
      }
      const result = await call("octoberEventSave", data);
      const r = result.registration;
      renderSubmittedSummary(data);
      renderRegistrationQr(r.registrationId);
      $("confirmationHeading").textContent = "पंजीकरण सुरक्षित हुआ";
      $("confirmText").textContent = "आपकी जानकारी सुरक्षित है। नीचे जमा विवरण देखें और QR को आयोजन स्थल पर दिखाएँ।";
      $("editRegistration").classList.add("event-hidden");
      $("confirmation").classList.remove("event-hidden");
      $("lookupSection").classList.add("event-hidden");
      $("formFields").classList.add("event-hidden");
      $("submit").classList.add("event-hidden");
      message(result.exists ? "पंजीकरण अपडेट हो गया।" : "पंजीकरण सफल हुआ।");
      window.scrollTo({ top: $("confirmation").offsetTop, behavior: "smooth" });
    } catch (e) {
      message(friendlyError(e) || "पंजीकरण सुरक्षित नहीं हो सका।", true);
    } finally {
      setSubmitting(false);
    }
  });
  $("editRegistration").addEventListener("click", () => {
    $("confirmation").classList.add("event-hidden");
    $("lookupSection").classList.remove("event-hidden");
    $("formFields").classList.remove("event-hidden");
    $("submit").classList.remove("event-hidden");
    message("अब आप अपनी जानकारी संशोधित कर सकते हैं।");
    $("registrationCard").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("printQr").addEventListener("click", () => window.print());
  setupAadhaarControls();
})();