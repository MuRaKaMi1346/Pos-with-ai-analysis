import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PurchaseSuggestionResponse } from '@/types/ai'

export function PurchaseSuggestionTable({
  data,
  isLoading,
}: {
  data: PurchaseSuggestionResponse | undefined
  isLoading: boolean
}) {
  const rows = data?.rows ?? []
  return (
    <Card>
      <CardHeader>
        <CardTitle>แนะนำสั่งวัตถุดิบ {data?.days ?? 14} วันถัดไป</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-slate-500">กำลังคำนวณ…</p>
        ) : rows.length === 0 ? (
          <p className="text-slate-500">
            ยังไม่มีข้อมูล — ต้องเทรนโมเดลก่อน หรือยังไม่มีสูตรสำหรับเมนู
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="py-2">วัตถุดิบ</th>
                  <th className="py-2 text-right">คงเหลือ</th>
                  <th className="py-2 text-right">ต้องการ</th>
                  <th className="py-2 text-right">แนะนำสั่ง</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.ingredient_id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-2 font-medium">{r.ingredient_name}</td>
                    <td className="py-2 text-right text-slate-500">
                      {r.current_stock} {r.unit}
                    </td>
                    <td className="py-2 text-right">
                      {r.forecast_required} {r.unit}
                    </td>
                    <td className="py-2 text-right font-semibold text-amber-700">
                      {r.suggested_order_qty} {r.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
