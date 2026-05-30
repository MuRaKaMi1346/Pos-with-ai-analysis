import type { TicketLine } from '@/features/pos/stores/cartStore'
import type { OrderItemRead } from '@/types/order'
import type { Product } from '@/types/product'

/**
 * Rebuild editable ticket lines from a resumed held order (spec §5.6).
 *
 * Product details come from the catalogue (`productById`); modifier names from
 * `nameById` (fetched via /products/{id}/modifiers, since the order read only
 * snapshots the price delta). Lines whose product has left the catalogue are
 * dropped rather than rendered as broken stubs.
 */
export function orderToTicketLines(
  items: OrderItemRead[],
  productById: Map<number, Product>,
  nameById: Map<number, string>,
): Omit<TicketLine, 'uid'>[] {
  const lines: Omit<TicketLine, 'uid'>[] = []
  for (const item of items) {
    const product = productById.get(item.product_id)
    if (!product) continue
    lines.push({
      product,
      qty: item.qty,
      unit_price: Number(item.unit_price),
      modifiers: item.modifiers.map((m) => ({
        modifier_id: m.modifier_id,
        name: nameById.get(m.modifier_id) ?? 'ตัวเลือก',
        price_delta: Number(m.price_delta),
      })),
    })
  }
  return lines
}
