import { Navigate, createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { AdminRoute } from '@/features/auth/components/AdminRoute'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { PosPage } from '@/features/pos/PosPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/pos" replace /> },
          { path: 'pos', element: <PosPage /> },
          {
            element: <AdminRoute />,
            children: [{ path: 'dashboard', element: <DashboardPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
