import { Receipt, ShoppingCart } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useCreateOrder } from '@/features/pos/api/products'
import { CartItem } from '@/features/pos/components/CartItem'
import { cartLineList, cartTotal, useCartStore } from '@/features/pos/stores/cartStore'
import { formatCurrency } from '@/lib/utils'

export function Cart() {
  const lines = useCartStore((s) => s.lines)
  const inc = useCartStore((s) => s.inc)
  const dec = useCartStore((s) => s.dec)
  const remove = useCartStore((s) => s.remove)
  const clear = useCartStore((s) => s.clear)
  const channel = useCartStore((s) => s.channel)
  const tableNumber = useCartStore((s) => s.tableNumber)
  const createOrder = useCreateOrder()

  const lineList = useMemo(() => cartLineList(lines), [lines])
  const total = useMemo(() => cartTotal(lines), [lines])

  async function handlePlaceOrder(): Promise<void> {
    if (lineList.length === 0) return
    try {
      const order = await createOrder.mutateAsync({
        items: lineList.map((line) => ({
          product_id: line.product.id,
          qty: line.qty,
        })),
        channel,
        table_number: channel === 'dine_in' ? tableNumber.trim() || null : null,
      })
      toast.success(`สร้างบิล ${order.order_number} สำเร็จ — ยอด ${formatCurrency(order.total)}`)
      clear()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      const msg = axiosErr.response?.data?.message ?? 'ไม่สามารถสร้างบิลได้'
      toast.error(msg)
    }
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" /> ตะกร้า ({lineList.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pt-0">
        {lineList.length === 0 ? (
          <p className="text-sm text-slate-500">เลือกเมนูเพื่อเพิ่มลงตะกร้า</p>
        ) : (
          <div>
            {lineList.map((line) => (
              <CartItem
                key={line.product.id}
                line={line}
                onInc={() => {
                  inc(line.product.id)
                }}
                onDec={() => {
                  dec(line.product.id)
                }}
                onRemove={() => {
                  remove(line.product.id)
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-3 border-t border-slate-100 pt-4">
        <div className="flex w-full items-center justify-between">
          <span className="text-sm text-slate-500">รวมทั้งสิ้น</span>
          <span className="text-xl font-bold">{formatCurrency(total)}</span>
        </div>
        <Button
          className="w-full"
          size="lg"
          disabled={lineList.length === 0 || createOrder.isPending}
          onClick={handlePlaceOrder}
        >
          <Receipt className="mr-2 h-4 w-4" />
          {createOrder.isPending ? 'กำลังบันทึก…' : 'สร้างบิล'}
        </Button>
      </CardFooter>
    </Card>
  )
}
