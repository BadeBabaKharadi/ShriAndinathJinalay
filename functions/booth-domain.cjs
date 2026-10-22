const EVENT_ID = "booth-2026-10-25";
const LIMIT = 20;
const FEE = 2100;

class BoothValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "BoothValidationError";
  }
}

function validMobile(value) {
  return /^[6-9]\d{9}$/.test(String(value || "").replace(/\D/g, "").slice(-10));
}

function clean(value, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validate(input, requireReceipt = true) {
  const fields = ["name", "stallName", "businessType", "mobile", "society", "city", "state"];
  for (const field of fields) {
    if (!clean(input[field], field === "businessType" ? 80 : 120)) {
      throw new BoothValidationError("Please complete every required field: " + field + ".");
    }
  }
  if (!validMobile(input.mobile)) {
    throw new BoothValidationError("Enter a valid 10-digit Indian mobile number.");
  }
  if (requireReceipt && (!input.receiptBase64 || !/^image\/(jpeg|png|webp)$/.test(input.receiptMime || ""))) {
    throw new BoothValidationError("Upload a valid payment receipt image (JPG, PNG or WebP).");
  }
  if (input.receiptBase64 && input.receiptBase64.length > 1900000) {
    throw new BoothValidationError("Receipt image is too large. Please upload an image under 1.4 MB.");
  }
  return {
    name: clean(input.name),
    stallName: clean(input.stallName),
    businessType: clean(input.businessType, 80),
    mobile: String(input.mobile).replace(/\D/g, "").slice(-10),
    society: clean(input.society),
    city: clean(input.city),
    state: clean(input.state),
  };
}

module.exports = { EVENT_ID, LIMIT, FEE, BoothValidationError, validMobile, validate };
