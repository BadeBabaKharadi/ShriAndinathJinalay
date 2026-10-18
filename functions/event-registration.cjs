const crypto = require("node:crypto");
const { Buffer } = require("node:buffer");
const { FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

const FOOD = "octoberEventFoodRegistrations";
const STAY = "octoberEventStayRegistrations";
const EVENT_ID = "october-2026";
const MAX_AADHAAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);

function normalizeMobile(value) {
  const mobile = String(value || "").replace(/\D/g, "");
  const normalized = mobile.length === 12 && mobile.startsWith("91") ? mobile.slice(2) : mobile;
  if (!/^[6-9]\d{9}$/.test(normalized)) throw new Error("Enter a valid 10-digit Indian mobile number.");
  return normalized;
}
function required(value, label) {
  const result = String(value || "").trim();
  if (!result) throw new Error(label + " is required.");
  return result.slice(0, 500);
}
function count(value, label, max = 100) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > max) throw new Error(label + " must be a whole number between 0 and " + max + ".");
  return n;
}
function registrationCode(kind, mobile) {
  return (kind === "food" ? "DKF26" : "DKS26") + "-" + crypto.createHash("sha256").update(EVENT_ID + ":" + kind + ":" + mobile).digest("hex").slice(0, 10).toUpperCase();
}
function validateFood(input) {
  const mobile = normalizeMobile(input.mobile);
  const coupons = count(input.coupons, "Food coupon count", 7);
  if (coupons < 1) throw new Error("Food coupon count must be between 1 and 7.");
  return { mobile, name: required(input.name, "Name"), address: required(input.address, "Address"), coupons };
}
function validateStay(input, { allowExistingAadhaar = false } = {}) {
  const mobile = normalizeMobile(input.mobile);
  const male = count(input.male, "Male count");
  const female = count(input.female, "Female count");
  const children = count(input.children, "Children count");
  if (male + female + children < 1) throw new Error("At least one traveller is required.");
  const checkInDate = required(input.checkInDate, "Check-in date");
  if (!/^2026-10-(2[3-6])$/.test(checkInDate)) throw new Error("Check-in date must be 23, 24, 25, or 26 October 2026.");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(input.checkInTime || ""))) throw new Error("Enter a valid check-in time.");
  const checkOutDate = required(input.checkOutDate, "Check-out date");
  if (!/^2026-10-(2[4-7])$/.test(checkOutDate)) throw new Error("Check-out date must be 24, 25, 26, or 27 October 2026.");
  const checkOutTime = String(input.checkOutTime || "");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(checkOutTime)) throw new Error("Enter a valid check-out time.");
  if (`${checkOutDate}T${checkOutTime}` <= `${checkInDate}T${input.checkInTime}`) throw new Error("Check-out must be after check-in.");
  const documentType = String(input.identityDocumentType || "");
  const documentNumber = String(input.identityDocumentNumber || "").replace(/\s+/g, "").toUpperCase();
  const documentPatterns = {
    aadhaar: /^[2-9][0-9]{11}$/,
    pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
    driving_license: /^[A-Z0-9-]{5,20}$/,
    voter_id: /^[A-Z]{3}[0-9]{7}$/,
  };
  if (documentType && !Object.hasOwn(documentPatterns, documentType)) throw new Error("Select a valid identity document type.");
  if (documentType && !documentPatterns[documentType].test(documentNumber)) {
    throw new Error(documentType === "aadhaar"
      ? "Aadhaar number must contain 12 digits and cannot start with 0 or 1."
      : documentType === "pan"
        ? "PAN number must match the format ABCDE1234F."
        : documentType === "voter_id"
          ? "Voter ID must match the format ABC1234567."
          : "Enter a valid driving licence number.");
  }
  const base = { mobile, name: required(input.name, "Name"), address: required(input.address, "Address"), ...(input.city !== undefined ? { city: required(input.city, "City") } : {}), ...(input.state !== undefined ? { state: required(input.state, "State") } : {}), ...(input.pincode !== undefined ? { pincode: String(input.pincode || "").trim() } : {}), comingFrom: required(input.comingFrom, "Where are you travelling from"), male, female, children, checkInDate, checkInTime: input.checkInTime, checkOutDate, checkOutTime, ...(documentType ? { identityDocumentType: documentType, identityDocumentNumber: documentNumber } : {}) };
  if (base.pincode !== undefined && !/^[0-9]{6}$/.test(base.pincode)) throw new Error("PIN code must contain six digits.");
  const rawBase64 = String(input.aadhaarBase64 || "").replace(/^data:[^,]+,/, "");
  if (!rawBase64 && allowExistingAadhaar && input.removeAadhaar === true) return { ...base, removeExistingAadhaar: true };
  if (!rawBase64 && allowExistingAadhaar) return { ...base, preserveExistingAadhaar: true };
  const mime = String(input.aadhaarMime || "");
  const fileName = required(input.aadhaarFileName, "Aadhaar file");
  if (!ALLOWED_MIME.has(mime)) throw new Error("Aadhaar must be a PDF, JPG, or PNG file.");
  const bytes = Buffer.from(rawBase64, "base64");
  if (!bytes.length || bytes.length > MAX_AADHAAR_BYTES) throw new Error("Aadhaar file must be smaller than 5 MB.");
  const hasPdfSignature = bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  const hasJpegSignature = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const hasPngSignature = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const contentMatchesMime =
    (mime === "application/pdf" && hasPdfSignature) ||
    (mime === "image/jpeg" && hasJpegSignature) ||
    (mime === "image/png" && hasPngSignature);
  if (!contentMatchesMime) throw new Error("Aadhaar file content does not match its declared PDF/JPG/PNG type.");
  return { ...base, aadhaarMime: mime, aadhaarFileName: fileName.replace(/[\\/]/g, "_").slice(0, 120), aadhaarBytes: bytes };
}
async function saveRegistration({ db, kind, input, storage = getStorage() }) {
  if (kind !== "food" && kind !== "stay") throw new Error("Invalid registration type.");
  const isFood = kind === "food";
  const collection = isFood ? FOOD : STAY;
  const mobile = normalizeMobile(input?.mobile);
  const ref = db.collection(collection).doc(mobile);
  const old = await ref.get();
  const oldData = old.exists ? old.data() : {};
  const data = isFood
    ? validateFood(input)
    : validateStay(input, { allowExistingAadhaar: Boolean(oldData.aadhaarPath) });
  const code = registrationCode(kind, data.mobile);
  const now = FieldValue.serverTimestamp();
  let aadhaarPath = oldData.aadhaarPath;
  let storedAadhaarFileName = oldData.aadhaarFileName;
  let storedAadhaarMime = oldData.aadhaarMime;
  if (!isFood && data.removeExistingAadhaar) {
    if (aadhaarPath) await storage.bucket().file(aadhaarPath).delete({ ignoreNotFound: true });
    aadhaarPath = undefined;
    storedAadhaarFileName = undefined;
    storedAadhaarMime = undefined;
  } else if (!isFood && !data.preserveExistingAadhaar) {
    const previousPath = aadhaarPath;
    aadhaarPath = `october-event-private-aadhaar/${data.mobile}/${crypto.randomUUID()}-${data.aadhaarFileName}`;
    storedAadhaarFileName = data.aadhaarFileName;
    storedAadhaarMime = data.aadhaarMime;
    await storage.bucket().file(aadhaarPath).save(data.aadhaarBytes, {
      resumable: false,
      metadata: { contentType: data.aadhaarMime, cacheControl: "private, no-store", metadata: { mobileHash: crypto.createHash("sha256").update(data.mobile).digest("hex") } },
      public: false,
      validation: "md5",
    });
    if (previousPath) await storage.bucket().file(previousPath).delete({ ignoreNotFound: true });
  }
  const safeData = { ...data };
  delete safeData.aadhaarBytes;
  delete safeData.aadhaarMime;
  delete safeData.aadhaarFileName;
  delete safeData.preserveExistingAadhaar;
  delete safeData.removeExistingAadhaar;
  const record = {
    ...safeData, eventId: EVENT_ID, registrationId: code,
    createdAt: old.exists ? oldData.createdAt : now,
    updatedAt: now,
    ...(isFood ? {} : (aadhaarPath ? { aadhaarPath, aadhaarFileName: storedAadhaarFileName, aadhaarMime: storedAadhaarMime } : {})),
  };
  await ref.set(record, { merge: false });
  return { exists: old.exists, registration: { ...safeData, eventId: EVENT_ID, registrationId: code, aadhaarUploaded: Boolean(aadhaarPath), updatedAt: new Date().toISOString() } };
}
async function lookupRegistration({ db, kind, mobile }) {
  const normalized = normalizeMobile(mobile);
  const collection = kind === "food" ? FOOD : kind === "stay" ? STAY : null;
  if (!collection) throw new Error("Invalid registration type.");
  const snapshot = await db.collection(collection).doc(normalized).get();
  if (!snapshot.exists) return { exists: false };
  const data = snapshot.data();
  const { aadhaarPath, ...safe } = data;
  delete safe.aadhaarMime;
  delete safe.aadhaarFileName;
  return { exists: true, registration: { ...safe, aadhaarUploaded: Boolean(aadhaarPath) } };
}
async function adminList({ db, kind, accessKey, expectedKey, filter = "" }) {
  if (!expectedKey || accessKey !== expectedKey) throw new Error("Unauthorized.");
  const collection = kind === "food" ? FOOD : kind === "stay" ? STAY : null;
  if (!collection) throw new Error("Invalid registration type.");
  const snap = await db.collection(collection).orderBy("updatedAt", "desc").limit(500).get();
  const needle = String(filter || "").trim().toLowerCase();
  const registrations = snap.docs.map(doc => {
    const data = doc.data();
    const { aadhaarPath, ...rest } = data;
    return { ...rest, aadhaarAvailable: Boolean(aadhaarPath) };
  }).filter(row => !needle || [row.name, row.mobile, row.address, row.comingFrom].some(v => String(v || "").toLowerCase().includes(needle)));
  const summary = registrations.reduce((s, row) => {
    s.registrations++;
    if (kind === "food") s.totalCoupons += Number(row.coupons || 0);
    else { s.male += Number(row.male || 0); s.female += Number(row.female || 0); s.children += Number(row.children || 0); }
    return s;
  }, { registrations: 0, totalCoupons: 0, male: 0, female: 0, children: 0 });
  return { registrations, summary };
}
async function adminAadhaarUrl({ db, accessKey, expectedKey, mobile, storage = getStorage() }) {
  if (!expectedKey || accessKey !== expectedKey) throw new Error("Unauthorized.");
  const normalized = normalizeMobile(mobile);
  const snap = await db.collection(STAY).doc(normalized).get();
  if (!snap.exists || !snap.data().aadhaarPath) throw new Error("Aadhaar document not found.");
  const [url] = await storage.bucket().file(snap.data().aadhaarPath).getSignedUrl({ action: "read", expires: Date.now() + 5 * 60 * 1000 });
  return { url, expiresInSeconds: 300 };
}
module.exports = { FOOD, STAY, normalizeMobile, validateFood, validateStay, registrationCode, saveRegistration, lookupRegistration, adminList, adminAadhaarUrl };