import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type SettingsFormInput, useUpdateSettings } from '@/features/admin/api/settings'
import { useSettings } from '@/features/pos/api/settings'

const CHANNEL_LABELS: Record<string, string> = {
  dine_in: 'ทานที่ร้าน',
  takeaway: 'กลับบ้าน',
  delivery: 'เดลิเวอรี่',
}

const schema = z.object({
  store_name: z.string().min(1, 'จำเป็นต้องใส่ชื่อร้าน').max(120),
  store_address: z.string().nullable(),
  store_tax_id: z.string().nullable(),
  currency: z.string().min(1).max(8),
  vat_rate: z.number().min(0).max(1),
  tax_inclusive: z.boolean(),
  service_charge_rate: z.number().min(0).max(1),
  service_charge_before_vat: z.boolean(),
  rounding_mode: z.enum(['TWO_DECIMALS', 'NEAREST_BAHT']),
  default_channel: z.enum(['dine_in', 'takeaway', 'delivery']),
  loyalty_baht_per_earn_point: z.number().gt(0),
  loyalty_baht_per_redeem_point: z.number().gt(0),
  receipt_footer: z.string().nullable(),
  receipt_pdf_enabled: z.boolean(),
  printer_name: z.string().nullable(),
})

const INPUT = 'h-10'
const SELECT =
  'h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
const optStr = (v: string) => (v === '' ? null : v)

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-text">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

export function SettingsPage() {
  const { data, isPending } = useSettings()
  const update = useUpdateSettings()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormInput>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (data) {
      reset({
        store_name: data.store_name,
        store_address: data.store_address,
        store_tax_id: data.store_tax_id,
        currency: data.currency,
        vat_rate: Number(data.vat_rate),
        tax_inclusive: data.tax_inclusive,
        service_charge_rate: Number(data.service_charge_rate),
        service_charge_before_vat: data.service_charge_before_vat,
        rounding_mode: data.rounding_mode,
        default_channel: data.default_channel,
        loyalty_baht_per_earn_point: Number(data.loyalty_baht_per_earn_point),
        loyalty_baht_per_redeem_point: Number(data.loyalty_baht_per_redeem_point),
        receipt_footer: data.receipt_footer,
        receipt_pdf_enabled: data.receipt_pdf_enabled,
        printer_name: data.printer_name,
      })
    }
  }, [data, reset])

  async function onSubmit(values: SettingsFormInput): Promise<void> {
    try {
      await update.mutateAsync(values)
      toast.success('บันทึกการตั้งค่าแล้ว')
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    }
  }

  if (isPending || !data) {
    return <p className="p-6 text-sm text-text-muted">กำลังโหลด…</p>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6" noValidate>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">ตั้งค่าร้าน</h1>
          <p className="text-sm text-text-muted">ข้อมูลร้าน ภาษี ค่าบริการ สมาชิก และใบเสร็จ</p>
        </div>
        <Button type="submit" disabled={update.isPending || !isDirty}>
          {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          บันทึก
        </Button>
      </header>

      <Section title="ข้อมูลร้าน">
        <div className="space-y-2">
          <Label htmlFor="s-name">ชื่อร้าน</Label>
          <Input id="s-name" className={INPUT} {...register('store_name')} />
          {errors.store_name && (
            <p role="alert" className="text-xs text-[var(--color-danger)]">
              {errors.store_name.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-currency">สกุลเงิน</Label>
          <Input id="s-currency" className={INPUT} {...register('currency')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-address">ที่อยู่</Label>
          <Input id="s-address" className={INPUT} {...register('store_address', { setValueAs: optStr })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-taxid">เลขผู้เสียภาษี</Label>
          <Input id="s-taxid" className={INPUT} {...register('store_tax_id', { setValueAs: optStr })} />
        </div>
      </Section>

      <Section title="ภาษีและค่าบริการ">
        <div className="space-y-2">
          <Label htmlFor="s-vat">VAT (ทศนิยม เช่น 0.07 = 7%)</Label>
          <Input id="s-vat" type="number" step="0.0001" min={0} max={1} className={INPUT} {...register('vat_rate', { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-svc">ค่าบริการ (ทศนิยม เช่น 0.1 = 10%)</Label>
          <Input id="s-svc" type="number" step="0.0001" min={0} max={1} className={INPUT} {...register('service_charge_rate', { valueAsNumber: true })} />
        </div>
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" className="h-4 w-4 accent-[var(--color-primary)]" {...register('tax_inclusive')} />
          ราคารวม VAT แล้ว
        </label>
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" className="h-4 w-4 accent-[var(--color-primary)]" {...register('service_charge_before_vat')} />
          คิดค่าบริการก่อน VAT
        </label>
        <div className="space-y-2">
          <Label htmlFor="s-round">การปัดเศษ</Label>
          <select id="s-round" className={SELECT} {...register('rounding_mode')}>
            <option value="TWO_DECIMALS">ทศนิยม 2 ตำแหน่ง</option>
            <option value="NEAREST_BAHT">ปัดเป็นบาทใกล้สุด</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-channel">ช่องทางเริ่มต้น</Label>
          <select id="s-channel" className={SELECT} {...register('default_channel')}>
            {(['dine_in', 'takeaway', 'delivery'] as const).map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="สมาชิก (Loyalty)">
        <div className="space-y-2">
          <Label htmlFor="s-earn">บาทต่อ 1 แต้มสะสม</Label>
          <Input id="s-earn" type="number" step="0.01" min={0} className={INPUT} {...register('loyalty_baht_per_earn_point', { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-redeem">มูลค่า (บาท) ต่อ 1 แต้มแลก</Label>
          <Input id="s-redeem" type="number" step="0.0001" min={0} className={INPUT} {...register('loyalty_baht_per_redeem_point', { valueAsNumber: true })} />
        </div>
      </Section>

      <Section title="ใบเสร็จ">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="s-footer">ข้อความท้ายใบเสร็จ</Label>
          <Input id="s-footer" className={INPUT} {...register('receipt_footer', { setValueAs: optStr })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-printer">ชื่อเครื่องพิมพ์</Label>
          <Input id="s-printer" className={INPUT} {...register('printer_name', { setValueAs: optStr })} />
        </div>
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" className="h-4 w-4 accent-[var(--color-primary)]" {...register('receipt_pdf_enabled')} />
          เปิดใช้ใบเสร็จ PDF
        </label>
      </Section>
    </form>
  )
}
