# Google Integration Setup

Vercel Functions are the trusted boundary for OAuth, Google Sheets access, Drive session creation, and server validation. Google credentials and access tokens must never be exposed to Vite/client code.

## 1. Enable APIs and OAuth

Enable Google Sheets API and Google Drive API in one Google Cloud project. Create an OAuth 2.0 client and authorize the account that can access all configured sheets/folders with offline access and these scopes:

- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive`

Store the client ID, client secret, and refresh token only in server environment variables.

## 2. Spreadsheet tabs and headers

The three spreadsheet IDs may reference the same workbook or different workbooks. Format identifier columns as **Plain text**.

### `pilok_master` — read only

```text
kode_pilok | nama_distributor | area_name
```

### `gudang_master` — read only

```text
kode_pilok | kode_gudang | nama_gudang | kapasitas_gudang
```

PILOK directly masters warehouses through `kode_pilok`. The logical relationship key is `(kode_pilok, kode_gudang)`. `kodeDistributor` no longer exists.

### `submission` — application read/write

```text
kode_pilok | nama_distributor | area_name | ada_perubahan | created_at | updated_at
```

### `submission_gudang` — application read/write

```text
kode_pilok | nama_distributor | area_name | kode_gudang | nama_gudang | kapasitas_gudang | status_gudang | kepemilikan | mulai_sewa | berakhir_sewa | shm_file_id | shm_file_name | shm_url | bukti_sewa_file_id | bukti_sewa_file_name | bukti_sewa_url | updated_at
```

Every **Ya** write snapshots PILOK/distributor/area and warehouse code/name/capacity from current master data. The client cannot supply authoritative master values.

## 3. Drive folders

Create separate folders for SHM and rental-proof PDFs and grant the OAuth account access. Folder selection remains server-controlled:

- `SHM` → `GOOGLE_DRIVE_SHM_FOLDER_ID`
- `BUKTI_SEWA` → `GOOGLE_DRIVE_SEWA_FOLDER_ID`

Drive metadata is verified for existence, PDF MIME type, size, and expected parent folder before submission persistence.

## 4. Environment variables

Copy `.env.example` to `.env`. Never use a `VITE_` prefix for these values:

```text
APP_ORIGIN
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GOOGLE_PILOK_SPREADSHEET_ID
GOOGLE_PILOK_SHEET_NAME
GOOGLE_WAREHOUSE_SPREADSHEET_ID
GOOGLE_WAREHOUSE_SHEET_NAME
GOOGLE_SUBMISSION_SPREADSHEET_ID
GOOGLE_SUBMISSIONS_SHEET_NAME
GOOGLE_SUBMISSION_WAREHOUSE_SHEET_NAME
GOOGLE_DRIVE_SHM_FOLDER_ID
GOOGLE_DRIVE_SEWA_FOLDER_ID
```

`APP_ORIGIN` must be the exact deployed frontend origin without a path or trailing slash. Local development additionally allows `http://localhost:3000` and `http://127.0.0.1:3000`.

## 5. Read-only verification

```bash
npm run verify:google
```

This checks OAuth, required tabs and current headers, plus both Drive folders. It performs no sheet write, upload, or delete.

## 6. Local and Vercel setup

Run the integrated frontend/functions environment with:

```bash
npx vercel dev
```

In Vercel, add every `.env.example` variable to each required environment. Do not expose secrets as Vite variables.

## Submission behavior

- One parent submission exists per `kode_pilok`.
- The first write sets both timestamps; updates preserve `created_at` and replace `updated_at` with a server timestamp.
- A first-time PILOK cannot submit **Tidak**.
- Existing + **Tidak** updates the parent row and leaves `submission_gudang` untouched, even if current master data changed.
- **Ya** requires the submitted warehouse set to exactly equal the current `gudang_master` rows scoped to that PILOK, then replaces active warehouse rows.
- Existing persisted rows removed from current master remain readable, but are omitted by the next **Ya** replacement.
- Replaced Drive files are not automatically deleted.

## Resumable upload

The browser requests a scoped session from `/api/upload-session`; the server confirms that `(kode_pilok, kode_gudang)` exists in current master and chooses the Drive folder. The browser then PUTs only the PDF directly to Google Drive. It must not manually set Authorization, Origin, Content-Length, or Host, and must not proxy/base64 the file through `/api`.
