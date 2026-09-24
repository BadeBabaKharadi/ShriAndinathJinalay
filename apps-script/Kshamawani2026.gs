/**
 * Kshamawani 2026 backend.
 * Bind this Apps Script to the Google Sheet used for registrations.
 * Deploy as a Web App executing as the owner.
 */
const EVENT_ID = "kshamawani-2026";
const REGISTRATIONS_SHEET = "Kshamawani Registrations";
const AUDIT_SHEET = "Kshamawani Audit";
const LOOKUP_CACHE_TTL_SECONDS = 300;
const REGISTRATION_CACHE_TTL_SECONDS = 300;
const MOBILE_INDEX_CACHE_KEY = "k26:lookup:mobile:v2";
const CODE_INDEX_CACHE_KEY = "k26:lookup:code:v2";
const MOBILE_REGISTRATION_CACHE_PREFIX = "k26:registration:mobile:v1:";
const CODE_REGISTRATION_CACHE_PREFIX = "k26:registration:code:v1:";
const NEXT_CODE_PROPERTY = "k26:nextApplicationNumber";

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.api === "lookupRegistration") {
    const result = p.code
      ? lookupRegistrationByCode_(p.eventId, p.code)
      : lookupRegistration_(p.eventId, p.mobile);
    return jsonp_(e, result);
  }
  return json_({ success: true, service: "kshamawani-2026" });
}

function doPost(e) {
  const startedAt = Date.now();
  try {
    const payload = JSON.parse((e.parameter && e.parameter.payload) || "{}");
    const action = payload.action;
    const data = payload.data || {};
    let result;
    if (action === "createRegistration") result = createRegistration_(data);
    else if (action === "updateRegistration") result = updateRegistration_(data);
    else if (action === "markTokensIssued") result = markTokensIssued_(data);
    else throw new Error("Unsupported action.");
    logPerformance_(action || "POST", result.success ? "success" : "failure", startedAt);
    return json_(result);
  } catch (error) {
    logPerformance_("POST", "error", startedAt);
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
  assert_(
    Number.isInteger(coupons) && coupons >= 1 && coupons <= 4,
    "Invalid coupon count.",
  );

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
    sheet.appendRow([
      now,
      EVENT_ID,
      code,
      mobile,
      String(data.name).trim(),
      String(data.address).trim(),
      coupons,
      "NO",
      "",
      "",
    ]);
    const registration = rowToRegistration_(
      sheet.getRange(sheet.getLastRow(), 1, 1, 10).getValues()[0],
    );
    invalidateLookupCaches_();
    cacheRegistration_(registration);
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
    Number.isInteger(coupons) && coupons >= 1 && coupons <= 4,
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
      const registration = rowToRegistration_(
        sheet.getRange(i + 1, 1, 1, 10).getValues()[0],
      );
      invalidateLookupCaches_();
      cacheRegistration_(registration);
      audit_("UPDATE", existingCode, mobile, coupons, "PUBLIC");

      return {
        success: true,
        updated: true,
        registrationId: existingCode,
        applicationCode: existingCode,
      };
    }

    // The mobile number is the source of truth. If it was not found,
    // create a new registration while keeping the same lock.
    const code = nextApplicationCode_(sheet);
    const now = new Date();
    sheet.appendRow([
      now,
      EVENT_ID,
      code,
      mobile,
      String(data.name).trim(),
      String(data.address).trim(),
      coupons,
      "NO",
      "",
      "",
    ]);
    const registration = rowToRegistration_(
      sheet.getRange(sheet.getLastRow(), 1, 1, 10).getValues()[0],
    );
    invalidateLookupCaches_();
    cacheRegistration_(registration);
    audit_("CREATE", code, mobile, coupons, "PUBLIC");
    return {
      success: true,
      created: true,
      registrationId: code,
      applicationCode: code,
    };
  } finally {
    lock.releaseLock();
  }
}

function lookupRegistration_(eventId, mobile) {
  const startedAt = Date.now();
  if (eventId !== EVENT_ID) return { success: false, error: "Invalid event." };

  const normalized = normalizeMobile_(mobile);
  const cached = getCachedRegistration_("mobile", normalized);
  if (cached) {
    logPerformance_("lookup-mobile", "hit", startedAt, true);
    return { success: true, exists: true, registration: cached };
  }

  const lookup = findRegistrationRow_("mobile", normalized);
  if (!lookup.rowNumber) {
    logPerformance_("lookup-mobile", "miss", startedAt, lookup.cacheHit);
    return { success: true, exists: false };
  }

  const registration = rowToRegistration_(
    registrationsSheet_().getRange(lookup.rowNumber, 1, 1, 10).getValues()[0],
  );
  cacheRegistration_(registration);
  logPerformance_("lookup-mobile", "hit", startedAt, lookup.cacheHit);
  return { success: true, exists: true, registration };
}

function lookupRegistrationByCode_(eventId, code) {
  const startedAt = Date.now();
  if (eventId !== EVENT_ID) return { success: false, error: "Invalid event." };

  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) {
    logPerformance_("lookup-code", "miss", startedAt, true);
    return { success: true, exists: false };
  }

  const cached = getCachedRegistration_("code", normalizedCode);
  if (cached) {
    logPerformance_("lookup-code", "hit", startedAt, true);
    return { success: true, exists: true, registration: cached };
  }

  const lookup = findRegistrationRow_("code", normalizedCode);
  if (!lookup.rowNumber) {
    logPerformance_("lookup-code", "miss", startedAt, lookup.cacheHit);
    return { success: true, exists: false };
  }

  const registration = rowToRegistration_(
    registrationsSheet_().getRange(lookup.rowNumber, 1, 1, 10).getValues()[0],
  );
  cacheRegistration_(registration);
  logPerformance_("lookup-code", "hit", startedAt, lookup.cacheHit);
  return { success: true, exists: true, registration };
}

function registrationCacheKey_(type, key) {
  const normalized = String(key || "").trim().toUpperCase();
  const prefix =
    type === "mobile"
      ? MOBILE_REGISTRATION_CACHE_PREFIX
      : CODE_REGISTRATION_CACHE_PREFIX;
  return prefix + normalized;
}

function getCachedRegistration_(type, key) {
  if (!key) return null;

  const cache = CacheService.getScriptCache();
  const cacheKey = registrationCacheKey_(type, key);
  const cached = cache.get(cacheKey);
  if (!cached) return null;

  try {
    return JSON.parse(cached);
  } catch (error) {
    cache.remove(cacheKey);
    console.log(
      JSON.stringify({
        event: "kshamawani.registration_cache_invalid",
        type,
        error: error.message,
      }),
    );
    return null;
  }
}

function cacheRegistration_(registration) {
  if (!registration || !registration.mobile || !registration.applicationCode) {
    return;
  }

  const cache = CacheService.getScriptCache();
  const payload = JSON.stringify(registration);

  try {
    cache.putAll(
      {
        [registrationCacheKey_("mobile", registration.mobile)]: payload,
        [registrationCacheKey_("code", registration.applicationCode)]: payload,
      },
      REGISTRATION_CACHE_TTL_SECONDS,
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        event: "kshamawani.registration_cache_write_failed",
        error: error.message,
      }),
    );
  }
}

function findRegistrationRow_(type, key) {
  if (!key) return { rowNumber: 0, cacheHit: true };

  const cache = CacheService.getScriptCache();
  const cacheKey =
    type === "mobile" ? MOBILE_INDEX_CACHE_KEY : CODE_INDEX_CACHE_KEY;
  const cached = cache.get(cacheKey);

  if (cached) {
    const index = JSON.parse(cached);
    return {
      rowNumber: Number(index[key] || 0),
      cacheHit: true,
    };
  }

  const indexes = buildLookupIndexes_();
  return {
    rowNumber: Number(
      (type === "mobile" ? indexes.mobile : indexes.code)[key] || 0,
    ),
    cacheHit: false,
  };
}

function buildLookupIndexes_() {
  const startedAt = Date.now();
  const sheet = registrationsSheet_();
  const lastRow = sheet.getLastRow();
  const mobile = {};
  const code = {};

  if (lastRow > 1) {
    const values = sheet.getRange(2, 2, lastRow - 1, 3).getValues();
    for (let i = 0; i < values.length; i++) {
      const rowNumber = i + 2;
      const eventId = String(values[i][0]);
      if (eventId !== EVENT_ID) continue;

      const applicationCode = String(values[i][1]).trim().toUpperCase();
      const mobileNumber = normalizeMobile_(values[i][2]);

      if (applicationCode) code[applicationCode] = rowNumber;
      if (mobileNumber) mobile[mobileNumber] = rowNumber;
    }
  }

  const cache = CacheService.getScriptCache();
  const payloads = {
    [MOBILE_INDEX_CACHE_KEY]: JSON.stringify(mobile),
    [CODE_INDEX_CACHE_KEY]: JSON.stringify(code),
  };

  try {
    cache.putAll(payloads, LOOKUP_CACHE_TTL_SECONDS);
  } catch (error) {
    console.log(
      JSON.stringify({
        event: "kshamawani.lookup_cache_write_failed",
        error: error.message,
      }),
    );
  }

  console.log(
    JSON.stringify({
      event: "kshamawani.lookup_index_built",
      rows: Math.max(0, lastRow - 1),
      mobileEntries: Object.keys(mobile).length,
      codeEntries: Object.keys(code).length,
      durationMs: Date.now() - startedAt,
    }),
  );

  return { mobile, code };
}

function invalidateLookupCaches_() {
  CacheService.getScriptCache().removeAll([
    MOBILE_INDEX_CACHE_KEY,
    CODE_INDEX_CACHE_KEY,
  ]);
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
      if (
        String(values[i][1]) === EVENT_ID &&
        String(values[i][2]) === code &&
        String(values[i][3]) === mobile
      ) {
        if (String(values[i][7]) === "YES") {
          const registration = rowToRegistration_(values[i]);
          cacheRegistration_(registration);
          return { success: true, alreadyIssued: true };
        }
        const timestamp = new Date();
        sheet.getRange(i + 1, 8, 1, 3).setValues([
          ["YES", timestamp, "COORDINATOR"],
        ]);
        const updatedRegistration = rowToRegistration_(
          sheet.getRange(i + 1, 1, 1, 10).getValues()[0],
        );
        cacheRegistration_(updatedRegistration);
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
    sheet.appendRow([
      "Timestamp",
      "EventId",
      "ApplicationCode",
      "Mobile",
      "Name",
      "Address",
      "Coupons",
      "TokensIssued",
      "IssuedAt",
      "IssuedBy",
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function audit_(action, code, mobile, coupons, actor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(AUDIT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(AUDIT_SHEET);
    sheet.appendRow([
      "Timestamp",
      "Action",
      "ApplicationCode",
      "Mobile",
      "Coupons",
      "Actor",
    ]);
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([new Date(), action, code, mobile, coupons, actor]);
}

function nextApplicationCode_(sheet) {
  const properties = PropertiesService.getScriptProperties();
  let nextNumber = Number(properties.getProperty(NEXT_CODE_PROPERTY));

  if (!Number.isInteger(nextNumber) || nextNumber < 1) {
    const rows = sheet.getLastRow();
    let max = 0;
    if (rows > 1) {
      const codes = sheet.getRange(2, 3, rows - 1, 1).getValues().flat();
      for (const code of codes) {
        const match = String(code).match(/^KW26-(\d+)$/);
        if (match) max = Math.max(max, Number(match[1]));
      }
    }
    nextNumber = max + 1;
  }

  properties.setProperty(NEXT_CODE_PROPERTY, String(nextNumber + 1));
  return "KW26-" + String(nextNumber).padStart(4, "0");
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
    issuedAt: row[8] ? String(row[8]) : "",
  };
}

function logPerformance_(operation, outcome, startedAt, cacheHit) {
  console.log(
    JSON.stringify({
      event: "kshamawani.performance",
      operation,
      outcome,
      cacheHit: cacheHit === undefined ? null : cacheHit,
      durationMs: Date.now() - startedAt,
    }),
  );
}

function normalizeMobile_(value) {
  return String(value || "").replace(/\D/g, "");
}
function assert_(condition, message) {
  if (!condition) throw new Error(message);
}
function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
function jsonp_(e, value) {
  const callback = String((e.parameter || {}).callback || "");
  if (!/^[A-Za-z_$][\w$]*$/.test(callback)) return json_(value);
  return ContentService.createTextOutput(
    callback + "(" + JSON.stringify(value) + ")",
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/**
 * Run this function manually from the Apps Script editor to verify
 * that the spreadsheet tabs can be opened/created.
 */
function testKshamawaniSetup() {
  const registrations = registrationsSheet_();
  audit_("SETUP_TEST", "", "", 0, "ADMIN");
  return {
    success: true,
    registrationsSheet: registrations.getName(),
    auditSheet: AUDIT_SHEET,
  };
}

/**
 * Run manually to inspect the current dataset size and lookup-index state.
 * This does not expose registration or mobile data.
 */
function getKshamawaniHealth() {
  const sheet = registrationsSheet_();
  const rows = Math.max(0, sheet.getLastRow() - 1);
  const cache = CacheService.getScriptCache();
  const mobileIndex = cache.get(MOBILE_INDEX_CACHE_KEY);
  const codeIndex = cache.get(CODE_INDEX_CACHE_KEY);

  const result = {
    success: true,
    eventId: EVENT_ID,
    registrationRows: rows,
    mobileIndexCached: Boolean(mobileIndex),
    codeIndexCached: Boolean(codeIndex),
    checkedAt: new Date().toISOString(),
  };
  console.log(JSON.stringify(result));
  return result;
}
