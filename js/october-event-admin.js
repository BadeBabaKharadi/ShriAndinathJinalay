(() => {
"use strict";
const $ = id => document.getElementById(id);
const kind = window.OCTOBER_KIND || (location.pathname.includes("stay") ? "stay" : "food");
const BASE = location.hostname === "localhost" || location.hostname === "127.0.0.1" ? "http://127.0.0.1:5001/jain-community-platform/asia-south1" : "https://asia-south1-jain-community-platform.cloudfunctions.net";
let accessKey = "", records = [], expandedRegistration = "";
async function call(name, data) {
  let response;
  try { response = await fetch(BASE + "/" + name, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) }); }
  catch { throw new Error("सर्वर से कनेक्शन नहीं हो पाया। स्थानीय परीक्षण के लिए Firebase Emulator चलाएँ और CORS सेटिंग जाँचें।"); }
  let payload;
  try { payload = await response.json(); } catch { throw new Error("सर्वर से अमान्य उत्तर मिला (HTTP " + response.status + ")।"); }
  if (!response.ok || payload.error) throw new Error(payload.error?.message || "अनुमति नहीं मिली (HTTP " + response.status + ")।");
  return payload.result ?? payload.data;
}
function msg(text) { $("msg").textContent = text; }
function esc(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]); }
function showAuthorized() { $("authCard").hidden = true; $("authSuccess").hidden = false; }
$("login").onclick = async () => {
  const candidate = $("key").value;
  try { await call("octoberEventVerifyAdmin", { accessKey: candidate }); accessKey = candidate; showAuthorized(); msg(""); await refresh(); }
  catch (error) { msg(error.message); }
};
const countFilters = kind === "stay" ? [["maleFilter","male"],["femaleFilter","female"],["childrenFilter","children"]] : [["couponFilter","coupons"]];
function matchesFilters(row) {
  const value = id => $(id)?.value.trim() ?? "";
  const search = value("filter").toLocaleLowerCase();
  if (search && ![row.name,row.mobile,row.address,row.city,row.state,row.comingFrom,row.registrationId].some(item => String(item ?? "").toLocaleLowerCase().includes(search))) return false;
  for (const [id, field] of countFilters) if (value(id) !== "" && Number(row[field] || 0) !== Number(value(id))) return false;
  const date = value("dateFilter");
  if (date && row.checkInDate !== date && row.checkOutDate !== date) return false;
  return true;
}
function detailRow(row) {
  const fields = kind === "food" ? [["रजिस्ट्रेशन",row.registrationId],["नाम",row.name],["मोबाइल",row.mobile],["पता",row.address],["शहर",row.city],["राज्य",row.state],["कूपन",row.coupons]] :
    [["रजिस्ट्रेशन",row.registrationId],["नाम",row.name],["मोबाइल",row.mobile],["पता",row.address],["शहर",row.city],["राज्य",row.state],["पिन कोड",row.pincode],["आने का स्थान",row.comingFrom],["पुरुष",row.male],["महिलाएँ",row.female],["बच्चे",row.children],["आगमन",String(row.checkInDate || "")+" "+String(row.checkInTime || "")],["प्रस्थान",String(row.checkOutDate || "")+" "+String(row.checkOutTime || "")]];
  return '<tr class="inline-details" data-details-for="'+esc(row.registrationId)+'"><td colspan="'+(kind==="stay"?12:6)+'"><section class="details-panel"><h3>पंजीकरण का पूरा विवरण</h3><table><tbody>'+
    fields.map(([label,value])=>'<tr><th>'+esc(label)+'</th><td>'+esc(value ?? "—")+'</td></tr>').join("")+
    (kind==="stay"?'<tr><th>आधार दस्तावेज़</th><td><div data-aadhaar-preview="'+esc(row.mobile)+'">पूर्वावलोकन लोड हो रहा है…</div></td></tr>':"")+
    '</tbody></table></section></td></tr>';
}
function renderRows() {
  const filtered = records.filter(matchesFilters);
  $("rows").innerHTML = filtered.map(row => {
    const action = '<button type="button" data-detail="'+esc(row.registrationId)+'" aria-expanded="'+(expandedRegistration===row.registrationId)+'">विवरण</button>';
    if (kind === "food") return '<tr data-registration-row="'+esc(row.registrationId)+'"><td>'+esc(row.registrationId)+'</td><td>'+esc(row.name)+'</td><td>'+esc(row.mobile)+'</td><td>'+esc(row.address)+'</td><td>'+esc(row.coupons)+'</td><td>'+action+'<button type="button" data-qr="'+esc(row.registrationId)+'">QR</button></td></tr>'+(expandedRegistration===row.registrationId?detailRow(row):"");
    return '<tr data-registration-row="'+esc(row.registrationId)+'"><td>'+esc(row.registrationId)+'</td><td>'+esc(row.name)+'</td><td>'+esc(row.mobile)+'</td><td>'+esc(row.address)+'</td><td>'+esc(row.comingFrom)+'</td><td>'+esc(row.male??0)+'</td><td>'+esc(row.female??0)+'</td><td>'+esc(row.children??0)+'</td><td>'+esc(row.checkInDate||"—")+'<br>'+esc(row.checkInTime||"")+'</td><td>'+esc(row.checkOutDate||"—")+'<br>'+esc(row.checkOutTime||"")+'</td><td>'+action+'</td><td>'+(row.aadhaarAvailable?'<button type="button" data-aadhaar="'+esc(row.mobile)+'">आधार पूर्वावलोकन</button>':"नहीं")+'</td></tr>'+(expandedRegistration===row.registrationId?detailRow(row):"");
  }).join("");
  if (!filtered.length) $("rows").innerHTML = '<tr><td colspan="'+(kind==="stay"?12:6)+'">कोई रजिस्ट्रेशन नहीं मिला।</td></tr>';
}
function renderStats(summary) {
  const cards = kind === "food" ? [["कुल पंजीकरण",summary.registrations],["कुल भोजन कूपन",summary.totalCoupons]] : [["कुल पंजीकरण",summary.registrations],["पुरुष",summary.male],["महिलाएँ",summary.female],["बच्चे",summary.children]];
  $("summary").innerHTML = cards.map(([label,value])=>'<article class="event-stat"><span>'+esc(label)+'</span><strong>'+esc(value??0)+'</strong></article>').join("");
  if (kind !== "stay") return;
  const checkins=summary.dailyCheckIn||{}, checkouts=summary.dailyCheckOut||{};
  const dates=[...new Set([...Object.keys(checkins),...Object.keys(checkouts)])].sort();
  $("dayStats").innerHTML='<h3>दिनवार चेक-इन / चेक-आउट (पहला व दूसरा हाफ)</h3>'+(dates.length?
    '<div class="scroll"><table><thead><tr><th>दिन</th><th>चेक-इन पहला हाफ</th><th>चेक-इन दूसरा हाफ</th><th>चेक-आउट पहला हाफ</th><th>चेक-आउट दूसरा हाफ</th></tr></thead><tbody>'+
    dates.map(date=>'<tr><th>'+esc(date)+'</th><td>'+esc(checkins[date]?.firstHalf??0)+'</td><td>'+esc(checkins[date]?.secondHalf??0)+'</td><td>'+esc(checkouts[date]?.firstHalf??0)+'</td><td>'+esc(checkouts[date]?.secondHalf??0)+'</td></tr>').join("")+'</tbody></table></div>':'<p>अभी कोई चेक-इन/चेक-आउट आँकड़ा उपलब्ध नहीं है।');
}
async function refresh() {
  try {
    if (!accessKey) throw new Error("पहले व्यवस्थापक कुंजी सत्यापित करें।");
    const response=await call("octoberEventAdminList",{kind,accessKey});
    records=response.registrations||[]; renderStats(response.summary||{}); renderRows();
    msg(records.length+" रजिस्ट्रेशन लोड हुए।");
  } catch(error) { msg(error.message); }
}
$("refresh").onclick=refresh;
["filter","maleFilter","femaleFilter","childrenFilter","couponFilter","dateFilter"].forEach(id=>$(id)?.addEventListener("input",renderRows));
async function loadAadhaarPreview(row,holder) {
  if (!row) return;
  holder.textContent="आधार पूर्वावलोकन लोड हो रहा है…";
  try {
    const response=await call("octoberEventAdminAadhaar",{accessKey,mobile:row.mobile});
    if(response.mimeType==="image/jpeg"||response.mimeType==="image/png") {
      const image=document.createElement("img"); image.src=response.url; image.alt="आधार दस्तावेज़ पूर्वावलोकन"; image.loading="lazy";
      image.style.cssText="max-width:320px;max-height:260px;object-fit:contain;border:1px solid #ddd;border-radius:8px"; holder.replaceChildren(image);
    } else {
      const link=document.createElement("a"); link.href=response.url; link.target="_blank"; link.rel="noopener noreferrer"; link.textContent="आधार PDF खोलें"; holder.replaceChildren(link);
    }
  } catch(error) { holder.textContent=error.message; }
}
$("rows").addEventListener("click",async event=>{
  const target=event.target.closest("button"); if(!target)return;
  const registration=target.dataset.detail;
  if(registration) {
    expandedRegistration=expandedRegistration===registration?"":registration; renderRows();
    if(expandedRegistration&&kind==="stay") {
      const row=records.find(item=>item.registrationId===expandedRegistration);
      const holder=document.querySelector('[data-aadhaar-preview="'+CSS.escape(row?.mobile||"")+'"]');
      if(holder&&row?.aadhaarAvailable) await loadAadhaarPreview(row,holder);
      else if(holder) holder.textContent="आधार दस्तावेज़ उपलब्ध नहीं है।";
    }
    return;
  }
  if(target.dataset.aadhaar) {
    const row=records.find(item=>item.mobile===target.dataset.aadhaar);
    const holder=document.querySelector('[data-aadhaar-preview="'+CSS.escape(target.dataset.aadhaar)+'"]');
    if(holder) await loadAadhaarPreview(row,holder);
    else { try { const result=await call("octoberEventAdminAadhaar",{accessKey,mobile:target.dataset.aadhaar}); window.open(result.url,"_blank","noopener,noreferrer"); } catch(error) { msg(error.message); } }
    return;
  }
  if(target.dataset.qr) {
    const canvas=document.createElement("canvas");
    await QRCode.toCanvas(canvas,JSON.stringify({event:"october-2026",kind,registrationId:target.dataset.qr}),{width:220});
    const win=window.open("","_blank"); if(win){win.document.write("<title>Registration QR</title>");win.document.body.append(canvas);win.document.body.append(document.createTextNode(target.dataset.qr));}
  }
});
$("export").onclick=()=>{
  const keys=records.length?Object.keys(records[0]).filter(key=>!["aadhaarPath","aadhaarMime"].includes(key)):[];
  const csv=[keys.join(","),...records.map(row=>keys.map(key=>JSON.stringify(row[key]??"")).join(","))].join("\r\n");
  const anchor=document.createElement("a");anchor.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));anchor.download="october-"+kind+"-registrations.csv";anchor.click();URL.revokeObjectURL(anchor.href);
};
Object.defineProperty(window,"__octoberAdminKey",{set(value){accessKey=value;showAuthorized();}});
})();