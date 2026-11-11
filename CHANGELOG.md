# Changelog

All notable changes to the School Coupon System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-11

### Added
- **UC-01 (Reissue RFID Card):** Implemented card reissuance for lost or damaged cards with automatic status transition and wallet balance preservation (BR-CARD-02, BR-CARD-03).
- **UC-02 (Card Freeze & Refund):** Added card freeze/unfreeze capability for staff and parents, plus full wallet balance refund upon student departure (BR-CARD-04).
- **UC-03 (Parent Wallet Top-Up):** Implemented wallet top-up supporting PromptPay QR, amount validation (50–2,000 THB), and maximum wallet ceiling (5,000 THB) (BR-TOPUP-01, BR-TOPUP-02).
- **UC-04 (Parent Daily Limit Setting):** Added daily limit management with overnight 00:00:00 effective date enforcement (BR-LIMIT-01).
- **UC-05 (Merchant Payments - Online & Offline):** Implemented online canteen checkout and offline payment with 100 THB transaction cap, 12-hour offline lock, and negative wallet allowance up to -500 THB on conflict sync (BR-PAY-01, BR-PAY-02, BR-PAY-03).
- **UC-06 (Merchant Void Payment):** Implemented same-day payment cancellation (before 23:59:59) with instant student wallet refund without RFID card re-scanning (BR-VOID-01, BR-VOID-02).
- **UC-07 (Daily Settlement & Approval):** Implemented midnight automated settlement generation (excluding voided payments, 3% school fee deduction) and staff admin approval workflow for T+1 payout (BR-SETTLE-01).
- **UC-08 (Staff Admin Auth & OIDC):** Implemented OpenID Connect (OIDC) Single-Sign-On, claim verification, and encrypted HTTP-only session cookies.
- **Web Admin Dashboard (`apps/admin/`):** Next.js multi-tab application for card reissuing, freeze/unfreeze, departure refunds, settlement approval, and secure logout.
- **Parent Mobile App (`apps/parent-mobile/`):** React Native app with profile, balance, PromptPay top-up, daily limit adjustments, and instant card freeze.
- **Merchant Mobile App (`apps/merchant-mobile/`):** React Native cashier POS with numpad, offline mode toggle, queue sync, same-day void, and daily sales summary.
- **Full Day E2E Simulation (`scripts/simulate-school-day.ts`):** Complete automated simulation testing the full school day lifecycle (`npm run simulate`).
- **Interactive API Documentation:** Embedded Swagger UI at `/api/docs` serving the 1,753-line OpenAPI 3.1 specification at `/api/openapi.yaml`.
- **Production Infrastructure:** Multi-stage Dockerfiles (`Dockerfile.api`, `Dockerfile.admin`), Nginx reverse proxy (`nginx.conf`), and `docker-compose.prod.yml`.
- **CI/CD Pipeline:** GitHub Actions workflow (`.github/workflows/ci.yml`) validating linting, testing (43 suites / 230 tests), simulation, and Docker container builds.
