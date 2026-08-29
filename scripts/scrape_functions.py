#!/usr/bin/env python3
"""Extract only function Name + Description from FluxoGestão landing (#recursos article)."""
from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup

USER_AGENT = "FluxoGestaoDocBot/1.0"
SELECTOR_SCOPE = "#recursos"
SELECTOR_CARD = "article"
SELECTOR_NAME = "h3"
SELECTOR_DESC = "p"


def load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        os.environ.setdefault(key.strip(), val.strip().strip("'").strip('"'))


def extract(html: str) -> list[tuple[str, str]]:
    soup = BeautifulSoup(html, "html.parser")
    scope = soup.select_one(SELECTOR_SCOPE) or soup
    rows: list[tuple[str, str]] = []
    seen: set[str] = set()
    for card in scope.select(SELECTOR_CARD):
        name_el = card.find(SELECTOR_NAME)
        desc_el = card.find(SELECTOR_DESC)
        if name_el is None or desc_el is None:
            continue
        name = " ".join(name_el.get_text(" ", strip=True).split())
        desc = " ".join(desc_el.get_text(" ", strip=True).split())
        if not name or not desc or name.lower() in seen:
            continue
        seen.add(name.lower())
        rows.append((name, desc))
    return rows


def render_txt(rows: list[tuple[str, str]]) -> str:
    lines = [f"Name: {name} | Description: {desc}" for name, desc in rows]
    return "\n\n".join(lines) + ("\n" if lines else "")


def chat_id_from_bot_db() -> str:
    db = Path("/root/bit/data/bot.db")
    if not db.is_file():
        return ""
    con = sqlite3.connect(str(db))
    row = con.execute("SELECT telegram_id FROM users LIMIT 1").fetchone()
    if not row:
        row = con.execute(
            "SELECT chat_id FROM jobs WHERE chat_id IS NOT NULL LIMIT 1"
        ).fetchone()
    con.close()
    return str(row[0]) if row else ""


def send_document(token: str, chat_id: str, path: Path) -> None:
    url = f"https://api.telegram.org/bot{token}/sendDocument"
    with path.open("rb") as fh:
        resp = requests.post(
            url,
            data={"chat_id": chat_id},
            files={"document": (path.name, fh, "text/plain; charset=utf-8")},
            timeout=60,
        )
    payload = resp.json()
    if not payload.get("ok"):
        raise SystemExit(f"Telegram: {payload.get('description', resp.status_code)}")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--url", default=os.environ.get("TARGET_URL", "http://178.253.250.173/"))
    p.add_argument("--out", default="/root/fluxogestao/scripts/out/functions.txt")
    p.add_argument("--env-file", default="")
    p.add_argument("--no-telegram", action="store_true")
    p.add_argument("--timeout", type=float, default=20.0)
    args = p.parse_args()

    if args.env_file:
        load_dotenv(Path(args.env_file))
    else:
        load_dotenv(Path("/root/bit/.env"))
        load_dotenv(Path("/root/bot/.env"))

    try:
        resp = requests.get(
            args.url,
            timeout=args.timeout,
            headers={"User-Agent": USER_AGENT, "Accept": "text/html"},
        )
        resp.raise_for_status()
    except requests.Timeout:
        print("timeout", file=sys.stderr)
        return 2
    except requests.RequestException as exc:
        print(f"http: {exc}", file=sys.stderr)
        return 2

    rows = extract(resp.text)
    if not rows:
        print("nenhuma função em #recursos article h3+p", file=sys.stderr)
        return 4

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render_txt(rows), encoding="utf-8")
    print(f"TXT {out} ({len(rows)} funções)")

    if args.no_telegram:
        return 0

    token = (os.environ.get("TELEGRAM_BOT_TOKEN") or os.environ.get("BOT_TOKEN") or "").strip()
    chat = (
        os.environ.get("TELEGRAM_CHAT_ID")
        or chat_id_from_bot_db()
        or ""
    ).strip()
    if not token or not chat:
        print("TELEGRAM_BOT_TOKEN / chat ausente", file=sys.stderr)
        return 3
    send_document(token, chat, out)
    print("Telegram OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
