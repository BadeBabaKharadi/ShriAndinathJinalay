(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const BASE = "https://asia-south1-jain-community-platform.cloudfunctions.net";
  let kind = "food", selectedAadhaar = null, existingAadhaar = false, removeAadhaar = false, previewUrl = null;

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
      name.textContent = "चुनी गई फ़ाइल: " + selectedAadhaar.name;
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
  }
  function setKind(next) {
    kind = next;
    $("kind").value = next;
    $("registrationCard").classList.remove("event-hidden");
    $("formFields").classList.add("event-hidden");
    $("foodFields").classList.toggle("event-hidden", next !== "food");
    $("stayFields").classList.toggle("event-hidden", next !== "stay");
    $("confirmation").classList.add("event-hidden");
    $("message").textContent = "";
    $("mobile").value = "";
    selectedAadhaar = null; existingAadhaar = false; removeAadhaar = false; $("aadhaar").value = "";
    renderAadhaarPreview();
    $("submit").classList.add("event-hidden");
    $("registrationCard").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  document.querySelectorAll("[data-kind]").forEach(button => button.addEventListener("click", () => setKind(button.dataset.kind)));
  $("lookup").addEventListener("click", async () => {
    try {
      const result = await call("octoberEventLookup", { kind, mobile: $("mobile").value });
      if (!result.exists) {
        selectedAadhaar = null; existingAadhaar = false; removeAadhaar = false; $("aadhaar").value = ""; renderAadhaarPreview();
        $("formFields").classList.remove("event-hidden");
        $("submit").classList.remove("event-hidden");
        message("इस मोबाइल नंबर से पंजीकरण नहीं मिला। नई जानकारी भरकर सुरक्षित करें।");
        return;
      }
      const r = result.registration;
      ["name", "address", "comingFrom", "checkInDate", "checkInTime", "checkOutDate", "checkOutTime", "male", "female", "children", "coupons"].forEach(key => { if ($(key) && r[key] !== undefined) $(key).value = r[key]; });
      selectedAadhaar = null; $("aadhaar").value = "";
      existingAadhaar = kind === "stay" && Boolean(r.aadhaarUploaded); removeAadhaar = false;
      renderAadhaarPreview();
      $("formFields").classList.remove("event-hidden");
      $("submit").classList.remove("event-hidden");
      message("पुरानी जानकारी लोड हो गई है। संशोधित करके दोबारा सुरक्षित कर सकते हैं।");
    } catch (e) { message(friendlyError(e), true); }
  });
  $("eventForm").addEventListener("submit", async event => {
    event.preventDefault();
    if ($("submit").disabled) return;
    setSubmitting(true);
    try {
      const data = { kind, mobile: $("mobile").value, name: $("name").value, address: $("address").value };
      if (kind === "food") data.coupons = Number($("coupons").value);
      else {
        Object.assign(data, { comingFrom: $("comingFrom").value, checkInDate: $("checkInDate").value, checkInTime: $("checkInTime").value, checkOutDate: $("checkOutDate").value, checkOutTime: $("checkOutTime").value, male: Number($("male").value), female: Number($("female").value), children: Number($("children").value) });
        if (selectedAadhaar) {
          if (selectedAadhaar.size > 5 * 1024 * 1024) throw new Error("आधार फाइल 5 MB से छोटी होनी चाहिए।");
          if (!["application/pdf", "image/jpeg", "image/png"].includes(selectedAadhaar.type)) throw new Error("आधार के लिए PDF, JPG या PNG फ़ाइल चुनें।");
          data.aadhaarFileName = selectedAadhaar.name;
          data.aadhaarMime = selectedAadhaar.type;
          data.aadhaarBase64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(selectedAadhaar); });
        } else if (removeAadhaar) data.removeAadhaar = true;
      }
      const result = await call("octoberEventSave", data);
      const r = result.registration;
      $("confirmation").classList.remove("event-hidden");
      $("confirmText").textContent = "आपकी जानकारी सुरक्षित है। QR को आयोजन स्थल पर दिखाएँ।";
      $("confirmCode").textContent = r.registrationId;
      if (window.QRCode) {
        $("qr").replaceChildren();
        new QRCode($("qr"), { text: JSON.stringify({ event: "october-2026", kind, registrationId: r.registrationId }), width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
      } else throw new Error("QR कोड लोड नहीं हो पाया। पृष्ठ रीफ़्रेश करके पुनः प्रयास करें।");
      message(result.exists ? "पंजीकरण अपडेट हो गया।" : "पंजीकरण सफल हुआ।");
      $("submit").textContent = "✓ पंजीकरण सुरक्षित हुआ";
      window.scrollTo({ top: $("confirmation").offsetTop, behavior: "smooth" });
    } catch (e) {
      message(friendlyError(e) || "पंजीकरण सुरक्षित नहीं हो सका।", true);
    } finally {
      setSubmitting(false);
    }
  });
  $("printQr").addEventListener("click", () => window.print());
  setupAadhaarControls();
})();