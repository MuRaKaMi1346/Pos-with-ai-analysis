"""v1 API router aggregator.

Sub-routers (auth, products, orders, ...) are mounted here as later steps add
them. Step 1 ships the aggregator only.
"""

from fastapi import APIRouter

api_router = APIRouter(prefix="/api/v1")
