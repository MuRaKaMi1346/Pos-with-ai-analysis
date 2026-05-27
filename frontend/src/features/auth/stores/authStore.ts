/**
 * In-memory auth state.
 *
 * The access token lives ONLY here (never localStorage — XSS surface).
 * The refresh token is in an httpOnly cookie controlled by the backend.
 */

import { create } from 'zustand'

import type { User } from '@/types/auth'

interface AuthState {
  accessToken: string | null
  user: User | null
  setAccessToken: (token: string | null) => void
  setUser: (user: User | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (accessToken) => {
    set({ accessToken })
  },
  setUser: (user) => {
    set({ user })
  },
  clear: () => {
    set({ accessToken: null, user: null })
  },
}))
