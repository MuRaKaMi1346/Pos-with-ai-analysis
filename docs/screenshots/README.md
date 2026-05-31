# POS Screenshots

ภาพประกอบของ [`../pos-guide.md`](../pos-guide.md) — ต้องถ่ายเองจากแอปที่รันจริง
(ถ่ายแบบ headless ในงานนี้ไม่ได้ จึงทิ้งเป็น checklist + วิธีถ่ายไว้)

## วิธีเตรียมข้อมูลก่อนถ่าย

1. รัน backend + frontend (ดู `pos-guide.md` §2.1)
2. เข้า http://localhost:8000/docs แล้ว (ผ่าน admin token):
   - `PATCH /settings` ตั้ง `store_name`, `vat_rate` ฯลฯ
   - `POST /products/` หลายรายการ (ใส่ `sku`/`barcode` สัก 1–2 ตัว)
   - `POST /modifier-groups/` + ผูกตัวเลือกกับสินค้าบางตัว
   - `POST /customers/` สัก 1–2 ราย
3. ล็อกอินที่ http://localhost:5173 → เปิดกะ (กรอกเงินตั้งต้น)
4. ถ่ายภาพ (เบราว์เซอร์: DevTools → device toolbar เพื่อจัดขนาดคงที่ก็ได้)

## รายการภาพที่ต้องถ่าย

| ไฟล์ | หน้าจอ |
| --- | --- |
| `pos-main.png` | หน้า `/pos` 3 คอลัมน์ (รางหมวดหมู่ · เมนู+ค้นหา · ตะกร้า) |
| `modifier-dialog.png` | dialog เลือกตัวเลือก (radio/checkbox + ราคา + หมายเหตุ) |
| `cart-line-sheet.png` | แผงแก้บรรทัด (จำนวน/ตัวเลือก/หมายเหตุ/ลบ) |
| `payment-cash.png` | dialog ชำระเงิน แท็บเงินสด (คีย์แพด + ชิป + เงินทอน) |
| `payment-success.png` | หน้าจอสำเร็จ + ตัวอย่างใบเสร็จ 80mm + ปุ่มพิมพ์ |
| `held-tickets.png` | drawer บิลที่พักไว้ |
| `customer-attach.png` | dialog ค้นหา/เพิ่มลูกค้า + ชิปลูกค้าบนแถบบน |
| `command-palette.png` | `⌘K` ค้นหาเมนู/บาร์โค้ด |
| `shift-open.png` | `/shift` ฟอร์มเปิดกะ |
| `shift-close.png` | `/shift` สรุปปิดกะ (คาดหวัง vs นับได้ + ส่วนต่าง) |
| `kds.png` | `/kds` คอลัมน์ BAR/KITCHEN (มีบิลค้างให้เห็นสี — ต้อง send-to-kitchen ก่อน) |
| `density.png` | เปรียบเทียบ compact vs comfortable |

> หมายเหตุ: ภาพ `kds.png` ต้องมี KDS ticket อยู่ก่อน — ปัจจุบันต้องเรียก
> `POST /orders/{id}/send-to-kitchen` ผ่าน API เพื่อสร้าง ticket (ดู gap §7 ในคู่มือ)
