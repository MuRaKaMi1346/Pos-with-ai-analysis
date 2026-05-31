import { Navigate, createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { AiInsightsPage } from '@/features/ai-insights/AiInsightsPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { AdminRoute } from '@/features/auth/components/AdminRoute'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { PosPage } from '@/features/pos/PosPage'
import { ShiftPage } from '@/features/shifts/ShiftPage'
import { ShiftGate } from '@/features/shifts/components/ShiftGate'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/pos" replace /> },
          { path: 'shift', element: <ShiftPage /> },
          {
            element: <ShiftGate />,
            children: [{ path: 'pos', element: <PosPage /> }],
          },
          {
            element: <AdminRoute />,
            children: [
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'ai-insights', element: <AiInsightsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
