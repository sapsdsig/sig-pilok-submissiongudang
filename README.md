# PILOK Gudang Submission Form

Responsive internal form for collecting warehouse survey data per PILOK. Phase 2 uses Vercel Functions as the trusted server boundary, Google Sheets for master/submission data, and direct browser-to-Google Drive resumable PDF uploads.

Kode PILOK is an access/lookup mechanism, not strong authentication.

## Stack

- React, TypeScript, Vite
- React Hook Form and Zod
- Tailwind CSS
- Vercel Functions under `/api`
- Google Sheets API and Google Drive API through `googleapis`

## Setup and commands

```bash
npm install
copy .env.example .env
npm run verify:google
npx vercel dev
```

Frontend-only development can use `npm run dev`; `/api` routes require `vercel dev`.

Quality commands:

```bash
npm run typecheck
npm run lint
npm run build
npm audit
```

See [GOOGLE_SETUP.md](./GOOGLE_SETUP.md) for Google/Vercel configuration and [DOMAIN_RULES.md](./DOMAIN_RULES.md) for authoritative business rules.

## Architecture

```text
api/
  _lib/                   Google auth, Sheets/Drive, master and validation logic
  pilok.ts                Exact PILOK lookup
  warehouses.ts           PILOK-scoped warehouse master list
  submission.ts           Existing-state lookup and parent/warehouse upsert
  upload-session.ts       Scoped Drive resumable-session creation
scripts/
  verify-google.ts        Read-only Google configuration verification
src/
  components/             Shared SIG form layout and field feedback
  features/pilok-form/    Form state, validation, warehouse cards, payloads
  services/               Browser API abstractions
  types/                  Domain and transport contracts
```

## Current master model

`pilok_master` directly owns `gudang_master` rows through `kode_pilok`. Warehouse membership is loaded as a complete scoped list and is not user-editable. `kodeDistributor` is not part of the model.

When the form opens:

1. The exact PILOK is loaded.
2. All current mastered warehouses for that PILOK are loaded.
3. Existing persisted survey values are merged by `(kode_pilok, kode_gudang)`.
4. Master names and capacities always come from current master data.

Every submission must contain the full current mastered warehouse set. Existing survey state is prefilled by `(kode_pilok, kode_gudang)`, while newly mastered warehouses start blank and require completion.

Each `submission_gudang` row stores a snapshot of PILOK/distributor/area and warehouse code/name/capacity alongside its validated survey fields.
Current master warehouses are updated or inserted by composite key. Stored rows for warehouses no longer present in `gudang_master` remain untouched and are not displayed or validated.

## UI system

The form follows [docs/ui-guidelines.md](./docs/ui-guidelines.md) and shares the SIG page shell, typography, spacing, cards, controls, banners, action bar, and responsive behavior used by the PILOK Supervisor form.

## Upload architecture

The browser requests a small scoped upload session from `/api/upload-session`, then sends the PDF directly to Google Drive. PDF binary data never passes through a Vercel Function. Final submission JSON contains only Drive references, which the server verifies before persistence.

## Intentionally deferred

- Full authentication and authorization
- Submission history/versioning and approval workflows
- Automatic deletion of replaced/orphaned Drive files
- Transactional locking beyond targeted Google Sheets operations
- Administrative master-data UI
- Any obsolete Jotform/`old_data` migration workflow
