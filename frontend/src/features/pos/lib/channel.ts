import type { OrderChannel } from '@/types/order'

const CYCLE: OrderChannel[] = ['dine_in', 'takeaway', 'delivery']

/** Next channel in the dine-in → takeaway → delivery cycle (F4 shortcut). */
export function nextChannel(channel: OrderChannel): OrderChannel {
  const i = CYCLE.indexOf(channel)
  return CYCLE[(i + 1) % CYCLE.length] ?? 'takeaway'
}
