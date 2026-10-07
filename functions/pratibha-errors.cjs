const { HttpsError } = require("firebase-functions/v2/https");

const PUBLIC_ERROR_PATTERNS = [
  /^Required field missing: [A-Za-z][A-Za-z0-9]*$/,
  /^Invalid mobile number\.$/,
  /^Invalid PIN code\.$/,
  /^कक्षा केवल 10वीं या 12वीं हो सकती है।$/,
  /^Overall percentage must be between 0 and 100\.$/,
  /^कक्षा (10|12)वीं के लिए न्यूनतम (80|85)% आवश्यक है।$/,
  /^Face photo is required\.$/,
  /^Maximum 10 supporting documents are allowed\.$/,
  /^एक Aadhaar और एक marksheet अनिवार्य है।$/,
  /^Invalid upload\.$/,
  /^Unsupported file type\.$/,
  /^File is too large\.$/,
  /^Form submission is currently paused\.$/,
  /^Form submission has not opened yet\.$/,
  /^Registration is closed\.$/,
  /^A registration already exists for this mobile number\. Please search the existing registration and edit it\.$/,
  /^All active rules must be accepted\.$/,
  /^Application not found\.$/,
  /^Unauthorized\.$/,
  /^Multiple registrations found for this mobile number\. Please contact the coordinator\.$/,
  /^Finalized applications cannot be edited\.$/,
];

function mapPublicError(error) {
  const message = String(error?.message || "").trim();
  if (!PUBLIC_ERROR_PATTERNS.some(pattern => pattern.test(message))) return null;
  return new HttpsError("invalid-argument", message);
}

module.exports = { mapPublicError };
