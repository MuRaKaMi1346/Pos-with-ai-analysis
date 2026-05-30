"""v1 API router aggregator. Sub-routers are mounted here per milestone."""

from fastapi import APIRouter

from app.api.v1 import (
    ai,
    auth,
    cash_drawer,
    customers,
    dashboard,
    discounts,
    ingredients,
    inventory,
    modifier_groups,
    orders,
    products,
    recipes,
    refunds,
    shifts,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(products.router)
api_router.include_router(ingredients.router)
api_router.include_router(modifier_groups.router)
api_router.include_router(recipes.router)
api_router.include_router(inventory.router)
api_router.include_router(orders.router)
api_router.include_router(refunds.router)
api_router.include_router(discounts.router)
api_router.include_router(customers.router)
api_router.include_router(shifts.router)
api_router.include_router(cash_drawer.router)
api_router.include_router(dashboard.router)
api_router.include_router(ai.router)
