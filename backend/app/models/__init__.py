"""Re-export every model + enum so consumers can ``from app.models import ...``."""

from app.models.audit import AuditLog
from app.models.customer import Customer
from app.models.discount import (
    Discount,
    DiscountScope,
    DiscountType,
    OrderDiscount,
    OrderItemDiscount,
)
from app.models.idempotency import IdempotencyKey
from app.models.ingredient import Ingredient, Unit
from app.models.inventory import MovementType, StockLevel, StockMovement, Waste
from app.models.kds import KdsStatus, KdsTicket, Station
from app.models.order import (
    KitchenStatus,
    Order,
    OrderChannel,
    OrderItem,
    OrderItemModifier,
    OrderStatus,
)
from app.models.payment import Payment, PaymentMethod
from app.models.product import (
    Category,
    Modifier,
    ModifierGroup,
    Product,
    ProductModifierLink,
)
from app.models.recipe import Recipe
from app.models.refund import Refund, RefundItem
from app.models.shift import CashierShift, CashMovement, CashMovementType
from app.models.user import Role, User

__all__ = [
    "AuditLog",
    "CashMovement",
    "CashMovementType",
    "CashierShift",
    "Category",
    "Customer",
    "Discount",
    "DiscountScope",
    "DiscountType",
    "IdempotencyKey",
    "Ingredient",
    "KdsStatus",
    "KdsTicket",
    "KitchenStatus",
    "Modifier",
    "ModifierGroup",
    "MovementType",
    "Order",
    "OrderChannel",
    "OrderDiscount",
    "OrderItem",
    "OrderItemDiscount",
    "OrderItemModifier",
    "OrderStatus",
    "Payment",
    "PaymentMethod",
    "Product",
    "ProductModifierLink",
    "Recipe",
    "Refund",
    "RefundItem",
    "Role",
    "Station",
    "StockLevel",
    "StockMovement",
    "Unit",
    "User",
    "Waste",
]
