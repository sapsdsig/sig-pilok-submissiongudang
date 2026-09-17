import type { IncomingMessage, ServerResponse } from 'node:http'

export interface ApiRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>
  body: unknown
}

export interface ApiResponse extends ServerResponse {
  status(statusCode: number): ApiResponse
  json(body: unknown): ApiResponse
}
