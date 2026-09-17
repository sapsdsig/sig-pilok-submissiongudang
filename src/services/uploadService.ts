import type { DriveDocumentReference } from '../types/domain'
import { ApiClientError, fetchJson } from './apiClient'

export type DocumentType = 'SHM' | 'BUKTI_SEWA'

interface UploadSession {
  uploadUrl: string
}

interface DriveUploadResponse {
  id?: string
  name?: string
  webViewLink?: string
}

export interface UploadRequest {
  kodePilok: string
  kodeGudang: string
  documentType: DocumentType
  file: File
}

export interface UploadService {
  uploadDocument(input: UploadRequest): Promise<DriveDocumentReference>
}

type UploadStep = 'upload-session' | 'drive-put' | 'drive-response'

function reportUploadError(error: ApiClientError, step: UploadStep) {
  if (!import.meta.env.DEV) return
  console.error('PDF upload error', {
    code: error.code,
    step,
    status: error.status,
    message: error.message,
  })
}

class GoogleDriveUploadService implements UploadService {
  async uploadDocument(input: UploadRequest): Promise<DriveDocumentReference> {
    let session: UploadSession
    try {
      session = await fetchJson<UploadSession>('/api/upload-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kodePilok: input.kodePilok,
          kodeGudang: input.kodeGudang,
          documentType: input.documentType,
          fileName: input.file.name,
          mimeType: input.file.type,
          size: input.file.size,
        }),
      })
    } catch (error) {
      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError(
              'Sesi upload Google Drive gagal dibuat.',
              'UPLOAD_SESSION_ERROR',
              0,
            )
      const classifiedError =
        apiError.code === 'APP_ORIGIN_NOT_ALLOWED' ||
        apiError.code === 'UPLOAD_SESSION_ERROR'
          ? apiError
          : new ApiClientError(
              apiError.message,
              'UPLOAD_SESSION_ERROR',
              apiError.status,
            )
      reportUploadError(classifiedError, 'upload-session')
      throw classifiedError
    }

    let response: Response
    try {
      response = await fetch(session.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: input.file,
      })
    } catch {
      const error = new ApiClientError(
        'Upload PDF ke Google Drive terputus. Silakan coba kembali.',
        'DRIVE_UPLOAD_NETWORK_ERROR',
        0,
      )
      reportUploadError(error, 'drive-put')
      throw error
    }

    if (!response.ok) {
      const error = new ApiClientError(
        'Upload PDF ke Google Drive gagal. Silakan coba kembali.',
        'DRIVE_UPLOAD_HTTP_ERROR',
        response.status,
      )
      reportUploadError(error, 'drive-put')
      throw error
    }

    let metadata: DriveUploadResponse
    try {
      metadata = (await response.json()) as DriveUploadResponse
    } catch {
      const error = new ApiClientError(
        'Respons upload Google Drive tidak dapat dibaca.',
        'DRIVE_UPLOAD_RESPONSE_ERROR',
        response.status,
      )
      reportUploadError(error, 'drive-response')
      throw error
    }
    if (!metadata.id || !metadata.name) {
      const error = new ApiClientError(
        'Google Drive tidak mengembalikan metadata dokumen yang lengkap.',
        'DRIVE_UPLOAD_RESPONSE_ERROR',
        502,
      )
      reportUploadError(error, 'drive-response')
      throw error
    }

    return {
      fileId: metadata.id,
      fileName: metadata.name,
      url:
        metadata.webViewLink ??
        `https://drive.google.com/file/d/${encodeURIComponent(metadata.id)}/view`,
    }
  }
}

export const uploadService: UploadService = new GoogleDriveUploadService()
