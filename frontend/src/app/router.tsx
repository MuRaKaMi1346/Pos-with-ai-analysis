import { Navigate, createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { AdminLayout } from '@/features/admin/AdminLayout'
import { AuditPage } from '@/features/admin/AuditPage'
import { CashDrawerPage } from '@/features/admin/CashDrawerPage'
import { DiscountsPage } from '@/features/admin/DiscountsPage'
import { IngredientsPage } from '@/features/admin/IngredientsPage'
import { InventoryPage } from '@/features/admin/InventoryPage'
import { ModifierGroupsPage } from '@/features/admin/ModifierGroupsPage'
import { ProductsPage } from '@/features/admin/ProductsPage'
import { RecipesPage } from '@/features/admin/RecipesPage'
import { RefundsPage } from '@/features/admin/RefundsPage'
import { SettingsPage } from '@/features/admin/SettingsPage'
import { AiInsightsPage } from '@/features/ai-insights/AiInsightsPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { AdminRoute } from '@/features/auth/components/AdminRoute'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { KdsPage } from '@/features/kds/KdsPage'
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
          { path: 'kds', element: <KdsPage /> },
          {
            element: <ShiftGate />,
            children: [{ path: 'pos', element: <PosPage /> }],
          },
          {
            element: <AdminRoute />,
            children: [
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'ai-insights', element: <AiInsightsPage /> },
              {
                path: 'admin',
                element: <AdminLayout />,
                children: [
                  { index: true, element: <Navigate to="/admin/products" replace /> },
                  { path: 'products', element: <ProductsPage /> },
                  { path: 'ingredients', element: <IngredientsPage /> },
                  { path: 'recipes', element: <RecipesPage /> },
                  { path: 'inventory', element: <InventoryPage /> },
                  { path: 'discounts', element: <DiscountsPage /> },
                  { path: 'modifiers', element: <ModifierGroupsPage /> },
                  { path: 'cash-drawer', element: <CashDrawerPage /> },
                  { path: 'refunds', element: <RefundsPage /> },
                  { path: 'audit', element: <AuditPage /> },
                  { path: 'settings', element: <SettingsPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
