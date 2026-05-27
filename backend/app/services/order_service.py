"""Order creation — single transaction that deducts stock per BOM.

Spec section 4 (Database):

    เมื่อสร้าง Order:
      สำหรับแต่ละ OrderItem:
        ดึง Recipe ของ product นั้น
        สำหรับแต่ละบรรทัดสูตร:
          ลด StockLevel ของ ingredient ตาม (qty ในสูตร x จำนวนที่สั่ง)
          บันทึก StockMovement type=sale
      ทำใน transaction เดียว (ถ้าพังให้ rollback ทั้งหมด)

We follow that exactly: check first, then write — all without an interim
commit. If anything raises before the final ``session.commit()`` SQLAlchemy
rolls the whole transaction back.
"""

from collections import defaultdict
from collections.abc import Sequence
from decimal import Decimal

from sqlmodel import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models import (
    Ingredient,
    Modifier,
    MovementType,
    Order,
    OrderItem,
    OrderItemModifier,
    OrderStatus,
    Product,
    StockLevel,
    StockMovement,
)
from app.repositories import inventory_repo, order_repo
from app.schemas.order import OrderItemCreate
from app.utils.datetime import now_utc


def get_or_404(session: Session, order_id: int) -> Order:
    order = order_repo.repository.get(session, order_id)
    if order is None:
        raise NotFoundError("order_not_found")
    return order


def list_recent(
    session: Session,
    *,
    user_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> Sequence[Order]:
    return order_repo.list_recent(session, user_id=user_id, offset=offset, limit=limit)


def create_order(
    session: Session,
    *,
    user_id: int,
    items_in: list[OrderItemCreate],
    note: str | None = None,
) -> Order:
    """Create Order + items + deduct stock per BOM. All-or-nothing."""

    # ── 1. Resolve products + compute ingredient requirements ────────
    products_by_id: dict[int, Product] = {}
    requirements: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))

    for item_in in items_in:
        product = session.get(Product, item_in.product_id)
        if product is None or not product.is_active:
            raise NotFoundError(f"product_not_found:{item_in.product_id}")
        products_by_id[product.id] = product  # type: ignore[index]
        for recipe in product.recipes:
            requirements[recipe.ingredient_id] += recipe.qty * item_in.qty

    # ── 2. Stock availability check (no writes yet) ──────────────────
    stocks_by_ingredient: dict[int, StockLevel] = {}
    for ingredient_id, required in requirements.items():
        stock = inventory_repo.get_stock(session, ingredient_id)
        if stock is None or stock.quantity < required:
            ingredient = session.get(Ingredient, ingredient_id)
            name = ingredient.name if ingredient else f"ingredient:{ingredient_id}"
            raise ConflictError(f"insufficient_stock:{name}")
        stocks_by_ingredient[ingredient_id] = stock

    # ── 3. Resolve modifiers (need price_delta snapshot) ─────────────
    modifiers_by_id: dict[int, Modifier] = {}
    for item_in in items_in:
        for mod_id in item_in.modifier_ids:
            if mod_id in modifiers_by_id:
                continue
            modifier = session.get(Modifier, mod_id)
            if modifier is None:
                raise NotFoundError(f"modifier_not_found:{mod_id}")
            modifiers_by_id[mod_id] = modifier

    # ── 4. Build Order + items + item modifiers ──────────────────────
    order = Order(user_id=user_id, status=OrderStatus.OPEN, note=note)
    session.add(order)
    session.flush()  # populate order.id
    assert order.id is not None

    total = Decimal("0.00")
    for item_in in items_in:
        product = products_by_id[item_in.product_id]
        item = OrderItem(
            order_id=order.id,
            product_id=product.id,  # type: ignore[arg-type]
            qty=item_in.qty,
            unit_price=product.price,
        )
        session.add(item)
        session.flush()  # populate item.id
        assert item.id is not None

        line_total = product.price * item_in.qty
        for mod_id in item_in.modifier_ids:
            modifier = modifiers_by_id[mod_id]
            session.add(
                OrderItemModifier(
                    order_item_id=item.id,
                    modifier_id=mod_id,
                    price_delta=modifier.price_delta,
                )
            )
            line_total += modifier.price_delta * item_in.qty
        total += line_total

    order.total = total
    order.updated_at = now_utc()

    # ── 5. Deduct stock + record sale movements ──────────────────────
    for ingredient_id, required in requirements.items():
        stock = stocks_by_ingredient[ingredient_id]
        stock.quantity = stock.quantity - required
        stock.updated_at = now_utc()
        session.add(stock)
        session.add(
            StockMovement(
                ingredient_id=ingredient_id,
                type=MovementType.SALE,
                qty=-required,
                ref=f"order:{order.id}",
                user_id=user_id,
            )
        )

    # ── 6. Commit once at the end ────────────────────────────────────
    session.commit()
    session.refresh(order)
    return order
