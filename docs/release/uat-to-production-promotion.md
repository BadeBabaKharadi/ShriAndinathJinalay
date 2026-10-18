# UAT-to-production promotion

The `Promote UAT release to production` workflow is manually triggered from **Actions** in this UAT repository. It validates a selected UAT ref, then opens a PR in `BadeBabaKharadi/ShriAndinathJinalay`. It never merges that PR or deploys production.

## One-time setup

1. Create a fine-grained GitHub token for the production repository only.
2. Grant **Contents: Read and write** and **Pull requests: Read and write** on `BadeBabaKharadi/ShriAndinathJinalay`.
3. Add it to the UAT repository as the Actions secret `PROD_PROMOTION_TOKEN`.
4. Ensure the production `master` branch requires the appropriate CI checks and authorized approval before merging. Configure a required reviewer on the production environment as an additional deployment gate if production deployment uses that environment.
5. Keep production Firebase deployment credentials exclusively in the production repository/environment. Do not add them to UAT.

## Run a promotion

1. Open **Actions → Promote UAT release to production → Run workflow**.
2. Set `source_ref` to the UAT branch, tag, or commit SHA that was tested.
3. Enter the exact newline-separated paths to promote. Use files/directories from that UAT ref, not an entire repository sync.
4. Add a short release summary and run the workflow.
5. Review the generated production PR's file diff and CI checks. Merge only after the required checks pass and an authorized person approves it.
6. Verify the production website and any affected backend/Functions after merge.

## Safety and scope

- The workflow validates `npm run check` on the selected UAT ref and runs Functions tests when a `functions/package.json` exists.
- It refuses paths that do not exist in the selected ref, unsafe paths, and `.github/workflows/*` paths.
- It creates a branch and production PR; it does not merge or deploy.
- It copies selected existing files from the chosen UAT commit onto production `master`. Deletions, renames, repository-wide sync, environment configuration changes, and workflow changes must be handled explicitly in a separately reviewed release.
- The generated PR must still pass production CI. The UAT validation does not substitute for production CI.
- If the token is missing, the action fails safely before pushing to production.
