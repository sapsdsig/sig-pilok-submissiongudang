import { google } from 'googleapis'
import { ApiError } from './errors.js'
import { getGoogleAuth } from './googleAuth.js'

export interface SheetRow {
  rowNumber: number
  values: string[]
  record: Readonly<Record<string, string>>
}

export interface SheetTable {
  headers: string[]
  rows: SheetRow[]
}

const sheetsApi = () => google.sheets({ version: 'v4', auth: getGoogleAuth() })

export const quoteSheetName = (sheetName: string) =>
  `'${sheetName.replaceAll("'", "''")}'`

function columnName(index: number): string {
  let value = index + 1
  let result = ''
  while (value > 0) {
    const remainder = (value - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    value = Math.floor((value - 1) / 26)
  }
  return result
}

export async function readSheetTable(
  spreadsheetId: string,
  sheetName: string,
  requiredHeaders: readonly string[],
): Promise<SheetTable> {
  let response
  try {
    response = await sheetsApi().spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteSheetName(sheetName)}!A:Z`,
      valueRenderOption: 'FORMATTED_VALUE',
    })
  } catch (error) {
    const status = readGoogleErrorStatus(error)
    if (status === 400 || status === 403 || status === 404) {
      throw new ApiError(
        500,
        'GOOGLE_CONFIG_ERROR',
        `Spreadsheet atau sheet ${sheetName} tidak dapat diakses.`,
      )
    }
    throw error
  }
  const rawRows = response.data.values ?? []
  if (rawRows.length === 0) {
    throw new ApiError(
      500,
      'GOOGLE_CONFIG_ERROR',
      `Sheet ${sheetName} tidak memiliki baris header.`,
    )
  }

  const headers = (rawRows[0] ?? []).map((cell) => String(cell).trim())
  const duplicates = headers.filter(
    (header, index) => header && headers.indexOf(header) !== index,
  )
  if (duplicates.length > 0) {
    throw new ApiError(
      500,
      'GOOGLE_CONFIG_ERROR',
      `Sheet ${sheetName} memiliki header duplikat.`,
    )
  }

  const missing = requiredHeaders.filter((header) => !headers.includes(header))
  if (missing.length > 0) {
    throw new ApiError(
      500,
      'GOOGLE_CONFIG_ERROR',
      `Sheet ${sheetName} tidak memiliki header wajib: ${missing.join(', ')}.`,
    )
  }

  const rows = rawRows.slice(1).map((rawRow, index) => {
    const values = headers.map((_, columnIndex) =>
      String(rawRow[columnIndex] ?? '').trim(),
    )
    const record = Object.fromEntries(
      headers.map((header, columnIndex) => [header, values[columnIndex] ?? '']),
    )
    return { rowNumber: index + 2, values, record }
  })

  return { headers, rows }
}

function readGoogleErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined
  }
  const response = error.response
  if (
    typeof response !== 'object' ||
    response === null ||
    !('status' in response)
  ) {
    return undefined
  }
  return typeof response.status === 'number' ? response.status : undefined
}

export async function appendRows(
  spreadsheetId: string,
  sheetName: string,
  headers: readonly string[],
  records: readonly Readonly<Record<string, string>>[],
) {
  if (records.length === 0) return

  await sheetsApi().spreadsheets.values.append({
    spreadsheetId,
    range: `${quoteSheetName(sheetName)}!A:${columnName(headers.length - 1)}`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: records.map((record) =>
        headers.map((header) => record[header] ?? ''),
      ),
    },
  })
}

export async function updateRowFields(
  spreadsheetId: string,
  sheetName: string,
  headers: readonly string[],
  rowNumber: number,
  values: Readonly<Record<string, string>>,
) {
  const data = Object.entries(values).map(([header, value]) => {
    const columnIndex = headers.indexOf(header)
    if (columnIndex < 0) {
      throw new ApiError(
        500,
        'GOOGLE_CONFIG_ERROR',
        `Sheet ${sheetName} tidak memiliki header ${header}.`,
      )
    }
    return {
      range: `${quoteSheetName(sheetName)}!${columnName(columnIndex)}${rowNumber}`,
      values: [[value]],
    }
  })

  await sheetsApi().spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: 'RAW', data },
  })
}

export async function verifySheetAccess(
  spreadsheetId: string,
  sheetName: string,
  headers: readonly string[],
  exactHeaders = false,
) {
  const table = await readSheetTable(spreadsheetId, sheetName, headers)
  if (
    exactHeaders &&
    (table.headers.length !== headers.length ||
      table.headers.some((header, index) => header !== headers[index]))
  ) {
    throw new ApiError(
      500,
      'GOOGLE_CONFIG_ERROR',
      `Sheet ${sheetName} harus memiliki header persis: ${headers.join(', ')}.`,
    )
  }
}
