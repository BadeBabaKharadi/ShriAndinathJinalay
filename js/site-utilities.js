(() => {
  "use strict";

  const HOME_URL = new URL("index.html", window.location.href).href;
  const MOBILE_PATTERN = /^[6-9]\d{9}$/;
  const normalizeMobile = value => {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    return digits;
  };

  function installBottomNavigation() {
    if (document.querySelector(".site-utility-bottom-nav, .mobile-bottom-nav") || document.getElementById("navbar")) return;

    const style = document.createElement("style");
    style.textContent = `
      .site-utility-bottom-nav{position:fixed;z-index:9999;left:0;right:0;bottom:0;display:flex;justify-content:center;gap:10px;padding:9px 12px calc(9px + env(safe-area-inset-bottom));background:rgba(255,255,255,.97);border-top:1px solid #e7ddcf;box-shadow:0 -4px 18px rgba(43,28,12,.10);backdrop-filter:blur(10px)}
      .site-utility-bottom-nav a,.site-utility-bottom-nav button{display:flex;align-items:center;justify-content:center;gap:7px;min-height:42px;min-width:112px;padding:8px 16px;border:1px solid #d9c6aa;border-radius:999px;background:#fffaf2;color:#633a1b;font:inherit;font-size:14px;font-weight:600;line-height:1.2;text-decoration:none;cursor:pointer}
      .site-utility-bottom-nav a:focus-visible,.site-utility-bottom-nav button:focus-visible{outline:3px solid #c88b3a;outline-offset:2px}
      body{padding-bottom:78px!important}
      @media(min-width:900px){.site-utility-bottom-nav{left:auto;right:18px;bottom:18px;border:1px solid #e7ddcf;border-radius:999px;padding:8px;box-shadow:0 4px 20px rgba(43,28,12,.13)}body{padding-bottom:0!important}}
    `;
    document.head.appendChild(style);

    const nav = document.createElement("nav");
    nav.className = "site-utility-bottom-nav";
    nav.setAttribute("aria-label", "पृष्ठ नेविगेशन");
    const home = document.createElement("a");
    home.href = HOME_URL;
    home.innerHTML = "<span aria-hidden=\"true\">⌂</span> मुख्य पृष्ठ";
    const back = document.createElement("button");
    back.type = "button";
    back.innerHTML = "<span aria-hidden=\"true\">←</span> वापस जाएँ";
    back.addEventListener("click", () => {
      if (window.history.length > 1 && document.referrer && new URL(document.referrer).origin === window.location.origin) {
        window.history.back();
      } else {
        window.location.assign(HOME_URL);
      }
    });
    nav.append(home, back);
    document.body.appendChild(nav);
  }

  function installMobileValidation() {
    const candidates = document.querySelectorAll(
      'input[type="tel"], input[name*="mobile" i], input[id*="mobile" i], input[name*="phone" i], input[id*="phone" i]'
    );
    candidates.forEach(input => {
      if (input.dataset.mobileValidationInstalled === "true") return;
      input.dataset.mobileValidationInstalled = "true";
      input.setAttribute("inputmode", "numeric");
      input.setAttribute("autocomplete", "tel-national");
      const validate = () => {
        if (!input.value.trim()) {
          input.setCustomValidity(input.required ? "कृपया मोबाइल नंबर दर्ज करें।" : "");
          return !input.required;
        }
        const valid = MOBILE_PATTERN.test(normalizeMobile(input.value));
        input.setCustomValidity(valid ? "" : "कृपया सही 10 अंकों का भारतीय मोबाइल नंबर दर्ज करें।");
        return valid;
      };
      input.addEventListener("input", validate);
      input.addEventListener("blur", validate);
      input.addEventListener("invalid", validate);
    });

    document.querySelectorAll("form").forEach(form => {
      form.addEventListener("submit", event => {
        const invalid = [...form.querySelectorAll(
          'input[type="tel"], input[name*="mobile" i], input[id*="mobile" i], input[name*="phone" i], input[id*="phone" i]'
        )].find(input => input.value.trim() && !MOBILE_PATTERN.test(normalizeMobile(input.value)));
        if (invalid) {
          invalid.setCustomValidity("कृपया सही 10 अंकों का भारतीय मोबाइल नंबर दर्ज करें।");
          invalid.reportValidity();
          invalid.focus();
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }, true);
    });
  }

  function init() {
    installBottomNavigation();
    installMobileValidation();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
