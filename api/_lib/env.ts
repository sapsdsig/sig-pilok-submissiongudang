import { ApiError } from './errors.js'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new ApiError(
      500,
      'GOOGLE_CONFIG_ERROR',
      `Konfigurasi server ${name} belum tersedia.`,
    )
  }
  return value
}

export function getGoogleOAuthConfig() {
  return {
    clientId: required('GOOGLE_CLIENT_ID'),
    clientSecret: required('GOOGLE_CLIENT_SECRET'),
    refreshToken: required('GOOGLE_REFRESH_TOKEN'),
  }
}

export function getPilokSheetConfig() {
  return {
    spreadsheetId: required('GOOGLE_PILOK_SPREADSHEET_ID'),
    sheetName: required('GOOGLE_PILOK_SHEET_NAME'),
  }
}

export function getWarehouseSheetConfig() {
  return {
    spreadsheetId: required('GOOGLE_WAREHOUSE_SPREADSHEET_ID'),
    sheetName: required('GOOGLE_WAREHOUSE_SHEET_NAME'),
  }
}

export function getSubmissionSheetConfig() {
  return {
    spreadsheetId: required('GOOGLE_SUBMISSION_SPREADSHEET_ID'),
    submissionSheetName: required('GOOGLE_SUBMISSIONS_SHEET_NAME'),
    warehouseSheetName: required(
      'GOOGLE_SUBMISSION_WAREHOUSE_SHEET_NAME',
    ),
  }
}

export function getDriveFolderId(documentType: 'SHM' | 'BUKTI_SEWA') {
  return documentType === 'SHM'
    ? required('GOOGLE_DRIVE_SHM_FOLDER_ID')
    : required('GOOGLE_DRIVE_SEWA_FOLDER_ID')
}
