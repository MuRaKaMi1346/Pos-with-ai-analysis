import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/admin/api/audit', () => ({
  useAuditLogs: () => ({
    data: [
      {
        id: 1,
        user_id: 2,
        action: 'order.void',
        entity_type: 'order',
        entity_id: 42,
        payload_json: null,
        ip_address: '127.0.0.1',
        created_at: '2026-05-01T03:00:00Z',
      },
    ],
    isPending: false,
  }),
}))

import { AuditPage } from '@/features/admin/AuditPage'

describe('AuditPage', () => {
  it('renders audit rows with action and entity', () => {
    render(<AuditPage />)
    expect(screen.getByText('order.void')).toBeInTheDocument()
    expect(screen.getByText('order #42')).toBeInTheDocument()
  })
})
