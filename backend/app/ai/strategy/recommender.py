"""Combine market basket + margin analysis into prioritized strategy insights."""

from typing import Any

from sqlmodel import Session

from app.ai.strategy import margin, market_basket


def recommend(session: Session, *, days: int = 30) -> list[dict[str, Any]]:
    """Return a flat list of insight dicts (type, title, description, data)."""
    insights: list[dict[str, Any]] = []

    # ── Bundles from market basket ───────────────────────────────────
    rules = market_basket.find_rules(session, days=days, top_n=3)
    for rule in rules:
        ant = ", ".join(rule["antecedent_names"]) or "?"
        con = ", ".join(rule["consequent_names"]) or "?"
        insights.append(
            {
                "type": "bundle",
                "title": f"แนะนำ bundle: {ant} + {con}",
                "description": (
                    f"ลูกค้าที่สั่ง {ant} มีแนวโน้มสั่ง {con} ด้วย "
                    f"(lift {rule['lift']:.1f}x, confidence {rule['confidence'] * 100:.0f}%)"
                ),
                "data": rule,
            }
        )

    # ── Margin: stars + slow movers + high margin ────────────────────
    m = margin.compute(session, days=days)

    for star in m["stars"]:
        insights.append(
            {
                "type": "star",
                "title": f"เมนูดาว: {star['name']}",
                "description": (
                    f"ขายได้ {star['units_sold']} ชิ้นใน {days} วัน "
                    f"กำไรขั้นต้น {star['gross_profit']:.0f} บาท "
                    f"({star['profit_margin'] * 100:.0f}%) — เน้นเชียร์ขาย"
                ),
                "data": star,
            }
        )

    for slow in m["slow_movers"]:
        insights.append(
            {
                "type": "slow_mover",
                "title": f"เมนูขายช้า: {slow['name']}",
                "description": (
                    f"ขายได้แค่ {slow['units_sold']} ชิ้นใน {days} วัน — พิจารณาทำโปรโมชั่นหรือถอดออกจากเมนู"
                ),
                "data": slow,
            }
        )

    # Mark a high-margin item separate from stars when it isn't also a star
    star_ids = {s["product_id"] for s in m["stars"]}
    for hm in m["high_margin"]:
        if hm["product_id"] in star_ids:
            continue
        insights.append(
            {
                "type": "high_margin",
                "title": f"กำไรสูง: {hm['name']}",
                "description": (
                    f"กำไรขั้นต้น {hm['profit_margin'] * 100:.0f}% "
                    f"(ขาย {hm['units_sold']} ชิ้น) — ดันยอดได้อีก"
                ),
                "data": hm,
            }
        )

    return insights
