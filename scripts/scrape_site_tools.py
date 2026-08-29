#!/usr/bin/env python3
"""Scrape public tool/feature inventory from a site and optionally send the TXT via Telegram.

Secrets only from the environment. Never logged.
"""
from __future__ import annotations

import argparse
import os
import re
import sys
import time
from collections import OrderedDict
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse, urlunparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup, Tag

USER_AGENT = "FluxoGestaoDocBot/1.0 (+authorized inventory; respects robots.txt)"
SKIP_EXT = {".css", ".js", ".map", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".woff", ".woff2", ".xml"}
SKIP_PREFIX = ("/_next/", "/api/", "/favicon")


def load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip().strip("'").strip('"')
        os.environ.setdefault(key, val)


def normalize_url(url: str) -> str:
    p = urlparse(url)
    path = p.path or "/"
    if path != "/" and path.endswith("/"):
        path = path[:-1]
    return urlunparse((p.scheme, p.netloc.lower(), path, "", "", ""))


def same_origin(a: str, b: str) -> bool:
    pa, pb = urlparse(a), urlparse(b)
    return pa.scheme == pb.scheme and pa.netloc.lower() == pb.netloc.lower()


def text_of(node: Tag | None) -> str:
    if node is None:
        return ""
    t = unescape(node.get_text(" ", strip=True))
    t = re.sub(r"\s+", " ", t).strip()
    return t


def detect_architecture(html: str, headers: dict[str, str]) -> dict[str, str]:
    h = {k.lower(): v for k, v in headers.items()}
    vary = h.get("vary", "")
    renderer = "unknown"
    method = "beautifulsoup+requests"
    if "/_next/" in html or "next-router" in vary.lower() or "next.js" in html.lower():
        renderer = "next.js (SSR HTML present)"
        method = "beautifulsoup — SSR, Playwright not required for public pages"
    elif "__NEXT_DATA__" in html:
        renderer = "next.js pages router"
    elif "data-reactroot" in html or "react-root" in html:
        renderer = "react spa"
        method = "playwright recommended if body text is empty"
    elif "id=\"app\"" in html and "vue" in html.lower():
        renderer = "vue spa"
        method = "playwright recommended"
    text_len = len(BeautifulSoup(html, "html.parser").get_text(" ", strip=True))
    if text_len < 80 and html.count("<script") >= 5:
        renderer += " | thin body (JS-heavy)"
        method = "playwright/selenium"
    return {"renderer": renderer, "method": method, "text_len": str(text_len)}


def allowed_by_robots(rp: RobotFileParser | None, url: str) -> bool:
    if rp is None:
        return True
    try:
        return rp.can_fetch(USER_AGENT, url)
    except Exception:
        return True


def fetch(
    session: requests.Session, url: str, timeout: float
) -> tuple[int, dict[str, str], str, str | None, str]:
    try:
        resp = session.get(url, timeout=timeout, allow_redirects=True)
        return resp.status_code, dict(resp.headers), resp.text or "", None, str(resp.url)
    except requests.Timeout:
        return 0, {}, "", "timeout", url
    except requests.RequestException as exc:
        return 0, {}, "", type(exc).__name__, url


def iter_links(base: str, soup: BeautifulSoup) -> Iterable[str]:
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        abs_url = normalize_url(urljoin(base, href))
        parsed = urlparse(abs_url)
        if parsed.scheme not in ("http", "https"):
            continue
        path = parsed.path.lower()
        if any(path.endswith(ext) for ext in SKIP_EXT):
            continue
        if any(path.startswith(p) for p in SKIP_PREFIX):
            continue
        yield abs_url


def extract_tools(page_url: str, soup: BeautifulSoup) -> list[dict[str, str]]:
    tools: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()

    def add(name: str, desc: str, kind: str, href: str = "") -> None:
        name = name.strip()
        desc = desc.strip()
        if len(name) < 2 or len(name) > 120:
            return
        key = (name.lower(), kind)
        if key in seen:
            return
        seen.add(key)
        tools.append({"name": name, "description": desc, "kind": kind, "url": href or page_url})

    for a in soup.find_all("a", href=True):
        name = text_of(a)
        href = urljoin(page_url, a["href"])
        if name and not a["href"].startswith("/_next"):
            add(name, f"Link interno: {a['href']}", "link", href)

    for btn in soup.find_all(["button"]):
        name = text_of(btn)
        if name:
            add(name, "Controle de interface (button)", "action", page_url)

    for heading in soup.find_all(["h1", "h2", "h3"]):
        name = text_of(heading)
        desc = ""
        sibling = heading.find_next_sibling()
        hops = 0
        while sibling is not None and hops < 4 and not desc:
            if isinstance(sibling, Tag):
                if sibling.name in {"p", "span", "div", "li"}:
                    desc = text_of(sibling)[:400]
                if sibling.name in {"h1", "h2", "h3"}:
                    break
            sibling = sibling.find_next_sibling()
            hops += 1
        if not desc:
            parent = heading.parent
            if isinstance(parent, Tag):
                p = parent.find("p")
                desc = text_of(p)[:400]
        add(name, desc, "section", page_url)

    recursos = soup.select("#recursos, [id*='recurso'], [id*='feature']")
    for box in recursos:
        for card in box.find_all(["article", "li", "div"], recursive=True):
            title = card.find(["h3", "h4", "strong"])
            if not title:
                continue
            name = text_of(title)
            desc = ""
            p = title.find_next("p")
            if p:
                desc = text_of(p)[:400]
            add(name, desc, "tool", page_url)

    return tools


def crawl(start: str, timeout: float, delay: float, max_pages: int) -> dict:
    origin = normalize_url(start)
    parsed = urlparse(origin)
    origin_root = f"{parsed.scheme}://{parsed.netloc}"

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})

    robots_url = urljoin(origin_root + "/", "robots.txt")
    sitemap_url = urljoin(origin_root + "/", "sitemap.xml")
    rp: RobotFileParser | None = None
    robots_status, _, robots_body, robots_err, _ = fetch(session, robots_url, timeout)
    if robots_status == 200 and robots_body.lstrip().upper().startswith(("USER-AGENT", "#")):
        rp = RobotFileParser()
        rp.set_url(robots_url)
        rp.parse(robots_body.splitlines())
    sitemap_status, _, _, sitemap_err, _ = fetch(session, sitemap_url, timeout)

    queue: list[str] = [origin]
    queued = {origin}
    pages: list[dict] = []
    tools: "OrderedDict[tuple[str, str], dict[str, str]]" = OrderedDict()
    architecture: dict[str, str] = {}

    while queue and len(pages) < max_pages:
        url = queue.pop(0)
        if not allowed_by_robots(rp, url):
            pages.append({"url": url, "status": "blocked-robots", "error": None})
            continue
        status, headers, html, err, final = fetch(session, url, timeout)
        record = {"url": url, "status": status, "error": err, "final": final}
        if err:
            pages.append(record)
            time.sleep(delay)
            continue
        if status == 404:
            pages.append(record)
            time.sleep(delay)
            continue
        if status >= 400:
            pages.append(record)
            time.sleep(delay)
            continue
        if not architecture:
            architecture = detect_architecture(html, headers)
        soup = BeautifulSoup(html, "html.parser")
        title = text_of(soup.find("title"))
        record["title"] = title
        pages.append(record)
        for tool in extract_tools(url, soup):
            tools[(tool["name"].lower(), tool["kind"])] = tool
        if same_origin(url, origin):
            for link in iter_links(url, soup):
                if not same_origin(link, origin):
                    continue
                if link not in queued:
                    queued.add(link)
                    queue.append(link)
        time.sleep(delay)

    return {
        "start": origin,
        "origin": origin_root,
        "architecture": architecture,
        "robots": {"url": robots_url, "status": robots_status, "error": robots_err},
        "sitemap": {"url": sitemap_url, "status": sitemap_status, "error": sitemap_err},
        "pages": pages,
        "tools": list(tools.values()),
    }


def render_txt(report: dict) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
    arch = report.get("architecture") or {}
    lines = [
        "INVENTÁRIO DE FERRAMENTAS / FUNÇÕES",
        f"Alvo: {report['start']}",
        f"Gerado: {now}",
        f"Arquitetura: {arch.get('renderer', 'n/d')}",
        f"Método: {arch.get('method', 'n/d')}",
        f"robots.txt: HTTP {report['robots']['status']}"
        + (f" ({report['robots']['error']})" if report["robots"]["error"] else ""),
        f"sitemap.xml: HTTP {report['sitemap']['status']}"
        + (f" ({report['sitemap']['error']})" if report["sitemap"]["error"] else ""),
        "",
        "PÁGINAS VARRIDAS",
        "----------------",
    ]
    for p in report["pages"]:
        err = f" error={p['error']}" if p.get("error") else ""
        title = f"  {p['title']}" if p.get("title") else ""
        bounced = f" → {p['final']}" if p.get("final") and p["final"].rstrip("/") != p["url"].rstrip("/") else ""
        lines.append(f"[{p['status']}] {p['url']}{bounced}{title}{err}")
    lines += ["", "FERRAMENTAS / FUNÇÕES", "---------------------"]
    if not report["tools"]:
        lines.append("(nenhum bloco de ferramenta extraído)")
    for i, t in enumerate(report["tools"], 1):
        lines.append(f"{i:02d}. [{t['kind']}] {t['name']}")
        if t.get("description"):
            lines.append(f"    {t['description']}")
        lines.append(f"    {t['url']}")
        lines.append("")
    lines.append("Fim do inventário.")
    return "\n".join(lines) + "\n"


def send_telegram(token: str, chat_id: str, path: Path, caption: str) -> None:
    url = f"https://api.telegram.org/bot{token}/sendDocument"
    with path.open("rb") as fh:
        resp = requests.post(
            url,
            data={"chat_id": chat_id, "caption": caption[:1024]},
            files={"document": (path.name, fh, "text/plain; charset=utf-8")},
            timeout=60,
        )
    try:
        payload = resp.json()
    except ValueError as exc:
        raise SystemExit(f"Telegram resposta inválida HTTP {resp.status_code}") from exc
    if not payload.get("ok"):
        raise SystemExit(f"Telegram recusou o envio: {payload.get('description', resp.status_code)}")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Inventário de tools de um site → TXT → Telegram")
    p.add_argument("--url", default=os.environ.get("TARGET_URL", "http://178.253.250.173"))
    p.add_argument("--out", default="")
    p.add_argument("--timeout", type=float, default=15.0)
    p.add_argument("--delay", type=float, default=0.4)
    p.add_argument("--max-pages", type=int, default=20)
    p.add_argument("--env-file", default="")
    p.add_argument("--no-telegram", action="store_true")
    p.add_argument("--chat-id", default=os.environ.get("TELEGRAM_CHAT_ID", ""))
    return p.parse_args()


def main() -> int:
    args = parse_args()
    if args.env_file:
        load_dotenv(Path(args.env_file))
    else:
        load_dotenv(Path.cwd() / ".env")
        load_dotenv(Path("/root/bit/.env"))
        load_dotenv(Path("/root/fluxogestao/.env.local"))

    start = args.url.strip()
    if not start.startswith(("http://", "https://")):
        print("TARGET_URL precisa de http(s)://", file=sys.stderr)
        return 2

    report = crawl(start, timeout=args.timeout, delay=args.delay, max_pages=args.max_pages)
    body = render_txt(report)
    out = Path(args.out) if args.out else Path("out") / f"tools-{urlparse(start).netloc}-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.txt"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(body, encoding="utf-8")
    print(f"TXT {out} ({len(report['tools'])} itens, {len(report['pages'])} páginas)")

    if args.no_telegram:
        return 0

    token = (os.environ.get("TELEGRAM_BOT_TOKEN") or os.environ.get("BOT_TOKEN") or "").strip()
    chat = (args.chat_id or os.environ.get("TELEGRAM_CHAT_ID") or os.environ.get("ALLOWED_CHAT_IDS") or "").strip()
    if "," in chat:
        chat = chat.split(",", 1)[0].strip()
    if not token or not chat:
        print("Defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID (ou --no-telegram).", file=sys.stderr)
        return 3
    caption = f"Inventário {report['start']} — {len(report['tools'])} funções"
    send_telegram(token, chat, out, caption)
    print(f"Telegram OK chat={chat}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
