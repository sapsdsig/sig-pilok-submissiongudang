# Domain Rules — PILOK Gudang Submission Form

## Master data

1. `kodePilok` is the PILOK identity and is always handled as a string.
2. `pilok_master` contains only `kode_pilok`, `nama_distributor`, and `area_name`.
3. `gudang_master` contains `kode_pilok`, `kode_gudang`, `nama_gudang`, and `kapasitas_gudang`.
4. PILOK directly masters warehouses through `kode_pilok` in a one-to-many relationship.
5. A mastered warehouse relationship is identified by `(kode_pilok, kode_gudang)`.
6. `kodeDistributor` no longer exists in the warehouse model.
7. Warehouse membership, names, and capacities are not editable by form users.

## Form behavior

- The form uses every current `gudang_master` row for the PILOK. The submitted warehouse set must exactly match that current master set.
- Existing survey values are merged into current master warehouses by `(kode_pilok, kode_gudang)`.
- A newly mastered warehouse starts with blank survey fields.
- A persisted warehouse removed from the current master is not displayed, validated, updated, remapped, or deleted.
- A PILOK without mastered warehouses cannot submit.

## Survey validation

- Status must be **Aktif** or **Tidak Aktif**.
- **Tidak Aktif** excludes ownership, rental dates, and ownership documents.
- **Aktif** requires ownership to be **Milik Sendiri** or **Sewa**.
- **Milik Sendiri** requires an SHM PDF up to 10 MB and excludes rental fields.
- **Sewa** requires start/end dates and a rental-proof PDF up to 10 MB; the end date cannot precede the start date and SHM is excluded.

## Server authority and persistence

- The server derives distributor and area from `pilok_master`.
- The server derives warehouse membership, name, and capacity from current scoped `gudang_master` rows.
- Client copies of master names, capacity, and warehouse membership are never trusted.
- `submission_gudang` stores a master snapshot: PILOK code, distributor, area, warehouse code, warehouse name, and capacity, plus validated survey fields.
- Current master warehouses are upserted by `(kode_pilok, kode_gudang)`; stored rows outside the current master remain untouched.
- Existing state is merged only into current master warehouse cards. Hidden stored rows do not participate in current form validation.
- Drive document metadata is verified server-side using the file ID.
- At most one parent submission is active per `kode_pilok`. Legacy
  `submission_gudang` rows may exist before that parent; they remain readable,
  and the next successful save creates the missing parent. Existing
  `created_at` is preserved and `updated_at` is server-generated.

## Obsolete migration

The previous `old_data` Jotform migration workflow is obsolete and has been removed. Legacy importing and document migration are not part of the current implementation.
