"""Model registry — joblib files under ``backend/models_store/``.

Each trained product model lives at ``lgbm_product_<id>.joblib``. The directory
is created lazily so first-run + tests work without manual setup.
"""

from pathlib import Path

import joblib

from app.ai.forecasting.lgbm_model import LgbmForecaster

# Override target for tests: set to a tmp dir via ``set_models_dir(...)``.
_MODELS_DIR: Path | None = None


def _default_models_dir() -> Path:
    # registry.py lives at backend/app/ai/forecasting/registry.py
    # → parents[3] = backend/
    return Path(__file__).resolve().parents[3] / "models_store"


def models_dir() -> Path:
    base = _MODELS_DIR or _default_models_dir()
    base.mkdir(parents=True, exist_ok=True)
    return base


def set_models_dir(path: Path | None) -> None:
    """Override the models directory (used by tests via monkeypatch)."""
    global _MODELS_DIR
    _MODELS_DIR = path


def _model_path(product_id: int) -> Path:
    return models_dir() / f"lgbm_product_{product_id}.joblib"


def save_model(product_id: int, model: LgbmForecaster) -> Path:
    path = _model_path(product_id)
    joblib.dump(model, path)
    return path


def load_model(product_id: int) -> LgbmForecaster | None:
    path = _model_path(product_id)
    if not path.exists():
        return None
    return joblib.load(path)  # type: ignore[no-any-return]


def list_trained_products() -> list[int]:
    out: list[int] = []
    for path in models_dir().glob("lgbm_product_*.joblib"):
        try:
            out.append(int(path.stem.removeprefix("lgbm_product_")))
        except ValueError:
            continue
    return sorted(out)
