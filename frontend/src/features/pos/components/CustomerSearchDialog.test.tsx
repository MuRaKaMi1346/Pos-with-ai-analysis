import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCreateCustomer, useCustomerSearch } from '@/features/pos/api/customers'
import { CustomerSearchDialog } from '@/features/pos/components/CustomerSearchDialog'
import type { Customer } from '@/types/customer'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/pos/api/customers', () => ({
  useCustomerSearch: vi.fn(),
  useCreateCustomer: vi.fn(),
}))

const ann: Customer = {
  id: 1,
  code: 'C00001',
  name: 'Ann',
  phone: '0801112222',
  loyalty_points: 120,
  pending_redemption_baht: '0.00',
}

const createMutate = vi.fn()

beforeEach(() => {
  createMutate.mockReset()
  vi.mocked(useCustomerSearch).mockReturnValue({
    data: [ann],
    isPending: false,
  } as unknown as ReturnType<typeof useCustomerSearch>)
  vi.mocked(useCreateCustomer).mockReturnValue({
    mutateAsync: createMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateCustomer>)
})

function setup(over: Partial<Parameters<typeof CustomerSearchDialog>[0]> = {}) {
  const onAttach = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <CustomerSearchDialog
      open
      onOpenChange={onOpenChange}
      customer={null}
      onAttach={onAttach}
      {...over}
    />,
  )
  return { onAttach, onOpenChange }
}

describe('CustomerSearchDialog', () => {
  it('attaches a searched customer on tap', async () => {
    const { onAttach } = setup()
    await userEvent.click(screen.getByRole('button', { name: /Ann/ }))
    expect(onAttach).toHaveBeenCalledWith(ann)
  })

  it('attaches null (walk-in) from the walk-in option', async () => {
    const { onAttach } = setup()
    await userEvent.click(screen.getByRole('button', { name: /Walk-in/ }))
    expect(onAttach).toHaveBeenCalledWith(null)
  })

  it('creates a new customer and attaches it', async () => {
    const created: Customer = { ...ann, id: 9, name: 'Bob' }
    createMutate.mockResolvedValue(created)
    const { onAttach } = setup()
    await userEvent.click(screen.getByRole('button', { name: /เพิ่มลูกค้าใหม่/ }))
    await userEvent.type(screen.getByLabelText('ชื่อลูกค้า'), 'Bob')
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }))
    expect(createMutate).toHaveBeenCalledWith({ name: 'Bob', phone: null })
    await waitFor(() => {
      expect(onAttach).toHaveBeenCalledWith(created)
    })
  })

  it('shows the attached customer with a remove action', () => {
    setup({ customer: ann })
    expect(screen.getByText(/120 แต้ม/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'นำออก' })).toBeInTheDocument()
  })
})
