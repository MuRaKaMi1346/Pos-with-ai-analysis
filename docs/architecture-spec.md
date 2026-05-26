# SmartBrew POS — Architecture & Claude Code Workflow Spec

> เอกสารสถาปัตยกรรมโค้ดฉบับเต็ม สำหรับ POS ร้านกาแฟ + AI + Dashboard
> Stack: **React + TypeScript** (frontend) / **Python + FastAPI** (backend)
> วัตถุประสงค์: ใช้เป็น spec ป้อน Claude Code เพื่อสร้างโครงสร้างไฟล์ที่ได้มาตรฐาน
> อัปเดต: พฤษภาคม 2026

---

## ⚠️ หมายเหตุเรื่องเวอร์ชัน (อ่านก่อน)

เอกสารนี้ระบุ pattern ที่เป็นมาตรฐานและเสถียร แต่ **ก่อนลงมือจริง ให้เช็คเวอร์ชันล่าสุดของ library เหล่านี้เอง** เพราะมีการอัปเดตเรื่อย ๆ:

- **FastAPI security**: https://fastapi.tiangolo.com/tutorial/security/
- **OWASP Cheat Sheets** (มาตรฐาน security ที่อัปเดตตลอด): https://cheatsheetseries.owasp.org/
- **Argon2 / password hashing**: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

จุดที่กูใส่ ⚠️ ไว้ในเอกสาร = จุดที่ควรไปเช็คของล่าสุดก่อนใช้

---

## สารบัญ

1. ภาพรวมสถาปัตยกรรม
2. โครงสร้างไฟล์ Backend (FastAPI)
3. โครงสร้างไฟล์ Frontend (React + TS)
4. Database Schema
5. Security (มาตรฐานปัจจุบัน)
6. Dashboard — ออกแบบทั้ง 2 ฝั่ง
7. AI Module — โครงสร้าง
8. Workflow สั่ง Claude Code (ซอยเป็นก้อน + prompt ตัวอย่าง)
9. มาตรฐานโค้ด & เครื่องมือ

---

## 1. ภาพรวมสถาปัตยกรรม

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT (Browser/Desktop)              │
│         React + TypeScript + Tailwind + shadcn/ui         │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│   │   POS    │  │Dashboard │  │ Inventory│  │ AI View │  │
│   └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS / REST (JSON)
                            │ JWT (access + refresh)
┌───────────────────────────▼─────────────────────────────┐
│                  BACKEND (FastAPI / Python)               │
│  ┌────────────────────────────────────────────────────┐ │
│  │  API Layer (routers)  →  Service Layer  →  Repo Layer│ │
│  └────────────────────────────────────────────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │  Auth    │  │  Sales   │  │ Inventory│  │   AI    │  │
│  │ (JWT)    │  │  /Orders │  │  /BOM    │  │ Service │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
└───────────────────────────┬─────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌─────────┐        ┌──────────┐        ┌──────────┐
   │ SQLite  │        │ ML Models│        │  Ollama  │
   │(SQLModel│        │(LightGBM │        │ (local   │
   │ / Alembic)       │ /Prophet)│        │  LLM)    │
   └─────────┘        └──────────┘        └──────────┘
```

**หลักการออกแบบ:**
- **แยกชั้นชัดเจน** (Layered): Router → Service → Repository → Model — ทดสอบง่าย แก้ทีละชั้นได้
- **Schema (Pydantic) แยกจาก Model (DB)** — ไม่ปนกัน ปลอดภัยกว่า
- **AI เป็น service แยก** — เทรน/รันโมเดลไม่ปนกับ logic การขาย
- **Local-first** — SQLite + โมเดลรันบนเครื่อง ไม่พึ่ง cloud

---

## 2. โครงสร้างไฟล์ Backend (FastAPI)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      # entry point, สร้าง FastAPI app, รวม routers
│   ├── core/                        # ของกลางทั้งระบบ
│   │   ├── __init__.py
│   │   ├── config.py                # Settings (pydantic-settings) อ่านจาก .env
│   │   ├── security.py              # JWT encode/decode, password hashing
│   │   ├── dependencies.py          # get_current_user, get_db, role checks
│   │   └── exceptions.py            # custom exceptions + handlers
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── session.py               # engine + session maker (SQLModel)
│   │   ├── base.py                  # import models ทั้งหมดเพื่อให้ Alembic เห็น
│   │   └── init_db.py               # seed ข้อมูลเริ่มต้น (admin user, หมวดหมู่)
│   │
│   ├── models/                      # DB models (SQLModel / SQLAlchemy)
│   │   ├── __init__.py
│   │   ├── user.py                  # User, Role
│   │   ├── product.py               # Product (เมนู), Category, Modifier
│   │   ├── ingredient.py            # Ingredient (วัตถุดิบ), Unit
│   │   ├── recipe.py                # Recipe / BOM (เมนู ↔ วัตถุดิบ)
│   │   ├── inventory.py             # StockLevel, StockMovement, Waste
│   │   ├── order.py                 # Order, OrderItem, OrderItemModifier
│   │   └── payment.py               # Payment
│   │
│   ├── schemas/                     # Pydantic schemas (request/response)
│   │   ├── __init__.py
│   │   ├── auth.py                  # Token, LoginRequest, TokenPayload
│   │   ├── user.py                  # UserCreate, UserRead, UserUpdate
│   │   ├── product.py
│   │   ├── ingredient.py
│   │   ├── recipe.py
│   │   ├── inventory.py
│   │   ├── order.py
│   │   └── dashboard.py             # schemas สำหรับ aggregate data
│   │
│   ├── repositories/                # ชั้นคุยกับ DB (CRUD) — แยกออกจาก logic
│   │   ├── __init__.py
│   │   ├── base.py                  # BaseRepository (generic CRUD)
│   │   ├── user_repo.py
│   │   ├── product_repo.py
│   │   ├── ingredient_repo.py
│   │   ├── order_repo.py
│   │   └── inventory_repo.py
│   │
│   ├── services/                    # business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py          # login, refresh token, register
│   │   ├── order_service.py         # สร้างออเดอร์ + ตัดสต็อกตาม BOM
│   │   ├── inventory_service.py     # รับของ, ปรับสต็อก, แจ้งเตือนของใกล้หมด
│   │   ├── product_service.py
│   │   ├── dashboard_service.py     # aggregate ยอดขาย/กำไร/ช่วงพีค
│   │   └── ai_service.py            # เรียกโมเดล forecast + กลยุทธ์
│   │
│   ├── api/                         # API routers (เวอร์ชัน v1)
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py            # รวม sub-routers ทั้งหมด
│   │       ├── auth.py              # /auth/login, /auth/refresh, /auth/me
│   │       ├── products.py          # CRUD เมนู
│   │       ├── ingredients.py       # CRUD วัตถุดิบ
│   │       ├── recipes.py           # ผูกสูตร BOM
│   │       ├── orders.py            # สร้าง/ดูออเดอร์
│   │       ├── inventory.py         # จัดการสต็อก
│   │       ├── dashboard.py         # endpoints สำหรับ dashboard
│   │       └── ai.py                # /ai/forecast, /ai/strategy
│   │
│   ├── ai/                          # โมดูล AI (แยกจาก services เพื่อความสะอาด)
│   │   ├── __init__.py
│   │   ├── data/
│   │   │   ├── synthetic.py         # สร้าง data จำลองร้านกาแฟ
│   │   │   └── features.py          # feature engineering (วันหยุด, อากาศ, ฯลฯ)
│   │   ├── forecasting/
│   │   │   ├── baseline.py          # naive / moving average
│   │   │   ├── prophet_model.py
│   │   │   ├── lgbm_model.py
│   │   │   ├── evaluate.py          # backtest, MAE/RMSE/MASE
│   │   │   └── registry.py          # โหลด/บันทึกโมเดลที่เทรนแล้ว
│   │   ├── strategy/
│   │   │   ├── market_basket.py     # association rules
│   │   │   ├── margin.py            # หาเมนูกำไรสูง/ขายไม่ออก
│   │   │   └── recommender.py       # รวมเป็นคำแนะนำ
│   │   └── llm/
│   │       └── summarizer.py        # เรียก Ollama สรุปกลยุทธ์เป็นภาษาไทย
│   │
│   └── utils/
│       ├── __init__.py
│       ├── logging.py               # structured logging
│       └── datetime.py              # helper เรื่องเวลา/timezone (Asia/Bangkok)
│
├── alembic/                         # database migrations
│   ├── env.py
│   └── versions/
├── tests/
│   ├── conftest.py                  # fixtures (test DB, test client)
│   ├── test_auth.py
│   ├── test_orders.py
│   ├── test_inventory.py
│   └── test_ai.py
│
├── models_store/                    # ไฟล์โมเดล ML ที่เทรนแล้ว (.pkl/.joblib)
├── .env.example                     # ตัวอย่าง env (ห้าม commit .env จริง)
├── .gitignore
├── alembic.ini
├── pyproject.toml                   # dependencies (ใช้ uv หรือ poetry)
├── Dockerfile
└── README.md
```

**ทำไมโครงนี้ดี:**
- **3 ชั้น (Router/Service/Repository)** ทำให้ test แต่ละชั้นแยกได้ และเปลี่ยน DB ทีหลังไม่กระทบ logic
- **AI แยกเป็นโมดูลของตัวเอง** มี data/forecasting/strategy/llm ชัดเจน — เทรนโมเดลแยกจาก API ได้
- **schemas แยกจาก models** = ไม่เผลอส่ง field ที่ไม่ควรเปิดเผย (เช่น password hash) ออก API

---

## 3. โครงสร้างไฟล์ Frontend (React + TypeScript)

```
frontend/
├── public/
├── src/
│   ├── main.tsx                     # entry point
│   ├── App.tsx                      # router หลัก + providers
│   │
│   ├── app/                         # การตั้งค่าระดับแอป
│   │   ├── router.tsx               # route definitions (react-router)
│   │   ├── providers.tsx            # QueryClient, Auth, Theme providers
│   │   └── queryClient.ts           # TanStack Query config
│   │
│   ├── components/                  # UI components ที่ใช้ซ้ำ
│   │   ├── ui/                      # shadcn/ui (button, card, dialog, ...)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx         # โครงหน้า (sidebar + header)
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   └── common/                  # DataTable, StatCard, ChartCard, EmptyState
│   │
│   ├── features/                    # แยกตามฟีเจอร์ (feature-based — ดูแลง่าย)
│   │   ├── auth/
│   │   │   ├── api/                 # hooks เรียก API (useLogin, useMe)
│   │   │   ├── components/          # LoginForm
│   │   │   ├── hooks/               # useAuth
│   │   │   └── stores/             # auth store (zustand)
│   │   │
│   │   ├── pos/                     # หน้าขายหลัก
│   │   │   ├── api/                 # useCreateOrder, useProducts
│   │   │   ├── components/          # MenuGrid, Cart, ModifierDialog, PaymentDialog
│   │   │   ├── hooks/               # useCart
│   │   │   └── PosPage.tsx
│   │   │
│   │   ├── dashboard/               # ⭐ ฟีเจอร์ที่อยากเพิ่ม
│   │   │   ├── api/                 # useSalesSummary, useTopProducts, usePeakHours
│   │   │   ├── components/
│   │   │   │   ├── SalesTrendChart.tsx
│   │   │   │   ├── TopProductsChart.tsx
│   │   │   │   ├── PeakHoursHeatmap.tsx
│   │   │   │   ├── KpiCards.tsx        # ยอดวันนี้, จำนวนบิล, กำไร, average ticket
│   │   │   │   └── DateRangePicker.tsx
│   │   │   └── DashboardPage.tsx
│   │   │
│   │   ├── inventory/
│   │   │   ├── api/
│   │   │   ├── components/          # StockTable, ReceiveStockDialog, LowStockAlert
│   │   │   └── InventoryPage.tsx
│   │   │
│   │   ├── products/                # จัดการเมนู + ผูกสูตร BOM
│   │   │   ├── api/
│   │   │   ├── components/          # ProductForm, RecipeBuilder
│   │   │   └── ProductsPage.tsx
│   │   │
│   │   └── ai-insights/             # หน้าแสดงผล AI
│   │       ├── api/                 # useForecast, useStrategy
│   │       ├── components/
│   │       │   ├── ForecastChart.tsx       # ยอดในอดีต + เส้นทำนาย + แถบ uncertainty
│   │       │   ├── PurchaseSuggestion.tsx  # ควรสั่งของเท่าไหร่
│   │       │   └── StrategyCard.tsx        # คำแนะนำกลยุทธ์ภาษาไทย
│   │       └── AiInsightsPage.tsx
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts            # axios/fetch instance + interceptor แนบ token
│   │   │   └── endpoints.ts         # รวม path API
│   │   ├── utils.ts                 # cn(), formatCurrency (บาท), formatDate
│   │   └── constants.ts
│   │
│   ├── types/                       # TypeScript types (ตรงกับ schema backend)
│   │   ├── api.ts
│   │   ├── product.ts
│   │   ├── order.ts
│   │   └── dashboard.ts
│   │
│   ├── hooks/                       # global hooks
│   └── styles/
│       └── globals.css              # Tailwind + theme tokens
│
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── README.md
```

**ทำไมใช้ feature-based ไม่ใช่แบ่งตาม type:**
- โค้ดที่เกี่ยวกับ "dashboard" อยู่ที่เดียวกันหมด (api + components + page) หาง่าย เพิ่มฟีเจอร์ใหม่ไม่กระทบของเก่า
- เหมาะกับโปรเจคที่จะโตเรื่อย ๆ แบบนี้

**Library หลักฝั่ง frontend:**
- **TanStack Query** — จัดการ data fetching/caching (มาตรฐานปัจจุบัน อย่าใช้ useEffect ดึงเอง)
- **Zustand** — state เบา ๆ (เช่น cart, auth) แทน Redux ที่หนักเกิน
- **React Hook Form + Zod** — ฟอร์ม + validation (Zod แชร์ type กับ TS ได้)
- **Recharts** — กราฟ dashboard
- **shadcn/ui** — component สวยทันสมัย คุมสไตล์เองได้

---

## 4. Database Schema (หัวใจคือ BOM 2 ชั้น)

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│  Category   │──┐    │   Product    │       │  Modifier   │
│  หมวดหมู่    │  └───<│   (เมนู)     │>─────<│ ตัวเลือก     │
└─────────────┘       └──────┬───────┘       │ (เพิ่มช็อต)  │
                            │               └─────────────┘
                            │ 1 เมนู มีหลายบรรทัดสูตร
                            ▼
                     ┌──────────────┐       ┌──────────────┐
                     │   Recipe     │>─────<│  Ingredient  │
                     │  (BOM line)  │       │  (วัตถุดิบ)   │
                     │ qty + unit   │       └──────┬───────┘
                     └──────────────┘              │
                                                   │
                                            ┌──────▼───────┐
                                            │ StockLevel   │
                                            │ คงเหลือ       │
                                            └──────────────┘
                                            ┌──────────────┐
                                            │StockMovement │
                                            │ รับ/ขาย/เสีย  │
                                            └──────────────┘

┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Order     │─────<│  OrderItem   │>────<│OrderItemMod  │
│  บิล         │      │ รายการในบิล   │      │ ตัวเลือกที่เลือก│
└──────┬──────┘      └──────────────┘      └──────────────┘
       │
       ▼
┌─────────────┐
│  Payment    │
│ เงินสด/QR    │
└─────────────┘
```

**ตารางหลัก (สรุป field สำคัญ):**

| ตาราง | field สำคัญ | หมายเหตุ |
|-------|-----------|----------|
| `users` | id, username, password_hash, role, is_active | role: admin/staff |
| `categories` | id, name, parent_id | หมวดหมู่ซ้อนชั้นได้ |
| `products` | id, name, category_id, price, cost, image, is_active | เมนูที่ลูกค้าสั่ง |
| `modifiers` | id, name, price_delta, group | เพิ่มช็อต +10, หวานน้อย |
| `ingredients` | id, name, unit, shelf_life_days | วัตถุดิบ |
| `recipes` | id, product_id, ingredient_id, qty, unit | **BOM**: เมนูใช้วัตถุดิบเท่าไหร่ |
| `stock_levels` | id, ingredient_id, quantity, reorder_point | คงเหลือ + จุดสั่งซื้อ |
| `stock_movements` | id, ingredient_id, type, qty, ref, created_at | type: receive/sale/waste/adjust |
| `orders` | id, total, status, created_at, user_id | บิล |
| `order_items` | id, order_id, product_id, qty, unit_price | รายการในบิล |
| `order_item_modifiers` | id, order_item_id, modifier_id, price_delta | ตัวเลือกที่เลือก |
| `payments` | id, order_id, method, amount, paid_at | วิธีจ่าย |

**กลไกสำคัญ — ตัดสต็อกอัตโนมัติ (ใน `order_service.py`):**
```
เมื่อสร้าง Order:
  สำหรับแต่ละ OrderItem:
    ดึง Recipe ของ product นั้น
    สำหรับแต่ละบรรทัดสูตร:
      ลด StockLevel ของ ingredient ตาม (qty ในสูตร × จำนวนที่สั่ง)
      บันทึก StockMovement type=sale
  ทำใน transaction เดียว (ถ้าพังให้ rollback ทั้งหมด)
```

> ⚠️ Migration ใช้ **Alembic** ตั้งแต่แรก อย่าใช้ create_all() ใน production — จะแก้ schema ทีหลังลำบาก

---

## 5. Security (มาตรฐานปัจจุบัน — พฤษภาคม 2026)

> ⚠️ จุดนี้ควรเช็คเวอร์ชันล่าสุดก่อนใช้: FastAPI security docs + OWASP Cheat Sheets (ลิงก์อยู่ต้นเอกสาร) เพราะ best practice อัปเดตเรื่อย

### 5.1 Authentication — JWT (access + refresh)
- ใช้ **OAuth2 password flow** ของ FastAPI (`OAuth2PasswordBearer`)
- **Access token** อายุสั้น (15-30 นาที) เก็บใน memory ฝั่ง frontend
- **Refresh token** อายุยาว (7 วัน) เก็บใน **httpOnly + Secure + SameSite cookie** (ไม่เก็บใน localStorage — กัน XSS ขโมย)
- Library: `python-jose` หรือ `pyjwt` สำหรับ encode/decode ⚠️ เช็คตัวที่ maintain อยู่ตอนนั้น

### 5.2 Password hashing
- ใช้ **Argon2** (`argon2-cffi`) เป็น default — OWASP แนะนำเป็นอันดับแรกปัจจุบัน
- ถ้าจะใช้ bcrypt ก็ได้ แต่ Argon2id คือคำแนะนำล่าสุด
- ผ่าน **passlib** หรือเรียก argon2 ตรง ⚠️ เช็คสถานะ passlib ก่อน (เคยมีปัญหา maintenance)

### 5.3 Authorization — RBAC
- ตรวจ role ผ่าน FastAPI dependency: `Depends(require_role("admin"))`
- staff ขายได้ดูสต็อกได้ แต่แก้ราคา/ลบเมนู/ดู dashboard การเงิน = admin เท่านั้น

### 5.4 ระดับ API / Transport
- **CORS** จำกัด origin เฉพาะ frontend ของเรา (อย่าใช้ `*`)
- **Rate limiting** (เช่น slowapi) กัน brute-force ที่ /auth/login
- **HTTPS** เสมอใน production
- **Security headers**: HSTS, X-Content-Type-Options, X-Frame-Options (ใช้ middleware)
- **Input validation** ผ่าน Pydantic ทุก endpoint (กัน injection ตั้งแต่ขาเข้า)
- **SQL injection**: ใช้ ORM (SQLModel/SQLAlchemy) parametrize ให้อยู่แล้ว อย่าต่อ SQL เป็น string เอง

### 5.5 จัดการ Secret
- ทุก secret (JWT secret key, DB url) อ่านจาก **environment / .env** ผ่าน `pydantic-settings`
- **ห้าม commit .env** — มีแค่ `.env.example`
- JWT secret ต้องสุ่มยาว (เช่น `openssl rand -hex 32`)

### 5.6 มาตรฐานอ้างอิง
- ทำตาม **OWASP Top 10** และ **OWASP ASVS** เป็นกรอบ
- เช็ค **OWASP API Security Top 10** เพราะนี่คือ API-first app

### 5.7 ตารางสรุป (เอาไปใส่ใน prompt Claude Code ได้)
| ด้าน | ใช้อะไร |
|------|---------|
| Password hash | Argon2id (argon2-cffi) |
| Token | JWT access สั้น + refresh ใน httpOnly cookie |
| Auth flow | OAuth2PasswordBearer (FastAPI) |
| Authorization | RBAC ผ่าน dependency |
| Validation | Pydantic v2 schemas |
| Rate limit | slowapi ที่ login |
| Secrets | pydantic-settings + .env (gitignored) |
| Headers | security middleware (HSTS, etc.) |
| CORS | allowlist เฉพาะ frontend |

---

## 6. Dashboard — ออกแบบทั้ง 2 ฝั่งให้ล็อกกัน

> dashboard สวย ๆ จะไร้ค่าถ้าไม่มี API รองรับ — ต้องทำ backend aggregate ก่อน

### 6.1 Backend endpoints (`api/v1/dashboard.py` + `dashboard_service.py`)
| Endpoint | คืนอะไร | ใช้ทำกราฟอะไร |
|----------|---------|---------------|
| `GET /dashboard/summary?from&to` | ยอดรวม, จำนวนบิล, กำไรขั้นต้น, average ticket | KPI cards |
| `GET /dashboard/sales-trend?from&to&granularity` | ยอดขายรายวัน/ชม. | กราฟเส้นแนวโน้ม |
| `GET /dashboard/top-products?from&to&limit` | เมนูขายดี/รายได้สูงสุด | bar chart |
| `GET /dashboard/peak-hours?from&to` | ยอดตามชั่วโมง×วัน | heatmap |
| `GET /dashboard/category-mix?from&to` | สัดส่วนยอดตามหมวด | donut chart |

- aggregate ด้วย SQL `GROUP BY` (เร็ว ไม่ดึง raw มานับใน Python)
- คืน schema ที่ frontend แปลงเป็นกราฟได้ตรง

### 6.2 Frontend (`features/dashboard/`)
- `DashboardPage.tsx` — วาง grid: KPI cards บน, กราฟแนวโน้ม + top products กลาง, heatmap ล่าง
- ใช้ **TanStack Query** ดึงแต่ละ endpoint แยก hook (`useSalesSummary`, ฯลฯ) — cache + loading state อัตโนมัติ
- ใช้ **Recharts** วาดกราฟ
- `DateRangePicker` คุมช่วงเวลา → ส่ง query param ไป API
- ทุกการ์ดมี loading skeleton + empty state (กันจอว่างตอนยังไม่มีข้อมูล)

---

## 7. AI Module — โครงสร้างและการเชื่อม

### 7.1 endpoints (`api/v1/ai.py`)
| Endpoint | ทำอะไร |
|----------|--------|
| `GET /ai/forecast?product_id&horizon` | คืนยอดทำนาย + ช่วงความเชื่อมั่น |
| `GET /ai/purchase-suggestion?days` | แปลง forecast → ควรสั่งวัตถุดิบเท่าไหร่ |
| `GET /ai/strategy/daily` | คำแนะนำกลยุทธ์ภาษาไทย (ผ่าน Ollama) |
| `POST /ai/train` | (admin) สั่งเทรนโมเดลใหม่จากข้อมูลล่าสุด |

### 7.2 หลักการ
- **เทรนแยกจาก serve** — เทรนแล้วเซฟไฟล์ลง `models_store/` (joblib) แล้ว API แค่โหลดมาทำนาย (เร็ว)
- **registry.py** จัดการว่าโหลดโมเดลตัวไหน เวอร์ชันอะไร
- **strategy** (market basket, margin) คำนวณจากข้อมูลขายจริงใน DB
- **llm/summarizer.py** เอา insight ตัวเลข → ส่งให้ Ollama เรียบเรียงเป็นภาษาไทยอ่านง่าย
- ทั้งหมดรัน **local** — ไม่มี data ออกนอกเครื่อง

---

## 8. Workflow สั่ง Claude Code (สำคัญที่สุด)

> **อย่าสั่งให้สร้างทั้งระบบในคำสั่งเดียว** — มันจะพังและแก้ยาก
> ให้ซอยเป็น milestone สั่งทีละก้อน ตรวจแต่ละก้อนก่อนไปต่อ

### ขั้นที่ 0 — เตรียม repo + ไฟล์ context
สั่ง Claude Code สร้าง:
- โครง monorepo (`backend/` + `frontend/`)
- ไฟล์ `CLAUDE.md` ที่ราก — ใส่ stack, มาตรฐานโค้ด, โครงสร้างโฟลเดอร์, กฎ (เช่น "schema แยก model", "ใช้ Argon2", "feature-based frontend") เพื่อให้ Claude Code อ้างอิงทุกครั้ง
- ตั้ง linter/formatter: ฝั่ง Python `ruff` + `mypy`, ฝั่ง TS `eslint` + `prettier`

### ขั้นที่ 1 — Backend รากฐาน
> "สร้างโครง FastAPI ตาม spec: core (config/security/dependencies), db session ด้วย SQLModle + SQLite, models ทั้งหมด, Alembic migration แรก, และ health check endpoint ยังไม่ต้องทำ business logic"

ตรวจ: รันได้ DB สร้างตารางครบ migration ผ่าน

### ขั้นที่ 2 — Auth + Security
> "เพิ่มระบบ auth: OAuth2 password flow, JWT access+refresh (refresh ใน httpOnly cookie), Argon2 password hashing, RBAC dependency, rate limit ที่ login, CORS allowlist, security headers middleware ตามตาราง security ใน spec"

ตรวจ: register/login/refresh ทำงาน, endpoint ที่ป้องกันเข้าไม่ได้ถ้าไม่มี token

### ขั้นที่ 3 — Core domain (เมนู/วัตถุดิบ/BOM/ขาย)
> "ทำ CRUD products, ingredients, recipes(BOM) และ order_service ที่สร้างออเดอร์แล้วตัดสต็อกตาม BOM ใน transaction เดียว พร้อม StockMovement"

ตรวจ: ขายแล้วสต็อกลดถูกต้อง, มี test

### ขั้นที่ 4 — Frontend รากฐาน + POS
> "สร้างโครง React+TS แบบ feature-based, ตั้ง TanStack Query + Zustand + shadcn/ui, ทำ login + หน้า POS (MenuGrid, Cart, PaymentDialog) เชื่อม API"

ตรวจ: login ได้, ขายของผ่าน UI ได้จริง

### ขั้นที่ 5 — Dashboard ⭐
> "ทำ backend dashboard endpoints (summary/sales-trend/top-products/peak-hours/category-mix) ด้วย SQL GROUP BY แล้วทำหน้า DashboardPage ฝั่ง frontend ด้วย Recharts + TanStack Query ตาม spec ส่วนที่ 6"

ตรวจ: ตัวเลขตรงกับข้อมูลจริง, กราฟแสดงถูก

### ขั้นที่ 6 — AI Forecasting
> "สร้างโมดูล ai/: synthetic data generator ร้านกาแฟ, feature engineering, baseline + Prophet + LightGBM, evaluate ด้วย backtest + MASE, registry เซฟโมเดล, และ endpoint /ai/forecast + /ai/purchase-suggestion"

ตรวจ: เทรนได้, ทำนายได้, LightGBM ชนะ baseline

### ขั้นที่ 7 — AI Strategy + LLM
> "ทำ strategy (market_basket, margin) + llm/summarizer เชื่อม Ollama สรุปเป็นภาษาไทย + endpoint /ai/strategy/daily + หน้า AiInsightsPage แสดง forecast chart, purchase suggestion, strategy cards"

ตรวจ: ได้คำแนะนำภาษาไทยจากข้อมูลจริง

### เทคนิคสั่ง Claude Code ให้ได้ผล
- **ใส่ spec นี้ไว้ใน repo** แล้วอ้างอิงในแต่ละ prompt ("ตาม architecture-spec.md ส่วนที่ X")
- **ให้เขียน test ไปด้วยทุกก้อน** อย่าทำทีหลัง
- **commit ทีละ milestone** — แตก branch ต่อก้อนยิ่งดี
- **ตรวจทุกก้อนก่อนไปต่อ** — รันจริง ดูว่าทำงานก่อนสั่งก้อนถัดไป
- ถ้าก้อนไหนใหญ่ไป ให้ซอยย่อยอีก (เช่น ขั้น 6 แยกเป็น "ทำ data ก่อน" แล้วค่อย "ทำโมเดล")

---

## 9. มาตรฐานโค้ด & เครื่องมือ

| ด้าน | Python (backend) | TypeScript (frontend) |
|------|------------------|----------------------|
| Package manager | uv หรือ poetry | pnpm |
| Lint | ruff | eslint |
| Format | ruff format | prettier |
| Type check | mypy | tsc (strict mode) |
| Test | pytest | vitest + testing-library |
| Pre-commit | pre-commit hooks ทั้งสองฝั่ง | |

**กฎทั่วไปที่ควรใส่ใน CLAUDE.md:**
- เปิด TypeScript `strict: true`
- ทุก function backend มี type hint + docstring
- schema (Pydantic) แยกจาก model (DB) เสมอ
- ไม่ commit secret / .env
- ทุกฟีเจอร์มี test
- ใช้ conventional commits (feat:, fix:, ...)

---

## สรุป

เอกสารนี้ให้:
1. โครงสร้างไฟล์เต็มทั้ง backend (layered) และ frontend (feature-based)
2. Database schema ที่หัวใจคือ BOM 2 ชั้น + ตัดสต็อกอัตโนมัติ
3. Security มาตรฐานปัจจุบัน (Argon2, JWT access+refresh, RBAC, OWASP) — ⚠️ เช็คเวอร์ชันล่าสุดก่อนใช้
4. Dashboard ออกแบบครบทั้ง 2 ฝั่ง
5. **Workflow สั่ง Claude Code แบบซอยเป็น 8 ขั้น** พร้อม prompt ตัวอย่าง — เอาไปใช้ได้เลย

**กุญแจสำคัญ:** ใส่เอกสารนี้ไว้ใน repo เป็น `architecture-spec.md` + ทำ `CLAUDE.md` สรุปกฎ แล้วสั่ง Claude Code ทีละขั้น ตรวจทุกก้อนก่อนไปต่อ
