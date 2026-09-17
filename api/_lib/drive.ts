import { randomBytes } from 'node:crypto'
import { google } from 'googleapis'
import type { DriveDocumentReference } from '../../src/types/domain.js'
import { getDriveFolderId } from './env.js'
import { ApiError } from './errors.js'
import { getGoogleAccessToken, getGoogleAuth } from './googleAuth.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const driveApi = () => google.drive({ version: 'v3', auth: getGoogleAuth() })

const sanitizeCode = (code: string) =>
  code.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 50)

export function createStoredFileName(
  kodePilok: string,
  kodeGudang: string,
  documentType: 'SHM' | 'BUKTI_SEWA',
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const shortId = randomBytes(4).toString('hex')
  const typeLabel = documentType === 'SHM' ? 'SHM' : 'BUKTI-SEWA'
  return `PILOK-${sanitizeCode(kodePilok)}__GUDANG-${sanitizeCode(kodeGudang)}__${typeLabel}__${timestamp}-${shortId}.pdf`
}

export async function createResumableUploadSession(input: {
  kodePilok: string
  kodeGudang: string
  documentType: 'SHM' | 'BUKTI_SEWA'
  size: number
  origin: string
}) {
  const folderId = getDriveFolderId(input.documentType)
  const storedFileName = createStoredFileName(
    input.kodePilok,
    input.kodeGudang,
    input.documentType,
  )
  const accessToken = await getGoogleAccessToken()
  const url = new URL('https://www.googleapis.com/upload/drive/v3/files')
  url.searchParams.set('uploadType', 'resumable')
  url.searchParams.set('fields', 'id,name,webViewLink')
  url.searchParams.set('supportsAllDrives', 'true')

  let googleResponse: Response
  try {
    googleResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/pdf',
        'X-Upload-Content-Length': String(input.size),
        Origin: input.origin,
      },
      body: JSON.stringify({
        name: storedFileName,
        mimeType: 'application/pdf',
        parents: [folderId],
        appProperties: {
          kodePilok: input.kodePilok,
          kodeGudang: input.kodeGudang,
          documentType: input.documentType,
        },
      }),
    })
  } catch {
    throw new ApiError(
      502,
      'UPLOAD_SESSION_ERROR',
      'Tidak dapat menghubungi Google Drive untuk membuat sesi upload.',
    )
  }

  const uploadUrl = googleResponse.headers.get('location')
  if (!googleResponse.ok || !uploadUrl) {
    throw new ApiError(
      502,
      'UPLOAD_SESSION_ERROR',
      'Sesi upload Google Drive gagal dibuat.',
    )
  }

  return { uploadUrl, storedFileName }
}

export async function verifyDriveDocument(
  fileId: string,
  documentType: 'SHM' | 'BUKTI_SEWA',
): Promise<DriveDocumentReference> {
  const expectedFolderId = getDriveFolderId(documentType)
  let metadata
  try {
    metadata = await driveApi().files.get({
      fileId,
      fields: 'id,name,webViewLink,mimeType,size,parents,trashed',
      supportsAllDrives: true,
    })
  } catch {
    throw new ApiError(
      400,
      'DOCUMENT_INVALID',
      'Dokumen Google Drive tidak ditemukan atau tidak dapat diakses.',
    )
  }

  const file = metadata.data
  const size = Number(file.size)
  if (
    !file.id ||
    !file.name ||
    file.trashed ||
    file.mimeType !== 'application/pdf' ||
    !Number.isFinite(size) ||
    size <= 0 ||
    size > MAX_FILE_SIZE ||
    !file.parents?.includes(expectedFolderId)
  ) {
    throw new ApiError(
      400,
      'DOCUMENT_INVALID',
      'Dokumen tidak valid atau tidak berada di folder Drive yang sesuai.',
    )
  }

  return {
    fileId: file.id,
    fileName: file.name,
    url:
      file.webViewLink ??
      `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`,
  }
}

export async function verifyDriveFolder(folderId: string) {
  let response
  try {
    response = await driveApi().files.get({
      fileId: folderId,
      fields: 'id,name,mimeType,trashed,capabilities(canAddChildren)',
      supportsAllDrives: true,
    })
  } catch {
    throw new ApiError(
      500,
      'GOOGLE_CONFIG_ERROR',
      'Drive folder yang dikonfigurasi tidak dapat diakses.',
    )
  }
  if (
    !response.data.id ||
    response.data.trashed ||
    response.data.mimeType !== 'application/vnd.google-apps.folder' ||
    response.data.capabilities?.canAddChildren !== true
  ) {
    throw new ApiError(
      500,
      'GOOGLE_CONFIG_ERROR',
      'Drive folder yang dikonfigurasi tidak valid.',
    )
  }
  return response.data.name ?? folderId
}
