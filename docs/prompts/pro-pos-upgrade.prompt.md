# SmartBrew POS — Pro-Level POS Upgrade Prompt

> Paste this into Claude Code. It is the **single source of truth** for the
> upgrade. Work milestone by milestone (Section 7) and commit after each.

---

## 0. Role & Mission

You are working inside the **SmartBrew POS** monorepo. Before touching anything,
read these files in order and treat them as binding constraints:

1. `CLAUDE.md` (project root) — coding rules, folder layout, security rules.
2. `docs/architecture-spec.md` — full architecture spec. Pay special attention
   to: Section 2 (backend layout), Section 3 (frontend layout), Section 4
   (database — order/stock transaction rules), Section 5 (security), Section 8
   (milestone workflow).

The current POS is too thin. The order model only stores `total`, `status`,
`user_id`, `note`. The POS page is a 2-column "menu grid + cart" with no
category tabs, no modifier picker, no discounts, no payment dialog, no
held tickets, no receipt — it looks unprofessional and is missing features any
production POS must have.

**Your mission**: turn this into a pro-grade POS, both on the backend (data
model + APIs + business logic) and on the frontend (touch-first, fast,
keyboard-friendly UI). Every existing test must keep passing. Every new feature
must ship with tests.

---

## 1. Non-Negotiable Rules (from CLAUDE.md)

- **Stack is fixed**: FastAPI + SQLModel + Alembic + Pydantic v2 (backend);
  React 18 + TypeScript strict + Vite + Tailwind + shadcn/ui + TanStack Query
  + Zustand + React Hook Form + Zod (frontend). Do not introduce new
  frameworks without justifying in the PR description.
- **Layered backend**: router (thin) → service (business logic) → repository
  (DB only). No ORM calls in services. No business logic in routers.
- **Schemas (Pydantic) vs Models (SQLModel) stay separate.** Never return a
  SQLModel directly from a route that could leak fields. Use `response_model`.
- **Schema changes go through Alembic.** Never edit an applied migration —
  write a new one.
- **Stock-deducting operations stay atomic.** Any order create / void /
  refund / partial refund must run inside a single transaction with rollback
  on failure. Add `StockMovement` rows for every quantity change with a `ref`
  back to the originating document (e.g. `order:123`, `refund:45`).
- **Money types**: `Decimal` on the backend (`max_digits=12, decimal_places=2`),
  numbers on the frontend formatted via `formatCurrency` (THB, locale
  `th-TH`). Never use `float` for money. Round half-up at the line level.
- **Auth**: every new endpoint must require auth via the existing
  `CurrentUserDep`. Cashier-only actions allowed for `staff`; configuration
  + refunds + discounts above a threshold + void after payment must require
  `admin` via `require_role("admin")`.
- **TypeScript strict**: no `any` unless you justify it with a comment.
- **Data fetching**: TanStack Query only. No raw `useEffect + fetch`.
- **Tests ship with the feature**: pytest for backend, vitest +
  `@testing-library/react` for frontend. Integration tests use in-memory
  SQLite via the existing `conftest.py` fixture.
- **Conventional Commits**. One reason per commit.

If anything below contradicts `architecture-spec.md`, the spec wins — flag the
contradiction in the PR description and ask before deviating.

---

## 2. Backend — New / Upgraded Data Model

Add Alembic migrations for everything below. Update `app/models/__init__.py`
exports. Add matching Pydantic schemas in `app/schemas/`.

### 2.1 Extend `Order`

Add the following fields (all nullable / defaulted so existing rows survive):

- `order_number: str` — human-friendly daily-rolling number, e.g. `20260528-0042`.
  Generate in the service layer, unique per day. Index it.
- `channel: OrderChannel` enum: `DINE_IN`, `TAKEAWAY`, `DELIVERY`. Default
  `TAKEAWAY`. Index it.
- `table_number: str | None` — free-text, max 16 chars (e.g. `A3`).
- `customer_id: int | None` — FK to new `customers` table (Section 2.6).
- `subtotal: Decimal` — sum of line totals **before** discounts and tax.
- `discount_total: Decimal` — sum of all order-level + line-level discounts.
- `service_charge: Decimal` — default `0.00`.
- `service_charge_rate: Decimal` — snapshot of the rate at sale time
  (e.g. `0.10`), so historical bills are correct if the rate changes later.
- `tax_total: Decimal` — VAT amount.
- `tax_rate: Decimal` — snapshot of the rate at sale time (e.g. `0.07`).
- `tax_inclusive: bool` — was VAT included in `unit_price` (Thai default)
  or added on top? Snapshot from settings at the time of sale.
- `tip_total: Decimal` — default `0.00`.
- `rounding_adjustment: Decimal` — default `0.00` (e.g. round to nearest 1 THB).
- `paid_total: Decimal` — sum of payments minus refunds.
- `change_due: Decimal` — default `0.00`.
- `closed_at: datetime | None` — when the bill was finalized to `paid`.
- `voided_at: datetime | None`, `voided_by_user_id: int | None`, `void_reason: str | None`.
- `cashier_shift_id: int | None` — FK to `cashier_shifts` (Section 2.7).
- `parent_order_id: int | None` — used when an order is split into multiple bills.

Add `OrderStatus` values: keep `OPEN`, `PAID`, `VOIDED`, `REFUNDED`, and add
`HOLD` (parked / saved-for-later ticket) and `PARTIALLY_REFUNDED`.

### 2.2 Extend `OrderItem`

- `note: str | None` — line-level note, max 255 chars (e.g. "no ice").
- `discount_amount: Decimal` — discount applied to this single line.
- `is_voided: bool` — line-level void (kitchen already started but customer
  cancelled). Voided lines stay in the bill for audit but don't count toward
  totals and reverse their stock movement.
- `voided_reason: str | None`
- `kitchen_status: KitchenStatus` enum: `PENDING`, `PREPARING`, `READY`,
  `SERVED`, `CANCELLED`. Default `PENDING`.
- `kds_ticket_id: int | None` — FK to `kds_tickets` (Section 2.8).
- `seat_number: int | None` — for split-by-seat dine-in.

### 2.3 Extend `Modifier` and recipe wiring

- Allow a modifier to have its own optional `Recipe` rows (e.g. "extra shot"
  consumes 7g coffee beans). Reuse the existing `Recipe` table by adding an
  optional `modifier_id: int | None` and making `product_id` nullable, with a
  CHECK constraint that exactly one of `product_id` / `modifier_id` is set.
  (If a CHECK is hard with SQLite, enforce in `recipe_service`.)
- Modifier groups: add a new `modifier_groups` table
  (`id, name, min_select, max_select, is_required, sort_order`). Move
  `Modifier.group: str` to a real `group_id: int` FK. Update `MenuRead`
  payloads so the POS can render proper group UI (radio for `max_select=1`,
  checkbox for `max_select>1`, required vs optional).

### 2.4 New: `Discount` + `OrderDiscount` + `OrderItemDiscount`

```
discounts: id, code, name, scope (ORDER | ITEM), type (PERCENT | AMOUNT),
           value (Decimal), starts_at, ends_at, min_order_amount,
           max_discount_amount, requires_admin, is_active
order_discounts: id, order_id, discount_id (nullable for ad-hoc), name,
                 type, value, amount_off, applied_by_user_id, reason
order_item_discounts: id, order_item_id, discount_id (nullable), type,
                      value, amount_off, applied_by_user_id, reason
```

Ad-hoc discounts (no code) must record `applied_by_user_id` and `reason`.
Discounts above a configurable threshold (e.g. 20% or ฿100) require admin
auth — enforce in `discount_service`.

### 2.5 New: `Refund` + `RefundItem`

```
refunds: id, order_id, refund_number, amount, reason, refunded_by_user_id,
         created_at, cashier_shift_id
refund_items: id, refund_id, order_item_id, qty, amount, restock (bool)
```

When `restock=true`, reverse the stock movements for that item's recipe
(create new `StockMovement` rows with `type=RETURN`). When `restock=false`,
log a `StockMovement` with `type=ADJUSTMENT` and a reason like
"refund-no-restock". Mark the parent order `REFUNDED` or
`PARTIALLY_REFUNDED` based on whether the full bill was refunded.

### 2.6 New: `Customer`

```
customers: id, code (auto), name, phone (unique nullable), email (nullable),
           note, loyalty_points, total_spend, total_visits, last_visit_at,
           is_active, created_at, updated_at
```

Loyalty: 1 point per ฿20 spent (configurable in settings). Points
redemption is a discount type (`type=POINTS`) — 100 points = ฿10 (configurable).

### 2.7 New: `CashierShift`

```
cashier_shifts: id, user_id, opening_float, closing_cash_counted,
                expected_cash, cash_variance, opened_at, closed_at,
                closing_note
```

A user must open a shift before creating orders (enforce in
`order_service`). Closing a shift computes `expected_cash` from CASH
payments minus CASH refunds plus opening float, and stores the user-counted
cash + variance.

### 2.8 New: `KdsTicket`

```
kds_tickets: id, order_id, station (BAR | KITCHEN), printed_at, bumped_at,
             status (NEW | IN_PROGRESS | DONE)
```

When an order moves from HOLD or OPEN to "send to kitchen", create a ticket
per station based on each item's category-to-station mapping
(category gets a `default_station` field, default `BAR`).

### 2.9 Extend `Payment`

- Add `reference: str | None` — last-4 of card, QR ref, slip number, etc.
- Add `tendered_amount: Decimal | None` — for cash, the amount the customer
  handed over (so we can compute and store change_due).
- Add `is_refund: bool` (default false). A refund row has a negative amount.
- Add `voided: bool` + `voided_at`.

### 2.10 New: `Settings` (key/value)

```
settings: key (PK), value_json, updated_at
```

Used for: store name + address + tax_id (for receipt header), VAT rate,
service-charge rate, currency, rounding mode, loyalty config, receipt
footer text, printer config, default channel. Service reads via cached
helper; admin-only write endpoint.

### 2.11 New: `AuditLog`

```
audit_logs: id, user_id, action, entity_type, entity_id, payload_json,
            ip_address, created_at
```

Log: voids, refunds, manual discounts, price overrides, shift open/close,
settings changes. Service helper `audit_service.record(...)`.

---

## 3. Backend — New / Upgraded APIs

All under `/api/v1/`. Every route has `response_model`. Every mutating route
takes `CurrentUserDep`. Add tests in `backend/tests/test_<feature>.py`.

### 3.1 Orders / Cart (extend)

- `POST /orders/` — extend body to accept: `channel`, `table_number`,
  `customer_id`, per-item `note`, per-item `seat_number`, order-level
  discounts (list), item-level discounts, ad-hoc discount with reason,
  `tip` (optional). Service computes `subtotal`, `discount_total`,
  `service_charge`, `tax_total`, `total`, `change_due` if cash.
- `POST /orders/{id}/hold` — move OPEN → HOLD. Stock has not yet been
  deducted in HOLD state (see 3.2).
- `POST /orders/{id}/resume` — move HOLD → OPEN.
- `PATCH /orders/{id}/items` — add/edit/remove items while OPEN or HOLD.
- `POST /orders/{id}/send-to-kitchen` — generate KDS tickets; deduct stock
  here (not at order create), atomically. After send, lines can no longer be
  freely removed — only voided with reason.
- `POST /orders/{id}/discounts` — apply order-level discount.
- `DELETE /orders/{id}/discounts/{discount_id}` — remove (admin if applied
  by another user).
- `POST /orders/{id}/items/{item_id}/discounts` — line-level discount.
- `POST /orders/{id}/items/{item_id}/void` — line void with reason; reverses
  stock movements. Admin-only after kitchen sent.
- `POST /orders/{id}/pay` — body: list of `{method, amount, reference,
  tendered_amount}`. Validates that `sum(amount) >= total`. Computes
  `change_due` for cash. Moves order to `PAID`, sets `closed_at`,
  associates `cashier_shift_id`.
- `POST /orders/{id}/void` — whole-bill void (admin); reverses stock if
  kitchen-sent. Records `voided_by_user_id`, `void_reason`.
- `POST /orders/{id}/split` — body: list of "child carts" (item-id +
  quantity slices). Creates N new orders with `parent_order_id=id`. Useful
  for split-by-customer.
- `POST /orders/{id}/merge` — body: `target_order_id`. Merges items in.
- `GET /orders/recent?limit=50` — last N orders, with status filter.
- `GET /orders/{id}/receipt` — returns receipt-friendly DTO (lines, taxes,
  payments, store header, footer).

### 3.2 Stock-deduction timing change

Right now stock is deducted when the order is created. Change to: stock is
deducted when the order is **sent to kitchen** (or paid, whichever first).
A HOLD ticket never holds stock. A modifier with its own recipe deducts
its ingredients in the same transaction. Update `order_service.create_order`
accordingly and update `tests/test_order_service.py`.

### 3.3 Refunds

- `POST /refunds/` — body: `order_id`, `items[]` (with `restock` flag),
  `reason`. Computes refund amount, writes Refund + RefundItems, reverses
  stock if restock, creates a negative-amount Payment row for the refunded
  method, updates parent order status.
- `GET /refunds/` and `GET /refunds/{id}`.

### 3.4 Customers

- `POST /customers/`, `GET /customers/?q=...&limit=50`, `GET /customers/{id}`,
  `PATCH /customers/{id}`, `DELETE /customers/{id}` (soft).
- `GET /customers/{id}/orders` — order history.
- `POST /customers/{id}/loyalty/redeem` — body: `points`. Returns the
  discount amount applicable; service flags the customer to apply
  next-bill.

### 3.5 Shifts

- `POST /shifts/open` — body: `opening_float`. Reject if a shift is already
  open for this user.
- `POST /shifts/close` — body: `closing_cash_counted`, `closing_note`.
  Returns the computed variance.
- `GET /shifts/current` — current open shift for the calling user.
- `GET /shifts/?user_id=&date_from=&date_to=` — admin only.

### 3.6 Cash Drawer

- `POST /cash-drawer/movements` — body: `type` (`PAY_IN` | `PAY_OUT`),
  `amount`, `reason`. Writes to a `cash_movements` table tied to the open
  shift.

### 3.7 KDS

- `GET /kds/tickets?station=&status=` — for the kitchen display.
- `POST /kds/tickets/{id}/bump` — mark DONE.
- `POST /kds/tickets/{id}/recall` — back to IN_PROGRESS.

### 3.8 Discounts management (admin)

- CRUD under `/discounts/`.
- `GET /discounts/applicable?subtotal=&channel=` — what's currently valid.

### 3.9 Settings

- `GET /settings/`, `PATCH /settings/` (admin).

### 3.10 Receipts / Printing

- `GET /orders/{id}/receipt.pdf` — server-rendered receipt PDF for emailing
  or 80mm thermal printer. Use ReportLab or WeasyPrint. Keep it
  feature-flagged via setting `receipt_pdf_enabled`.

### 3.11 Quick-search / Barcode

- `GET /products/lookup?code=` — match by SKU/barcode. Add `sku` and
  `barcode` columns to `products` (indexed, unique-when-not-null).

---

## 4. Backend — Service Layer Behaviour Rules

- `order_service.calculate_totals(order, settings, discounts)` is the **only**
  place totals are computed. Routers do not compute totals. Tests cover:
  tax inclusive vs exclusive, percentage vs amount discounts, line vs order
  discounts, service charge applied before or after VAT depending on Thai
  rules (default: service charge first, then VAT on (subtotal + service);
  expose via setting `service_charge_before_vat=true`).
- Rounding: at the end, round the bill total to 2 decimals using
  `ROUND_HALF_UP`; if `rounding_mode=NEAREST_BAHT`, round to whole bahts and
  store the delta in `rounding_adjustment`.
- Concurrency: stock check + deduct must hold a row-level lock on
  `stock_levels` (`SELECT ... FOR UPDATE` where supported; on SQLite use the
  default serializable transaction). Add a regression test that runs two
  concurrent `send-to-kitchen` calls on the same low-stock ingredient and
  asserts exactly one succeeds.
- Idempotency: `POST /orders/` and `POST /orders/{id}/pay` accept an
  `Idempotency-Key` header. Store recent keys in a small `idempotency_keys`
  table (TTL 24h) and replay the prior response if the same key arrives
  again.

---

## 5. Frontend — UX Redesign (the big one)

The current POS page is a basic 2-column grid. Replace with a touch-first
layout. Use shadcn/ui primitives — install any missing ones (`tabs`,
`sheet`, `dialog`, `drawer`, `tooltip`, `command`, `popover`, `scroll-area`,
`separator`, `badge`, `skeleton`, `toggle-group`). Keep everything in
`src/features/pos/`.

### 5.1 Page layout (desktop ≥1280, also usable on tablet)

Three columns:

```
┌──────────────┬──────────────────────────────┬──────────────────────┐
│  Category    │     Menu grid + search       │   Cart / Ticket      │
│  rail        │     + filter chips           │   + totals + actions │
│  (icons +    │                              │                      │
│   counts)    │                              │                      │
└──────────────┴──────────────────────────────┴──────────────────────┘
```

- Left rail: vertical list of categories with icons + product count + an
  "All" entry. Sticky. Keyboard arrows navigate.
- Middle: search bar (autofocuses, `/` keyboard shortcut), filter chips
  ("Hot", "Iced", "Promo", "New"), then a responsive product grid. Each
  card shows an image (or category-fallback emoji), name, price, a small
  "ADD" affordance and a tiny dot if the item has required modifiers.
- Right: current ticket (cart). Sticky. Scrollable item list. Footer with
  subtotal / discount / service / VAT / total and **two primary buttons**:
  "Hold" and "Charge".
- A top sub-bar shows: order number (or "New Sale"), channel selector
  (Dine-in / Takeaway / Delivery as a `ToggleGroup`), table-number input
  (shown only if dine-in), customer chip (click to attach customer), and a
  "Held Tickets" button with a badge for count.

### 5.2 Product card

Refactor `ProductCard.tsx` to:

- Replace the outline "Add to cart" button with a full-bleed clickable
  card (large touch target). The "Add" button shows only on hover/focus.
- Show a small "Out of stock" badge if any recipe ingredient is below
  required stock. Disable click in that case.
- Show a "PROMO" badge if any active discount applies.

### 5.3 Modifier dialog

New component `features/pos/components/ModifierDialog.tsx`. Opens when a
product with modifiers is tapped. Renders modifier groups according to the
new schema (`min_select`, `max_select`, `is_required`). Bottom bar shows
running price with deltas. Confirm adds the configured line to the cart.

### 5.4 Cart / Ticket panel

Rebuild `Cart.tsx` to look like a thermal receipt preview:

- Each line shows: product name (bold), modifiers (indented, smaller), note
  (italic, smaller). Right-aligned qty + line subtotal.
- Tap a line opens a `Sheet` from the right with: qty stepper (big +/-),
  inline edit modifiers, line discount, line note, remove. No more tiny
  trash icon as the only action.
- Footer breakdown:
  - Subtotal
  - – Item discounts
  - – Order discount (chip showing the applied coupon, X to remove)
  - + Service charge (X%) — only if enabled and channel = dine-in
  - + VAT (X%) — line says "incl." or "added" based on setting
  - Tip (optional row, click to set)
  - Rounding (if non-zero)
  - **Total** in big bold
- Two big buttons: `Hold` (secondary) and `Charge` (primary). Keyboard
  shortcut `F8` = Hold, `F9` = Charge.

### 5.5 Payment dialog

`features/pos/components/PaymentDialog.tsx`. Multi-tender flow:

- Top: total due, change due (computed live).
- Method tabs (Cash / QR PromptPay / Card / Other). Each tab has its own
  body:
  - Cash: number pad + quick-amount chips (฿100, ฿500, ฿1,000, exact
    amount). Live `change_due`. "Add tender" appends a row.
  - QR PromptPay: shows a QR canvas (use the `qrcode` library; payload from
    backend `/payments/promptpay/qr?amount=`). "Mark as paid" only when
    cashier confirms slip. Optional reference field.
  - Card: amount + reference (last 4).
  - Other: free-form amount + reference + note.
- Below: list of tenders added so far with remove buttons.
- Submit when paid >= total. Shows a success screen with a receipt
  preview and three actions: "Print", "Email", "New sale".
- Esc closes; warn if there are uncommitted tenders.

### 5.6 Held tickets drawer

`features/pos/components/HeldTicketsDrawer.tsx`. A `Sheet` from the right
listing all HOLD orders for the active shift. Each row shows order
number, channel, table, customer name, total, age, and a "Resume" button.

### 5.7 Customer attach dialog

`features/pos/components/CustomerSearchDialog.tsx`. Uses shadcn `Command`
for search-as-you-type. "Walk-in" is the default. New-customer inline
form (name + phone). Once attached, the customer chip in the sub-bar
shows their name + loyalty points and offers a "Redeem points" action.

### 5.8 Quick search / barcode

A `Command` palette opens on `Ctrl/Cmd+K` from the POS page: type product
name or scan a barcode (USB scanners just type the code + Enter). On
Enter, the item is added to the cart with its default modifiers.

### 5.9 Numeric keypad component

Reusable `components/ui/Keypad.tsx` for tablet use — used inside payment
dialog and any qty input. Big buttons, 0–9, dot, clear, backspace.

### 5.10 Receipt preview

`features/pos/components/ReceiptPreview.tsx`. 80mm-width-styled component
fed by `/orders/{id}/receipt`. Print uses `window.print()` with a
print-only stylesheet (`@media print`). Test snapshot included.

### 5.11 Shift open/close screens

New route `/shift`. When a user logs in and has no open shift, the POS
redirects here. UI: opening float input → "Open shift". Closing UI shows
expected vs counted with a delta.

### 5.12 KDS view

New route `/kds` (staff-visible). Two columns (BAR / KITCHEN). Each ticket
shows order number, table, items + modifiers + notes, time since printed
(colored: <5min green, 5–10 yellow, >10 red). Tap = bump. Long-press =
recall.

### 5.13 Styling system

- Define design tokens in `src/index.css`: primary brand colour, surface,
  surface-strong, success, warning, danger, neutral palette. Stop using
  raw `slate-*` everywhere. Use Tailwind theme vars.
- Replace the white-on-near-white header with a dark "command bar"
  feel for the POS route specifically: dark slate top sub-bar with the
  channel toggle and order number; keep the global header.
- Cards: subtle border + shadow on hover, generous padding, rounded-xl.
- Buttons: minimum 44px height on POS surfaces (touch target).
- Typography: keep Inter; bump the cart total to `text-3xl`,
  use `tabular-nums` everywhere money appears.
- Add a "Compact" / "Comfortable" density toggle stored in user prefs
  (Zustand persisted to localStorage).
- Make sure all states have skeleton, empty, and error UI — no blank
  screens.

### 5.14 Keyboard shortcuts (POS route)

| Key | Action |
| --- | --- |
| `/` | Focus search |
| `Ctrl/Cmd+K` | Open command palette |
| `F2` | Open customer search |
| `F4` | Toggle channel |
| `F8` | Hold ticket |
| `F9` | Charge |
| `Esc` | Close any dialog / clear search |
| `+` / `-` | Inc/dec qty on selected line |
| `Del` | Remove selected line |

Document the cheatsheet in a `?` icon popover in the POS sub-bar.

### 5.15 Toast + error UX

Use `sonner` (already installed). Backend error contract returns
`{code, message}`. Render `message` in toast; show inline form errors
when the code maps to a field (e.g. `insufficient_stock:Milk` highlights
the offending line).

---

## 6. State management updates

`src/features/pos/stores/cartStore.ts` is too simple. Replace with a
ticket store that supports:

```ts
interface TicketLine {
  uid: string                 // local UUID — multiple lines of the same
                              // product with different modifiers must coexist
  product: Product
  qty: number
  unit_price: number          // snapshot, allows manual override (admin)
  modifiers: SelectedModifier[]
  note?: string
  line_discount?: Discount
  seat_number?: number
}

interface TicketState {
  orderId?: number            // server-side id once persisted (Hold/Send)
  orderNumber?: string
  channel: 'dine_in' | 'takeaway' | 'delivery'
  tableNumber?: string
  customer?: CustomerSummary
  lines: TicketLine[]
  orderDiscount?: Discount
  tip?: number
  // actions: add, updateQty, updateModifiers, setNote, applyLineDiscount,
  // applyOrderDiscount, setCustomer, setTable, setChannel, hold, resume,
  // sendToKitchen, charge, clear …
}
```

Persist to `localStorage` so a browser refresh during a sale doesn't lose
the cart. Clear on `charge` success.

A second store `useShiftStore` tracks the current open shift.

---

## 7. Milestone Plan (commit per milestone)

Work in this order. Each milestone = a single PR/branch with tests and a
conventional commit. Do **not** merge milestones together.

1. `feat(orders): add order_number, channel, table_number, totals breakdown`
   — schema + migration + extend `OrderCreate`/`OrderRead` + service
   recomputes totals + tests.
2. `feat(orders): modifier groups + modifier recipes`
   — modifier_groups table + Recipe.modifier_id + service consumes modifier
   ingredients on send-to-kitchen.
3. `feat(orders): hold / resume / send-to-kitchen lifecycle`
   — new statuses + endpoints + stock-deduction-timing change.
4. `feat(discounts): discount engine (order + line, manual + coded)`
   — Discount models + endpoints + audit log + admin threshold.
5. `feat(payments): multi-tender + change_due + idempotency`
   — Payment extensions + `POST /orders/{id}/pay` + tests for split tender.
6. `feat(refunds): partial refund + restock`
   — Refund + RefundItem + endpoints + stock reversal + tests.
7. `feat(customers): customers + loyalty`
   — Customer model + endpoints + redemption discount type.
8. `feat(shifts): cashier shifts + cash drawer movements`
   — Shift model + open/close + cash variance + drawer movements.
9. `feat(kds): KDS tickets + endpoints`
   — Ticket model + bump/recall + station-by-category mapping.
10. `feat(settings): store settings + audit log`
    — Settings KV + AuditLog + helper.
11. `feat(receipts): receipt DTO + PDF`
    — Receipt endpoint + ReportLab/WeasyPrint PDF behind a setting flag.
12. `feat(pos-ui): three-column layout + category rail + search`
    — Frontend layout rebuild.
13. `feat(pos-ui): modifier dialog + line sheet + cart redesign`
14. `feat(pos-ui): payment dialog (multi-tender + change due)`
15. `feat(pos-ui): held tickets + customer attach + barcode lookup`
16. `feat(pos-ui): receipt preview + print`
17. `feat(pos-ui): shift open/close screens`
18. `feat(pos-ui): KDS view`
19. `feat(pos-ui): design tokens + density + keyboard shortcuts`
20. `chore(pos): docs + screenshots + admin onboarding guide`

If a milestone reveals a real conflict with `architecture-spec.md`,
update the spec in the **same** commit that introduces the conflict and
explain why in the commit body.

---

## 8. Testing Requirements

For every milestone:

- Backend: at least one happy-path test + edge cases (insufficient
  stock, tax inclusive vs exclusive, percent vs amount discount, refund
  with and without restock, shift not open rejection, concurrent
  send-to-kitchen). Use the existing in-memory SQLite fixture.
- Frontend: at least one render test per new component + one interaction
  test for the critical flow (e.g. add → modifier → cart → charge cash →
  toast success). Use vitest + Testing Library.
- Run `ruff check && ruff format --check && mypy app && pytest` (backend)
  and `pnpm lint && pnpm typecheck && pnpm test` (frontend) before every
  commit. Don't merge if any are red.

---

## 9. Out of Scope (do not silently add)

- Multi-store / multi-tenant.
- Online ordering / e-commerce storefront.
- Inventory purchase orders (already covered by existing AI suggestions —
  leave as is).
- Driver dispatch / delivery routing.
- New auth providers / SSO.

If you think one of these is necessary for a milestone, stop and ask
before adding it.

---

## 10. Acceptance Criteria — Definition of Done

A milestone is "done" only when:

1. Tests added and passing locally.
2. `mypy` clean for backend, `tsc --noEmit` clean for frontend.
3. New endpoints documented in OpenAPI (FastAPI auto) and visible in
   `/docs`.
4. The POS page can be used for a realistic sale flow end-to-end at every
   milestone — meaning: after milestone N, never leave the POS broken.
5. A short PR description with: what changed, why, screenshots (for UI
   work), and a "spec deltas" section if `architecture-spec.md` had to be
   updated.

---

## 11. First Action

Open a new branch `feat/pos-pro-upgrade-m1` and start with **Milestone 1**.
Before writing code, write the Alembic migration draft and the updated
`OrderCreate` / `OrderRead` schemas, post them in the chat for review, and
only then implement the service changes + tests.
