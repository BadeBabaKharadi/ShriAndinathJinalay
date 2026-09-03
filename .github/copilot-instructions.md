# Shri Andinath Jinalay Development Rules

This repository is developed collaboratively by humans and AI agents. These rules are mandatory for all new features, fixes, refactoring and content changes.

## 0. Branch and Pull Request Safety

* Never commit directly to `master` or `main`.
* Create a dedicated feature, fix or chore branch from the latest `master`.
* All changes must reach `master` through a Pull Request.
* Do not merge a PR until required CI checks pass, unless the repository owner explicitly approves an exception.
* Before editing, confirm that the working branch is not `master`/`main`.
* Keep PRs focused and avoid unrelated changes.

## 1. Before Writing Code

* Inspect the existing architecture and nearby implementations before making changes.
* Prefer extending existing patterns over introducing parallel implementations.
* Understand the complete user flow, not just the requested page or component.
* Identify all affected HTML, CSS, JavaScript, data files, assets, build scripts and tests.
* Do not make speculative fixes.
* When CI fails, inspect the actual failing logs first and fix the root cause.

## 2. Website Architecture

This is a static HTML/CSS/JavaScript website deployed through GitHub Pages.

* Preserve the existing static-site architecture unless there is a clear requirement to change it.
* Reuse existing shared components and utilities.
* Shared site elements such as navigation and footer should remain consistent across pages.
* Avoid duplicating shared markup when an existing component mechanism can be reused.
* Keep JavaScript responsibilities separated by feature.
* Prefer small, readable functions over large monolithic scripts.
* Do not introduce a client-side framework or routing library unless explicitly required.
* Preserve existing URL structures unless a change is intentional and documented.

## 3. Navigation and Routing

* Every user-facing page must have a valid path from the existing navigation system or another intentional entry point.
* Unknown or unavailable pages must fall back to the home page through the root-level `404.html`.
* Do not implement multiple competing 404/redirect mechanisms.
* Existing navigation links must continue to point to valid pages.
* Shared header, footer and navigation behaviour must remain consistent across pages.
* When modifying navigation, test desktop and mobile navigation flows.

## 4. Shared Components

* Reuse `components/navbar.html`, `components/footer.html` and the existing component-loading mechanism where applicable.
* Do not create page-specific copies of shared navigation/footer markup without a clear reason.
* Changes to common components must be reviewed for impact across every page.
* Verify that relative paths continue to work from pages at different directory levels.

## 5. HTML Rules

* Preserve valid semantic HTML.
* Use appropriate headings and document structure.
* Maintain accessibility attributes where relevant.
* Images must have meaningful `alt` text unless they are genuinely decorative.
* Do not introduce duplicate IDs.
* Keep links and form controls keyboard accessible.
* Avoid inline JavaScript and inline CSS when an existing project stylesheet/script can be used.

## 6. CSS and Responsive Design

* Reuse existing CSS variables, utility classes and component styles.
* Do not add duplicate styles for an existing component.
* Preserve the current visual language unless the change intentionally modifies the design.
* Test responsive behaviour on mobile, tablet and desktop layouts.
* Do not fix one viewport by unnecessarily breaking another.
* Keep responsive overrides in the established responsive stylesheet/pattern.

## 7. JavaScript Rules

* Follow the existing JavaScript organisation and naming conventions.
* Use existing utility functions before introducing new equivalents.
* Handle failed network requests and missing data gracefully.
* Avoid silently swallowing errors.
* Do not leave debug logging in production code unless it is intentional and useful.
* Use defensive checks when DOM elements or external data may be unavailable.
* Avoid unnecessary global state.
* Ensure asynchronous operations do not race with DOM/component loading.

## 8. Data and Content

* Keep structured data in the existing `data/` files where applicable.
* Do not hardcode values in JavaScript when the same information already belongs in a data file.
* Validate JSON after changes.
* Preserve the existing data schema unless a schema change is intentional.
* When changing a data structure, update every affected consumer.

## 9. Assets

* Use existing assets whenever appropriate.
* Asset paths are case-sensitive and must exactly match committed filenames.
* Do not reference files that are not committed.
* Keep image/file naming consistent with the existing project.
* Avoid adding duplicate assets.

## 10. Localization and Language Support

* Preserve all currently supported language behaviour.
* New user-visible text must follow the project's existing language/localization approach.
* Do not introduce unexplained hardcoded language-specific strings when an existing content/data mechanism should be used.
* When modifying shared navigation or common UI, verify that all supported language variants continue to work correctly.

## 11. Testing

A feature or fix is not complete until relevant tests and validation have been performed.

For changes affecting pages, navigation or routing, verify at minimum:

* Home page loads successfully.
* The changed page loads successfully.
* Existing navigation links still work.
* An invalid/non-existent page reaches `404.html` and redirects to the home page.
* Shared header/navigation/footer remain available.
* Mobile navigation remains functional where applicable.
* Console errors introduced by the change are resolved.

For JavaScript/data changes:

* Test the normal path.
* Test missing or empty data.
* Test network/data-loading failure paths where relevant.
* Test important regression scenarios.

Prefer behavioural tests over brittle implementation-specific assertions.

## 12. Link and Build Validation

Before considering work complete, run the repository's existing checks where applicable:

```bash
npm ci
npm run check
```

If the full check is too broad for a focused change, at minimum run the affected lint, unit, integration, link and UI checks already provided by the repository.

Do not claim that tests passed unless they were actually run.

The repository already defines formatting, linting, unit, integration, link and UI test commands, so these existing checks should be reused rather than replaced.

## 13. CI Discipline

* CI failures must be investigated from the actual failing job output.
* Do not repeatedly change code or tests based on assumptions.
* Fix the underlying issue rather than suppressing the failure.
* Do not weaken tests simply to make CI pass.
* A green build is required before declaring the change complete, unless the repository owner explicitly approves an exception.

## 14. Documentation

For significant changes:

* Update relevant documentation or specifications.
* Review `README.md`, `SPEC.md` and `CONTRIBUTING.md` when the change affects documented behaviour.
* Routing, navigation, architecture or operational changes should be documented when appropriate.
* If no documentation change is necessary, the PR should make that clear.

## 15. AI Agent Working Principle

When implementing a change:

1. Inspect before editing.
2. Identify all affected files and user flows.
3. Implement the smallest coherent solution.
4. Reuse existing architecture and patterns.
5. Preserve responsive behaviour and shared UI.
6. Add or update tests in the same change.
7. Run the relevant checks.
8. Fix root causes, not symptoms.
9. Review the change for regressions across other pages.
10. Update documentation when behaviour or architecture changes.
11. Never declare a fix complete without verifying the relevant checks.

## 16. Definition of Done

Before opening a PR, verify:

* [ ] Change works in the intended user flow.
* [ ] Existing pages and navigation are not broken.
* [ ] Shared header/footer/navigation remain consistent.
* [ ] Responsive behaviour is preserved.
* [ ] New assets are committed and paths are correct.
* [ ] Data/JSON changes are valid.
* [ ] Relevant tests are added or updated.
* [ ] Existing automated tests still pass.
* [ ] Link checks pass.
* [ ] Static analysis/lint passes.
* [ ] CI logs have been checked.
* [ ] Documentation impact has been reviewed.
* [ ] Regression coverage exists for changed behaviour.

The goal is to make small, reliable changes that preserve the existing Shri Andinath Jinalay website rather than continuously introducing new parallel patterns.
