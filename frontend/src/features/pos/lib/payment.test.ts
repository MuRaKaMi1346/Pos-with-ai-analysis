import { describe, expect, it } from 'vitest'

import { addTender, canSubmit, changeDue, paidTotal, remaining } from '@/features/pos/lib/payment'

describe('payment tender math', () => {
  it('cash overpayment covers the bill and yields change', () => {
    const tenders = addTender([], 'cash', 100, 65)
    expect(tenders).toEqual([{ method: 'cash', amount: 65, tendered_amount: 100 }])
    expect(paidTotal(tenders)).toBe(65)
    expect(remaining(65, tenders)).toBe(0)
    expect(changeDue(tenders)).toBe(35)
    expect(canSubmit(65, tenders)).toBe(true)
  })

  it('exact cash leaves no change', () => {
    const tenders = addTender([], 'cash', 65, 65)
    expect(changeDue(tenders)).toBe(0)
    expect(canSubmit(65, tenders)).toBe(true)
  })

  it('caps a non-cash tender at the remaining (no overpayment)', () => {
    const tenders = addTender([], 'card', 200, 130, '1234')
    expect(tenders).toEqual([{ method: 'card', amount: 130, reference: '1234' }])
    expect(canSubmit(130, tenders)).toBe(true)
  })

  it('supports split tender (cash then card)', () => {
    let tenders = addTender([], 'cash', 100, 130)
    expect(remaining(130, tenders)).toBe(30)
    expect(canSubmit(130, tenders)).toBe(false)
    tenders = addTender(tenders, 'card', 30, 130, '4321')
    expect(paidTotal(tenders)).toBe(130)
    expect(remaining(130, tenders)).toBe(0)
    expect(canSubmit(130, tenders)).toBe(true)
  })

  it('partial cash leaves a remaining and no change', () => {
    const tenders = addTender([], 'cash', 50, 130)
    expect(tenders[0]?.amount).toBe(50)
    expect(changeDue(tenders)).toBe(0)
    expect(remaining(130, tenders)).toBe(80)
  })

  it('ignores a non-positive entry or one past full payment', () => {
    expect(addTender([], 'cash', 0, 65)).toEqual([])
    const full = addTender([], 'cash', 65, 65)
    expect(addTender(full, 'cash', 20, 65)).toEqual(full)
  })

  it('handles a decimal total without float drift', () => {
    const tenders = addTender([], 'cash', 100, 69.55)
    expect(tenders[0]?.amount).toBe(69.55)
    expect(changeDue(tenders)).toBe(30.45)
    expect(remaining(69.55, tenders)).toBe(0)
  })
})
