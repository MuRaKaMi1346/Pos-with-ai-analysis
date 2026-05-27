export type Role = 'admin' | 'staff'

export interface User {
  id: number
  username: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}
