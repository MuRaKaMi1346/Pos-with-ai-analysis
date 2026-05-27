/**
 * Auth API calls — use *raw* axios (not the shared apiClient) so they don't
 * trigger the 401-refresh interceptor loop and so authStore can stay free
 * of imports from lib/api/client.
 */

import axios from 'axios'

import type { TokenResponse, User } from '@/types/auth'

export async function login(username: string, password: string): Promise<string> {
  const form = new URLSearchParams()
  form.set('username', username)
  form.set('password', password)
  const res = await axios.post<TokenResponse>('/api/v1/auth/login', form, {
    withCredentials: true,
  })
  return res.data.access_token
}

export async function logoutRequest(): Promise<void> {
  await axios.post('/api/v1/auth/logout', null, { withCredentials: true })
}

export async function refresh(): Promise<string> {
  const res = await axios.post<TokenResponse>('/api/v1/auth/refresh', null, {
    withCredentials: true,
  })
  return res.data.access_token
}

export async function getMe(accessToken: string): Promise<User> {
  const res = await axios.get<User>('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
    withCredentials: true,
  })
  return res.data
}
