/* Pratibha Samman hard-copy records and passport-photo sheets. */
(() => {
  "use strict";
  const KEY = "ps26-admin-key";
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
  const base = location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5001/jain-community-platform/asia-south1"
    : "https://asia-south1-jain-community-platform.cloudfunctions.net";
  const adminKey = () => sessionStorage.getItem(KEY) || "";
  const call = async (name, data) => {
    const response = await fetch(base + "/" + name, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { ...data, accessKey: adminKey() } }),
    });
    const body = await response.json();
    if (!response.ok || body.error) throw new Error(body.error?.message || "आवेदन लोड नहीं हो सका।");
    return body.result ?? body.data;
  };
  const media = async (applicationId, path) => {
    const response = await fetch(base + "/pratibhaAdminMedia", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessKey: adminKey(), applicationId, path }),
    });
    if (!response.ok) throw new Error("दस्तावेज़ डाउनलोड नहीं हो सका।");
    return response.blob();
  };
  const dataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  const statusLabels = {
    SUBMITTED: "जमा", UNDER_REVIEW: "समीक्षा में", CONSIDERED_FOR_SAMMAN: "सम्मान हेतु चयनित",
    NOT_SELECTED: "चयनित नहीं", CLARIFICATION_REQUIRED: "स्पष्टीकरण आवश्यक", REJECTED: "अस्वीकृत",
  };
  const css = document.createElement("style");
  css.textContent = `
    .print-profile-action{background:#efe7da;color:#4e3219;border:1px solid #d8c5ac}
    .photo-batch-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0;padding:14px;background:#f7f2e9;border-radius:12px}
    .photo-batch-tools label{display:flex;gap:8px;align-items:center;font-weight:700}
    .photo-batch-tools input[type=checkbox],.photo-select{width:auto;accent-color:#7b3f00}
    .photo-select-label{display:flex;align-items:center;gap:5px;font-size:12px;color:#5e4b39;padding:0 12px 10px}
    .photo-select-label input{width:auto}
    @page{size:A4 portrait;margin:8mm}
    @media print{.print-tools{display:none!important}}
  `;
  document.head.appendChild(css);
  let addedTools = false;
  const selected = new Map();
  function addTools() {
    const rows = $("rows");
    if (!rows || ! $("app") || $("app").classList.contains("hidden")) return;
    if (!addedTools) {
      const toolbar = document.createElement("div");
      toolbar.className = "photo-batch-tools";
      toolbar.id = "pratibha-print-tools";
      toolbar.innerHTML = '<strong>प्रिंट एवं रिकॉर्ड</strong><label><input id="photo-select-all" type="checkbox"> सभी आवेदन चुनें</label><span id="photo-select-count">0 चयनित</span><button type="button" class="button primary" id="print-photo-sheet">चयनित फोटो A4 पर प्रिंट करें</button>';
      rows.parentElement.insertBefore(toolbar, rows);
      $("photo-select-all").addEventListener("change", () => {
        rows.querySelectorAll("[data-photo-select]").forEach((input) => {
          input.checked = $("photo-select-all").checked;
          const id = input.dataset.photoSelect;
          if (input.checked) selected.set(id, input.dataset.name); else selected.delete(id);
        });
        updateCount();
      });
      $("print-photo-sheet").addEventListener("click", printPhotoSheet);
      addedTools = true;
    }
    rows.querySelectorAll(".application-card").forEach((card) => {
      const open = card.querySelector("[data-open]");
      const id = open?.dataset.open;
      if (!id || card.querySelector("[data-photo-select]")) return;
      const name = card.querySelector(".application-name")?.textContent || id;
      const label = document.createElement("label");
      label.className = "photo-select-label";
      label.innerHTML = '<input class="photo-select" type="checkbox" data-photo-select="' + esc(id) + '" data-name="' + esc(name) + '"> फोटो शीट के लिए चुनें';
      label.querySelector("input").checked = selected.has(id);
      label.querySelector("input").addEventListener("change", (event) => {
        if (event.target.checked) selected.set(id, name); else selected.delete(id);
        updateCount();
      });
      const footer = card.querySelector(".application-footer");
      if (footer) {
        const print = document.createElement("button");
        print.type = "button"; print.className = "button print-profile-action";
        print.textContent = "आवेदन प्रिंट";
        print.dataset.printApplication = id;
        footer.appendChild(print);
      }
      card.appendChild(label);
    });
    updateCount();
  }
  function updateCount() {
    if ($("photo-select-count")) $("photo-select-count").textContent = selected.size + " चयनित";
  }
  function printWindow(title, body, styles, existingWindow) {
    const win = existingWindow || window.open("", "_blank");
    if (!win) { alert("प्रिंट विंडो ब्लॉक है। कृपया पॉप-अप की अनुमति दें।"); return null; }
    win.document.open();
    win.document.write('<!doctype html><html lang="hi"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + styles + '</style></head><body>' + body + '</body></html>');
    win.document.close();
    return win;
  }
  async function renderPdfFirstPage(pdfDataUrl, canvas, status) {
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.onload = resolve;
        script.onerror = () => reject(new Error("PDF पढ़ने की लाइब्रेरी लोड नहीं हुई। इंटरनेट कनेक्शन जाँचें।"));
        document.head.appendChild(script);
      });
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const bytes = await fetch(pdfDataUrl).then((response) => response.arrayBuffer());
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(680 / baseViewport.width, 930 / baseViewport.height) });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    canvas.style.width = "auto";
    canvas.style.height = "auto";
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    if (status) status.remove();
    if (pdf.numPages > 1) {
      const note = document.createElement("p");
      note.textContent = "नोट: PDF में " + pdf.numPages + " पृष्ठ हैं; दूसरी शीट पर पहला पृष्ठ दिखाया गया है।";
      note.style.cssText = "font-size:9pt;text-align:center;margin:2mm";
      canvas.after(note);
    }
  }
  const recordStyles = `
    *{box-sizing:border-box}body{font-family:"Noto Sans Devanagari",Arial,sans-serif;color:#181818;font-size:10pt;margin:0}
    .page{height:279mm;position:relative;overflow:hidden;padding:2mm 1mm;page-break-after:always}
    .page:last-child{page-break-after:auto}.heading{text-align:center;border-bottom:1.5px solid #333;padding-bottom:4mm;margin-bottom:4mm}
    h1{font-size:17pt;margin:0 0 2mm}h2{font-size:12pt;margin:3mm 0 2mm}.sub{font-size:9pt}
    .identity{display:flex;gap:5mm;align-items:flex-start}.face{width:30mm;height:38mm;object-fit:cover;border:1px solid #777}
    table{width:100%;border-collapse:collapse;margin:2mm 0 3mm}td,th{border:1px solid #999;padding:1.6mm;vertical-align:top}th{width:28%;text-align:left;background:#f3f0eb}
    .rules{padding-left:5mm;margin:1mm 0}.rules li{margin-bottom:2mm}.declaration{margin-top:4mm;border-top:1px solid #999;padding-top:3mm}
    .signature{display:flex;justify-content:space-between;margin-top:12mm}.mark-title{text-align:center;font-size:15pt;margin:0 0 4mm}
    .mark-image{display:block;max-width:100%;max-height:250mm;object-fit:contain;margin:auto}
    .mark-pdf{width:100%;height:255mm;border:0}.missing{border:1px dashed #777;padding:8mm;text-align:center}
    @page{size:A4 portrait;margin:10mm}
  `;
  async function printApplication(id) {
    // Open synchronously from the click handler so mobile browsers do not block the print tab.
    const printTab = window.open("", "_blank");
    if (!printTab) { alert("प्रिंट विंडो ब्लॉक है। ब्राउज़र में इस साइट के लिए पॉप-अप की अनुमति दें।"); return; }
    printTab.document.write('<!doctype html><html lang="hi"><body style="font-family:Arial,sans-serif;padding:24px">आवेदन और मार्कशीट तैयार हो रही है…</body></html>');
    try {
      const result = await call("pratibhaAdminGet", { applicationId: id });
      const a = result.application || result.data?.application;
      if (!a) throw new Error("आवेदन विवरण उपलब्ध नहीं है।");
      const face = a.facePhoto?.path ? await dataUrl(await media(id, a.facePhoto.path)) : "";
      const mark = (a.supportingDocuments || []).find((d) => {
        const type = String(d.documentType || "").toUpperCase();
        return type === "MARKSHEET" || /marksheet|mark-sheet|marks|मार्कशीट|अंक/i.test(d.name || "");
      });
      let markUrl = "";
      if (mark?.path) markUrl = await dataUrl(await media(id, mark.path));
      const rules = Array.isArray(a.acceptedRulesSnapshot) ? a.acceptedRulesSnapshot : [];
      const ruleMarkup = rules.length
        ? '<ol class="rules">' + rules.map((r) => '<li>' + esc(r.text || r.hindi || r.rule || "") + '</li>').join("") + '</ol>'
        : '<p class="missing">इस आवेदन में स्वीकार किए गए नियमों का स्नैपशॉट उपलब्ध नहीं है।</p>';
      const details = [
        ["आवेदन क्रमांक", a.applicationId], ["आवेदक का नाम", a.name], ["मोबाइल", a.mobile],
        ["पिता का नाम", a.fatherName], ["माता का नाम", a.motherName], ["जन्म तिथि", a.dateOfBirth],
        ["कक्षा", a.classStandard === "10" ? "10वीं" : a.classStandard === "12" ? "12वीं" : a.classStandard],
        ["विद्यालय / संस्था", a.schoolInstitute], ["प्राप्तांक प्रतिशत", a.overallPercentage == null ? "" : a.overallPercentage + "%"],
        ["पता", [a.address, a.city, a.state, a.pincode].filter(Boolean).join(", ")],
        ["उपलब्धि", a.achievementDetails], ["अन्य उपलब्धियाँ", a.otherAccomplishments],
        ["आवेदन स्थिति", statusLabels[a.status] || a.status], ["जमा तिथि", a.submittedAt || a.createdAt],
      ];
      const table = '<table>' + details.filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k,v]) => '<tr><th>' + esc(k) + '</th><td>' + esc(v) + '</td></tr>').join("") + '</table>';
      const page1 = '<section class="page"><header class="heading"><h1>प्रतिभा सम्मान २०२६</h1><div>आवेदन एवं स्वीकृत नियम — अभिलेख प्रति</div></header><div class="identity"><div style="flex:1">' + table + '</div>' + (face ? '<img class="face" src="' + face + '" alt="आवेदक का फोटो">' : '') + '</div><h2>आवेदक द्वारा स्वीकार किए गए नियम</h2>' + ruleMarkup + '<div class="declaration">मैं पुष्टि करता/करती हूँ कि आवेदन में दी गई जानकारी मेरे ज्ञान के अनुसार सही है।</div><div class="signature"><span>आवेदक / अभिभावक के हस्ताक्षर: ______________</span><span>दिनांक: ______________</span></div><div style="position:absolute;bottom:1mm;right:1mm;font-size:8pt">पृष्ठ 1 / 2</div></section>';
      let markPage = '<section class="page"><h1 class="mark-title">संलग्न मार्कशीट — ' + esc(a.name) + ' (' + esc(a.applicationId) + ')</h1>';
      if (!markUrl) markPage += '<div class="missing">मार्कशीट दस्तावेज़ नहीं मिला। कृपया आवेदन में अपलोड किए गए दस्तावेज़ की जाँच करें।</div>';
      const isPdf = !!markUrl && (String(mark?.mimeType || "").toLowerCase().includes("pdf") || /^data:application\/pdf/i.test(markUrl) || /\.pdf(?:$|[?#])/i.test(mark?.name || ""));
      if (isPdf) markPage += '<div id="pdf-status" class="missing">PDF मार्कशीट तैयार हो रही है…</div><canvas id="marksheet-pdf-canvas" style="display:block;max-width:100%;max-height:250mm;margin:auto"></canvas>';
      else if (markUrl) markPage += '<img class="mark-image" src="' + markUrl + '" alt="मार्कशीट">';
      markPage += '<div style="position:absolute;bottom:1mm;right:1mm;font-size:8pt">पृष्ठ 2 / 2</div></section>';
      const win = printWindow("प्रतिभा सम्मान आवेदन " + a.applicationId, page1 + markPage, recordStyles, printTab);
      if (win) {
        const images = [...win.document.images];
        await Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; })));
        if (isPdf) await renderPdfFirstPage(markUrl, win.document.getElementById("marksheet-pdf-canvas"), win.document.getElementById("pdf-status"));
        win.focus(); setTimeout(() => win.print(), 150);
      }
    } catch (error) { printTab.close(); alert(error.message || "प्रिंट तैयार नहीं हो सका।"); }
  }
  async function printPhotoSheet() {
    const ids = [...selected.keys()];
    if (!ids.length) { alert("फोटो प्रिंट करने के लिए कम-से-कम एक आवेदन चुनें।"); return; }
    const printTab = window.open("", "_blank");
    if (!printTab) { alert("प्रिंट विंडो ब्लॉक है। ब्राउज़र में इस साइट के लिए पॉप-अप की अनुमति दें।"); return; }
    printTab.document.write('<!doctype html><html lang="hi"><body style="font-family:Arial,sans-serif;padding:24px">चयनित फोटो तैयार हो रहे हैं…</body></html>');
    const button = $("print-photo-sheet"); button.disabled = true; button.textContent = "फोटो तैयार हो रहे हैं…";
    try {
      const people = [];
      for (const id of ids) {
        const result = await call("pratibhaAdminGet", { applicationId: id });
        const a = result.application || result.data?.application;
        if (!a?.facePhoto?.path) { people.push({ id, name: a?.name || selected.get(id), image: "", error: true }); continue; }
        people.push({ id, name: a.name, image: await dataUrl(await media(id, a.facePhoto.path)) });
      }
      const cards = people.map((p) => '<div class="photo">' + (p.image ? '<img src="' + p.image + '" alt="' + esc(p.name) + '">' : '<div class="no-photo">फोटो उपलब्ध नहीं</div>') + '<div class="caption">' + esc(p.name) + ' · ' + esc(p.id) + '</div></div>').join("");
      const styles = ' *{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0}.sheet{display:grid;grid-template-columns:repeat(5,35mm);grid-auto-rows:45mm;gap:3mm;align-content:start;justify-content:center}.photo{width:35mm;height:45mm;border:0.2mm dashed #aaa;display:flex;flex-direction:column;align-items:center;overflow:hidden}.photo img{width:35mm;height:40mm;object-fit:cover}.caption{width:100%;height:5mm;font-size:5.5pt;text-align:center;overflow:hidden;white-space:nowrap;padding:0.5mm}.no-photo{width:35mm;height:40mm;display:grid;place-items:center;font-size:8pt;text-align:center}@page{size:A4 portrait;margin:8mm}';
      const win = printWindow("प्रतिभा सम्मान — पासपोर्ट आकार फोटो", '<main class="sheet">' + cards + '</main>', styles, printTab);
      if (win) {
        await Promise.all([...win.document.images].map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; })));
        win.focus(); setTimeout(() => win.print(), 150);
      }
    } catch (error) { printTab.close(); alert(error.message || "फोटो शीट तैयार नहीं हो सकी।"); }
    finally { button.disabled = false; button.textContent = "चयनित फोटो A4 पर प्रिंट करें"; }
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-print-application]");
    if (button) { event.preventDefault(); printApplication(button.dataset.printApplication); }
  });
  const observer = new MutationObserver(addTools);
  const start = () => {
    if ($("rows")) observer.observe($("rows"), { childList: true, subtree: true });
    const appObserver = new MutationObserver(addTools);
    if ($("app")) appObserver.observe($("app"), { attributes: true, attributeFilter: ["class"] });
    addTools();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();