import type { Product } from '@/types/product'

export interface ProductFilter {
  /** ``null`` means the "All" rail entry — no category restriction. */
  categoryId: number | null
  query: string
}

/** Filter the menu by selected category + a case-insensitive name search. */
export function filterProducts(
  products: Product[],
  { categoryId, query }: ProductFilter,
): Product[] {
  const q = query.trim().toLowerCase()
  return products.filter((p) => {
    if (categoryId !== null && p.category_id !== categoryId) return false
    if (q.length > 0 && !p.name.toLowerCase().includes(q)) return false
    return true
  })
}

/** Active-product count per category id — drives the rail badges. */
export function categoryCounts(products: Product[]): Record<number, number> {
  const counts: Record<number, number> = {}
  for (const p of products) {
    if (p.category_id !== null) {
      counts[p.category_id] = (counts[p.category_id] ?? 0) + 1
    }
  }
  return counts
}
