import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ShortcutsDialog } from '@/features/pos/components/ShortcutsDialog'

describe('ShortcutsDialog', () => {
  it('lists the shortcuts when open', () => {
    render(<ShortcutsDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByText('คีย์ลัด')).toBeInTheDocument()
    expect(screen.getByText('ชำระเงิน')).toBeInTheDocument()
    expect(screen.getByText('F9')).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    render(<ShortcutsDialog open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByText('คีย์ลัด')).not.toBeInTheDocument()
  })
})
