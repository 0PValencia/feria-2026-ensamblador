"""Bitácora opcional en SQLite. Solo guarda el tráfico sintético de la simulación."""

from __future__ import annotations

import sqlite3
from pathlib import Path


class Bitacora:
    def __init__(self, ruta: Path | None):
        self.conn: sqlite3.Connection | None = None
        if ruta is None:
            return
        try:
            ruta.parent.mkdir(parents=True, exist_ok=True)
            self.conn = sqlite3.connect(ruta, check_same_thread=False)
            self.conn.execute("PRAGMA journal_mode=WAL")
            self.conn.execute("PRAGMA synchronous=NORMAL")
            self.conn.execute(
                """
                CREATE TABLE IF NOT EXISTS eventos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TEXT NOT NULL,
                    usuario TEXT NOT NULL,
                    origen TEXT NOT NULL,
                    texto TEXT NOT NULL,
                    riesgo INTEGER,
                    clasificacion TEXT,
                    razones TEXT,
                    descartado INTEGER NOT NULL DEFAULT 0
                )
                """
            )
            self.conn.commit()
        except sqlite3.Error:
            self.conn = None

    def registrar(
        self,
        ts: str,
        usuario: str,
        origen: str,
        texto: str,
        riesgo: int | None,
        clasificacion: str | None,
        razones: str,
        descartado: bool,
    ) -> None:
        if self.conn is None:
            return
        try:
            self.conn.execute(
                """
                INSERT INTO eventos
                    (ts, usuario, origen, texto, riesgo, clasificacion, razones, descartado)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (ts, usuario, origen, texto, riesgo, clasificacion, razones, int(descartado)),
            )
            self.conn.commit()
        except sqlite3.Error:
            return

    def contar(self) -> int:
        if self.conn is None:
            return 0
        fila = self.conn.execute("SELECT COUNT(*) FROM eventos").fetchone()
        return int(fila[0]) if fila else 0

    def vaciar(self) -> None:
        if self.conn is None:
            return
        try:
            self.conn.execute("DELETE FROM eventos")
            self.conn.commit()
        except sqlite3.Error:
            return
