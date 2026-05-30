"""Application settings loaded from environment / .env via pydantic-settings."""

from decimal import Decimal
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ────────────────────────────────────────────────────────
    app_env: str = "dev"
    app_name: str = "SmartBrew POS API"
    app_version: str = "0.1.0"
    log_level: str = "INFO"

    # ── Security ───────────────────────────────────────────────────
    app_secret_key: str = "change-me-to-a-random-64-hex-string"  # noqa: S105 — placeholder; must be set in .env
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    refresh_cookie_name: str = "sb_refresh"
    refresh_cookie_secure: bool = True
    refresh_cookie_samesite: str = "lax"

    # ── CORS ───────────────────────────────────────────────────────
    cors_allow_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # ── Database ───────────────────────────────────────────────────
    database_url: str = "sqlite:///./smartbrew.db"
    sql_echo: bool = False

    # ── Rate limit ─────────────────────────────────────────────────
    rate_limit_login: str = "10/minute"

    # ── POS totals (M1 defaults; migrates to KV settings table in M10) ─
    # Thai default: prices already include VAT → tax_inclusive=true,
    # tax_rate=0.07. Service charge is off by default.
    pos_tax_rate: Decimal = Decimal("0.07")
    pos_tax_inclusive: bool = True
    pos_service_charge_rate: Decimal = Decimal("0.00")
    # Thai accounting practice: service charge first, then VAT on
    # (subtotal + service). Flip if your jurisdiction needs VAT first.
    pos_service_charge_before_vat: bool = True
    # "TWO_DECIMALS" — round bill to 2dp; "NEAREST_BAHT" — round to whole
    # bahts and store the delta in rounding_adjustment.
    pos_rounding_mode: str = "TWO_DECIMALS"

    # ── POS discounts (M4 admin threshold) ──────────────────────────
    # Ad-hoc / per-bill discounts above either threshold force an admin
    # role check. The Discount catalog can also flip ``requires_admin``
    # on individual entries regardless of size.
    pos_discount_admin_threshold_pct: Decimal = Decimal("0.20")  # 20%
    pos_discount_admin_threshold_amount: Decimal = Decimal("100.00")

    # ── POS loyalty (M7) ────────────────────────────────────────────
    # Earn: floor(bill total / N) points per paid bill. Redeem: 1 point
    # converts to M baht of discount, parked for the customer's next bill.
    pos_loyalty_baht_per_earn_point: Decimal = Decimal("20")  # ฿20 spent → 1 pt
    pos_loyalty_baht_per_redeem_point: Decimal = Decimal("0.10")  # 1 pt → ฿0.10

    # ── AI / Ollama ────────────────────────────────────────────────
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"

    # ── Seed ───────────────────────────────────────────────────────
    seed_admin_username: str = "admin"
    seed_admin_password: str = "change-me-on-first-run"  # noqa: S105 — placeholder; override in .env

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance — use as FastAPI dependency."""
    return Settings()
