"""v1 API router aggregator. Sub-routers are mounted here per milestone."""

from fastapi import APIRouter

from app.api.v1 import (
    ai,
    auth,
    dashboard,
    discounts,
    ingredients,
    inventory,
    modifier_groups,
    orders,
    products,
    recipes,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(products.router)
api_router.include_router(ingredients.router)
api_router.include_router(modifier_groups.router)
api_router.include_router(recipes.router)
api_router.include_router(inventory.router)
api_router.include_router(orders.router)
api_router.include_router(discounts.router)
api_router.include_router(dashboard.router)
api_router.include_router(ai.router)
