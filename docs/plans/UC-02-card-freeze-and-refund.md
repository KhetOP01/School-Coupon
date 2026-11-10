# UC-02 Implementation Plan: Card Freeze & Refund

Implementation is performed on branch `feature/UC-02-card-freeze-refund` based on `main`.

| AC | Domain | Application | Infrastructure | HTTP and verification |
|---|---|---|---|---|
| **AC2.1a, AC2.1b** | `Student.suspendCard` and `Student.reportLost`; transitions card status to `suspended` or `lost`. | `FreezeCardUseCase` executes card state change based on actor role (Staff vs Parent). | Repository saves card status change atomically. | `PATCH /admin/cards/{id}/freeze` and `PATCH /parent/cards/{id}/freeze` return `200` with `CardStatusResponse`. |
| **AC2.2, AC2.6, AC2.7** | `Student.refundDeparture`; deactivates card, returns refund amount, zeroes wallet balance, sets `departedAt`. Rejects duplicate refund with `REFUND_ALREADY_PROCESSED`. If balance is zero, closes without refund record. | `RefundDepartingStudentUseCase` loads student, executes departure, and persists changes atomically. | Transaction updates student `wallet_balance = 0.00` and `departed_at`, deactivates card, and inserts `student_refunds` record if amount > 0. | `POST /admin/students/{id}/refund` returns `200` with `StudentRefundResponse`. |
| **AC2.3** | `Student.unfreezeCard`; allows un-suspending a `suspended` card back to `active`. Fails if already active or other active card exists. | `UnfreezeCardUseCase` executes un-suspension. | Repository updates card status and verifies partial unique constraint on active card. | `PATCH /admin/cards/{id}/unfreeze` returns `200` with updated `CardStatusResponse`. |
| **AC2.4, AC2.5** | Domain errors for missing student or card. | Propagates not found and authorization failures. | No database writes on rejected requests. | HTTP returns `401 AUTHENTICATION_REQUIRED`, `403 STAFF_ACCESS_REQUIRED`, `404 CARD_NOT_FOUND`, `404 STUDENT_NOT_FOUND`. |

## Verification Plan

- Run unit tests for each AC in domain, application, and HTTP layers.
- Run PostgreSQL integration tests in `student-account.repository.spec.ts` against embedded database.
- Run E2E test verifying full freeze and refund flows.
- Verify `npm run lint` and `npm run build` clean pass.
