import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { AuditLog } from '@/types/audit'

export const auditKey = ['admin', 'audit-logs'] as const

export interface AuditFilter {
  entityType?: string
  action?: string
  limit?: number
}

/** Most-recent-first audit trail, with optional entity/action filters. */
export function useAuditLogs(filter: AuditFilter = {}) {
  return useQuery({
    queryKey: [...auditKey, filter] as const,
    queryFn: async () => {
      const res = await apiClient.get<AuditLog[]>('/audit-logs/', {
        params: {
          entity_type: filter.entityType || undefined,
          action: filter.action || undefined,
          limit: filter.limit ?? 100,
        },
      })
      return res.data
    },
  })
}
