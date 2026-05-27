/**
 * Shared axios client used by every TanStack Query hook.
 *
 * Two interceptors:
 *   request: attach the in-memory access token from authStore
 *   response: on 401, try /auth/refresh exactly once (deduped across concurrent
 *             requests), update the token, and replay the original request.
 *             If refresh fails, the auth store is cleared so the user is
 *             bounced back to /login by the ProtectedRoute guard.
 */

import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'

import { useAuthStore } from '@/features/auth/stores/authStore'

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type RetryableConfig = AxiosRequestConfig & { _retry?: boolean }

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ access_token: string }>('/api/v1/auth/refresh', null, { withCredentials: true })
      .then((res) => {
        const token = res.data.access_token
        useAuthStore.getState().setAccessToken(token)
        return token
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    // Don't try to refresh if this very call IS the refresh / login endpoint
    const url = original.url ?? ''
    if (url.endsWith('/auth/refresh') || url.endsWith('/auth/login')) {
      return Promise.reject(error)
    }
    original._retry = true
    try {
      const newToken = await refreshAccessToken()
      original.headers = {
        ...(original.headers ?? {}),
        Authorization: `Bearer ${newToken}`,
      }
      return apiClient.request(original)
    } catch (refreshErr) {
      useAuthStore.getState().clear()
      return Promise.reject(refreshErr)
    }
  },
)
