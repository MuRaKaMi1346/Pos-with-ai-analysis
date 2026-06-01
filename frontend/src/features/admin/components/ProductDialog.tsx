import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProductInput } from '@/features/admin/api/products'
import type { Category, Product } from '@/types/product'

const schema = z.object({
  name: z.string().min(1, 'จำเป็นต้องใส่ชื่อ').max(120),
  category_id: z.number().int().positive().nullable(),
  price: z.number().min(0, 'ต้องไม่ติดลบ'),
  cost: z.number().min(0, 'ต้องไม่ติดลบ'),
  image: z.string().max(512).nullable(),
  sku: z.string().max(64).nullable(),
  barcode: z.string().max(64).nullable(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Product
  categories: Category[]
  onSubmit: (values: ProductInput) => void
  isPending?: boolean
}

const FIELD = 'h-10'
const SELECT =
  'h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
const optStr = (v: string) => (v === '' ? null : v)
const catId = (v: string) => (v === '' ? null : Number(v))

export function ProductDialog({ open, onOpenChange, initial, categories, onSubmit, isPending }: Props) {
  const editing = initial !== undefined
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', category_id: null, price: 0, cost: 0, image: null, sku: null, barcode: null },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: initial?.name ?? '',
        category_id: initial?.category_id ?? null,
        price: initial ? Number(initial.price) : 0,
        cost: initial ? Number(initial.cost) : 0,
        image: initial?.image ?? null,
        sku: initial?.sku ?? null,
        barcode: initial?.barcode ?? null,
      })
    }
  }, [open, initial, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}</DialogTitle>
            <DialogDescription>ชื่อ หมวด ราคา ต้นทุน และรหัสสแกน</DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((v) => {
              onSubmit(v)
            })}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="p-name">ชื่อสินค้า</Label>
              <Input id="p-name" autoFocus className={FIELD} {...register('name')} />
              {errors.name && (
                <p role="alert" className="text-xs text-[var(--color-danger)]">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-category">หมวด</Label>
              <select id="p-category" className={SELECT} {...register('category_id', { setValueAs: catId })}>
                <option value="">— ไม่มีหมวด —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="p-price">ราคาขาย (บาท)</Label>
                <Input id="p-price" type="number" step="0.01" min={0} className={FIELD} {...register('price', { valueAsNumber: true })} />
                {errors.price && (
                  <p role="alert" className="text-xs text-[var(--color-danger)]">
                    {errors.price.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-cost">ต้นทุน (บาท)</Label>
                <Input id="p-cost" type="number" step="0.01" min={0} className={FIELD} {...register('cost', { valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="p-sku">SKU (ไม่บังคับ)</Label>
                <Input id="p-sku" className={FIELD} {...register('sku', { setValueAs: optStr })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-barcode">บาร์โค้ด (ไม่บังคับ)</Label>
                <Input id="p-barcode" className={FIELD} {...register('barcode', { setValueAs: optStr })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-image">URL รูปภาพ (ไม่บังคับ)</Label>
              <Input id="p-image" className={FIELD} {...register('image', { setValueAs: optStr })} />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                }}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'บันทึก' : 'เพิ่ม'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}
