export interface AuditLog {
  id: number
  user_id: number | null
  action: string
  entity_type: string
  entity_id: number
  /** Raw JSON snapshot of the change, if recorded. */
  payload_json: string | null
  ip_address: string | null
  created_at: string
}
