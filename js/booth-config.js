// Use the dedicated UAT Firebase Functions endpoint here, for example:
// https://asia-south1-YOUR-UAT-PROJECT.cloudfunctions.net
// Do not point UAT to the production project.
window.BOOTH_FUNCTIONS_BASE = window.BOOTH_FUNCTIONS_BASE || "https://asia-south1-jain-community-platform.cloudfunctions.net";
// Set only to the official Kharadi Jain Samaj Trust UPI ID after verification.
window.BOOTH_PAYMENT_UPI_ID = window.BOOTH_PAYMENT_UPI_ID || "";

// Optional relative path to the official Trust QR image, e.g. images/booth-payment-qr.png.
window.BOOTH_PAYMENT_QR_IMAGE = window.BOOTH_PAYMENT_QR_IMAGE || "assets/images/temple-payment-qr.jpeg";
