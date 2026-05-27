"""Modifier repository (just the generic wrapper for now — CRUD endpoint lands later)."""

from app.models import Modifier
from app.repositories.base import BaseRepository

repository = BaseRepository(Modifier)
