import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ReceiptPreview } from '@/features/pos/components/ReceiptPreview'
import type { Receipt } from '@/types/receipt'

function makeReceipt(over: Partial<Receipt> = {}): Receipt {
  return {
    store: { name: 'SmartBrew', address: '123 Bangkok', tax_id: '1234567890123' },
    order_number: '20260531-0001',
    status: 'paid',
    channel: 'takeaway',
    table_number: null,
    cashier_name: 'admin',
    customer_name: null,
    created_at: '2026-05-31T03:00:00Z',
    closed_at: '2026-05-31T03:05:00Z',
    currency: 'THB',
    lines: [
      {
        product_name: 'Latte',
        qty: 2,
        unit_price: '65.00',
        modifiers: [{ name: 'Extra shot', price_delta: '10.00' }],
        line_total: '150.00',
      },
    ],
    subtotal: '150.00',
    discount_total: '0.00',
    service_charge: '0.00',
    service_charge_rate: '0.00',
    tax_total: '9.81',
    tax_rate: '0.07',
    tax_inclusive: true,
    tip_total: '0.00',
    rounding_adjustment: '0.00',
    total: '150.00',
    paid_total: '200.00',
    change_due: '50.00',
    payments: [{ method: 'cash', amount: '150.00', reference: null, tendered_amount: '200.00' }],
    footer: 'ขอบคุณที่ใช้บริการ',
    ...over,
  }
}

describe('ReceiptPreview', () => {
  it('renders the store header, lines, modifiers, total, and footer', () => {
    render(<ReceiptPreview receipt={makeReceipt()} />)
    expect(screen.getByText('SmartBrew')).toBeInTheDocument()
    expect(screen.getByText(/Latte/)).toBeInTheDocument()
    expect(screen.getByText(/Extra shot/)).toBeInTheDocument()
    expect(screen.getByText('รวมทั้งสิ้น')).toBeInTheDocument()
    expect(screen.getAllByText(/150\.00/).length).toBeGreaterThan(0)
    expect(screen.getByText('เงินทอน')).toBeInTheDocument()
    expect(screen.getByText('ขอบคุณที่ใช้บริการ')).toBeInTheDocument()
  })

  it('omits the discount + change rows when they are zero', () => {
    render(<ReceiptPreview receipt={makeReceipt({ discount_total: '0.00', change_due: '0.00' })} />)
    expect(screen.queryByText('ส่วนลด')).not.toBeInTheDocument()
    expect(screen.queryByText('เงินทอน')).not.toBeInTheDocument()
  })
})
