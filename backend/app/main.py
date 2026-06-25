"""FastAPI-прокси к API ЕГР РБ."""

from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.catalog import (
    BULK_METHODS,
    FIELD_LABELS,
    PERIOD_METHODS,
    STATES,
    unp_methods,
)
from app.egr_client import call_api, fetch_parallel

SWAGGER_URL = "https://egr.gov.by/api/v2/api-docs"

app = FastAPI(title="ЕГР РБ Lookup", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/meta")
async def meta() -> dict[str, Any]:
    return {
        "swaggerUrl": SWAGGER_URL,
        "states": STATES,
        "periodMethods": PERIOD_METHODS,
        "bulkMethods": BULK_METHODS,
        "fieldLabels": FIELD_LABELS,
    }


@app.get("/api/lookup/unp")
async def lookup_unp(
    unp: str = Query(..., min_length=1),
    scope: str = Query("basic"),
) -> dict[str, Any]:
    if not unp.isdigit():
        raise HTTPException(400, "УНП должен быть числом")
    methods = unp_methods(scope)
    return await fetch_parallel(methods, unp)


@app.get("/api/lookup/name")
async def lookup_name(name: str = Query(..., min_length=1)) -> dict[str, Any]:
    ok, data = await call_api("getShortInfoByRegName", name)
    return {"ok": ok, "method": "getShortInfoByRegName", "title": "Поиск по названию", "data": data}


@app.get("/api/lookup/period")
async def lookup_period(
    method: str = Query(...),
    start: str = Query(...),
    end: str = Query(...),
) -> dict[str, Any]:
    allowed = {m["method"] for m in PERIOD_METHODS}
    if method not in allowed:
        raise HTTPException(400, "Неизвестный метод")
    ok, data = await call_api(method, start, end)
    title = next((m["title"] for m in PERIOD_METHODS if m["method"] == method), method)
    return {"ok": ok, "method": method, "title": title, "data": data}


@app.get("/api/lookup/state")
async def lookup_state(state: str = Query("1")) -> dict[str, Any]:
    if state not in STATES:
        raise HTTPException(400, "Неверное состояние")
    ok, data = await call_api("getRegNumByState", state)
    return {
        "ok": ok,
        "method": "getRegNumByState",
        "title": f"УНП: {STATES[state]}",
        "data": data,
    }


@app.get("/api/lookup/bulk")
async def lookup_bulk(method: str = Query(...)) -> dict[str, Any]:
    allowed = {m["method"] for m in BULK_METHODS}
    if method not in allowed:
        raise HTTPException(400, "Неизвестный метод")
    ok, data = await call_api(method)
    title = next((m["title"] for m in BULK_METHODS if m["method"] == method), method)
    return {"ok": ok, "method": method, "title": title, "data": data}


@app.get("/api/lookup/custom")
async def lookup_custom(
    method: str = Query(...),
    params: str = Query(""),
) -> dict[str, Any]:
    if not method.replace("_", "").isalnum():
        raise HTTPException(400, "Некорректное имя метода")
    if "/" in params:
        args = [p for p in params.split("/") if p]
    elif params.strip():
        args = [p.strip() for p in params.splitlines() if p.strip()]
    else:
        args = []
    ok, data = await call_api(method, *args)
    return {"ok": ok, "method": method, "title": method, "data": data}
