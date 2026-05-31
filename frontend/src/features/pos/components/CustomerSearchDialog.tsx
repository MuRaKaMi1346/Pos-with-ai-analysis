import { Search, Star, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateCustomer, useCustomerSearch } from '@/features/pos/api/customers'
import { cn } from '@/lib/utils'
import type { Customer } from '@/types/customer'

interface CustomerSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  onAttach: (customer: Customer | null) => void
}

/** Attach / change / clear the ticket's customer (spec §5.7). Fresh per open. */
export function CustomerSearchDialog({
  open,
  onOpenChange,
  customer,
  onAttach,
}: CustomerSearchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <CustomerSearchBody
          customer={customer}
          onAttach={(c) => {
            onAttach(c)
            onOpenChange(false)
          }}
        />
      )}
    </Dialog>
  )
}

function CustomerSearchBody({
  customer,
  onAttach,
}: {
  customer: Customer | null
  onAttach: (customer: Customer | null) => void
}) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const { data: results, isPending } = useCustomerSearch(query)

  return (
    <DialogContent className="flex max-h-[85vh] w-full max-w-md flex-col gap-3 overflow-hidden">
      <DialogHeader>
        <DialogTitle>ลูกค้า</DialogTitle>
        <DialogDescription className="sr-only">
          ค้นหาหรือเพิ่มลูกค้าเพื่อแนบกับบิล
        </DialogDescription>
      </DialogHeader>

      {customer && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-amber-900">{customer.name}</p>
            <p className="flex items-center gap-1 text-xs text-amber-700">
              <Star className="h-3 w-3 fill-current" />
              {customer.loyalty_points} แต้ม
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onAttach(null)
            }}
          >
            นำออก
          </Button>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
          placeholder="ค้นหาด้วยชื่อ / เบอร์โทร"
          aria-label="ค้นหาลูกค้า"
          className="h-11 w-full rounded-lg border border-stone-300 pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <button
          type="button"
          onClick={() => {
            onAttach(null)
          }}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-100"
        >
          ลูกค้าทั่วไป (Walk-in)
        </button>
        {isPending ? (
          <p className="py-6 text-center text-sm text-stone-400">กำลังค้นหา…</p>
        ) : results && results.length > 0 ? (
          <ul>
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onAttach(c)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-stone-100',
                    customer?.id === c.id && 'bg-amber-50',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-stone-800">{c.name}</span>
                    {c.phone && <span className="block text-xs text-stone-500">{c.phone}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-stone-500">
                    <Star className="h-3 w-3 fill-current" />
                    {c.loyalty_points}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : query ? (
          <p className="py-6 text-center text-sm text-stone-400">ไม่พบลูกค้า</p>
        ) : null}
      </div>

      {creating ? (
        <NewCustomerForm
          initialName={query}
          onCancel={() => {
            setCreating(false)
          }}
          onCreated={onAttach}
        />
      ) : (
        <Button
          variant="outline"
          onClick={() => {
            setCreating(true)
          }}
        >
          <UserPlus className="mr-2 h-4 w-4" /> เพิ่มลูกค้าใหม่
        </Button>
      )}
    </DialogContent>
  )
}

function NewCustomerForm({
  initialName,
  onCancel,
  onCreated,
}: {
  initialName: string
  onCancel: () => void
  onCreated: (customer: Customer) => void
}) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState('')
  const createCustomer = useCreateCustomer()

  async function submit(): Promise<void> {
    if (!name.trim()) return
    try {
      const created = await createCustomer.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || null,
      })
      onCreated(created)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'เพิ่มลูกค้าไม่สำเร็จ')
    }
  }

  const inputClass =
    'h-10 rounded-lg border border-stone-300 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500'

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-stone-200 p-3">
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value)
        }}
        placeholder="ชื่อ"
        aria-label="ชื่อลูกค้า"
        className={inputClass}
      />
      <input
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value)
        }}
        placeholder="เบอร์โทร (ไม่บังคับ)"
        aria-label="เบอร์โทรลูกค้า"
        className={inputClass}
      />
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button
          className="flex-1"
          disabled={!name.trim() || createCustomer.isPending}
          onClick={submit}
        >
          บันทึก
        </Button>
      </div>
    </div>
  )
}
