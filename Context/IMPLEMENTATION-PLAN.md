# Implementation Plan

Order matters: each task builds on the previous one and ends with something runnable. After
every task run `npm run lint`, `npm run test`, and `npm run build`.

Stack and rules: see `.kiro/steering/tech.md`. Screens: see `FRONTEND-SCOPE.md` section 5.

## Task 1. Tooling and foundations
- Add ESLint, Vitest, Testing Library, TanStack Query, react-pdf. Add `lint` and `test` scripts.
- Design tokens in `src/styles/` (baby-blue palette, demo red reserved, type scale, 8px grid).
- `src/lib/`: IDR money, ISO date display, `null` to "—". Unit tests for each.
- Done when: lint, test, build pass; a token showcase renders.

## Task 2. Domain schemas and status map
- Strict zod schemas in `src/api/` for submission, document, program context, Screening 1 and 2,
  decision, checklist, category, RO, reference document, user. Types inferred into `src/types/`.
- Codes are strings. Unknown fields are rejected with a clear message.
- One role-based status mapping function in `src/lib/`.
- Done when: tests cover valid and invalid payloads, leading zeros, and status mapping per role.

## Task 3. API client and mock adapter
- Fixed client interface; `real` adapter (fetch + zod) and `mock` adapter chosen by
  `VITE_API_MODE`.
- Mock: sample Screening 1/2 JSON, `localStorage` accounts, sessions, and submissions,
  simulated processing (Terupload to Diperiksa). Wrapped as demo.
- Done when: contract tests pass against the mock and bad responses fail without crashing.

## Task 4. Shared components
- `DemoOnly`, `StatusBadge`, `AiCandidateTag`, `DataTable`, `EmptyState`, `LoadingState`,
  `ErrorState`, `ConfirmDialog` (focus trap), `UploadDropzone`.
- Done when: tests cover badge text per role, table semantics, dialog focus, and
  `VITE_SHOW_DEMO` toggling.

## Task 5. Auth, routing, shell
- Login and register (Satker self-register), 3 demo role buttons inside `DemoOnly`.
- Role-guarded routes, app shell (nav by role, user name, logout, change password), 403, 404.
- Done when: each role sees the right menu; removing the demo buttons leaves login intact.

## Task 6. Satker flow
- Home, Ajukan Baru (RO select, TOR/RAB PDF validation, preview, Kirim), My Submissions with
  status filter, Submission Detail (no technical data). Status polling.
- Done when: a mock submission moves from Terupload to Diperiksa and the Satker never sees AI
  evidence.

## Task 7. ROCAN review core
- ROCAN home (queue), all-submissions list with filters, `DocumentPair`, `PdfPreviewModal`
  (react-pdf, jump to page), `ProgramContextPanel`.
- Done when: filters work, null shows "—", PDF opens at a given page.

## Task 8. Screening results and decision
- `ChecklistTree` (derived parent status), `VerdictRow`, `EvidenceQuote`, `CategoryResultCard`,
  `DecisionPanel` (separate from AI results, with confirm), hidden technical section (raw JSON,
  evidence IDs, scores, versions, download), "Pemrosesan bermasalah" with resubmit, rejected
  submission linked resubmission.
- Done when: a full review reaches Diterima or Ditolak and the Satker sees the decision and
  note. Technical failures never appear as review conclusions.

## Task 9. Reference documents
- `/rocan/acuan`: add, view, toggle active, delete (confirm), grouped by category.

## Task 10. Super Admin management
- Master RO, Checklist management (parent/child, order, required document type, split; 5W+1H
  mapping kept as editable data), two-tab Category management, User accounts.
- Done when: CRUD works in the mock and non-admins cannot reach these routes.

## Task 11. Polish and verification
- Responsive pass, keyboard focus, labels, reduced motion, contrast check.
- Search for `DemoOnly` and `data-demo` to confirm all demo items are covered.
- Confirm no secrets, `.env`, or original TOR/RAB/checklist/regulation documents are committed.
- Done when: lint, test, build pass and all three roles were walked through manually.

## Open items
- Final API contract and status update method (polling vs push) depend on the backend.
- 5W+1H mapping and checklist splitting may change; keep them as data.
