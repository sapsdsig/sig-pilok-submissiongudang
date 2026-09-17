import { google } from 'googleapis'
import { getGoogleOAuthConfig } from './env.js'

function createGoogleAuth() {
  const config = getGoogleOAuthConfig()
  const client = new google.auth.OAuth2({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  })
  client.setCredentials({ refresh_token: config.refreshToken })
  return client
}

let googleAuth: ReturnType<typeof createGoogleAuth> | undefined

export function getGoogleAuth() {
  googleAuth ??= createGoogleAuth()
  return googleAuth
}

export async function getGoogleAccessToken(): Promise<string> {
  const token = await getGoogleAuth().getAccessToken()
  if (!token.token) throw new Error('Google access token was not returned.')
  return token.token
}
