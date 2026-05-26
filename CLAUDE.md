# CLAUDE.md — SmartBrew POS

> กฎทำงานของ Claude Code ในโปรเจคนี้ — อ่านทุกครั้งก่อนแก้โค้ด
> รายละเอียดเต็มอยู่ที่ [`docs/architecture-spec.md`](docs/architecture-spec.md)

---

## 0. หลักการสูงสุด

1. **อ่าน `docs/architecture-spec.md` ก่อนเสมอ** ก่อนเริ่ม feature ใหม่ — โดยเฉพาะส่วนที่ตรงกับงาน (เช่น "ส่วนที่ 5" สำหรับ security)
2. **ทำทีละก้อน (milestone)** — ห้ามทำหลายขั้นในคอมมิตเดียว ขั้นใน `docs/architecture-spec.md` ส่วนที่ 8 คือลำดับมาตรฐาน
3. **เขียน test ไปกับโค้ดเสมอ** — ไม่ทำทีหลัง
4. **commit ทุก milestone ด้วย conventional commits** (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`)

---

## 1. Stack

| ชั้น | ของที่ใช้ |
|------|-----------|
| Frontend | React 18+ / TypeScript (strict) / Vite + SWC / Tailwind / shadcn/ui / TanStack Query / Zustand / React Hook Form + Zod / Recharts |
| Backend | Python 3.11+ / FastAPI / SQLModel / Alembic / Pydantic v2 / pydantic-settings |
| DB | SQLite (dev/prod เริ่มต้น) ผ่าน SQLModel + Alembic migration |
| Auth | OAuth2 password flow + JWT (access สั้น + refresh ใน httpOnly cookie) + Argon2id |
| AI | LightGBM / Prophet / scikit-learn / mlxtend (market basket) / Ollama (LLM local) |
| Pkg mgr | `uv` (backend) · `pnpm` (frontend) |
| Test | `pytest` + `pytest-asyncio` + `httpx` (backend) · `vitest` + `@testing-library/react` (frontend) |
| Lint/format | `ruff` + `mypy` (backend) · `eslint` + `prettier` (frontend) |

---

## 2. โครงสร้างโฟลเดอร์ (ห้ามผิดจากนี้)

```
.
├── backend/         # FastAPI app — ดู spec ส่วนที่ 2 (3-layer: router → service → repository)
├── frontend/        # React app — ดู spec ส่วนที่ 3 (feature-based ใน src/features/)
├── docs/
│   └── architecture-spec.md
├── CLAUDE.md        # ไฟล์นี้
├── README.md
└── .gitignore
```

### backend layout สำคัญ
- `app/api/v1/` — routers เท่านั้น (รับ request, validate, ส่งต่อ service)
- `app/services/` — business logic ทั้งหมด
- `app/repositories/` — คุยกับ DB เท่านั้น (CRUD)
- `app/models/` — SQLModel DB models
- `app/schemas/` — Pydantic request/response (**ห้ามใช้แทน models**)
- `app/core/` — config, security, dependencies (`get_current_user`, RBAC), exceptions
- `app/ai/` — แยกเป็นของตัวเอง: `data/`, `forecasting/`, `strategy/`, `llm/`

### frontend layout สำคัญ
- `src/features/<feature>/` — ใส่ `api/`, `components/`, `hooks/`, `*.tsx` page ของฟีเจอร์ในที่เดียว
- `src/components/ui/` — shadcn/ui primitives
- `src/components/layout/` — `AppShell`, `Sidebar`, `Header`
- `src/lib/api/client.ts` — axios/fetch + interceptor แนบ token / refresh

---

## 3. กฎโค้ดที่ห้ามทำพลาด

### Backend
1. **แยก schema (Pydantic) ออกจาก model (SQLModel)** เสมอ — ห้ามคืน DB model ตรง ๆ ออก API (เผลอเปิดเผย `password_hash`)
2. **ทุก endpoint มี Pydantic schema** ทั้ง request body, response_model — กัน injection + เอกสาร auto
3. **business logic อยู่ใน `services/` เท่านั้น** — router บางและ thin
4. **CRUD อยู่ใน `repositories/`** — service ไม่เรียก ORM เอง (เปลี่ยน DB ทีหลังง่าย)
5. **ใช้ Alembic migration ตั้งแต่แรก** — ห้าม `SQLModel.metadata.create_all()` ใน production code
6. **transaction ครอบ order + stock movement** — ถ้าตัดสต็อกพัง ต้อง rollback ทั้งบิล
7. **ทุก function มี type hint** + docstring สั้น ๆ ถ้า non-obvious
8. **secret อ่านจาก `pydantic-settings`** เท่านั้น (อ่าน `.env`) — ห้าม hard-code

### Frontend
1. **TypeScript `strict: true`** — ห้าม `any` ยกเว้นจำเป็นจริง (มี comment อธิบาย)
2. **data fetching = TanStack Query เท่านั้น** — ห้าม `useEffect` + `fetch` เอง
3. **global state เบา ๆ ใช้ Zustand** — Redux เกินจำเป็น
4. **ฟอร์มใช้ React Hook Form + Zod** — Zod schema แชร์ type ได้
5. **path import ใช้ alias `@/`** (ตั้งใน `tsconfig.json` + `vite.config.ts`) ไม่ใช้ relative `../../../`
6. **ทุก page state มี loading skeleton + empty state + error UI** — ห้ามจอว่าง
7. **ฟอร์แมตเงิน/วันที่ผ่าน helper ใน `lib/utils.ts`** (`formatCurrency` = บาท, `formatDate` timezone `Asia/Bangkok`)

### Security (สรุปจาก spec ส่วนที่ 5)
- Password = **Argon2id** ผ่าน `argon2-cffi`
- JWT access อายุ 15-30 นาที (memory) · refresh 7 วัน ใน **httpOnly + Secure + SameSite cookie**
- CORS allowlist เฉพาะ origin ของ frontend — ห้าม `*`
- Rate limit `/auth/login` ด้วย `slowapi`
- Security headers middleware: HSTS, X-Content-Type-Options, X-Frame-Options
- RBAC ผ่าน FastAPI dependency: `Depends(require_role("admin"))`
- ⚠️ ก่อนเขียนโค้ด security ใหม่ — เช็ค OWASP Cheat Sheets ล่าสุด ตามที่ spec เตือน

---

## 4. มาตรฐานคอมมิต

ใช้ [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(pos): add ModifierDialog and wire to Cart
fix(order): stock not decremented when modifier has its own ingredient
chore(deps): bump fastapi to 0.115.x
docs: update CLAUDE.md authorization rules
test(inventory): cover negative stock guard
refactor(repo): extract base repository generics
```

- 1 commit = 1 reason — ห้าม mix หลายเรื่อง
- คอมมิตทุก milestone ตาม spec ส่วนที่ 8 — แตก branch ต่อขั้นได้ยิ่งดี

---

## 5. ทดสอบ

- ทุกฟีเจอร์ใหม่ต้องมี test:
  - backend: `pytest` ที่ `backend/tests/test_<feature>.py`
  - frontend: `vitest` ติดข้าง component (`Cart.test.tsx`)
- integration test ฝั่ง backend ใช้ **SQLite ในหน่วยความจำ** ผ่าน fixture ใน `conftest.py` — ห้าม mock DB เพื่อให้ครอบคลุม SQL จริง
- ก่อน commit: `ruff check && ruff format --check && mypy app && pytest` (backend) · `pnpm lint && pnpm typecheck && pnpm test` (frontend)

---

## 6. AI Module

- เทรน **แยกจาก** serve: เทรนแล้ว save ลง `backend/models_store/<model>.joblib` ผ่าน `app/ai/forecasting/registry.py`
- API endpoint เพียงโหลดโมเดลที่เซฟไว้ ไม่เทรนตอน request
- ทุกข้อมูล + โมเดลรัน **local** — ห้ามส่ง raw data ของลูกค้าออกนอกเครื่อง (LLM ใช้ Ollama)
- baseline (moving average / naive) ต้องผ่าน **ก่อน** ไปโมเดลใหญ่ — เทียบ MAE/RMSE/MASE ทุกครั้ง

---

## 7. คำสั่ง dev ที่ใช้บ่อย

```bash
# Backend
cd backend
uv sync                      # ติดตั้ง deps
uv run uvicorn app.main:app --reload --port 8000
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "msg"
uv run pytest -q
uv run ruff check . && uv run ruff format .
uv run mypy app

# Frontend
cd frontend
pnpm install
pnpm dev                     # vite dev server
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

---

## 8. จุดที่ห้ามแตะโดยไม่ถาม

- โครงสร้างโฟลเดอร์ใน spec ส่วนที่ 2 และ 3
- กลไก auth (Argon2, JWT pair, RBAC)
- กลไกตัดสต็อกใน `order_service` (transaction + rollback)
- migration ที่ apply แล้ว — สร้าง migration ใหม่แทน อย่าแก้ของเก่า

ถ้าจำเป็นต้องเปลี่ยน — เขียน rationale ใน PR แล้วอัปเดต spec + CLAUDE.md ในคอมมิตเดียวกัน
