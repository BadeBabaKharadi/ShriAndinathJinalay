document.addEventListener("DOMContentLoaded", async () => {
  const DATA_URL = "./data/team.json";
  const teamList = document.getElementById("team-list");
  const loader = document.getElementById("team-loader");
  const emptyState = document.getElementById("team-empty");

  if (!teamList) {
    console.error("Team list element not found.");
    return;
  }

  function hideLoader() {
    if (loader) loader.classList.add("is-hidden");
  }

  function normalizeMobile(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function createIcon(type) {
    if (type === "call") {
      return `<svg viewBox="0 0 24 24" width="18" height="18"
        aria-hidden="true" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2
        19.8 19.8 0 0 1-8.63-3.07
        19.5 19.5 0 0 1-6-6
        19.8 19.8 0 0 1-3.07-8.67
        A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72
        c.12.9.33 1.78.62 2.63
        a2 2 0 0 1-.45 2.11L8 9.73
        a16 16 0 0 0 6 6l1.27-1.27
        a2 2 0 0 1 2.11-.45
        c.85.29 1.73.5 2.63.62
        A2 2 0 0 1 22 16.92z"/>
      </svg>`;
    }

    return `<svg viewBox="0 0 24 24" width="18" height="18"
      aria-hidden="true" fill="currentColor">
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.07 0
      C5.5 0 .15 5.35.15 11.93
      c0 2.1.55 4.15 1.59 5.96
      L.05 24l6.25-1.64
      a11.9 11.9 0 0 0 5.77 1.48h.01
      c6.57 0 11.92-5.35 11.92-11.93
      0-3.19-1.24-6.19-3.48-8.43z
      M12.08 21.8c-1.8 0-3.56-.48-5.1-1.39
      l-.37-.22-3.71.97.99-3.61-.24-.37
      a9.87 9.87 0 0 1-1.51-5.25
      c0-5.46 4.45-9.91 9.92-9.91
      2.65 0 5.14 1.03 7.01 2.91
      a9.87 9.87 0 0 1 2.9 7.02
      c0 5.46-4.45 9.91-9.91 9.91z"/>
      <path d="M17.52 14.35c-.3-.15-1.77-.87-2.05-.97
      -.28-.1-.48-.15-.68.15
      -.2.3-.78.97-.96 1.17
      -.18.2-.35.22-.65.07
      -.3-.15-1.25-.46-2.39-1.47
      -.88-.78-1.47-1.74-1.64-2.04
      -.17-.3-.02-.46.13-.61
      .13-.13.3-.35.45-.53
      .15-.18.2-.3.3-.5
      .1-.2.05-.37-.03-.52
      -.08-.15-.68-1.63-.93-2.23
      -.24-.58-.49-.5-.68-.51
      h-.58c-.2 0-.52.07-.8.37
      -.28.3-1.04 1.02-1.04 2.48
      s1.07 2.87 1.22 3.07
      c.15.2 2.1 3.2 5.09 4.49
      .71.31 1.26.49 1.69.63
      .71.23 1.36.2 1.87.12
      .57-.08 1.77-.72 2.02-1.42
      .25-.7.25-1.3.17-1.42
      -.08-.12-.28-.2-.58-.35z"/>
    </svg>`;
  }

  function createContactActions(member) {
    const mobile = normalizeMobile(member.mobile);

    if (!mobile) return null;

    const actions = document.createElement("div");
    actions.className = "team-member-actions";

    const call = document.createElement("a");
    call.className = "team-contact-button call-button";
    call.href = `tel:${mobile}`;
    call.title = "कॉल करें";
    call.setAttribute(
      "aria-label",
      `कॉल करें ${member.name || ""}`
    );
    call.innerHTML = createIcon("call");

    const whatsapp = document.createElement("a");
    whatsapp.className =
      "team-contact-button whatsapp-button";

    const whatsappNumber =
      mobile.length === 10 ? `91${mobile}` : mobile;

    whatsapp.href = `https://wa.me/${whatsappNumber}`;
    whatsapp.target = "_blank";
    whatsapp.rel = "noopener noreferrer";
    whatsapp.title = "WhatsApp पर संपर्क करें";
    whatsapp.setAttribute(
      "aria-label",
      `WhatsApp पर संपर्क करें ${member.name || ""}`
    );
    whatsapp.innerHTML = createIcon("whatsapp");

    actions.append(call, whatsapp);

    return actions;
  }

  function createMember(member) {
    const row = document.createElement("div");
    row.className = "team-member";

    const name = document.createElement("span");
    name.className = "team-member-name";
    name.textContent =
      member.name || "नाम उपलब्ध नहीं है";

    row.appendChild(name);

    const actions = createContactActions(member);

    if (actions) {
      row.appendChild(actions);
    }

    return row;
  }

  function createTeamCard(team, index) {
    const card = document.createElement("article");
    card.className = "team-card";

    /*
     * ---------------------------------------------------------
     * TEAM HEADER
     * ---------------------------------------------------------
     */

    const header = document.createElement("button");
    header.type = "button";
    header.className = "team-card-header";
    header.setAttribute("aria-expanded", "false");

    const titleBlock = document.createElement("div");
    titleBlock.className = "team-title-block";

    if (team.icon) {
      const icon = document.createElement("span");
      icon.className = "team-icon";
      icon.textContent = team.icon;
      icon.setAttribute("aria-hidden", "true");

      titleBlock.appendChild(icon);
    }

    const names = document.createElement("div");
    names.className = "team-title-names";

    const hindi = document.createElement("div");
    hindi.className = "team-hindi-name";
    hindi.textContent = team.hindiName || "";

    const english = document.createElement("div");
    english.className = "team-english-name";
    english.textContent = team.name || "";

    names.append(hindi, english);
    titleBlock.appendChild(names);

    const members = Array.isArray(team.members)
      ? team.members
      : [];

    const badge = document.createElement("span");
    badge.className = "team-badge";
    badge.textContent = `${members.length} सदस्य`;

    /*
     * Expand / collapse indicator
     */
    const toggle = document.createElement("span");
    toggle.className = "team-toggle";
    toggle.setAttribute("aria-hidden", "true");
    toggle.textContent = "⌄";

    header.append(titleBlock, badge, toggle);

    /*
     * ---------------------------------------------------------
     * MEMBER LIST
     * ---------------------------------------------------------
     */

    const memberList = document.createElement("div");
    memberList.className = "team-members";
    memberList.id = `team-members-${index}`;

    /*
     * Start collapsed
     */
    memberList.hidden = true;

    header.setAttribute(
      "aria-controls",
      memberList.id
    );

    if (members.length) {
      members.forEach(member => {
        if (
          member &&
          typeof member === "object"
        ) {
          memberList.appendChild(
            createMember(member)
          );
        }
      });
    } else {
      const empty = document.createElement("div");
      empty.className = "team-no-member";
      empty.textContent =
        "सदस्य विवरण शीघ्र उपलब्ध होगा";

      memberList.appendChild(empty);
    }

    /*
     * ---------------------------------------------------------
     * TOGGLE BEHAVIOUR
     * ---------------------------------------------------------
     */

    header.addEventListener("click", () => {
      const isExpanded =
        header.getAttribute("aria-expanded") === "true";

      const nextState = !isExpanded;

      header.setAttribute(
        "aria-expanded",
        String(nextState)
      );

      memberList.hidden = !nextState;

      card.classList.toggle(
        "is-expanded",
        nextState
      );
    });

    card.appendChild(header);
    card.appendChild(memberList);

    return card;
  }

  /*
   * -----------------------------------------------------------
   * LOAD TEAM DATA
   * -----------------------------------------------------------
   */

  try {
    const response = await fetch(
      `${DATA_URL}?v=${Date.now()}`
    );

    if (!response.ok) {
      throw new Error(
        `Unable to load team.json (${response.status})`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "team.json must contain an array."
      );
    }

    console.log("Teams loaded:", data.length);

    teamList.innerHTML = "";

    data.forEach((team, index) => {
      if (
        team &&
        typeof team === "object"
      ) {
        teamList.appendChild(
          createTeamCard(team, index)
        );
      }
    });

    if (!data.length) {
      emptyState.hidden = false;
    }
  } catch (error) {
    console.error(
      "Team page error:",
      error
    );

    teamList.innerHTML = "";

    emptyState.hidden = false;

    emptyState.textContent =
      "टीम की जानकारी लोड नहीं हो सकी।";
  } finally {
    hideLoader();
  }
});