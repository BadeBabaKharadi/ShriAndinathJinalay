# JCP User Profile Integration

BadeBaba remains a separate application repository while JCP is the canonical owner of community identity.

## Existing event data

Historical Kshamawani registrations are reconciled by normalized mobile number through JCP's trusted profile migration API. The registration document receives `userId` and `profileLinkSource`.

Historical Pratibha Samman applications use the same reconciliation process through `migration/link-pratibha-to-jcp-profiles.mjs`.

If the mobile number does not yet belong to a JCP profile, the migration provisions a profile from the existing event record. A later Google login can attach to that profile through mobile linking.

## Participation

JCP reads the `userId` reference from existing BadeBaba event collections so the MyJinalay profile can show participation without duplicating the event records.

## Migration configuration

The migration scripts require:

- `JCP_API_URL` pointing to the deployed JCP API.
- The shared JCP integration key supplied through the deployment environment; it must never be committed to the repository.

Do not put credentials, exported registrations or personal data into source control.

## Boundary

BadeBaba owns event workflows and event-specific records. JCP owns the canonical community profile and identity mapping. This is a transitional integration boundary until the two applications are eventually consolidated.
