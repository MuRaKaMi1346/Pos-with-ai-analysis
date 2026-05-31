import { QueryClientProvider } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'

import { queryClient } from '@/app/queryClient'

/** Default toast icons — lucide, mapped per sonner level (pos-ui-motion §4.11). */
const toastIcons = {
  success: <CheckCircle2 className="h-5 w-5" />,
  error: <XCircle className="h-5 w-5" />,
  warning: <AlertCircle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" richColors icons={toastIcons} />
    </QueryClientProvider>
  )
}
