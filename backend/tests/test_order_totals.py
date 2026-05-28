"""Unit tests for ``order_service.calculate_totals``.

Exhaustive across the four mode combinations the spec calls out:

    tax_inclusive ∈ {True, False}
    service_charge_before_vat ∈ {True, False}     (only meaningful when rate>0)
    rounding_mode ∈ {TWO_DECIMALS, NEAREST_BAHT}

Discounts are M4 — covered there. M1 keeps ``discount_total=0``.
"""

from decimal import Decimal

import pytest

from app.core.config import Settings
from app.services.order_service import calculate_totals


def _settings(**overrides: object) -> Settings:
    s = Settings()
    for k, v in overrides.items():
        setattr(s, k, v)
    return s


# ── Happy path: Thai default (incl 7%, no service, two-decimal) ──────


def test_totals_inclusive_7pct_no_service() -> None:
    out = calculate_totals(Decimal("100.00"), settings=_settings())
    assert out.subtotal == Decimal("100.00")
    assert out.service_charge == Decimal("0.00")
    # 100 - 100/1.07 = 6.5420... → 6.54
    assert out.tax_total == Decimal("6.54")
    assert out.tax_inclusive is True
    assert out.total == Decimal("100.00")
    assert out.rounding_adjustment == Decimal("0.00")


# ── Tax-inclusive + service charge (Thai dine-in scenario) ───────────


def test_totals_inclusive_with_10pct_service() -> None:
    settings = _settings(pos_service_charge_rate=Decimal("0.10"))
    out = calculate_totals(Decimal("200.00"), settings=settings)
    # service on inclusive subtotal: 200 * 10% = 20
    assert out.service_charge == Decimal("20.00")
    # gross_pre_tip = 220; tax = 220 - 220/1.07 = 14.3925... → 14.39
    assert out.tax_total == Decimal("14.39")
    assert out.total == Decimal("220.00")


# ── Tax-exclusive: service first vs VAT first ────────────────────────


def test_totals_exclusive_service_first() -> None:
    settings = _settings(
        pos_tax_inclusive=False,
        pos_service_charge_rate=Decimal("0.10"),
        pos_service_charge_before_vat=True,
    )
    out = calculate_totals(Decimal("100.00"), settings=settings)
    # service on subtotal: 10. tax on (100+10)*7% = 7.70
    assert out.service_charge == Decimal("10.00")
    assert out.tax_total == Decimal("7.70")
    assert out.total == Decimal("117.70")


def test_totals_exclusive_vat_first() -> None:
    settings = _settings(
        pos_tax_inclusive=False,
        pos_service_charge_rate=Decimal("0.10"),
        pos_service_charge_before_vat=False,
    )
    out = calculate_totals(Decimal("100.00"), settings=settings)
    # tax on subtotal: 7. service on (100+7)*10% = 10.70
    assert out.tax_total == Decimal("7.00")
    assert out.service_charge == Decimal("10.70")
    assert out.total == Decimal("117.70")  # commutative for these rates


# ── Tip flows into total but not into the taxable base ───────────────


def test_totals_tip_added_after_tax() -> None:
    out = calculate_totals(Decimal("100.00"), tip=Decimal("15.00"), settings=_settings())
    # inclusive: total = subtotal + tip = 115. tax unchanged (tip not taxed).
    assert out.tip_total == Decimal("15.00")
    assert out.total == Decimal("115.00")
    assert out.tax_total == Decimal("6.54")


# ── Discounts placeholder (M4 will populate; M1 just forwards 0) ─────


def test_totals_discount_reduces_base() -> None:
    out = calculate_totals(
        Decimal("200.00"),
        discount_total=Decimal("50.00"),
        settings=_settings(),
    )
    # base = 150; total inclusive = 150.
    assert out.discount_total == Decimal("50.00")
    assert out.total == Decimal("150.00")
    # tax extracted from inclusive: 150 - 150/1.07 = 9.81
    assert out.tax_total == Decimal("9.81")


# ── Rounding: NEAREST_BAHT stores the delta ──────────────────────────


def test_totals_round_to_nearest_baht() -> None:
    settings = _settings(pos_rounding_mode="NEAREST_BAHT")
    # 65 * 3 = 195 already whole — pick something with a fractional baht.
    out = calculate_totals(Decimal("99.40"), settings=settings)
    assert out.total == Decimal("99.00")
    assert out.rounding_adjustment == Decimal("-0.40")

    out2 = calculate_totals(Decimal("99.60"), settings=settings)
    assert out2.total == Decimal("100.00")
    assert out2.rounding_adjustment == Decimal("0.40")


# ── Money is always Decimal, never float ─────────────────────────────


@pytest.mark.parametrize(
    "field",
    [
        "subtotal",
        "discount_total",
        "service_charge",
        "tax_total",
        "tip_total",
        "rounding_adjustment",
        "total",
    ],
)
def test_totals_returns_decimal_for_money(field: str) -> None:
    out = calculate_totals(Decimal("123.45"), settings=_settings())
    assert isinstance(getattr(out, field), Decimal)
