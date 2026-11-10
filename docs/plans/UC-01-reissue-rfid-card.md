# UC-01 implementation plan: Reissue RFID card

Implementation is performed inline in the `D:\School-Coupon-UC-01-mainline` worktree on branch `feature/UC-01-reissue-rfid-card-mainline`, based on `origin/main`.

The user approved extending UC-01 to the Next.js Admin screen and same-origin Staff sign-in/API flow. Use provider-neutral OIDC in NestJS with opaque session cookies; keep the real IdP and Staff claim values as deployment configuration, not test or seed credentials.

The implementation was carried over from an earlier uncommitted worktree. The current final tests pass, but historical Red output for each acceptance criterion was not preserved; do not report those Red steps as completed.

| AC | Domain | Application | Infrastructure | HTTP and verification |
|---|---|---|---|---|
| AC1.1 | Restore Student and RFIDCard; implement reissue while retaining wallet balance. | Load the student, request a new card ID, apply the aggregate operation, and persist the replacement atomically. | Add a read query for the preview and retain the transactional reissue repository. | Build the Next.js page to lookup the student, display the replaceable card and wallet, capture the new RFID UID, submit reissue, and show result; test preview and replacement end to end. |
| AC1.2 | Keep registered UID unavailable as a domain error. | Propagate the repository conflict without changing account state. | Translate the UID unique constraint to `CARD_ALREADY_BOUND`; verify rollback with PostgreSQL. | Return the OpenAPI `409` response. |
| AC1.3 | No business rule beyond missing account. | Return `STUDENT_NOT_FOUND` when the repository has no student. | Verify no write occurs for an absent student. | Return `404` and test the route response. |
| AC1.4 | No domain rule; request shape is an HTTP concern. | Do not execute the use case for invalid input. | No database write. | Validate required fields and types; return `400 INVALID_REQUEST`. |
| AC1.5 | No authentication rule in the student aggregate. | Require an authenticated Staff principal at the HTTP boundary. | Validate OIDC identity and resolve revocable Staff sessions; persist only the SHA-256 hash of the opaque session identifier. | Next.js redirects unauthenticated page requests to sign-in; API returns `401 AUTHENTICATION_REQUIRED` or `403 STAFF_ACCESS_REQUIRED`; rejected calls do not mutate card or wallet state. |
| AC1.6 | Reject replacement when the expected card is no longer the current replaceable card. | Treat expected-card mismatch as a conflict. | Lock the student row and conditionally transition the old card in the same transaction; enforce the partial unique index. | Race two requests and assert at most one succeeds with no partial state. |
| AC1.7 | Preserve the rule that a registered UID is never reusable. | Propagate the duplicate UID conflict. | Verify the unique UID constraint includes deactivated cards. | Return `409 CARD_ALREADY_BOUND` for a retired UID. |

## Verification

- Run unit tests for each AC with test names prefixed by the AC code.
- Run repository integration tests against a real local PostgreSQL instance, not a mock.
- Validate the OpenAPI document and start the Prism mock.
- Apply migrations from an empty local database, load seed data, and run the complete test suite.
- Build and smoke-test the Next.js Admin page through the same-origin API/auth routing.
- Do not deploy until the school IdP, issuer/audience/client/callback configuration, Staff claim mapping, session policy, and reverse-proxy deployment platform are confirmed.

## Verification results

- Passed: `npm test` — 8 suites and 31 tests, including PostgreSQL integration and OIDC/session flows.
- Passed: `npm run build`, `npm run build:admin`, and `npm run lint`.
- Passed: applied both migrations to a fresh local PostgreSQL database; reran migrations and seed successfully.
- Passed: parsed `openapi.yaml` as OpenAPI 3.1 and exercised the Prism mock; the session endpoint returned `401` without a cookie and `200` with the documented cookie.
- Passed: smoke-tested the running Admin and API locally; the Next.js auth rewrite returned the API's `401`, and `/admin` redirected an unauthenticated user to sign-in.
- Smoke tests used placeholder local OIDC settings only. The local servers and database were stopped afterward.
- Deployment remains blocked on confirming the real school IdP, Staff claim mapping, session policy, and reverse-proxy configuration.
