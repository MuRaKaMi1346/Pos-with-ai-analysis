"""Ollama HTTP wrapper for Thai strategy summaries.

If Ollama is unreachable (server down / timeout / model missing), every helper
returns ``None`` so the endpoint can degrade gracefully — the caller still gets
the structured insights, just without a natural-language paragraph.
"""

import json
import logging
from collections.abc import Sequence
from typing import Any

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)

_PROMPT_TEMPLATE = (
    "คุณเป็นที่ปรึกษาธุรกิจร้านกาแฟในประเทศไทย\n"
    "ช่วยสรุปข้อมูล insights ต่อไปนี้เป็นภาษาไทยที่กระชับ 3-5 บรรทัด\n"
    "เน้นสิ่งที่เจ้าของร้านควรลงมือทำในสัปดาห์นี้:\n\n"
    "{items}\n"
)


def _format_items(insights: Sequence[dict[str, Any]]) -> str:
    return "\n".join(f"- {insight['title']}: {insight['description']}" for insight in insights)


def summarize_th(insights: Sequence[dict[str, Any]], settings: Settings) -> str | None:
    """Call Ollama for a Thai-language summary. Returns None on any failure."""
    if not insights:
        return None
    prompt = _PROMPT_TEMPLATE.format(items=_format_items(insights))
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                },
            )
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, json.JSONDecodeError, KeyError, ValueError) as exc:
        logger.info("Ollama summary unavailable: %s", exc)
        return None
    text_out = str(data.get("response", "")).strip()
    return text_out or None
