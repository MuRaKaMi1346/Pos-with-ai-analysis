export type AgeLevel = 'fresh' | 'warning' | 'late'

/** Whole minutes since a ticket was printed (never negative). */
export function ticketAgeMinutes(printedAt: string, now: number = Date.now()): number {
  const printed = new Date(printedAt).getTime()
  if (Number.isNaN(printed)) return 0
  return Math.max(0, Math.floor((now - printed) / 60000))
}

/** Colour band by age: <5 min fresh, 5–10 warning, >10 late (spec §5.12). */
export function ageLevel(minutes: number): AgeLevel {
  if (minutes < 5) return 'fresh'
  if (minutes < 10) return 'warning'
  return 'late'
}
