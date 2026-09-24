/**
 * Kshamawani 2026 backend.
 * Bind this Apps Script to the Google Sheet used for registrations.
 * Deploy as a Web App executing as the owner.
 */
const EVENT_ID = "kshamawani-2026";
const REGISTRATIONS_SHEET = "Kshamawani Registrations";
const AUDIT_SHEET = "Kshamawani Audit";

function doGet(e) {
  const p = e.parameter || {};
  if (p.api === "lookupRegistration") {
    const result = lookupRegistration_(p.eventId, p.mobile);
    return jsonp_(e, result);
  }
  return json_( { success: true, service: "kshamawani-2026" } );
}

function doPost(e) {
  try {
    const payload = JSON.parse((e.parameter && e.parameter.payload) || "{}");
    const action = payload.action;
    const data = payload.data || {};
    let result;
    if (action === "createRegistration") result = createRegistration_(data);
    else if (action === "updateRegistration") result = updateRegistration_(data);
    else if (action === "markTokensIssued") result = markTokensIssued_(data);
    else throw new Error("Unsupported action.");
    return json_(result);
  } catch (error) {
    return json_({ success: false, error: error.message });
  }
}

function createRegistration_(data) {
  assert_(data.eventId === EVENT_ID, "Invalid event.");
  const mobile = normalizeMobile_(data.mobile);
  assert_(/^[6-9]\d{9}$/.test(mobile), "Invalid mobile number.");
  assert_(String(data.name || "").trim(), "Name is required.");
  assert_(String(data.address || "").trim(), "Address is required.");
  const coupons = Number(data.coupons);
  assert_(Number.isInteger(coupons) && coupons >= 1 && coupons <= 20, "Invalid coupon count.");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = registrationsSheet_();
    const values = sheet.getDataRange().getValues();
    const mobileIndex = 3;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][mobileIndex]) === mobile) {
        throw new Error("This mobile number is already registered.");
      }
    }

    const code = nextApplicationCode_(sheet);
    const now = new Date();
    sheet.appendRow([now, EVENT_ID, code, mobile, String(data.name).trim(), String(data.address).trim(), coupons, "NO", "", ""]);
    audit_("CREATE", code, mobile, coupons, "PUBLIC");
    return { success: true, registrationId: code, applicationCode: code };
  } finally {
    lock.releaseLock();
  }
}

function updateRegistration_(data) {
  assert_(data.eventId === EVENT_ID, "Invalid event.");
  const mobile = normalizeMobile_(data.mobile);
  assert_(/^[6-9]\d{9}$/.test(mobile), "Invalid mobile number.");
  assert_(String(data.name || "").trim(), "Name is required.");
  assert_(String(data.address || "").trim(), "Address is required.");
  const coupons = Number(data.coupons);
  assert_(
    Number.isInteger(coupons) && coupons >= 1 && coupons <= 20,
    "Invalid coupon count.",
  );

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = registrationsSheet_();
    const values = sheet.getDataRange().getValues();

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (String(row[1]) !== EVENT_ID || String(row[3]) !== mobile) continue;

      if (String(row[7]) === "YES") {
        throw new Error(
          "इस मोबाइल नंबर के लिए टोकन पहले ही जारी हो चुके हैं। अब पंजीकरण अपडेट नहीं किया जा सकता।",
        );
      }

      const existingCode = String(row[2]);
      const registrationId = String(data.registrationId || "").trim();
      if (registrationId && registrationId !== existingCode) {
        throw new Error("Application code does not match the mobile number.");
      }

      sheet.getRange(i + 1, 5, 1, 3).setValues([
        [
          String(data.name).trim(),
          String(data.address).trim(),
          coupons,
        ],
      ]);
      audit_("UPDATE", existingCode, mobile, coupons, "PUBLIC");

      return {
        success: true,
        updated: true,
        registrationId: existingCode,
        applicationCode: existingCode,
      };
    }

    // The mobile number is the source of truth. If it was not found,
    // create a new registration rather than relying on a stale client lookup.
    return createRegistration_(data);
  } finally {
    lock.releaseLock();
  }
}

function lookupRegistration_(eventId, mobile) {
  if (eventId !== EVENT_ID) return { success: false, error: "Invalid event." };
  const normalized = normalizeMobile_(mobile);
  const values = registrationsSheet_().getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]) === EVENT_ID && String(values[i][3]) === normalized) {
      return { success: true, exists: true, registration: rowToRegistration_(values[i]) };
    }
  }
  return { success: true, exists: false };
}

function markTokensIssued_(data) {
  assert_(data.eventId === EVENT_ID, "Invalid event.");
  const mobile = normalizeMobile_(data.mobile);
  const code = String(data.registrationId || data.applicationCode || "").trim();
  assert_(code, "Application code is required.");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = registrationsSheet_();
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][1]) === EVENT_ID && String(values[i][2]) === code && String(values[i][3]) === mobile) {
        if (String(values[i][7]) === "YES") {
          return { success: true, alreadyIssued: true };
        }
        const timestamp = new Date();
        sheet.getRange(i + 1, 8, 1, 3).setValues([["YES", timestamp, "COORDINATOR"]]);
        audit_("TOKENS_ISSUED", code, mobile, Number(values[i][6]), "COORDINATOR");
        return { success: true, alreadyIssued: false };
      }
    }
    throw new Error("Application not found.");
  } finally {
    lock.releaseLock();
  }
}

function registrationsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(REGISTRATIONS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(REGISTRATIONS_SHEET);
    sheet.appendRow(["Timestamp", "EventId", "ApplicationCode", "Mobile", "Name", "Address", "Coupons", "TokensIssued", "IssuedAt", "IssuedBy"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function audit_(action, code, mobile, coupons, actor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(AUDIT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(AUDIT_SHEET);
    sheet.appendRow(["Timestamp", "Action", "ApplicationCode", "Mobile", "Coupons", "Actor"]);
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([new Date(), action, code, mobile, coupons, actor]);
}

function nextApplicationCode_(sheet) {
  const rows = sheet.getLastRow();
  let max = 0;
  if (rows > 1) {
    const codes = sheet.getRange(2, 3, rows - 1, 1).getValues().flat();
    for (const code of codes) {
      const match = String(code).match(/^KW26-(\d+)$/);
      if (match) max = Math.max(max, Number(match[1]));
    }
  }
  return "KW26-" + String(max + 1).padStart(4, "0");
}

function rowToRegistration_(row) {
  return {
    eventId: row[1],
    registrationId: row[2],
    applicationCode: row[2],
    mobile: row[3],
    name: row[4],
    address: row[5],
    coupons: Number(row[6]),
    tokensIssued: String(row[7]) === "YES",
    issuedAt: row[8] ? String(row[8]) : ""
  };
}

function normalizeMobile_(value) { return String(value || "").replace(/\D/g, ""); }
function assert_(condition, message) { if (!condition) throw new Error(message); }
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function jsonp_(e, value) {
  const callback = String((e.parameter || {}).callback || "");
  if (!/^[A-Za-z_$][\w$]*$/.test(callback)) return json_(value);
  return ContentService.createTextOutput(callback + "(" + JSON.stringify(value) + ")").setMimeType(ContentService.MimeType.JAVASCRIPT);
}
