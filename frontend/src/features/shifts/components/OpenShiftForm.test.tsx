import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useOpenShift } from '@/features/shifts/api/shifts'
import { OpenShiftForm } from '@/features/shifts/components/OpenShiftForm'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/shifts/api/shifts', () => ({ useOpenShift: vi.fn() }))

const mutateAsync = vi.fn()

beforeEach(() => {
  mutateAsync.mockReset()
  vi.mocked(useOpenShift).mockReturnValue({
    mutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useOpenShift>)
})

describe('OpenShiftForm', () => {
  it('keeps the button disabled until a float is entered', () => {
    render(<OpenShiftForm onOpened={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'เปิดกะ' })).toBeDisabled()
  })

  it('opens a shift with the entered float, then calls onOpened', async () => {
    mutateAsync.mockResolvedValue({ id: 1, is_open: true })
    const onOpened = vi.fn()
    render(<OpenShiftForm onOpened={onOpened} />)
    await userEvent.type(screen.getByLabelText('เงินตั้งต้น'), '1000')
    await userEvent.click(screen.getByRole('button', { name: 'เปิดกะ' }))
    expect(mutateAsync).toHaveBeenCalledWith(1000)
    await waitFor(() => {
      expect(onOpened).toHaveBeenCalled()
    })
  })
})
