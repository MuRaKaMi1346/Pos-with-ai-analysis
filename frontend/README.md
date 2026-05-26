# SmartBrew Frontend (React + TypeScript + Vite)

> ดู [`../CLAUDE.md`](../CLAUDE.md) และ [`../docs/architecture-spec.md`](../docs/architecture-spec.md) สำหรับกฎ + สถาปัตยกรรม

## ติดตั้ง

ใช้ [`pnpm`](https://pnpm.io/) — ติดตั้งครั้งแรก:

```powershell
# ใน C:\Users\ccgam\OneDrive\Desktop\POS AI FUNCTION\frontend
pnpm install
copy .env.example .env.local
# แก้ VITE_API_URL ถ้าจำเป็น
```

## คำสั่งหลัก

```powershell
pnpm dev          # vite dev server (http://localhost:5173)
pnpm build        # production build
pnpm preview      # serve build ผ่าน vite preview
pnpm lint         # eslint
pnpm lint:fix     # eslint --fix
pnpm typecheck    # tsc --noEmit
pnpm format       # prettier --write
pnpm format:check # prettier --check
pnpm test         # vitest run (single pass)
pnpm test:watch   # vitest watch
pnpm test:ui      # vitest UI
```

## โครงสร้าง (อ้างอิง spec ส่วนที่ 3 — feature-based)

```
frontend/
├── src/
│   ├── main.tsx                    # entry
│   ├── App.tsx                     # placeholder (Step 0)
│   ├── setupTests.ts               # vitest + @testing-library/jest-dom setup
│   │
│   ├── app/                        # (Step 4) router, providers, queryClient
│   ├── components/                 # (Step 4) ui/, layout/, common/
│   ├── features/                   # (Step 4+) ฟีเจอร์ — auth/, pos/, dashboard/, ...
│   ├── lib/                        # (Step 4) api/, utils.ts
│   ├── types/                      # (Step 4) shared TS types
│   ├── hooks/                      # (Step 4) global hooks
│   └── styles/                     # (Step 4) Tailwind globals
│
├── public/                         # static assets
├── vite.config.ts                  # Vite + SWC + Vitest config + path alias '@/'
├── tsconfig.app.json               # strict TS + paths
├── eslint.config.js                # ESLint flat config + prettier-config
├── .prettierrc                     # 2-space, no-semi, single quote, trailing-comma all
├── pnpm-workspace.yaml             # pnpm 11 settings (allowBuilds @swc/core)
└── .env.example
```

## ทำไมเลือกของพวกนี้

- **Vite 8 + React 19 + SWC** (`@vitejs/plugin-react-swc`) — fastest HMR + lightweight
- **TS strict** (เปิด `noUncheckedIndexedAccess`, `noImplicitOverride` ด้วย) — ตามกฎใน CLAUDE.md
- **path alias `@/`** — เลี่ยง `../../../` ตามกฎ
- **ESLint flat config** (ESLint 10) + `eslint-config-prettier` — Lint logic, Prettier ฟอร์แมต ไม่ทับซ้อน
- **Vitest 4** (jsdom) + `@testing-library/react` + `jest-dom` — มาตรฐาน test ของ Vite ecosystem

## Step ปัจจุบัน

ดู [`../docs/architecture-spec.md`](../docs/architecture-spec.md) ส่วนที่ 8 — workflow 8 ขั้น
**ตอนนี้: Step 0 (setup)** ยังไม่มี Tailwind/shadcn/TanStack Query/Zustand — เพิ่มใน Step 4 (frontend foundation + POS)
