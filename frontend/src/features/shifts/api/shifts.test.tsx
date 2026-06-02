import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import {
  currentShiftKey,
  useCloseShift,
  useCurrentShift,
  useOpenShift,
} from '@/features/shifts/api/shifts'
import { apiClient } from '@/lib/api/client'
import type { Shift } from '@/types/shift'

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}))

const get = apiClient.get as unknown as Mock
const post = apiClient.post as unknown as Mock

function makeShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: 1,
    user_id: 1,
    opening_float: '1000.00',
    closing_cash_counted: null,
    expected_cash: null,
    cash_variance: null,
    closing_note: null,
    opened_at: '2026-06-02T00:00:00Z',
    closed_at: null,
    is_open: true,
    ...overrides,
  }
}

/** A fresh client per test so cached shift state never leaks between cases. */
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
  return { qc, Wrapper }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCurrentShift', () => {
  it('maps a backend 404 to null (no shift open)', async () => {
    get.mockRejectedValue({ response: { status: 404 } })
    const { Wrapper } = makeWrapper()

    const { result } = renderHook(() => useCurrentShift(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data).toBeNull()
  })
})

describe('useOpenShift', () => {
  it('primes the current-shift cache so the gate sees the open shift immediately', async () => {
    const shift = makeShift({ id: 7, is_open: true })
    post.mockResolvedValue({ data: shift })
    const { qc, Wrapper } = makeWrapper()

    const { result } = renderHook(() => useOpenShift(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync(1000)
    })

    expect(post).toHaveBeenCalledWith('/shifts/open', { opening_float: '1000.00' })
    expect(qc.getQueryData(currentShiftKey)).toEqual(shift)
  })
})

describe('useCloseShift', () => {
  it('clears the current-shift cache to null so the gate re-locks the POS', async () => {
    const closed = makeShift({ id: 7, is_open: false, closing_cash_counted: '500.00' })
    post.mockResolvedValue({ data: closed })
    const { qc, Wrapper } = makeWrapper()
    // A stale open shift in cache must not keep the POS unlocked after closing.
    qc.setQueryData(currentShiftKey, makeShift({ id: 7, is_open: true }))

    const { result } = renderHook(() => useCloseShift(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({ closing_cash_counted: 500 })
    })

    expect(post).toHaveBeenCalledWith('/shifts/close', {
      closing_cash_counted: '500.00',
      closing_note: null,
    })
    expect(qc.getQueryData(currentShiftKey)).toBeNull()
  })
})
