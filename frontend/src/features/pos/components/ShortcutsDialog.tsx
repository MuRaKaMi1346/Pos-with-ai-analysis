import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: '/', action: 'โฟกัสช่องค้นหา' },
  { keys: 'Ctrl / ⌘ + K', action: 'ค้นหาเมนู / สแกนบาร์โค้ด' },
  { keys: 'F2', action: 'แนบลูกค้า' },
  { keys: 'F4', action: 'สลับช่องทางการขาย' },
  { keys: 'F8', action: 'พักบิล' },
  { keys: 'F9', action: 'ชำระเงิน' },
  { keys: 'Esc', action: 'ปิดหน้าต่าง / ล้างการค้นหา' },
]

/** `?` cheatsheet for the POS keyboard shortcuts (spec §5.14). */
export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>คีย์ลัด</DialogTitle>
            <DialogDescription className="sr-only">รายการแป้นพิมพ์ลัดของหน้าขาย</DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-1 text-sm">
            {SHORTCUTS.map((s) => (
              <li key={s.keys} className="flex items-center justify-between gap-3 py-1">
                <span className="text-text-muted">{s.action}</span>
                <kbd className="rounded border border-border bg-surface-2 px-2 py-0.5 font-mono text-xs text-text">
                  {s.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </DialogContent>
      )}
    </Dialog>
  )
}
