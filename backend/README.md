# SmartBrew Backend (FastAPI)

> ดู [`../CLAUDE.md`](../CLAUDE.md) และ [`../docs/architecture-spec.md`](../docs/architecture-spec.md) สำหรับกฎ + สถาปัตยกรรม

## ติดตั้ง

ใช้ [`uv`](https://docs.astral.sh/uv/) — ติดตั้งครั้งแรก:

```powershell
# ใน C:\Users\ccgam\OneDrive\Desktop\POS AI FUNCTION\backend
uv sync                                  # สร้าง .venv และติดตั้ง deps ตาม pyproject.toml + uv.lock
copy .env.example .env
# แก้ APP_SECRET_KEY และอื่น ๆ ใน .env
```

## คำสั่งหลัก

```powershell
# Dev server
uv run uvicorn app.main:app --reload --port 8000
# Migrations
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "describe change"
# Tests
uv run pytest -q
uv run pytest --cov
# Lint + format
uv run ruff check .
uv run ruff format .
# Type check
uv run mypy app
```

## โครงสร้าง (อ้างอิง spec ส่วนที่ 2)

```
backend/
├── app/
│   ├── main.py                  # FastAPI entry + รวม routers
│   ├── core/                    # config, security, dependencies, exceptions
│   ├── db/                      # session, base, init_db
│   ├── models/                  # SQLModel DB models
│   ├── schemas/                 # Pydantic request/response
│   ├── repositories/            # CRUD (ชั้นคุย DB)
│   ├── services/                # business logic
│   ├── api/v1/                  # routers (auth, products, orders, ...)
│   ├── ai/                      # data, forecasting, strategy, llm
│   └── utils/
├── alembic/                     # migrations
├── tests/                       # pytest
├── models_store/                # ไฟล์โมเดล ML ที่เทรนแล้ว (.joblib) — gitignore เนื้อหา
├── pyproject.toml
├── .env.example
└── README.md
```

## ทำไมเลือกของพวกนี้

- **uv** — เร็ว, lockfile, แทน pip+venv+pip-tools รวบเป็นตัวเดียว
- **SQLModel** — ผสาน Pydantic + SQLAlchemy ลด boilerplate (schema vs model ยังคงแยกตามกฎ)
- **PyJWT** แทน python-jose — maintenance ดีกว่า (spec เตือนให้เช็คตัวที่ maintain)
- **argon2-cffi** ตรง ๆ — เลี่ยง passlib ที่มีปัญหา maintenance
- **slowapi** — rate limit ที่ FastAPI ใช้กันทั่วไป
- **ruff + mypy** — แทน flake8+black+isort+mypy รวบเป็น 2 ตัว (ruff รวบ 3 อันแรก)

## Step ปัจจุบัน

ดู [`../docs/architecture-spec.md`](../docs/architecture-spec.md) ส่วนที่ 8 — workflow 8 ขั้น
**ตอนนี้: Step 0 (setup)** ยังไม่มี business logic — ขั้นถัดไป Step 1 จะสร้าง `app/` skeleton + Alembic
