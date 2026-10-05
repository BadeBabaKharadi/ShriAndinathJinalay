# AI Repository Profile — Shri Andinath Jinalay

This file is the repository-local operating profile for AI agents. It complements `.github/copilot-instructions.md`, `SPEC.md` and `CONTRIBUTING.md`.

## Identity
- Repository: BadeBabaKharadi/ShriAndinathJinalay
- Default branch: `master`
- Product: Bade Baba Kharadi / Shri Andinath Jinalay temple website and evolving reusable temple platform
- Hosting model: static website / GitHub Pages
- Current domain: badebabakharadi.com

## Source of truth
1. `.github/copilot-instructions.md` — engineering rules.
2. `SPEC.md` — platform specification and compatibility contract.
3. `CONTRIBUTING.md` — local validation and contribution workflow.
4. `README.md` — repository baseline.
5. Existing code, data, assets and tests — implementation truth.
6. GitHub issues/PRs/CI — current execution state.

## Developer operating contract
1. Inspect Copilot instructions, SPEC, relevant pages/components/data and tests before editing.
2. Preserve existing public routes, content, registration contracts and asset paths unless the requirement explicitly changes them.
3. Implement the smallest coherent change using existing static-site patterns.
4. Add/update unit, integration, link and browser/UI coverage as applicable.
5. Test desktop/mobile behaviour for user-facing changes.
6. Validate JSON/data and local assets.
7. Run `npm run check` (or the affected checks while iterating) before push.
8. Monitor CI, inspect actual failures, fix root causes and continue until required checks are green.
9. Review all affected pages for regressions.
10. Update SPEC/README/CONTRIBUTING or other docs when documented behaviour changes.
11. Merge only after required CI checks pass and repository rules permit it.

## Product Owner operating contract
1. Read SPEC and existing roadmap/requirements before proposing new platform behaviour.
2. Treat backward compatibility as a first-class constraint.
3. Separate event-specific requirements from reusable temple-platform capabilities.
4. Create/update epics, stories and acceptance criteria rather than embedding product policy only in code.
5. Keep the specification and implementation aligned.
6. For production cutovers, require explicit acceptance testing and a reversible deployment path.
7. Identify impacts on public routes, registrations, data contracts, accessibility, mobile responsiveness and future tenant reuse.

## Non-negotiable compatibility rules
- Existing public routes must continue to work unless an approved migration explicitly changes them.
- Existing registration endpoint/event identifiers/payload contracts must not change silently.
- New temple-home experiences remain preview-first until explicitly approved.
- Do not delete production data/assets before replacement paths have regression coverage.
- Production cutovers must be reversible.

## Quality gate
A change is complete only when the intended flow works, regression coverage exists, relevant checks are clean, CI is green, compatibility is preserved, and documentation impact is addressed.

## Firebase Firestore database
- Firebase project: `jain-community-platform`
- Production Firestore database: `jcp-firestore-db-001`
- Firestore location: `asia-south1`
- Do not use or recreate the deleted `(default)` Firestore database.
- Firebase Admin SDK code must explicitly target `jcp-firestore-db-001`.
