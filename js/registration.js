
const API_URL =
  "https://script.google.com/macros/s/AKfycbyKkCyUKvxiNq4ZdAv74ofzM53iOGJ-jL4z5aiZaJD9OcgNmmfdWKn6vHBZKs2Hmjix/exec";

const EVENT_ID =
  "shravak-sanskar-shivir-2026";



document.addEventListener("DOMContentLoaded", async () => {

  // ============================================================
  // ELEMENTS
  // ============================================================

  const registrationSuccessSection =
    document.getElementById(
      "registration-success-section"
    );

  const successTitle =
    document.getElementById(
      "success-title"
    );

  const successDescription =
    document.getElementById(
      "success-description"
    );

  const successRegistrationId =
    document.getElementById(
      "success-registration-id"
    );

  const successViewButton =
    document.getElementById(
      "success-view-button"
    );

  const rulesBox =
    document.getElementById("rules-box");

  const rulesAccepted =
    document.getElementById("rules-accepted");

  const acceptButton =
    document.getElementById("accept-button");

  const continueButton =
    document.getElementById("continue-button");

  const scrollStatus =
    document.getElementById("scroll-status");


  const rulesSection =
    document.querySelector(".registration-panel");


  const mobileSection =
    document.getElementById("mobile-section");

  const mobileInput =
    document.getElementById("mobile");

  const mobileMessage =
    document.getElementById("mobile-message");

  const mobileContinue =
    document.getElementById("mobile-continue");


  const existingRegistrationSection =
    document.getElementById(
      "existing-registration-section"
    );

  const existingRegistrationSummary =
    document.getElementById(
      "existing-registration-summary"
    );

  const viewRegistrationButton =
    document.getElementById(
      "view-registration-button"
    );


  const registrationDetailsSection =
    document.getElementById(
      "registration-details-section"
    );

  const registrationDetails =
    document.getElementById(
      "registration-details"
    );

  const familyMembersDetails =
    document.getElementById(
      "family-members-details"
    );

  const editRegistrationButton =
    document.getElementById(
      "edit-registration-button"
    );


  const registrationFormSection =
    document.getElementById(
      "registration-form-section"
    );

  const registrationForm =
    document.getElementById(
      "registration-form"
    );

  const registrationFormTitle =
    document.getElementById(
      "registration-form-title"
    );

  const registrationFormDescription =
    document.getElementById(
      "registration-form-description"
    );


  const formName =
    document.getElementById(
      "form-name"
    );

  const formFatherName =
    document.getElementById(
      "form-father-name"
    );

  const formAge =
    document.getElementById(
      "form-age"
    );

  const formMobile =
    document.getElementById(
      "form-mobile"
    );

  const formMaritalStatus =
    document.getElementById(
      "form-marital-status"
    );

  const formEducation =
    document.getElementById(
      "form-education"
    );

  const formOccupation =
    document.getElementById(
      "form-occupation"
    );

  const formAddress =
    document.getElementById(
      "form-address"
    );

  const formCity =
    document.getElementById(
      "form-city"
    );

  const formPincode =
    document.getElementById(
      "form-pincode"
    );

  const formAccommodation =
    document.getElementById(
      "form-accommodation"
    );

  const formFood =
    document.getElementById(
      "form-food"
    );


  const familyMembersForm =
    document.getElementById(
      "family-members-form"
    );

  const addFamilyMemberButton =
    document.getElementById(
      "add-family-member"
    );


  const formBackButton =
    document.getElementById(
      "form-back-button"
    );

  const saveRegistrationButton =
    document.getElementById(
      "save-registration-button"
    );

  const formMessage =
    document.getElementById(
      "form-message"
    );


  // ============================================================
  // CONFIGURATION
  // ============================================================




  // ============================================================
  // STATE
  // ============================================================

  let currentEvent = null;

  let currentMobile = "";

  let currentRegistration = null;

  let currentFamilyMembers = [];

  let editingExistingRegistration = false;

  let reachedBottom = false;


  // ============================================================
  // HTML SAFETY
  // ============================================================

  function escapeHtml(value) {

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  // ============================================================
  // DATE FORMATTER
  // ============================================================

  function formatDate(dateString) {

    if (!dateString) {
      return "";
    }


    const [year, month, day] =
      dateString.split("-");


    const months = [
      "जनवरी",
      "फरवरी",
      "मार्च",
      "अप्रैल",
      "मई",
      "जून",
      "जुलाई",
      "अगस्त",
      "सितम्बर",
      "अक्टूबर",
      "नवम्बर",
      "दिसम्बर"
    ];


    return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
  }


  // ============================================================
  // COMMON UI HELPERS
  // ============================================================
  function showOnly(section) {

    const sections = [
      mobileSection,
      existingRegistrationSection,
      registrationDetailsSection,
      registrationFormSection,
      registrationSuccessSection
    ];


    sections.forEach(item => {

      if (item) {
        item.classList.add("hidden");
      }

    });


    if (section) {
      section.classList.remove("hidden");
    }


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }


  function showFormMessage(message, type = "error") {

    if (!formMessage) {
      return;
    }


    formMessage.textContent = message;

    formMessage.classList.remove(
      "hidden"
    );


    formMessage.dataset.type = type;
  }


  function clearFormMessage() {

    if (!formMessage) {
      return;
    }


    formMessage.textContent = "";

    formMessage.classList.add(
      "hidden"
    );
  }


  // ============================================================
  // EVENT RENDERING
  // ============================================================

  function renderEvent(event) {

    currentEvent = event;


    document.title =
      `${event.name} २०२६ - पंजीकरण`;


    const pageTitle =
      document.querySelector(".page-title");


    if (pageTitle) {

      pageTitle.textContent =
        event.name;

    }


    const venueSummary =
      document.getElementById(
        "venue-summary"
      );


    if (venueSummary) {

      venueSummary.textContent =
        `${event.venue.name} · ${event.venue.place}`;

    }


    const eventDetails =
      document.getElementById(
        "event-details"
      );


    if (!eventDetails) {
      return;
    }


    eventDetails.innerHTML = `

      <div class="event-info-title">
        २०२६ शिविर की महत्वपूर्ण जानकारी
      </div>


      <div class="event-item">

        <span class="label">
          📅 शिविर की अवधि
        </span>

        <strong class="value">

          ${escapeHtml(
      formatDate(event.dates.start)
    )}

          से

          ${escapeHtml(
      formatDate(event.dates.end)
    )}

        </strong>

      </div>


      <div class="event-item">

        <span class="label">
          📋 पंजीकरण की अंतिम तिथि
        </span>

        <strong class="value">

          ${escapeHtml(
      formatDate(
        event.registration.deadline
      )
    )}

        </strong>

      </div>


      <div class="event-item">

        <span class="label">
          📍 शिविर स्थान
        </span>

        <strong class="value">

          ${escapeHtml(
      event.venue.name
    )}

          <br>

          ${escapeHtml(
      event.venue.place
    )}

        </strong>

      </div>

    `;
  }


  // ============================================================
  // RULE RENDERING
  // ============================================================

  function renderRules(event) {

    const rulesList =
      document.getElementById(
        "rules-list"
      );


    if (!rulesList) {
      return;
    }


    rulesList.innerHTML =
      event.rules
        .map(rule => `

          <div class="rule">

            <span class="rule-number">
              ${escapeHtml(rule.number)}.
            </span>

            <p>
              ${escapeHtml(rule.text)}
            </p>

          </div>

        `)
        .join("");
  }


  // ============================================================
  // LOAD EVENT DATA
  // ============================================================

  try {

    const response =
      await fetch(
        "data/event.json",
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `Could not load event data: ${response.status}`
      );

    }


    const event =
      await response.json();


    renderEvent(event);

    renderRules(event);

  } catch (error) {

    console.error(
      "Event loading error:",
      error
    );


    const rulesList =
      document.getElementById(
        "rules-list"
      );


    if (rulesList) {

      rulesList.innerHTML = `

        <p class="data-error">
          नियम लोड नहीं हो सके।
          कृपया पृष्ठ पुनः खोलें।
        </p>

      `;

    }


    return;
  }


  // ============================================================
  // RULE SCROLL
  // ============================================================

  function checkRulesScroll() {

    const reached =
      rulesBox.scrollTop +
      rulesBox.clientHeight >=
      rulesBox.scrollHeight - 10;


    if (
      reached &&
      !reachedBottom
    ) {

      reachedBottom = true;


      rulesAccepted.disabled =
        false;


      scrollStatus.textContent =
        "✓ आपने सभी नियम पढ़ लिए हैं";

    }
  }


  rulesBox.addEventListener(
    "scroll",
    checkRulesScroll
  );


  checkRulesScroll();


  // ============================================================
  // ACCEPT RULES
  // ============================================================

  rulesAccepted.addEventListener(
    "change",
    () => {

      acceptButton.disabled =
        !rulesAccepted.checked;

    }
  );


  acceptButton.addEventListener(
    "click",
    () => {

      if (!rulesAccepted.checked) {
        return;
      }


      acceptButton.textContent =
        "✓ नियम स्वीकार किए गए";


      acceptButton.disabled =
        true;


      continueButton.disabled =
        false;

    }
  );


  // ============================================================
  // CONTINUE FROM RULES
  // ============================================================

  continueButton.addEventListener(
    "click",
    () => {

      if (!rulesAccepted.checked) {
        return;
      }


      rulesSection.classList.add(
        "hidden"
      );


      showOnly(
        mobileSection
      );

    }
  );
  successViewButton.addEventListener(
    "click",
    () => {

      renderRegistrationDetails();

    }
  );

  editRegistrationButton.addEventListener(
    "click",
    () => {

      showEditRegistrationForm();

    }
  );
  function showEditRegistrationForm() {

    if (!currentRegistration) {
      return;
    }


    editingExistingRegistration =
      true;


    populateRegistrationForm(
      currentRegistration,
      currentFamilyMembers
    );


    registrationFormTitle.textContent =
      "पंजीकरण संशोधित करें";


    registrationFormDescription.textContent =
      "अपनी जानकारी में आवश्यक परिवर्तन करें。";


    saveRegistrationButton.textContent =
      "परिवर्तन सुरक्षित करें";


    showOnly(
      registrationFormSection
    );


    formName.focus();
  }
  // ============================================================
  // SHOW EXISTING REGISTRATION SUMMARY
  // ============================================================

  function showExistingRegistration(
    result
  ) {

    currentRegistration =
      result.registration || null;


    currentFamilyMembers =
      Array.isArray(
        result.familyMembers
      )
        ? result.familyMembers
        : [];


    if (!currentRegistration) {

      showFormMessage(
        "पंजीकरण की जानकारी प्राप्त नहीं हो सकी।"
      );

      return;
    }


    const registration =
      currentRegistration;


    existingRegistrationSummary.innerHTML = `

      <div class="registration-summary-item">

        <span>
          पंजीकरण क्रमांक
        </span>

        <strong>
          ${escapeHtml(
      registration.registrationId
    )}
        </strong>

      </div>


      <div class="registration-summary-item">

        <span>
          नाम
        </span>

        <strong>
          ${escapeHtml(
      registration.name
    )}
        </strong>

      </div>


      <div class="registration-summary-item">

        <span>
          मोबाइल नंबर
        </span>

        <strong>
          ${escapeHtml(
      registration.mobile
    )}
        </strong>

      </div>

    `;


    showOnly(
      existingRegistrationSection
    );
  }


  // ============================================================
  // VIEW EXISTING REGISTRATION
  // ============================================================

  function renderRegistrationDetails() {

    if (!currentRegistration) {
      return;
    }


    const registration =
      currentRegistration;


    registrationDetails.innerHTML = `

      <div class="details-grid">

        <div class="detail-item">

          <span class="detail-label">
            पंजीकरण क्रमांक
          </span>

          <strong>
            ${escapeHtml(
      registration.registrationId
    )}
          </strong>

        </div>


        <div class="detail-item">

          <span class="detail-label">
            नाम
          </span>

          <strong>
            ${escapeHtml(
      registration.name
    )}
          </strong>

        </div>


        <div class="detail-item">

          <span class="detail-label">
            पिता / पति का नाम
          </span>

          <strong>
            ${escapeHtml(
      registration.fatherName
    )}
          </strong>

        </div>


        <div class="detail-item">

          <span class="detail-label">
            आयु
          </span>

          <strong>
            ${escapeHtml(
      registration.age
    )}
          </strong>

        </div>


        <div class="detail-item">

          <span class="detail-label">
            मोबाइल नंबर
          </span>

          <strong>
            ${escapeHtml(
      registration.mobile
    )}
          </strong>

        </div>


        <div class="detail-item">

          <span class="detail-label">
            वैवाहिक स्थिति
          </span>

          <strong>
            ${escapeHtml(
      translateMaritalStatus(
        registration.maritalStatus
      )
    )}
          </strong>

        </div>


        <div class="detail-item">

          <span class="detail-label">
            शिक्षा
          </span>

          <strong>
            ${escapeHtml(
      registration.education
    )}
          </strong>

        </div>


        <div class="detail-item">

          <span class="detail-label">
            व्यवसाय
          </span>

          <strong>
            ${escapeHtml(
      registration.occupation
    )}
          </strong>

        </div>


        <div class="detail-item detail-full">

          <span class="detail-label">
            पता
          </span>

          <strong>
            ${escapeHtml(
      registration.address
    )}
          </strong>

        </div>


        <div class="detail-item">

          <span class="detail-label">
            शहर
          </span>

          <strong>
            ${escapeHtml(
      registration.city
    )}
          </strong>

        </div>


        <div class="detail-item">

          <span class="detail-label">
            पिनकोड
          </span>

          <strong>
            ${escapeHtml(
      registration.pincode
    )}
          </strong>

        </div>


        <div class="detail-item">

          <span class="detail-label">
            आवास
          </span>

          <strong>
            ${registration.accommodationRequired
        ? "आवश्यक है"
        : "आवश्यक नहीं है"}
          </strong>

        </div>


        <div class="detail-item">

          <span class="detail-label">
            भोजन
          </span>

          <strong>
            ${registration.foodRequired
        ? "आवश्यक है"
        : "आवश्यक नहीं है"}
          </strong>

        </div>

      </div>

    `;


    renderFamilyMembers(
      currentFamilyMembers
    );


    showOnly(
      registrationDetailsSection
    );
  }


  // ============================================================
  // FAMILY MEMBER DISPLAY
  // ============================================================

  function renderFamilyMembers(
    members
  ) {

    if (!familyMembersDetails) {
      return;
    }


    if (
      !members ||
      members.length === 0
    ) {

      familyMembersDetails.innerHTML = `

        <div class="form-section">

          <div class="form-section-title">
            परिवार के सदस्य
          </div>

          <p class="form-section-description">
            कोई परिवार सदस्य दर्ज नहीं है।
          </p>

        </div>

      `;

      return;
    }


    familyMembersDetails.innerHTML = `

      <div class="form-section">

        <div class="form-section-title">
          परिवार के सदस्य
        </div>


        <div class="family-members-list">

          ${members.map(
      (member, index) => `

              <div class="family-member-card">

                <div class="family-member-number">
                  ${index + 1}
                </div>


                <div class="family-member-content">

                  <div class="family-member-name">
                    ${escapeHtml(
        member.name
      )}
                  </div>


                  <div class="family-member-meta">

                    <span>
                      संबंध:
                      ${escapeHtml(
        member.relation
      )}
                    </span>

                    <span>
                      आयु:
                      ${escapeHtml(
        member.age
      )}
                    </span>

                    <span>
                      लिंग:
                      ${escapeHtml(
        translateGender(
          member.gender
        )
      )}
                    </span>

                  </div>


                  <div class="family-member-meta">

                    <span>
                      आवास:
                      ${member.accommodationRequired
          ? "हाँ"
          : "नहीं"
        }
                    </span>

                    <span>
                      भोजन:
                      ${member.foodRequired
          ? "हाँ"
          : "नहीं"
        }
                    </span>

                  </div>

                </div>

              </div>

            `
    ).join("")}

        </div>

      </div>

    `;
  }


  // ============================================================
  // TRANSLATIONS
  // ============================================================

  function translateMaritalStatus(
    value
  ) {

    switch (String(value || "").toLowerCase()) {

      case "married":
        return "विवाहित";

      case "unmarried":
        return "अविवाहित";

      case "other":
        return "अन्य";

      default:
        return value || "-";
    }
  }


  function translateGender(
    value
  ) {

    switch (String(value || "").toLowerCase()) {

      case "male":
        return "पुरुष";

      case "female":
        return "महिला";

      default:
        return value || "-";
    }
  }


  // ============================================================
  // SHOW NEW REGISTRATION FORM
  // ============================================================

  function showNewRegistrationForm(
    mobile
  ) {

    currentMobile =
      mobile;


    currentRegistration =
      null;


    currentFamilyMembers =
      [];


    editingExistingRegistration =
      false;


    clearRegistrationForm();


    formMobile.value =
      mobile;


    registrationFormTitle.textContent =
      "नया पंजीकरण";


    registrationFormDescription.textContent =
      "कृपया अपनी जानकारी भरें।";


    saveRegistrationButton.textContent =
      "पंजीकरण सुरक्षित करें";


    showOnly(
      registrationFormSection
    );


    formName.focus();
  }


  // ============================================================
  // SHOW EDIT FORM
  // ============================================================

  function showEditRegistrationForm() {

    if (!currentRegistration) {
      return;
    }


    editingExistingRegistration =
      true;


    populateRegistrationForm(
      currentRegistration,
      currentFamilyMembers
    );


    registrationFormTitle.textContent =
      "पंजीकरण संशोधित करें";


    registrationFormDescription.textContent =
      "अपनी जानकारी में आवश्यक परिवर्तन करें।";


    saveRegistrationButton.textContent =
      "परिवर्तन सुरक्षित करें";


    showOnly(
      registrationFormSection
    );


    formName.focus();
  }


  // ============================================================
  // CLEAR FORM
  // ============================================================

  function clearRegistrationForm() {

    registrationForm.reset();


    formMobile.value =
      currentMobile;


    familyMembersForm.innerHTML =
      "";


    clearFormMessage();
  }


  // ============================================================
  // POPULATE EDIT FORM
  // ============================================================

  function populateRegistrationForm(
    registration,
    members
  ) {

    formName.value =
      registration.name || "";


    formFatherName.value =
      registration.fatherName || "";


    formAge.value =
      registration.age || "";


    formMobile.value =
      registration.mobile || "";


    formMaritalStatus.value =
      registration.maritalStatus || "";


    formEducation.value =
      registration.education || "";


    formOccupation.value =
      registration.occupation || "";


    formAddress.value =
      registration.address || "";


    formCity.value =
      registration.city || "";


    formPincode.value =
      registration.pincode || "";


    formAccommodation.checked =
      Boolean(
        registration.accommodationRequired
      );


    formFood.checked =
      Boolean(
        registration.foodRequired
      );


    familyMembersForm.innerHTML =
      "";


    if (
      Array.isArray(members)
    ) {

      members.forEach(
        member => {

          addFamilyMemberRow(
            member
          );

        }
      );

    }


    clearFormMessage();
  }


  // ============================================================
  // ADD FAMILY MEMBER
  // ============================================================

  function addFamilyMemberRow(
    member = {}
  ) {

    const row =
      document.createElement(
        "div"
      );


    row.className =
      "family-member-form-row";


    row.innerHTML = `

      <div class="family-member-form-head">

        <span>
          परिवार सदस्य
        </span>

        <button
          type="button"
          class="remove-family-member"
        >
          हटाएँ
        </button>

      </div>


      <div class="form-field">

        <label>
          नाम <span>*</span>
        </label>

        <input
          type="text"
          class="input family-name"
          value="${escapeHtml(
      member.name || ""
    )}"
        >

      </div>


      <div class="form-row">

        <div class="form-field">

          <label>
            संबंध
          </label>

          <input
            type="text"
            class="input family-relation"
            value="${escapeHtml(
      member.relation || ""
    )}"
          >

        </div>


        <div class="form-field">

          <label>
            आयु
          </label>

          <input
            type="number"
            class="input family-age"
            min="0"
            max="120"
            value="${escapeHtml(
      member.age || ""
    )}"
          >

        </div>

      </div>


      <div class="form-row">

        <div class="form-field">

          <label>
            लिंग
          </label>

          <select
            class="input family-gender"
          >

            <option value="">
              चयन करें
            </option>

            <option
              value="Male"
              ${member.gender === "Male"
        ? "selected"
        : ""
      }
            >
              पुरुष
            </option>

            <option
              value="Female"
              ${member.gender === "Female"
        ? "selected"
        : ""
      }
            >
              महिला
            </option>

          </select>

        </div>


        <div class="form-field">

          <label>
            मोबाइल नंबर
          </label>

          <input
            type="tel"
            class="input family-mobile"
            inputmode="numeric"
            maxlength="10"
            value="${escapeHtml(
        member.mobile || ""
      )}"
          >

        </div>

      </div>


      <div class="family-member-options">

        <label class="check-option">

          <input
            type="checkbox"
            class="family-accommodation"
            ${member.accommodationRequired
        ? "checked"
        : ""
      }
          >

          <span>
            आवास
          </span>

        </label>


        <label class="check-option">

          <input
            type="checkbox"
            class="family-food"
            ${member.foodRequired
        ? "checked"
        : ""
      }
          >

          <span>
            भोजन
          </span>

        </label>

      </div>

    `;


    const removeButton =
      row.querySelector(
        ".remove-family-member"
      );


    removeButton.addEventListener(
      "click",
      () => {

        row.remove();

      }
    );


    familyMembersForm.appendChild(
      row
    );
  }


  // ============================================================
  // COLLECT FAMILY MEMBERS
  // ============================================================

  function collectFamilyMembers() {

    const rows =
      familyMembersForm.querySelectorAll(
        ".family-member-form-row"
      );


    return Array.from(rows)
      .map(row => {

        return {

          name:
            row.querySelector(
              ".family-name"
            ).value.trim(),

          relation:
            row.querySelector(
              ".family-relation"
            ).value.trim(),

          age:
            row.querySelector(
              ".family-age"
            ).value
              ? Number(
                row.querySelector(
                  ".family-age"
                ).value
              )
              : "",

          gender:
            row.querySelector(
              ".family-gender"
            ).value,

          mobile:
            row.querySelector(
              ".family-mobile"
            ).value
              .replace(/\D/g, ""),

          accommodationRequired:
            row.querySelector(
              ".family-accommodation"
            ).checked,

          foodRequired:
            row.querySelector(
              ".family-food"
            ).checked

        };

      });
  }


  // ============================================================
  // COLLECT REGISTRATION DATA
  // ============================================================

  function collectRegistrationData() {

    return {

      eventId:
        EVENT_ID,

      mobile:
        formMobile.value
          .replace(/\D/g, ""),

      name:
        formName.value.trim(),

      fatherName:
        formFatherName.value.trim(),

      age:
        formAge.value
          ? Number(formAge.value)
          : "",

      maritalStatus:
        formMaritalStatus.value,

      education:
        formEducation.value.trim(),

      occupation:
        formOccupation.value.trim(),

      address:
        formAddress.value.trim(),

      city:
        formCity.value.trim(),

      pincode:
        formPincode.value
          .replace(/\D/g, ""),

      accommodationRequired:
        formAccommodation.checked,

      foodRequired:
        formFood.checked,

      consentAccepted:
        true,

      familyMembers:
        collectFamilyMembers()

    };
  }


  // ============================================================
  // FORM VALIDATION
  // ============================================================

  function validateRegistrationData(
    data
  ) {

    if (!data.name) {

      return "कृपया अपना नाम दर्ज करें।";

    }


    if (!data.fatherName) {

      return "कृपया पिता / पति का नाम दर्ज करें।";

    }


    if (
      !data.age ||
      data.age < 1 ||
      data.age > 120
    ) {

      return "कृपया सही आयु दर्ज करें।";

    }


    if (
      !/^[6-9]\d{9}$/.test(
        data.mobile
      )
    ) {

      return "कृपया सही मोबाइल नंबर दर्ज करें।";

    }


    if (!data.address) {

      return "कृपया पूरा पता दर्ज करें।";

    }


    if (!data.city) {

      return "कृपया शहर दर्ज करें।";

    }


    if (
      !/^\d{6}$/.test(
        data.pincode
      )
    ) {

      return "कृपया सही 6 अंकों का पिनकोड दर्ज करें।";

    }


    for (
      let i = 0;
      i < data.familyMembers.length;
      i++
    ) {

      const member =
        data.familyMembers[i];


      if (!member.name) {

        return `परिवार सदस्य ${i + 1} का नाम दर्ज करें।`;

      }


      if (
        member.mobile &&
        !/^[6-9]\d{9}$/.test(
          member.mobile
        )
      ) {

        return `परिवार सदस्य ${i + 1} का मोबाइल नंबर सही नहीं है।`;

      }

    }


    return null;
  }


  // ============================================================
  // MOBILE LOOKUP
  // ============================================================

  mobileContinue.addEventListener(
    "click",
    async () => {

      const mobile =
        mobileInput.value
          .replace(/\D/g, "");


      if (
        !/^[6-9]\d{9}$/.test(
          mobile
        )
      ) {

        mobileMessage.textContent =
          "कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।";


        mobileMessage.classList.remove(
          "hidden"
        );


        mobileInput.focus();

        return;
      }


      mobileMessage.classList.add(
        "hidden"
      );


      mobileContinue.disabled =
        true;


      mobileContinue.textContent =
        "जाँच हो रही है...";


      currentMobile =
        mobile;


      try {

        const result =
          await lookupRegistration(
            mobile
          );


        console.log(
          "Lookup result:",
          result
        );


        if (!result || !result.success) {

          throw new Error(
            result?.error ||
            "पंजीकरण की जाँच नहीं हो सकी।"
          );

        }


        if (result.exists) {

          showExistingRegistration(
            result
          );

        } else {

          showNewRegistrationForm(
            mobile
          );

        }

      } catch (error) {

        console.error(
          "Lookup error:",
          error
        );


        mobileMessage.textContent =
          error.message ||
          "सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।";


        mobileMessage.classList.remove(
          "hidden"
        );

      } finally {

        mobileContinue.disabled =
          false;


        mobileContinue.textContent =
          "आगे बढ़ें";

      }

    }
  );


  // ============================================================
  // VIEW EXISTING REGISTRATION
  // ============================================================

  viewRegistrationButton.addEventListener(
    "click",
    () => {

      renderRegistrationDetails();

    }
  );


  // ============================================================
  // EDIT EXISTING REGISTRATION
  // ============================================================

  editRegistrationButton.addEventListener(
    "click",
    () => {

      showEditRegistrationForm();

    }
  );


  // ============================================================
  // ADD FAMILY MEMBER
  // ============================================================

  addFamilyMemberButton.addEventListener(
    "click",
    () => {

      addFamilyMemberRow();

    }
  );


  // ============================================================
  // FORM BACK
  // ============================================================

  formBackButton.addEventListener(
    "click",
    () => {

      if (
        editingExistingRegistration
      ) {

        renderRegistrationDetails();

      } else {

        showOnly(
          mobileSection
        );

      }

    }
  );


  // ============================================================
  // FORM SUBMIT
  // ============================================================

  registrationForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      clearFormMessage();

      const data =
        collectRegistrationData();


      // ----------------------------------------------------------
      // Validate
      // ----------------------------------------------------------

      const validationError =
        validateRegistrationData(data);


      if (validationError) {

        showFormMessage(
          validationError
        );

        return;
      }


      // ----------------------------------------------------------
      // Disable button
      // ----------------------------------------------------------

      saveRegistrationButton.disabled =
        true;

      saveRegistrationButton.textContent =
        editingExistingRegistration
          ? "परिवर्तन सुरक्षित हो रहे हैं..."
          : "पंजीकरण सुरक्षित हो रहा है...";


      try {

        // --------------------------------------------------------
        // Submit to Apps Script
        // --------------------------------------------------------

        await submitRegistration(
          editingExistingRegistration
            ? "updateRegistration"
            : "createRegistration",
          data
        );


        // --------------------------------------------------------
        // Verify the saved data using our working JSONP lookup
        // --------------------------------------------------------

        showFormMessage(
          "जानकारी सुरक्षित की जा रही है...",
          "info"
        );


        const savedResult =
          await waitForSavedRegistration(
            data.mobile,
            data
          );


        if (
          !savedResult ||
          !savedResult.success ||
          !savedResult.exists
        ) {

          throw new Error(
            "जानकारी सुरक्षित होने की पुष्टि नहीं हो सकी।"
          );
        }


        // --------------------------------------------------------
        // Save successful
        // --------------------------------------------------------

        currentRegistration =
          savedResult.registration;


        currentFamilyMembers =
          Array.isArray(
            savedResult.familyMembers
          )
            ? savedResult.familyMembers
            : [];


        // --------------------------------------------------------
        // Show success
        // --------------------------------------------------------

        if (editingExistingRegistration) {

          showUpdateSuccess();

        } else {

          showCreateSuccess();

        }


      } catch (error) {

        console.error(
          "Save error:",
          error
        );


        showFormMessage(
          error.message ||
          "जानकारी सुरक्षित नहीं हो सकी। कृपया पुनः प्रयास करें।"
        );


      } finally {

        saveRegistrationButton.disabled =
          false;

        saveRegistrationButton.textContent =
          editingExistingRegistration
            ? "परिवर्तन सुरक्षित करें"
            : "पंजीकरण सुरक्षित करें";

      }

    }
  );

  // ============================================================
  // UPDATE SUCCESS
  // ============================================================
  function showCreateSuccess() {

    successTitle.textContent =
      "पंजीकरण सफलतापूर्वक हो गया";


    successDescription.textContent =
      "आपकी जानकारी सफलतापूर्वक सुरक्षित कर ली गई है।";


    successRegistrationId.textContent =
      currentRegistration?.registrationId ||
      "-";


    showOnly(
      registrationSuccessSection
    );
  }
  function showUpdateSuccess() {

    successTitle.textContent =
      "जानकारी सफलतापूर्वक संशोधित हुई";


    successDescription.textContent =
      "आपके पंजीकरण की जानकारी सफलतापूर्वक अपडेट कर दी गई है।";


    successRegistrationId.textContent =
      currentRegistration?.registrationId ||
      "-";


    showOnly(
      registrationSuccessSection
    );
  }

  // ============================================================
  // INITIAL STATE
  // ============================================================

  /*
   * Rules panel is the first screen.
   *
   * Other panels are hidden by HTML/CSS.
   */

});
// ============================================================
// SUBMIT REGISTRATION TO APPS SCRIPT
// ============================================================

function submitRegistration(action, data) {

  return new Promise((resolve, reject) => {

    const iframeName =
      "registration_submit_" + Date.now();

    // ----------------------------------------------------------
    // Hidden iframe
    // ----------------------------------------------------------

    const iframe =
      document.createElement("iframe");

    iframe.name = iframeName;
    iframe.style.display = "none";

    document.body.appendChild(iframe);


    // ----------------------------------------------------------
    // Temporary POST form
    // ----------------------------------------------------------

    const form =
      document.createElement("form");

    form.method = "POST";
    form.action = API_URL;
    form.target = iframeName;
    form.style.display = "none";


    // ----------------------------------------------------------
    // Payload
    // ----------------------------------------------------------

    const payload = {
      action: action,
      data: data
    };


    const input =
      document.createElement("input");

    input.type = "hidden";
    input.name = "payload";
    input.value = JSON.stringify(payload);

    form.appendChild(input);

    document.body.appendChild(form);


    // ----------------------------------------------------------
    // Cleanup
    // ----------------------------------------------------------

    let completed = false;

    function cleanup() {

      if (form.parentNode) {
        form.parentNode.removeChild(form);
      }

      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }


    // ----------------------------------------------------------
    // Timeout
    // ----------------------------------------------------------

    const timeout =
      setTimeout(() => {

        if (completed) {
          return;
        }

        completed = true;

        cleanup();

        reject(
          new Error(
            "सर्वर से प्रतिक्रिया मिलने में अधिक समय लग रहा है।"
          )
        );

      }, 20000);


    // ----------------------------------------------------------
    // POST completed
    // ----------------------------------------------------------

    iframe.onload = () => {

      if (completed) {
        return;
      }

      completed = true;

      clearTimeout(timeout);

      cleanup();

      resolve({
        success: true
      });
    };


    // ----------------------------------------------------------
    // Submit
    // ----------------------------------------------------------

    form.submit();

  });
}

async function waitForSavedRegistration(
  mobile,
  expectedData
) {

  const maxAttempts = 5;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {

    console.log(
      `Verifying saved registration. Attempt ${attempt}/${maxAttempts}`
    );

    try {

      const result =
        await lookupRegistration(mobile);

      console.log(
        "Verification result:",
        result
      );


      if (
        result &&
        result.success &&
        result.exists &&
        result.registration
      ) {

        const saved =
          result.registration;


        // ------------------------------------------------------
        // Verify important fields
        // ------------------------------------------------------

        const matches =
          String(saved.mobile || "") ===
          String(expectedData.mobile || "") &&

          String(saved.name || "") ===
          String(expectedData.name || "") &&

          String(saved.fatherName || "") ===
          String(expectedData.fatherName || "") &&

          Number(saved.age || 0) ===
          Number(expectedData.age || 0) &&

          String(saved.address || "") ===
          String(expectedData.address || "") &&

          String(saved.city || "") ===
          String(expectedData.city || "") &&

          String(saved.pincode || "") ===
          String(expectedData.pincode || "") &&

          Boolean(saved.accommodationRequired) ===
          Boolean(expectedData.accommodationRequired) &&

          Boolean(saved.foodRequired) ===
          Boolean(expectedData.foodRequired);


        if (matches) {

          console.log(
            "✓ Saved data verified successfully."
          );

          return result;

        }


        console.log(
          "Saved record found, but values have not updated yet."
        );

      }

    } catch (error) {

      console.warn(
        `Verification attempt ${attempt} failed:`,
        error
      );

    }


    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          1000
        )
    );

  }


  throw new Error(
    "जानकारी सुरक्षित होने की पुष्टि नहीं हो सकी। कृपया कुछ देर बाद पुनः जाँच करें।"
  );
}


// ============================================================
// JSONP REGISTRATION LOOKUP
// ============================================================

function lookupRegistration(mobile) {

  return new Promise(
    (resolve, reject) => {

      const callbackName =
        "registrationLookup_" +
        Date.now() +
        "_" +
        Math.random()
          .toString(36)
          .substring(2);


      const script =
        document.createElement(
          "script"
        );


      let finished = false;


      const timeout =
        setTimeout(
          () => {

            if (finished) {
              return;
            }


            finished = true;

            cleanup();


            reject(
              new Error(
                "Registration lookup timed out."
              )
            );

          },
          15000
        );


      function cleanup() {

        clearTimeout(timeout);


        try {
          delete window[callbackName];
        } catch (error) {
          console.warn(error);
        }


        if (
          script.parentNode
        ) {

          script.parentNode
            .removeChild(script);

        }

      }


      window[callbackName] =
        function (result) {

          if (finished) {
            return;
          }


          finished = true;

          cleanup();

          resolve(result);

        };


      script.onerror =
        function () {

          if (finished) {
            return;
          }


          finished = true;

          cleanup();


          reject(
            new Error(
              "Could not connect to registration service."
            )
          );

        };


      const params =
        new URLSearchParams({

          api:
            "lookupRegistration",

          eventId:
            EVENT_ID,

          mobile:
            mobile,

          callback:
            callbackName

        });


      script.src =
        `${API_URL}?${params.toString()}`;


      document.body.appendChild(
        script
      );

    }
  );
}