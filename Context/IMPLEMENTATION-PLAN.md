# Implementation Plan

After every task run `npm run lint`, `npm run test`, and `npm run build`.

Stack and rules: see `.kiro/steering/tech.md`. Screens: see `FRONTEND-SCOPE.md` section 5.

Scope: frontend only (decided 2026-11-06). No task in this plan writes backend code, here or in
`tor-rab-ai-reviewer`. Where the backend is missing, use the mock adapter and record the needed
endpoint in `BACKEND-APPENDIX.md` section 4.

Authority: `tor-rab-ai-reviewer/docs/prd.md` (PRD v2.1), then `docs/api/contract.md` (contract
v2.1), then `FRONTEND-SCOPE.md`. On 2026-11-06 the frontend was realigned to them (branch
`align-prd`): statuses, item results, K1–K4, NIP login without self-registration, the 3-part
submit form, role split, and every contract endpoint group.

## Done (2026-11-06, `align-prd`)

| Area | What exists |
|---|---|
| Data layer | Zod schemas in contract field names; `ApiClient` covering contract §3.1–§3.11; real adapter (`/api/v1`, Bearer, one refresh on 401, server `detail` messages); mock adapter enforcing contract rules. |
| Auth and shell | NIP login, demo role buttons, role-guarded routes, notifications with unread count. |
| Satker | Home, 3-part submit form with cascading Master RO dropdowns and PDF checks, list, detail with progress polling, final result, resubmission (max 3), version history. |
| ROCAN | Home queues, filtered list, review page (progress, retry on `gagal`, Hasil_Final editor with change reason and revision conflict, Screening 2, finalize with confirm, history, technical section), checklist versions, reference documents, reference tables, Master RO datasets, curation. |
| Super Admin | Accounts: create, edit, deactivate, password reset, Satker unit from Master RO units. |
| Tests | 75 tests: schemas, real client, mock contract rules, status mapping, PDF validation, shared components, routes, Satker, ROCAN, admin flows. |

## Next

1. **Connect to the real backend.** Run with `VITE_API_MODE=real` against the backend runtime;
   record every schema mismatch in `BACKEND-APPENDIX.md` §3 instead of loosening schemas.
2. **Bundle size.** The main chunk is ~560 kB; split routes with lazy imports.
3. **Polish and verification.** Responsive pass, keyboard walk-through of all three roles,
   contrast check, confirm all demo items are behind `DemoOnly`, confirm no secrets or client
   documents are committed.

## Open items
- `ReferenceTableVersion`, curation sample detail, and export shapes are frontend proposals
  (see `BACKEND-APPENDIX.md` §4).
- No self-service password change endpoint.
- 5W+1H mapping and checklist splitting may change; they stay as checklist data.
