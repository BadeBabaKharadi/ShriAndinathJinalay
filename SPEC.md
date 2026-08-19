# Temple Platform Modernisation — Specification

**Status:** Draft for review  
**Date:** 18 August 2026  
**Approach:** Spec-driven, incremental migration with backward compatibility

## 1. Purpose

Evolve the current Chaturmas 2026 static website into a reusable temple platform without interrupting the live site. Bade Baba Kharadi is the first implementation, design partner, and no-charge support tenant. The resulting product shall be configurable for future commercial onboarding of other temples.

The platform shall support:

1. A temple-first home page.
2. Reusable event pages for Chaturmas and future events.
3. Reusable forms, beginning with the existing Pangikaran (registration) form.
4. A consistent shared user interface and styling system.
5. Automated unit, integration, and browser UI tests, enforced by CI/CD.
6. A temple-admin workspace for donations and inventory, introduced in controlled phases.

## 2. Current system baseline

The repository is a static HTML/CSS/JavaScript site with JSON data files. The current public domain is `badebabakharadi.com` and the registration flow submits to a Google Apps Script endpoint.

Existing public pages include:

- `/index.html`
- `/dainik-karyakram.html`
- `/kalash.html`
- `/gallery.html`
- `/team.html`
- `/registration.html`
- `/chowka.html`

## 3. Non-negotiable compatibility contract

Until the temple home page is explicitly approved for production:

1. `/` and `/index.html` shall continue to show the current Chaturmas landing experience.
2. Every existing URL above shall continue to load successfully.
3. Existing inbound links, bookmarks, shared WhatsApp links, image paths, and JSON paths shall remain valid.
4. The existing registration endpoint, event identifier, and submitted payload contract shall remain unchanged unless an approved backend migration is specified.
5. No content migration may delete an existing production data file before its replacement has passed regression tests.
6. New routes shall be additive; the temple home page shall initially be deployed as a preview route.
7. A production cutover shall be reversible through a deployment revert and shall not require restoring deleted files.

## 4. Target information architecture

### 4.1 Routes

| Purpose | Preview/canonical route | Compatibility route |
|---|---|---|
| Temple home | `/temple/` during review; `/` after approval | `/index.html` remains valid |
| Event home | `/events/{event-id}/` | Existing event pages remain aliases during migration |
| Event timetable | `/events/{event-id}/timetable/` | `/dainik-karyakram.html` for Chaturmas |
| Event gallery | `/events/{event-id}/gallery/` | `/gallery.html` for Chaturmas |
| Event contacts | `/events/{event-id}/contacts/` | `/team.html` for Chaturmas |
| Event registration | `/events/{event-id}/forms/{form-id}/` | `/registration.html` for the current form |

The exact static-hosting route implementation may use HTML files internally, but these user-facing paths are the intended contract.

### 4.2 Content model

Site-wide configuration shall contain temple identity, branding, default contacts, address, social links, shared navigation, footer information, and global announcements.

Each event shall have an isolated configuration containing:

```json
{
  "id": "chaturmas-2026",
  "name": "...",
  "status": "upcoming|active|completed",
  "dates": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "venue": { "name": "...", "place": "..." },
  "contacts": [],
  "announcements": [],
  "timetable": [],
  "gallery": [],
  "forms": []
}
```

The migration shall map existing JSON data into this model without changing its displayed Hindi content.

### 4.3 Reusable presentation modules

The platform shall provide reusable modules for:

- Announcement bar
- Header, branding, desktop/mobile navigation, and footer
- Page hero
- Event summary and event cards
- Timetable
- Gallery
- Contacts/team listing
- Daily programme/calendar information
- Empty, loading, and error states
- Buttons, cards, section headings, forms, and validation messages

Page-specific styles shall use shared design tokens and components. Duplicated global definitions such as container sizing, footer styling, colours, typography, and breakpoints shall be removed only after affected pages are verified.

## 5. Reusable form specification

### 5.1 Form configuration

A reusable form shall be defined by configuration rather than copied HTML and JavaScript. It shall support:

- `id`, title, description, associated event, and status
- Multi-step sections
- Fields: text, telephone, email, number, date, select, radio, checkbox, textarea, and repeating family/member groups
- Required fields, validation rules, conditional visibility, consent/rules acceptance, and field help text
- Confirmation content and registration reference display
- Submission adapter configuration

### 5.2 Pangikaran compatibility

The initial reusable-form implementation shall preserve the existing registration journey:

1. Display event rules and require acceptance.
2. Capture and validate mobile number.
3. Detect and display an existing registration where supported.
4. Permit details entry/editing, including family members.
5. Submit to the existing Google Apps Script service.
6. Display success or useful failure feedback.

No live request payload change is permitted without explicit approval and an integration test proving the new contract.

## 6. Temple home page specification

The new temple home page shall be temple-first, not tied to one event. It shall include:

1. Temple name, location, and visual identity.
2. Current announcements and daily programme highlights.
3. Primary links to active and upcoming events.
4. Featured gallery/media content.
5. Contact and visit information.
6. A clear route back to current Chaturmas information while it remains active.

It shall initially be available only at the preview route. Moving it to `/` requires acceptance testing and explicit stakeholder approval.

## 7. Quality requirements

### 7.1 Functional

- All public pages shall work with current static hosting.
- Data failures shall show a safe, user-readable fallback and must not break the page shell.
- Navigation must identify the active route correctly; it must not have a hard-coded active item.
- The website shall remain usable on mobile and desktop screen sizes.
- Existing Hindi/Devanagari content must render correctly.

### 7.2 Accessibility and performance

- Interactive controls must be keyboard operable and show a visible focus state.
- Images must have meaningful alternative text or be explicitly decorative.
- Forms must expose labels and validation errors to assistive technology.
- Pages must avoid obvious console errors, broken assets, and broken internal links.

## 8. Automated test specification

The project shall have a package-based test runner and three required test layers. The implementation may use a lightweight JavaScript test stack appropriate to this static site, such as Vitest for unit/component tests and Playwright for browser tests.

### 8.1 Unit tests

| Area | Required assertions |
|---|---|
| Date/calendar utilities | Normalisation, lookup, missing-data fallback, display formatting |
| Data parsing | Valid event/site/form data is accepted; malformed or missing data has a safe result |
| Event selection | Status and date determine active/upcoming event correctly |
| Navigation | Active route selection is correct for every current page |
| Form validation | Required values, phone number, consent, field rules, and repeatable group validation |
| Payload mapping | Pangikaran data maps to the current Apps Script request contract |

### 8.2 Integration tests

| Journey | Required assertions |
|---|---|
| Legacy routes | Each listed legacy page loads and its expected primary content is visible |
| Shared shell | Header/footer load once and navigation works on each representative page |
| Event rendering | Chaturmas configuration renders overview, timetable, gallery, contacts, and announcements |
| Data resilience | Failed JSON loading produces a safe state, not a blank or unusable page |
| Registration | Rules acceptance, mobile validation, details flow, existing record state, request success, and request failure |
| Link integrity | All internal links and local assets resolve successfully |

### 8.3 UI/browser tests

| Screen or interaction | Required assertions |
|---|---|
| Responsive views | Key pages render at mobile and desktop viewport sizes without overflow or hidden primary controls |
| Navigation | Mobile navigation and active-state behaviour are usable |
| Shared design | Header, footer, buttons, cards, forms, and page hero meet approved visual snapshots/baselines |
| Forms | Validation states, multi-step progression, focus handling, success, and error feedback are visible and usable |
| Accessibility smoke checks | Keyboard navigation, focus visibility, labels, and image alternative text on critical paths |

Browser tests shall mock external Apps Script responses by default. Any live endpoint smoke test must be opt-in and must not create unintended registrations.

## 9. CI/CD specification

Every pull request shall run, in order:

1. Dependency installation using the lockfile.
2. Formatting and/or lint checks.
3. Unit tests.
4. Integration tests.
5. Browser UI tests.
6. Internal-link and local-asset checks.
7. Static build/deployment validation.

Production deployment shall require all required checks to pass. Preview deployment is recommended for each pull request or release candidate. Production deployment must be triggered only from the approved production branch.

## 10. Future capability roadmap

### 10.1 Authenticated and role-protected features

The public temple and event information shall remain readable without an account. The platform shall support authenticated access for selected future features, including member-only documents, private event updates, a member profile, registrations, payment history, and administrative content management.

The platform shall define these roles from the outset:

| Role | Permitted access |
|---|---|
| Visitor | Public temple/event content and public forms |
| Member | Their own profile, registrations, receipts, and member-only content |
| Volunteer | Assigned event operations and limited member/event data |
| Event administrator | Event content, registrations, communications, and reports for assigned events |
| Temple administrator | Cross-event settings and users; least number of people possible |
| Finance administrator | Donations, pledges, payments, refunds, receipts, and finance reports for their temple |
| Inventory administrator | Inventory catalogue, stock movements, vendors, and inventory reports for their temple |

The client UI must never be treated as the authorization control. Data access must be enforced at the backend by authenticated identity and role-based rules. Administrative roles shall be assigned only by a protected server-side workflow, never by a browser request.

Initial sign-in should be low-friction: phone OTP is suitable for a temple/member audience; Google sign-in may be offered as an additional option. Email/password is optional, not required for the first release.

### 10.1.1 Member pledge, payment, and receipt area

Authenticated members shall have a private **My pledges and payments** area. It shall display only records belonging to the signed-in member and their current temple.

For every pledge, the member can see:

- Pledge/reference number, purpose/campaign, date, pledged amount, and status.
- Amount received, remaining balance, and a chronological list of instalments.
- A clear option to make a permitted partial payment against the remaining balance.
- Receipts for confirmed payments, with download access from the member area.

The system shall calculate payment amounts, pledge balances, and eligibility on the server. A browser must not be able to reduce a balance, select another member's pledge, mark payment as paid, or generate an official receipt.

Receipt requirements:

- Receipts are generated only after a verified/captured payment.
- Each receipt has a unique immutable receipt number, temple identity, payment/pledge reference, amount, date, donor details as approved, and legally required content.
- Receipts are stored as immutable PDF records, with access restricted to the owning member and authorized temple roles.
- A correction/refund creates a separate adjustment/refund record; it must not overwrite the original receipt.

Before this feature goes live, the temple's finance owner must approve donation categorisation, receipt wording, numbering policy, tax treatment, refund policy, and retention period. The platform must not claim tax deductibility unless the temple has approved the applicable legal wording.

### 10.1.2 Daily Niyam engagement and streaks

Authenticated members shall have a private daily-practice area that presents the **Niyam of the day** for their temple.

The feature shall support:

1. A temple-configured daily Niyam, including title, description, display date/time zone, optional reflection, and visibility period.
2. A member confirmation that they completed the Niyam, limited to one confirmation per member, tenant, and local calendar day.
3. A personal history view showing completed days, current consecutive-day streak, longest streak, and completion calendar.
4. A transparent streak rule: a streak increments only when consecutive temple-local dates have valid confirmations; missed days reset the current streak but preserve the longest streak.
5. A confirmation correction policy. The initial default is that a member may change today's confirmation, while prior-day changes require an authorized administrator and are audit logged.
6. Optional, privacy-respecting encouragement such as milestones or badges. Public leaderboards are explicitly out of scope unless separately approved.

The daily Niyam and streak are engagement data, not a religious judgment. The interface shall use respectful language, avoid shame-based messages, and make personal activity private by default.

### 10.1.3 Temple-admin donations management

Authorized finance administrators shall have a tenant-scoped donations workspace. It shall support:

- Donation and pledge campaigns, categories, and optional designated purpose/fund.
- Donor/member records with duplicate-aware search and consent/preferences.
- Pledges, partial payments, received amounts, remaining balances, refunds/adjustments, and payment/receipt status.
- Manual/offline donation recording with maker/checker or audit requirements defined by the finance policy.
- Searchable, exportable donation and receipt records, with date/campaign/payment-method filters.
- Finance summaries: pledged, received, pending, refunded, and reconciliation exceptions.
- An immutable audit trail for financial changes: who changed what, when, and why.

Donation reports and exports shall be limited to the finance/temple roles for that tenant. Member personal data and payment records must not be used for unrelated outreach without consent.

### 10.1.4 Temple-admin inventory management

Authorized inventory administrators shall have a tenant-scoped inventory workspace. The first release shall focus on reliable stock visibility rather than complex accounting.

It shall support:

- Item catalogue: name, category, unit, location, optional barcode/SKU, reorder threshold, and active status.
- Stock movements: opening balance, receipt/purchase, issue/use, return, adjustment, and damaged/lost stock.
- Every movement records quantity, actor, date/time, reason/reference, and optional supplier/event link; balances are derived from movements rather than freely edited.
- Current stock, low-stock alerts, item movement history, stock-take/reconciliation, and exports.
- Optional future extensions: purchase requests, supplier management, purchase orders, asset tracking, and event-specific allocation.

Financial valuation/accounting integration is explicitly out of scope for the first inventory release. It may be added only after the initial stock ledger is stable and finance requirements are agreed.

### 10.2 Payments

Payments are a separate, security-critical capability. They are not part of the first temple-home release.

Supported future payment use cases may include donations, event fees, bookings, and sponsorships. The system must use a payment service provider's hosted/standard checkout; it must never collect or store card or UPI credentials itself.

Required payment flow:

1. The authenticated browser asks the secure backend to create an order for a server-calculated amount.
2. The backend records a pending payment and returns only the provider's public checkout data/order ID.
3. The provider hosts the payment interaction.
4. A secure backend verifies the returned payment signature and receives the provider webhook.
5. The payment is marked successful only after verified/captured payment status; the browser callback is not the source of truth.
6. Each order, payment, and webhook event is handled idempotently, with an auditable record and receipt.

For an India-first implementation, evaluate Razorpay Standard Checkout first; it supports standard web checkout and requires server-side order creation, signature verification, and webhook validation. A final provider choice also requires finance/legal approval, settlement-account verification, refund and dispute policies, and applicable tax/receipt requirements.

**Absolute rule:** no payment secret, webhook secret, or order-creation logic may be committed to the repository, placed in a JSON file, or exposed in browser JavaScript.

### 10.3 WhatsApp communications

The product shall support a future communications feature for publishing approved event or temple updates to opted-in recipients.

The first version shall provide an administrator workflow:

1. Select audience using consent, event participation, role, and communication preference.
2. Compose or select an approved Hindi/English message template.
3. Preview recipient count and content; require a second confirmation before sending.
4. Queue messages through the official WhatsApp Business Platform provider.
5. Store a delivery/audit record: sender, template, audience criteria/count, time, provider message ID, and delivery outcome.
6. Respect opt-out immediately and prevent messaging recipients without recorded consent.

This will use an official WhatsApp Business Platform integration or a verified provider built on it; direct `wa.me` links remain appropriate only for one-to-one contact links, not bulk publishing.

### 10.4 Data and hosting architecture

| Capability stage | Public/static content | Private data and backend | Hosting decision |
|---|---|---|---|
| Now through shared-template migration | Versioned JSON files | Existing Apps Script registration endpoint | GitHub Pages remains suitable |
| Login/member features | Static shell plus public content | Firebase Authentication + Firestore + Security Rules | GitHub Pages may continue to host the frontend |
| Forms migration | Configured public/private forms | Cloud Functions/API layer; Firebase/Firestore data as approved | GitHub Pages frontend plus Firebase backend is suitable |
| WhatsApp publishing | Static/admin UI | Cloud Functions, secure provider credentials, queue/audit storage | Backend required; frontend may remain on Pages |
| Payments | Static checkout launch page | Cloud Functions for server order creation, verification, webhooks, records | Backend required; frontend may remain on Pages |

GitHub Pages is suitable for the current public website, static event templates, documentation, and GitHub Actions-based CI/CD. It does not provide server-side application code, secret management, protected APIs, or secure payment-webhook endpoints, so it is insufficient as the whole platform once authentication, bulk messaging, or payments are introduced.

Firebase is a good staged fit for this project when configured correctly:

- Firebase Authentication establishes user identity.
- Cloud Firestore stores structured temple/event/member/form data.
- Firebase Security Rules enforce per-user and role-based access before data reaches the browser.
- Cloud Functions holds secrets and carries out privileged work such as payment verification, webhook handling, role changes, and WhatsApp sends.
- The Emulator Suite and rules tests are required before every deployment.

Firebase configuration values used by a web client are not secrets; access must instead rely on Authentication, correctly reviewed Security Rules, App Check where suitable, server-side secrets, and server-side validation. Production databases must start in locked mode and grant only the minimum required access.

Google Apps Script remains acceptable for the current low-risk registration integration during migration. It is not recommended as the primary payment backend or long-term authorization boundary because payment order creation, signature verification, webhook processing, secrets, and least-privilege operational controls need a dedicated server-side design.

### 10.4.1 Multi-temple platform and domain configuration

The solution shall be designed as a multi-tenant platform so additional temples can be onboarded without copying application code. A **tenant** is one temple organization and is identified by a stable internal `templeId`, never solely by a domain name.

Each temple shall have configuration for:

- Name, logos, colours, typography, language/copy, timezone, contacts, address, social links, and legal/receipt details.
- Domain and optional subdomain mapping.
- Public navigation, enabled modules, home-page sections, active events, Niyams, gallery, and announcements.
- Member, volunteer, finance, and administrator roles scoped to that temple.
- Its own payment-provider account/configuration, WhatsApp Business sender/configuration, communication consent text, and data-retention policy.

All protected records must include `templeId`: users/memberships, roles, events, forms, registrations, pledges, payments, receipts, Niyam completions, communications, and audit logs. Backend queries and security rules must require the authenticated user's membership of the requested temple and must never accept a client-supplied tenant as proof of authorization.

Custom-domain onboarding shall validate domain ownership and map the request hostname to a known `templeId` at the trusted hosting/edge or backend layer. Branding may be configured per tenant; executable code, security rules, payment secrets, and privileged workflows remain centrally maintained.

The platform shall initially use one Firebase project per environment with strict tenant isolation in the schema/rules. A later enterprise/isolation tier may use a dedicated Firebase/payment/WhatsApp project per temple when required by scale, governance, or contractual needs.

### 10.4.2 Suggested protected-data model

```text
temples/{templeId}
  memberships/{uid}                 # role(s), status, consent
  events/{eventId}
  forms/{formId}
  pledges/{pledgeId}
  payments/{paymentId}
  receipts/{receiptId}
  donationCampaigns/{campaignId}
  inventoryItems/{itemId}
  inventoryMovements/{movementId}
  niyams/{yyyy-mm-dd}
  niyamCompletions/{uid_yyyy-mm-dd}
  communications/{communicationId}
  auditLogs/{auditId}
```

The production schema may change, but the isolation rule must not: every record lives under or is bound to one tenant and access is verified server-side and in Firebase Security Rules.

### 10.4.3 Product packaging and tenancy policy

The platform is one centrally maintained product, not a separate custom codebase per temple. Each module is enabled by tenant configuration and subscription/contract status:

| Product area | Bade Baba | Future temple packages |
|---|---|---|
| Public temple site and events | Enabled | Foundation package |
| Forms and registrations | Enabled as needed | Foundation or Events package |
| Member login and Niyam | Enabled when approved | Member Engagement package |
| Donations, payments, receipts | Enabled when finance/policy approved | Donations package |
| WhatsApp communications | Enabled when approved | Communications add-on |
| Inventory | Enabled when approved | Temple Operations package |

Bade Baba remains a no-charge tenant for agreed product support. Any bespoke feature that is not generally reusable must be explicitly classified as either a product enhancement, a paid customization, or out of scope before development. This protects the reusable product from accumulating one-temple-only behavior.

The platform operator shall retain a central, strictly audited support role. Temple administrators must not gain access to another temple's data, configuration, payment credentials, or message sender.

### 10.5 Technology decisions and timing

| Technology | Adopt at | Purpose |
|---|---|---|
| Node.js package scripts, Vitest, Playwright, GitHub Actions | Iteration 1 | Unit, integration, UI tests and CI/CD |
| Shared CSS tokens/components and event/form schemas | Iterations 1–3 | Consistent UI and reusable content |
| Firebase project, Auth, Firestore, Security Rules, Emulator Suite | Before any login-only feature | Identity and protected data; develop only in a separate non-production project first |
| Cloud Functions, Secret Manager, App Check, audit logging | Before form migration to Firebase, WhatsApp, or payments | Privileged server-side operations and abuse controls |
| Official WhatsApp Business provider/API | After consent, audience, and admin design are approved | Opt-in, auditable outbound communications |
| Razorpay Standard Checkout (or approved equivalent) | Only after the payment business rules and backend security review | Donation/event-fee payments, verified with webhooks |
| PDF receipt generation and protected file storage | With pledge/payment feature | Immutable, authorized donor receipts |
| Tenant/domain configuration and tenant-isolation test suite | Before onboarding a second temple | Branded domains without copied application code |
| Donation ledger, payment reconciliation, and immutable audit logging | Before finance/admin donations release | Controlled donation operations |
| Inventory ledger, stock-take workflow, and low-stock notifications | After authenticated admin foundation | Reliable physical stock operations |
| Error monitoring and analytics with privacy review | Before authenticated/public scale-up | Production diagnostics and release monitoring |
| Google Analytics 4 / Firebase Analytics adapter and event schema | After public routes are protected, before temple-home launch | Privacy-aware feature-adoption measurement |

### 10.6 Mobile-app channel strategy

The public website remains the primary discovery, SEO, shareable-link, and no-install channel. It shall continue to be a responsive web application and shall not be migrated wholesale to Flutter at this stage.

The platform shall instead separate channel-specific presentation from shared capabilities:

| Layer | Web site | Future mobile app |
|---|---|---|
| Public presentation | Responsive web templates on GitHub Pages/static hosting | Optional deep links to public web content |
| Identity and authorization | Firebase Auth tokens and tenant/role rules | Same Firebase Auth tokens and tenant/role rules |
| Business operations | Cloud Functions/API contracts | Same Cloud Functions/API contracts |
| Protected data | Firestore with tested rules | Same Firestore data with tested rules |
| Notifications | Web notification capability where supported | Native push via Firebase Cloud Messaging |

Flutter is the recommended mobile-client choice when a native Android/iOS app is justified. It can target Android, iOS, and web and has supported Firebase integrations for Authentication, Firestore, Cloud Functions, Storage, App Check, Crashlytics, and Cloud Messaging. The mobile app must call the same protected backend contracts as the web product; it must not duplicate payment verification, role assignment, receipt generation, or tenant authorization in the device.

#### Mobile delivery stages

1. **Responsive web first:** deliver the public site and member/admin portal as a high-quality mobile web experience.
2. **PWA assessment:** make suitable public/member routes installable as a Progressive Web App only if offline/read-later and home-screen access provide value. Do not depend on PWA notifications as the sole engagement channel.
3. **Flutter member app:** begin after authentication, multi-tenant isolation, payment contracts, and Niyam APIs are stable. First features: sign-in, member profile, Niyam/streaks, pledge/payment history, receipt access, event updates, and push-notification preferences.
4. **Flutter admin companion (optional):** only after web-admin donation/inventory operations are proven. Prioritize stock-taking, low-stock alerts, donation lookup, and approvals rather than duplicating every desktop report.

#### Flutter decision gate

Commission the Flutter app once at least two of these conditions are true:

- Members need reliable native push notifications for Niyams, event updates, or payment receipts.
- A meaningful percentage of intended users return frequently enough that app installation is worthwhile.
- Offline or camera/barcode workflows materially improve inventory or event operations.
- The member web portal has stable workflows and verified shared backend contracts.

Before app-store release, add Android/iOS device testing, crash reporting, privacy policy/support links, app-store account ownership, notification consent, deep-link tests, and release-signing/rollback procedures. A Flutter app does not remove the need for the responsive web site: public pages, payments, shared links, and search discovery continue to need the web channel.

### 10.7 Privacy-aware product analytics

The platform shall measure anonymous and authenticated **feature usage** so each temple can understand what is helpful, what needs improvement, and what is unused. Analytics is for product improvement and operational decisions; it must not become a record of individual religious practice, financial information, or personal communications.

Google Analytics 4 / Firebase Analytics is the recommended first analytics provider because it supports web and future Flutter/mobile clients, standard page/screen measurement, custom events, and export to BigQuery if later analysis requires it. The implementation shall use one centrally maintained analytics adapter so a different provider can be substituted without changing feature code.

#### Event taxonomy

Every tracked event shall use a stable, documented name and only approved non-sensitive parameters:

| Area | Events to measure | Safe parameters |
|---|---|---|
| Public site | `page_view`, `navigation_clicked`, `cta_clicked`, `event_viewed` | `temple_id`, `page_type`, `route`, `cta_name`, `event_id` |
| Event content | `timetable_viewed`, `gallery_viewed`, `contact_clicked` | `temple_id`, `event_id`, `module`, `contact_method` |
| Forms | `form_started`, `form_step_completed`, `form_submission_succeeded`, `form_submission_failed` | `temple_id`, `event_id`, `form_id`, `step_name`, `failure_category` |
| Members | `login_succeeded`, `member_feature_viewed`, `niyam_checkin_completed` | `temple_id`, `feature_name`, `member_state` |
| Donations/payments | `pledge_viewed`, `payment_started`, `payment_verified`, `receipt_downloaded` | `temple_id`, `campaign_id`, `payment_method`, `outcome` |
| Administration | `admin_feature_viewed`, `report_exported`, `inventory_movement_created` | `temple_id`, `module`, `report_type`, `movement_type` |

`temple_id` is an internal non-human-readable identifier. Event values must never include name, phone number, email, full address, registration answers, receipt number, payment identifier, exact donation amount, Niyam text, free-form form content, WhatsApp message content, or authentication tokens. Analytics user identifiers must be pseudonymous and must not reuse a phone number or email address.

#### Reporting requirements

The initial product dashboard shall answer:

1. Which public pages and calls to action are used most and least?
2. Which event modules (timetable, gallery, contacts, forms) have usage?
3. Where do users abandon a form, based on step—not entered values?
4. How many members return daily/weekly and which member features are used?
5. Which admin modules are active for each temple?

Reports shall be filterable by temple, date range, platform (web/mobile when available), and event/campaign. A monthly review should produce a short decision: improve, promote, keep, or retire a low-use feature. Counts must be treated as directional evidence alongside temple feedback, not as the only measure of community value.

#### Privacy, control, and tests

- Each tenant can enable/disable analytics and configure consent/notice wording.
- Add a visible privacy notice and obtain consent where applicable before non-essential analytics collection; the final wording and legal obligations require local legal review.
- Analytics must be disabled in local development and test environments by default.
- Analytics calls must be non-blocking: a failed provider request must never break a page, form, payment, or member action.
- Unit tests verify event name/parameter allowlists; integration tests verify key actions emit the expected safe event; browser tests stub analytics and never transmit test data.
- Financial truth remains in the payment ledger; analytics events are never used for reconciliation, receipt generation, authorization, or payment status.

## 11. Iterative delivery and acceptance gates

### Iteration 0 — Baseline

Create the route inventory, compatibility manifest, baseline screenshots, test fixtures, and acceptance inventory. No page changes.

**Exit criteria:** every current URL is recorded and baseline test scaffolding can serve the site locally.

### Iteration 1 — Shared foundation

Add package scripts, test runners, CI workflow, design tokens, and shared shell without changing visible behaviour.

**Exit criteria:** legacy routes, unit tests, link checks, and desktop/mobile smoke tests pass.

### Iteration 2 — Event template

Introduce the event schema and reusable content modules; migrate Chaturmas as the first event.

**Exit criteria:** old and new Chaturmas presentation paths show approved equivalent content, and legacy URLs remain green.

### Iteration 3 — Reusable forms

Refactor Pangikaran to the configured form framework.

**Exit criteria:** all registration regression tests pass; current API payload is verified unchanged.

### Iteration 4 — Authentication foundation

Create separate Firebase development and production projects; add Authentication, role model, locked Firestore rules, emulator/rules tests, and a minimal protected member page. No payment or bulk communication capability.

**Exit criteria:** unauthenticated users cannot read private data; each role is positively and negatively tested; privileged actions are server-side only.

### Iteration 5 — Multi-temple foundation

Add `templeId`-scoped configuration, hostname/domain mapping design, tenant-aware roles, separate test tenants, and automated tenant-isolation tests. The existing temple is migrated as the first tenant.

**Exit criteria:** data belonging to test Temple A cannot be read or modified by an authenticated user or administrator from test Temple B; a second branded test tenant can render from configuration without code duplication.

### Iteration 6 — Temple-home preview

Build and publish the temple page at the preview route.

**Exit criteria:** stakeholder visual/content approval and all automated tests pass.

### Iteration 7 — Member pledges, instalments, and receipts (when approved)

Implement the protected pledge ledger, partial-payment rules, member payment-history view, and finance/member views. It may include verified manually recorded/offline payment records where approved. Online checkout and official receipt generation are deferred until the secure payment iteration and finance-policy approval.

**Exit criteria:** members can access only their own records; balances are derived from the ledger; tenant and role tests pass; no client can alter a payment status or produce an official receipt.

### Iteration 8 — Daily Niyam and streaks

Implement temple-configured daily Niyams, private member confirmations, temple-timezone streak calculation, history, and correction/audit policy.

**Exit criteria:** unit tests cover date/time-zone boundaries, duplicates, missed days, corrections, and longest/current streak calculations; integration tests prove members cannot view another member's activity.

### Iteration 9 — Donations administration (when approved)

Implement finance roles, campaign/donation ledger, offline/manual entry policy, pledge and payment reconciliation, reports/exports, receipt access, and immutable finance audit records.

**Exit criteria:** tenant-isolation and role tests pass; totals are derived and reproducible from the ledger; corrections/refunds retain history; authorization, export, and audit scenarios pass integration tests.

### Iteration 10 — Inventory administration (when approved)

Implement item catalogue, stock-movement ledger, balance calculation, low-stock views, stock-take/reconciliation, reports/exports, and inventory audit records.

**Exit criteria:** concurrent/duplicate movement protections, negative-stock policy, adjustment, reconciliation, tenant-isolation, and role-based access tests pass.

### Iteration 11 — WhatsApp communications (when approved)

Implement consent capture, recipient preferences, administrative approval, template-based sending, audit records, and sandbox tests against the selected official provider.

**Exit criteria:** opt-in/out, recipient selection, authorization, duplicate-send prevention, and audit trails are integration tested.

### Iteration 12 — Payments (when approved)

Implement payment business rules, provider sandbox integration, secure server-created orders, signature/webhook verification, idempotency, official receipt generation/downloads, refunds/disputes handling, and production operational runbooks.

**Exit criteria:** successful, cancelled, failed, duplicate, forged-callback, and delayed-webhook cases are tested; an independent security review is completed before live payments.

### Iteration 13 — Production cutover

Make the temple page the root home page, retain compatibility routes, monitor release, and preserve the ability to revert.

**Exit criteria:** post-deployment smoke tests pass and no broken legacy links are detected.

### Iteration 14 — Mobile member application (conditional)

Build the Flutter member application only after the mobile decision gate is met. Use the stable shared backend for authentication, Niyam streaks, payments/receipts, events, and notification preferences; provide native push notifications through Firebase Cloud Messaging.

**Exit criteria:** Android/iOS authentication, tenant isolation, key member workflows, payment deep-link/return handling, push consent, device tests, crash monitoring, and store release procedures pass.

## 12. Decisions requiring approval before implementation

1. The canonical event URL naming convention.
2. The approved temple-home content, imagery, and primary language/copy.
3. Whether the current Google Apps Script endpoint remains the long-term form backend.
4. The production hosting/deployment repository and branch policy for CI/CD.
5. The visual approval owner and the go-live authority for switching `/`.
6. The login policy: phone OTP only, or phone OTP plus Google sign-in; and the initial member-only features.
7. The WhatsApp Business account owner, consent wording, content approval process, and acceptable communication frequency.
8. The payment use cases, legal entity/bank account, selected provider, refund/dispute process, and finance owner.
9. Pledge rules: permitted instalments, minimum/maximum payment amounts, payment deadline behavior, and whether pledges are private, household-based, or both.
10. Receipt finance policy: numbering format, required fields, authorized issuer, PDF retention, and legal/tax wording.
11. Niyam policy: temple timezone, correction window, administrator correction authority, and whether milestones/badges are desired.
12. Multi-temple business model: central platform operator, support model, tenant data ownership, pricing/onboarding approach, and when a tenant receives dedicated infrastructure.
13. Donation operations: campaign types, manual-entry approval workflow, reconciliation owner, report formats, and data-retention policy.
14. Inventory operations: item categories/units, locations, stock-taking process, negative-stock policy, adjustment authority, and whether purchasing/accounting integration is a later requirement.
15. Bade Baba product-partner scope: free support boundaries, feedback cadence, approval contacts, and how bespoke requests are classified before work begins.
16. Mobile-product decision: target users, Android/iOS priority, desired app-only workflows, notification policy, funding for Apple/Google store accounts, and the measurable criteria for proceeding beyond responsive web/PWA.

## 13. Side-project execution plan

### 13.1 Delivery assumptions

This plan assumes 1–2 focused hours on five days per week (approximately 5–10 hours weekly), with AI assistance used for implementation, tests, documentation, and review. It intentionally limits each week to one deployable capability or one safety milestone.

Rules for every week:

1. Start from one written acceptance criterion and one small branch/PR-sized change.
2. Write or update the relevant automated test before considering the feature done.
3. Do not combine a content redesign, route change, backend migration, and payment/authentication work in one week.
4. Deploy only additive preview routes or backward-compatible changes until an explicit release decision.
5. Keep a short `CHANGELOG` entry and a demo checklist for each completed week.
6. If a week slips, move its unfinished scope forward; do not compress testing to recover time.

### 13.2 Migration strategy

The migration is deliberately **strangler-style**: new reusable modules are added alongside existing pages, then an existing page adopts the module only after its route, content, and workflow have regression tests. Old pages/files are retained as aliases or compatibility pages through the temple-home cutover.

```text
Current static Chaturmas site
        |
        +-- baseline tests and CI
        |
        +-- shared design/shell (legacy routes unchanged)
        |
        +-- event/form configurations beside current JSON and pages
        |
        +-- preview temple home and reusable event routes
        |
        +-- Firebase protected services beside public static site
        |
        +-- multi-tenant product modules and optional mobile app
```

The website remains static where it should be public. Only protected/member/admin operations move to Firebase-backed services. Google Apps Script remains in place until its replacement has passed contract tests and an approved migration/reversal plan.

### 13.3 Phase A — weekly public-platform plan (first 10 weeks)

| Week | Small weekly feature/outcome | Main tasks | Definition of done |
|---|---|---|---|
| 1 | Development safety net | Add package scripts, local static server, formatter/linter, unit-test runner, browser-test runner | A new contributor can run one command to validate the project locally |
| 2 | Legacy-route protection | Inventory all current routes/assets; add automated link checks and browser smoke tests | Every listed legacy URL and its primary content is tested |
| 3 | CI on every change | Add GitHub Actions for lint, unit, browser smoke, and link checks | A deliberately broken link/test fails CI; a clean branch passes |
| 4 | Shared design tokens | Consolidate colour, typography, spacing, container, responsive, button, and card primitives | Representative legacy pages visually match baseline and CSS duplication is reduced safely |
| 5 | Shared site shell | Consolidate announcement bar, header, footer, navigation, and correct dynamic active navigation | All legacy pages retain routes and have passing navigation/mobile tests |
| 6 | Configured temple identity | Add a versioned site configuration and make shared shell/metadata read it | Existing Hindi branding/content renders unchanged from configuration |
| 7 | Event data contract | Define and validate Chaturmas event configuration; create read-only event overview preview | Preview route renders from event data; old pages remain untouched |
| 8 | First reusable event module | Migrate one low-risk module—gallery or contacts/team—onto the reusable event renderer | Preview and legacy module display equivalent approved data/content |
| 9 | Temple-home preview | Build `/temple/` from the site/event configuration with links back to Chaturmas | Stakeholder can review it; root and all current URLs remain unchanged |
| 10 | Analytics foundation | Add consent-aware analytics adapter, approved event schema, and page/CTA tracking tests | Dashboard identifies public-page and CTA usage without transmitting personal data |
| 11 | Public release hardening | Accessibility pass, responsive checks, content review, rollback instructions, deployment rehearsal | Green CI, approved preview checklist, and documented root-switch decision gate |

At the end of Week 11, decide whether to make the temple page the home page. This is the first safe public milestone. It must not be delayed by login, payments, inventory, WhatsApp, or Flutter work.

### 13.4 Phase B — authenticated multi-tenant foundation (Weeks 12–17)

| Week | Small weekly feature/outcome | Definition of done |
|---|---|---|
| 11 | Firebase dev environment | Separate development project, emulator suite, and no production credentials in source control |
| 12 | Tenant and role schema | `templeId` data model, membership records, locked default rules, and rule-test harness |
| 13 | Member sign-in | Phone OTP or approved sign-in method, logout, protected empty member page |
| 14 | Role protection | Member and admin route guards plus positive/negative Security Rules tests |
| 15 | Second test temple | Two branded local/test tenants with isolation tests proving no cross-temple access |
| 16 | Go/no-go review | Security review, backup/export approach, support/admin process, and choice to enable real member accounts |

### 13.5 Phase C — member engagement and administration (one module at a time)

Complete these as separate weekly feature slices after Phase B; do not start a new module until the current module has passing tests and a demo.

1. **Niyam setup:** admin creates the Niyam of the day for one temple.
2. **Niyam confirmation:** a member records today's completion once.
3. **Niyam streak:** current/longest streak and private history, including timezone-edge unit tests.
4. **Donation ledger:** finance admin creates campaign/pledge and records an audited offline donation.
5. **Member pledge view:** member sees only their pledges, balance, and payment history.
6. **Inventory catalogue:** create/search items and reorder thresholds.
7. **Inventory movements:** record receipts/issues/adjustments and derive stock balances.
8. **Inventory operations:** low-stock and stock-take/reconciliation reports.
9. **WhatsApp foundation:** consent/preferences and audited audience preview—no sending yet.
10. **WhatsApp sending:** provider sandbox, template send, opt-out, duplicate prevention, and delivery audit.

### 13.6 Phase D — payment and receipt release (security milestone)

Payments are a multi-week release, not a one-week feature. Plan 4–6 weekly slices: finance-policy sign-off and data model; provider sandbox order creation; verified webhook/idempotency; member partial-payment UI; PDF receipts/download authorization; then production readiness/security review. Live payments must remain disabled until the complete suite passes.

### 13.7 Mobile plan

Reassess the Flutter decision only after Phase C has demonstrated regular member usage. A reasonable earliest point is after Niyam and member pledge/history features work well on mobile web. Flutter becomes a separate 6–10 week stream, beginning with Android if that is the user base priority; it does not block web product releases.

### 13.8 Suggested weekly rhythm

| Day | 1–2 hour focus |
|---|---|
| Day 1 | Confirm the week's acceptance criteria; inspect relevant code/data; write a short task checklist |
| Days 2–3 | Implement the smallest vertical slice and its unit tests |
| Day 4 | Add integration/UI tests; test mobile and error states |
| Day 5 | Review diff, update docs/changelog, run full CI, deploy preview, and record the next week's starting point |
