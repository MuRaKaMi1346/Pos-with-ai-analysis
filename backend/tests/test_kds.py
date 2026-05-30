"""M9 — KDS tickets: station routing + bump/recall."""

from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Category, Modifier, Product, Station


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _create_and_send(
    client: TestClient, token: str, items: list[dict[str, object]]
) -> dict[str, object]:
    create = client.post("/api/v1/orders/", headers=_bearer(token), json={"items": items})
    create.raise_for_status()
    oid = create.json()["id"]
    send = client.post(f"/api/v1/orders/{oid}/send-to-kitchen", headers=_bearer(token))
    send.raise_for_status()
    return send.json()


def _tickets(client: TestClient, token: str, query: str = "") -> list[dict[str, object]]:
    r = client.get(f"/api/v1/kds/tickets{query}", headers=_bearer(token))
    r.raise_for_status()
    return r.json()


def _kitchen_product(session: Session) -> Product:
    """A product whose category routes to the KITCHEN station (no recipe)."""
    cat = Category(name="Food", default_station=Station.KITCHEN)
    session.add(cat)
    session.commit()
    session.refresh(cat)
    product = Product(name="Sandwich", category_id=cat.id, price=Decimal("50.00"))
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


# ── Ticket creation + routing ────────────────────────────────────────


def test_send_creates_one_bar_ticket(
    client: TestClient, admin_token: str, product_latte: Product, stocked_pantry: None
) -> None:
    _ = stocked_pantry
    _create_and_send(client, admin_token, [{"product_id": product_latte.id, "qty": 2}])
    tickets = _tickets(client, admin_token)
    assert len(tickets) == 1
    ticket = tickets[0]
    assert ticket["station"] == "bar"  # Coffee category defaults to BAR
    assert ticket["status"] == "new"
    assert ticket["bumped_at"] is None
    assert ticket["order_number"]
    assert len(ticket["lines"]) == 1
    assert ticket["lines"][0]["product_name"] == "Latte"
    assert ticket["lines"][0]["qty"] == 2


def test_two_stations_make_two_tickets(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    _ = stocked_pantry
    sandwich = _kitchen_product(session)
    _create_and_send(
        client,
        admin_token,
        [
            {"product_id": product_latte.id, "qty": 1},
            {"product_id": sandwich.id, "qty": 1},
        ],
    )
    tickets = _tickets(client, admin_token)
    assert len(tickets) == 2
    by_station = {t["station"]: t for t in tickets}
    assert set(by_station) == {"bar", "kitchen"}
    assert by_station["bar"]["lines"][0]["product_name"] == "Latte"
    assert by_station["kitchen"]["lines"][0]["product_name"] == "Sandwich"


def test_no_tickets_before_send(
    client: TestClient, admin_token: str, product_latte: Product
) -> None:
    create = client.post(
        "/api/v1/orders/",
        headers=_bearer(admin_token),
        json={"items": [{"product_id": product_latte.id, "qty": 1}]},
    )
    create.raise_for_status()
    assert _tickets(client, admin_token) == []


def test_ticket_lines_include_modifiers(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    modifier_extra_shot: Modifier,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    _create_and_send(
        client,
        admin_token,
        [{"product_id": product_latte.id, "qty": 1, "modifier_ids": [modifier_extra_shot.id]}],
    )
    tickets = _tickets(client, admin_token)
    assert tickets[0]["lines"][0]["modifiers"] == ["Extra shot"]


# ── Bump / recall state machine ──────────────────────────────────────


def test_bump_marks_done(
    client: TestClient, admin_token: str, product_latte: Product, stocked_pantry: None
) -> None:
    _ = stocked_pantry
    _create_and_send(client, admin_token, [{"product_id": product_latte.id, "qty": 1}])
    tid = _tickets(client, admin_token)[0]["id"]
    bump = client.post(f"/api/v1/kds/tickets/{tid}/bump", headers=_bearer(admin_token))
    assert bump.status_code == 200
    assert bump.json()["status"] == "done"
    assert bump.json()["bumped_at"] is not None


def test_bump_already_done_returns_409(
    client: TestClient, admin_token: str, product_latte: Product, stocked_pantry: None
) -> None:
    _ = stocked_pantry
    _create_and_send(client, admin_token, [{"product_id": product_latte.id, "qty": 1}])
    tid = _tickets(client, admin_token)[0]["id"]
    client.post(f"/api/v1/kds/tickets/{tid}/bump", headers=_bearer(admin_token)).raise_for_status()
    second = client.post(f"/api/v1/kds/tickets/{tid}/bump", headers=_bearer(admin_token))
    assert second.status_code == 409
    assert "ticket_already_bumped" in second.json()["message"]


def test_recall_after_bump_returns_in_progress(
    client: TestClient, admin_token: str, product_latte: Product, stocked_pantry: None
) -> None:
    _ = stocked_pantry
    _create_and_send(client, admin_token, [{"product_id": product_latte.id, "qty": 1}])
    tid = _tickets(client, admin_token)[0]["id"]
    client.post(f"/api/v1/kds/tickets/{tid}/bump", headers=_bearer(admin_token)).raise_for_status()
    recall = client.post(f"/api/v1/kds/tickets/{tid}/recall", headers=_bearer(admin_token))
    assert recall.status_code == 200
    assert recall.json()["status"] == "in_progress"
    assert recall.json()["bumped_at"] is None


def test_recall_not_bumped_returns_409(
    client: TestClient, admin_token: str, product_latte: Product, stocked_pantry: None
) -> None:
    _ = stocked_pantry
    _create_and_send(client, admin_token, [{"product_id": product_latte.id, "qty": 1}])
    tid = _tickets(client, admin_token)[0]["id"]
    recall = client.post(f"/api/v1/kds/tickets/{tid}/recall", headers=_bearer(admin_token))
    assert recall.status_code == 409
    assert "ticket_not_bumped" in recall.json()["message"]


# ── Filters ──────────────────────────────────────────────────────────


def test_filter_by_station(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    _ = stocked_pantry
    sandwich = _kitchen_product(session)
    _create_and_send(
        client,
        admin_token,
        [
            {"product_id": product_latte.id, "qty": 1},
            {"product_id": sandwich.id, "qty": 1},
        ],
    )
    kitchen = _tickets(client, admin_token, "?station=kitchen")
    assert len(kitchen) == 1
    assert kitchen[0]["station"] == "kitchen"


def test_filter_by_status(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    _ = stocked_pantry
    sandwich = _kitchen_product(session)
    _create_and_send(
        client,
        admin_token,
        [
            {"product_id": product_latte.id, "qty": 1},
            {"product_id": sandwich.id, "qty": 1},
        ],
    )
    # Bump the BAR ticket only.
    bar = next(t for t in _tickets(client, admin_token) if t["station"] == "bar")
    client.post(
        f"/api/v1/kds/tickets/{bar['id']}/bump", headers=_bearer(admin_token)
    ).raise_for_status()

    done = _tickets(client, admin_token, "?status=done")
    assert len(done) == 1
    assert done[0]["station"] == "bar"

    new = _tickets(client, admin_token, "?status=new")
    assert len(new) == 1
    assert new[0]["station"] == "kitchen"
