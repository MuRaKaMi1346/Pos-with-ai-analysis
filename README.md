# SmartBrew POS

> POS ร้านกาแฟ + AI Forecast/Strategy + Dashboard
> Local-first · React + TypeScript / FastAPI + Python

---

## โครงสร้าง monorepo

```
.
├── backend/   # FastAPI · SQLModel · Alembic · ai/ (LightGBM, Prophet, Ollama)
├── frontend/  # React + TS (Vite-SWC) · Tailwind · shadcn/ui · TanStack Query
├── docs/
│   └── architecture-spec.md   # spec ตัวเต็ม (Thai)
├── CLAUDE.md                  # กฎทำงานของ Claude Code
└── README.md                  # ไฟล์นี้
```

ที่มาของกฎ/มาตรฐาน + workflow แบ่ง 8 ขั้น อยู่ใน [`docs/architecture-spec.md`](docs/architecture-spec.md)
สรุปกฎที่ใช้บ่อยอยู่ใน [`CLAUDE.md`](CLAUDE.md)

---

## Stack

| ชั้น | ใช้ |
|------|-----|
| Frontend | React 18+ · TypeScript (strict) · Vite + SWC · Tailwind · shadcn/ui · TanStack Query · Zustand · React Hook Form + Zod · Recharts |
| Backend | Python 3.11+ · FastAPI · SQLModel · Alembic · Pydantic v2 |
| DB | SQLite (ผ่าน SQLModel + Alembic) |
| Auth | OAuth2 password flow · JWT access + refresh (httpOnly cookie) · Argon2id |
| AI | LightGBM · Prophet · scikit-learn · mlxtend · Ollama (local LLM) |
| Pkg mgr | `uv` (backend) · `pnpm` (frontend) |

---

## เริ่มต้นใช้งาน

> ก่อนเริ่ม: ติดตั้ง [Python 3.11+](https://www.python.org/), [Node 20+](https://nodejs.org/), [`uv`](https://docs.astral.sh/uv/), [`pnpm`](https://pnpm.io/), และ [Ollama](https://ollama.com/) (สำหรับโมดูล AI ภาษาไทย)

### Backend

```powershell
cd backend
uv sync                                  # ติดตั้ง dependencies
copy .env.example .env                   # แล้วแก้ค่า secret ใน .env
uv run alembic upgrade head              # apply migrations
uv run uvicorn app.main:app --reload     # http://localhost:8000
```

API docs: <http://localhost:8000/docs>

### Frontend

```powershell
cd frontend
pnpm install
copy .env.example .env.local             # แล้วแก้ค่า VITE_API_URL ถ้าจำเป็น
pnpm dev                                 # http://localhost:5173
```

---

## คำสั่งที่ใช้บ่อย

| งาน | คำสั่ง |
|-----|--------|
| รัน backend dev server | `cd backend && uv run uvicorn app.main:app --reload` |
| รัน frontend dev server | `cd frontend && pnpm dev` |
| สร้าง migration ใหม่ | `cd backend && uv run alembic revision --autogenerate -m "msg"` |
| Apply migration | `cd backend && uv run alembic upgrade head` |
| Lint+format backend | `cd backend && uv run ruff check . && uv run ruff format .` |
| Type-check backend | `cd backend && uv run mypy app` |
| Test backend | `cd backend && uv run pytest -q` |
| Lint frontend | `cd frontend && pnpm lint` |
| Type-check frontend | `cd frontend && pnpm typecheck` |
| Test frontend | `cd frontend && pnpm test` |

---

## Workflow พัฒนา

ทำตาม 8 ขั้นใน [`docs/architecture-spec.md`](docs/architecture-spec.md) ส่วนที่ 8:

0. **Setup** — repo + CLAUDE.md + linter/formatter ← *ขั้นปัจจุบัน*
1. **Backend รากฐาน** — FastAPI skeleton + models + Alembic
2. **Auth + Security** — OAuth2 + JWT + Argon2 + RBAC + rate limit
3. **Core domain** — products / ingredients / recipes / orders + ตัดสต็อกตาม BOM
4. **Frontend รากฐาน + POS** — login + MenuGrid + Cart + Payment
5. **Dashboard** — backend aggregate endpoints + DashboardPage (Recharts)
6. **AI Forecasting** — synthetic data + baseline + Prophet + LightGBM + registry
7. **AI Strategy + LLM** — market basket + margin + Ollama summarizer + AiInsightsPage

ตรวจทุกก้อนก่อนไปต่อ commit แยกก้อน

---

## License

Private — สำหรับใช้งานภายในร้านเท่านั้น
