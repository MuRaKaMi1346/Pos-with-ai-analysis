import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon, Loader2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
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
  /** Uploads a picked image file and resolves to its stored URL. When omitted,
   *  the device picker is disabled and only the manual URL field is available. */
  onUploadImage?: (file: File) => Promise<string>
}

const FIELD = 'h-10'
const SELECT =
  'h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
const optStr = (v: string) => (v === '' ? null : v)
// "— ไม่มีหมวด —" (and any blank/invalid value) must become null, not 0 —
// the schema requires a positive id or null, and 0 silently blocks submit.
const catId = (v: string) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function ProductDialog({
  open,
  onOpenChange,
  initial,
  categories,
  onSubmit,
  isPending,
  onUploadImage,
}: Props) {
  const editing = initial !== undefined
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      category_id: null,
      price: 0,
      cost: 0,
      image: null,
      sku: null,
      barcode: null,
    },
  })

  const imageValue = useWatch({ control, name: 'image' })

  async function handleFile(file: File): Promise<void> {
    if (!onUploadImage) return
    setUploading(true)
    try {
      const url = await onUploadImage(file)
      setValue('image', url, { shouldDirty: true, shouldValidate: true })
    } catch {
      toast.error('อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setUploading(false)
    }
  }

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
              <select
                id="p-category"
                className={SELECT}
                {...register('category_id', { setValueAs: catId })}
              >
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
                <Input
                  id="p-price"
                  type="number"
                  step="0.01"
                  min={0}
                  className={FIELD}
                  {...register('price', { valueAsNumber: true })}
                />
                {errors.price && (
                  <p role="alert" className="text-xs text-[var(--color-danger)]">
                    {errors.price.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-cost">ต้นทุน (บาท)</Label>
                <Input
                  id="p-cost"
                  type="number"
                  step="0.01"
                  min={0}
                  className={FIELD}
                  {...register('cost', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="p-sku">SKU (ไม่บังคับ)</Label>
                <Input id="p-sku" className={FIELD} {...register('sku', { setValueAs: optStr })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-barcode">บาร์โค้ด (ไม่บังคับ)</Label>
                <Input
                  id="p-barcode"
                  className={FIELD}
                  {...register('barcode', { setValueAs: optStr })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>รูปภาพสินค้า (ไม่บังคับ)</Label>
              <div className="flex items-start gap-3">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-2">
                  {imageValue ? (
                    <>
                      <img
                        src={imageValue}
                        alt="ตัวอย่างรูปสินค้า"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        aria-label="ลบรูป"
                        onClick={() => {
                          setValue('image', null, { shouldDirty: true })
                        }}
                        className="absolute right-1 top-1 rounded-full bg-black/55 p-0.5 text-white hover:bg-black/75"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="h-6 w-6 text-text-muted" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    aria-label="ไฟล์รูปภาพ"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = '' // let the user re-pick the same file
                      if (file) void handleFile(file)
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading || !onUploadImage}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    เลือกรูปจากเครื่อง
                  </Button>
                  <Input
                    aria-label="URL รูปภาพ"
                    placeholder="หรือวาง URL รูปภาพ"
                    className={FIELD}
                    {...register('image', { setValueAs: optStr })}
                  />
                </div>
              </div>
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
