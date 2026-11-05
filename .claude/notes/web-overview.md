# Telaah Reborn — web overview (working notes, not committed)

## Running it
- `.claude/launch.json` → config `web` (Vite on :5173). `.env` = mock mode + `VITE_SHOW_DEMO=true`.
- Login page has demo buttons "Masuk sebagai Satker / ROCAN / Super Admin".
- Seed submission: `/rocan/pengajuan/s-contoh-1` (status Menunggu Pemeriksaan, full S1+S2 results).

## Map
| Route | File |
|---|---|
| `/masuk` | `src/features/auth/LoginPage.tsx` (+ `DemoRoleButtons.tsx`) |
| shell | `src/components/AppShell.tsx` (sidebar 256px, top bar with name/role, ganti sandi, keluar) |
| `/satker` | `features/satker/SatkerHomePage.tsx` |
| `/satker/ajukan` | `features/satker/SubmitPage.tsx` (`UploadDropzone`) |
| `/satker/pengajuan(/:id)` | `SubmissionsPage.tsx`, `SubmissionDetailPage.tsx` |
| `/rocan` | `features/rocan/RocanHomePage.tsx` |
| `/rocan/pengajuan` | `RocanSubmissionsPage.tsx` (`DataTable`, filters in `filters.ts`) |
| `/rocan/pengajuan/:id` | `RocanReviewPage.tsx` — the most important screen |
| `/rocan/acuan` | `ReferenceDocumentsPage.tsx` |
| `/admin/*` | `features/admin/{Ro,Checklist,Category,Users}Page.tsx`, shared bits in `admin/ui.tsx` |
| 403/404/placeholder | `src/routes/pages.tsx` |

Review page order: header → DocumentPair → ProgramContextPanel → Screening 1 (ChecklistTree) →
Screening 2 (CategoryResultCard/VerdictRow/EvidenceQuote) → DecisionPanel → TechnicalSection.

## Tokens (`src/styles/index.css`)
sky-soft #bfe3f7, sky-pale #eaf6fd (page bg), brand #3b9ad9, brand-deep #1e5f8e, ink #1f2a37,
ink-soft #5b6b7b, line #d5e3ee, ok/warn/bad, bad-text. radius card 12 / control 8. Inter Variable.

## Rules that must survive any restyle
- AI output always labeled "kandidat", visually separate from ROCAN's decision.
- Technical failure ≠ verdict (`PROCESSING_FAILED` shows as "Terupload" to Satker).
- Status = text + icon + color; one mapper `src/lib/status.ts`, verdicts in `src/lib/verdict.ts`.
- `#FF0000` only for `DemoOnly` / `.demo-flag`. Satker never sees technical details.
- Plain Indonesian copy. Light-blue theme (spec says baby blue; rest is free).
- Before saying done: `npm run build`, `npm run lint`, `npm run test`.

## De-slop pass 1 (2026-11-06) — done: items 1–4, 6, 7 below + demo marker
- Shared classes in `src/styles/index.css` (`btn*`, `field`, `field-label`, `page-title`,
  `section-title`, `term`, `link`, `error-text`, `progress-line`). Global focus rule only.
- New shared components: `Section`, `StatusSummary`, `BackLink`, `ActiveLabel`, `tone.ts`.
- Layout: white canvas, baby-blue sidebar holding user + actions (no top bar), sections split by
  hairlines. Only the ROCAN decision panel and dialogs keep a filled surface.
- List pages read `?status=<label>` so summary counts link to a filtered list.
- Demo marker: solid 3px #FF0000, square corners, square label.
- Still open: item 5 partly (empty/loading now plain), item 8 leftovers.

## AI-slop inventory (confirmed in browser)
1. Card soup: every block is a white `rounded-card border border-line` box on pale blue; review page
   is ~10 stacked identical boxes. No hierarchy between header, documents, results, decision.
2. Everything blue: all h1/h2/labels `text-brand-deep`; sidebar active pill also blue.
3. Sparkles icon in `AiCandidateTag`.
4. KPI tiles on both home pages (badge + big 0 + "pengajuan"); 5 tiles of mostly zeros on ROCAN home.
5. Template states: Inbox-icon empty state, fake 1/3 pulsing bar in `LoadingState`.
6. Duplicated class strings (focus-visible, primary button) across ~every file; global
   `:focus-visible` rule already exists. `admin/ui.tsx` button constants unused elsewhere.
7. Filler copy: "Status:" before badge, "Galat:" prefix, reassurance sentences,
   "Contoh ROCAN (ROCAN)" in top bar.
8. Leftovers: `TokenShowcase`, `PlaceholderPage`, JSDoc restating component names.
   Page `<title>` is "Telaah TOR dan RAB" while the app says "Telaah Reborn".
