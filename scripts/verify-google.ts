import 'dotenv/config'
import { getDriveFolderId } from '../api/_lib/env.js'
import { verifyDriveFolder } from '../api/_lib/drive.js'
import { getGoogleAccessToken } from '../api/_lib/googleAuth.js'
import {
  PILOK_HEADERS,
  WAREHOUSE_HEADERS,
} from '../api/_lib/masterData.js'
import {
  getPilokSheetConfig,
  getSubmissionSheetConfig,
  getWarehouseSheetConfig,
} from '../api/_lib/env.js'
import {
  SUBMISSION_HEADERS,
  SUBMISSION_WAREHOUSE_HEADERS,
} from '../api/_lib/submissions.js'
import { verifySheetAccess } from '../api/_lib/sheets.js'

async function verify() {
  process.stdout.write('Checking Google OAuth... ')
  await getGoogleAccessToken()
  console.log('OK')

  const pilok = getPilokSheetConfig()
  process.stdout.write('Checking PILOK master sheet and headers... ')
  await verifySheetAccess(pilok.spreadsheetId, pilok.sheetName, PILOK_HEADERS)
  console.log('OK')

  const warehouse = getWarehouseSheetConfig()
  process.stdout.write(
    'Checking PILOK-scoped warehouse master sheet and headers... ',
  )
  await verifySheetAccess(
    warehouse.spreadsheetId,
    warehouse.sheetName,
    WAREHOUSE_HEADERS,
  )
  console.log('OK')

  const submissions = getSubmissionSheetConfig()
  process.stdout.write('Checking submissions sheet and headers... ')
  await verifySheetAccess(
    submissions.spreadsheetId,
    submissions.submissionSheetName,
    SUBMISSION_HEADERS,
  )
  console.log('OK')

  process.stdout.write(
    'Checking submission_gudang snapshot sheet and headers... ',
  )
  await verifySheetAccess(
    submissions.spreadsheetId,
    submissions.warehouseSheetName,
    SUBMISSION_WAREHOUSE_HEADERS,
  )
  console.log('OK')

  process.stdout.write('Checking SHM Drive folder... ')
  await verifyDriveFolder(getDriveFolderId('SHM'))
  console.log('OK')

  process.stdout.write('Checking Bukti Sewa Drive folder... ')
  await verifyDriveFolder(getDriveFolderId('BUKTI_SEWA'))
  console.log('OK')

  console.log('Google configuration verification completed without writes.')
}

verify().catch((error: unknown) => {
  console.error(
    'Google verification failed:',
    error instanceof Error ? error.message : 'Unknown error',
  )
  process.exitCode = 1
})
