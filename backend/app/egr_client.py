"""Асинхронный клиент к API ЕГР РБ."""

import asyncio
from typing import Any
from urllib.parse import quote

import httpx

API_BASE = "http://egr.gov.by/api/v2/egr"
RETRIES = 6
RETRY_SLEEP = 1.5
TIMEOUT = 25.0
MAX_CONCURRENCY = 8

_semaphore = asyncio.Semaphore(MAX_CONCURRENCY)


async def call_api(method: str, *path_args: str) -> tuple[bool, Any]:
    segments = [method, *[str(a) for a in path_args]]
    url = API_BASE + "/" + "/".join(quote(s, safe="") for s in segments)
    last_err: str | None = None

    async with _semaphore:
        for _ in range(RETRIES):
            try:
                async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                    resp = await client.get(
                        url,
                        headers={
                            "Accept": "application/json",
                            "User-Agent": "egr-lookup/3.0",
                        },
                    )
                    if resp.status_code == 204:
                        return True, None
                    if resp.status_code == 200 and not resp.content:
                        last_err = "пустой ответ от сервера"
                        await asyncio.sleep(RETRY_SLEEP)
                        continue
                    resp.raise_for_status()
                    return True, resp.json()
            except Exception as exc:  # noqa: BLE001
                last_err = str(exc)
                await asyncio.sleep(RETRY_SLEEP)

    return False, last_err or "неизвестная ошибка"


async def fetch_parallel(
    methods: list[dict[str, str]],
    *path_args: str,
) -> dict[str, dict[str, Any]]:
    async def one(key: str, method: str, title: str) -> tuple[str, dict[str, Any]]:
        ok, data = await call_api(method, *path_args)
        return key, {"ok": ok, "method": method, "title": title, "data": data}

    tasks = [one(m["key"], m["method"], m["title"]) for m in methods]
    pairs = await asyncio.gather(*tasks)
    return dict(pairs)
