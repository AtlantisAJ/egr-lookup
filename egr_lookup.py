#!/usr/bin/env python3
"""
ЕГР РБ — единый интерфейс к открытому API реестра.

Локальный веб-сервер без сторонних зависимостей.
Проксирует запросы к http://egr.gov.by/api/v2/egr
(у API нет CORS и только http — браузер напрямую не достучится).

Документация API: https://egr.gov.by/api/v2/api-docs

Запуск:
    python3 egr_lookup.py
    python3 egr_lookup.py 8765   # другой порт

Открой: http://127.0.0.1:8765
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

API_BASE = "http://egr.gov.by/api/v2/egr"
SWAGGER_URL = "https://egr.gov.by/api/v2/api-docs"
HOST = "127.0.0.1"
PORT = 8765
RETRIES = 6
RETRY_SLEEP = 1.5
TIMEOUT = 25
MAX_WORKERS = 8

# (key, method, title)
UNP_BASIC = [
    ("base", "getBaseInfoByRegNum", "Общие данные"),
    ("short", "getShortInfoByRegNum", "Краткие сведения"),
    ("names", "getJurNamesByRegNum", "Наименование"),
    ("address", "getAddressByRegNum", "Адрес"),
    ("ved", "getVEDByRegNum", "Вид деятельности"),
    ("ipfio", "getIPFIOByRegNum", "ФИО ИП"),
    ("events", "getEventByRegNum", "События"),
]

UNP_HISTORY = [
    ("address_h", "getAllAddressByRegNum", "Адрес (с историей)"),
    ("names_h", "getAllJurNamesByRegNum", "Наименование (с историей)"),
    ("ved_h", "getAllVEDByRegNum", "Вид деятельности (с историей)"),
    ("ipfio_h", "getAllIPFIOByRegNum", "ФИО ИП (с историей)"),
]

UNP_GO = [
    ("go_info", "getGOInfoByRegNum", "GO: сведения"),
    ("go_info_h", "getGOInfoHByRegNum", "GO: сведения (история)"),
    ("go_name", "getGONameByRegNum", "GO: наименование"),
    ("go_name_h", "getGONameHByRegNum", "GO: наименование (история)"),
    ("go_addr", "getGOAddressByRegNum", "GO: адрес"),
    ("go_addr_h", "getGOAddressHByRegNum", "GO: адрес (история)"),
    ("go_tel", "getGOTelByRegNum", "GO: телефон"),
    ("go_tel_h", "getGOTelHByRegNum", "GO: телефон (история)"),
    ("go_pod", "getGOPodByRegNum", "GO: подразделение"),
    ("go_pod_h", "getGOPodHByRegNum", "GO: подразделение (история)"),
    ("go_pred", "getGOPredByRegNum", "GO: председатель"),
    ("go_pree", "getGOPreeByRegNum", "GO: преемник"),
]

UNP_OTHER = [
    ("ip_to_jur", "getIPtoJurByRegNum", "ИП → ЮЛ"),
]

PERIOD_METHODS = [
    ("base", "getBaseInfoByPeriod", "Общие данные за период"),
    ("short", "getShortInfoByPeriod", "Краткие сведения за период"),
    ("names", "getJurNamesByPeriod", "Наименования за период"),
    ("address", "getAddressByPeriod", "Адреса за период"),
    ("ved", "getVEDByPeriod", "Виды деятельности за период"),
    ("ipfio", "getIPFIOByPeriod", "ФИО ИП за период"),
    ("events", "getEventByPeriod", "События за период"),
    ("ip_to_jur", "getIPtoJurByPeriod", "ИП → ЮЛ за период"),
]

BULK_METHODS = [
    ("all_likvid_ul", "getAllLikvidUL", "Все ЮЛ в ликвидации"),
    ("all_likvid_ip", "getAllLikvidIP", "Все ИП в ликвидации"),
    ("all_ip_to_jur", "getAllIPtoJur", "Все связи ИП → ЮЛ"),
    ("go_info_all", "getGOInfoAll", "GO: все сведения"),
    ("go_name_all", "getGONameAll", "GO: все наименования"),
    ("go_addr_all", "getGOAddressAll", "GO: все адреса"),
    ("go_tel_all", "getGOTelAll", "GO: все телефоны"),
    ("go_pod_all", "getGOPodAll", "GO: все подразделения"),
    ("go_pred_all", "getGOPredAll", "GO: все председатели"),
    ("go_pree_all", "getGOPreeAll", "GO: все преемники"),
]

STATES = {
    "1": "Действующий",
    "2": "Исключен из ЕГР",
    "3": "В процессе ликвидации",
    "4": "Процедура банкротства",
    "5": "Прекращение в результате реорганизации",
    "6": "Переход в другой РО",
    "7": "Переход в другой ТО",
    "8": "Прекращение в прежней ОПФ",
    "9": "Ошибка",
    "10": "Приостановлена деятельность",
    "11": "Утрата правоспособности",
    "12": "Регистрация аннулирована",
}


def call_api(method: str, *path_args: str):
    """Вызвать метод API. Возвращает (ok, data_or_error)."""
    segments = [method] + [str(a) for a in path_args]
    url = API_BASE + "/" + "/".join(urllib.parse.quote(s, safe="") for s in segments)
    last_err = None
    for _ in range(RETRIES):
        try:
            req = urllib.request.Request(url, headers={
                "Accept": "application/json",
                "User-Agent": "egr-lookup/2.0",
            })
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                code = resp.getcode()
                raw = resp.read()
                if code == 204:
                    return True, None
                if not raw:
                    last_err = "пустой ответ от сервера"
                    time.sleep(RETRY_SLEEP)
                    continue
                text = raw.decode("utf-8", errors="replace")
                try:
                    return True, json.loads(text)
                except json.JSONDecodeError:
                    return True, {"_raw": text}
        except Exception as e:  # noqa: BLE001
            last_err = str(e)
            time.sleep(RETRY_SLEEP)
    return False, last_err or "неизвестная ошибка"


def fetch_parallel(methods, *path_args):
    """Параллельно вызвать список методов с одними и теми же аргументами."""
    result = {}

    def one(key, method, title):
        ok, data = call_api(method, *path_args)
        return key, {"ok": ok, "method": method, "title": title, "data": data}

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = [pool.submit(one, k, m, t) for k, m, t in methods]
        for fut in as_completed(futures):
            key, block = fut.result()
            result[key] = block
    return result


def unp_methods(scope: str):
    methods = list(UNP_BASIC)
    if scope in ("history", "all"):
        methods += UNP_HISTORY
    if scope in ("go", "all"):
        methods += UNP_GO
    if scope in ("other", "all"):
        methods += UNP_OTHER
    return methods


def json_response(handler, code, obj):
    body = json.dumps(obj, ensure_ascii=False)
    handler._send(code, body, "application/json; charset=utf-8")


INDEX_HTML = r"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ЕГР РБ — API explorer</title>
<style>
  :root { color-scheme: light dark; --accent: #2563eb; --border: #e3e6ea; --card: #fff; --bg: #f5f6f8; }
  @media (prefers-color-scheme: dark) {
    :root { --border: #2c2f36; --card: #1e2127; --bg: #15171b; }
    input, select, textarea { background: #15171b !important; color: #e8e8e8 !important; }
    th { background: #232730 !important; }
    pre { background: #15171b !important; }
  }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; background: var(--bg); color: inherit; }
  header { background: linear-gradient(135deg, #2563eb, #1e40af); color: #fff; padding: 20px; }
  header h1 { margin: 0 0 4px; font-size: 20px; }
  header p { margin: 0; font-size: 13px; opacity: .85; }
  header a { color: #bfdbfe; }
  main { max-width: 1000px; margin: 0 auto; padding: 16px 20px 40px; }
  .tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
  .tab { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); cursor: pointer; font-size: 13px; }
  .tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
  .panel { display: none; }
  .panel.active { display: block; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; align-items: center; }
  input, select, textarea {
    padding: 10px 12px; font-size: 15px; border: 1px solid var(--border);
    border-radius: 8px; background: #fff;
  }
  input, select { min-width: 160px; }
  textarea { width: 100%; min-height: 70px; font-family: inherit; }
  button {
    padding: 10px 18px; font-size: 15px; border: 0; border-radius: 8px;
    background: var(--accent); color: #fff; cursor: pointer; font-weight: 600;
  }
  button:disabled { opacity: .5; cursor: default; }
  button.secondary { background: #64748b; }
  .opts { display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; margin: 8px 0 14px; }
  .opts label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
  .warn { background: #fef9c3; color: #854d0e; border: 1px solid #fde047; border-radius: 8px; padding: 10px 12px; font-size: 13px; margin-bottom: 12px; }
  @media (prefers-color-scheme: dark) { .warn { background: #422006; color: #fde68a; border-color: #854d0e; } }
  .status { font-size: 14px; margin: 8px 0 14px; min-height: 20px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; margin-bottom: 12px; }
  .card h2 { margin: 0 0 10px; font-size: 14px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .badge { font-size: 11px; padding: 2px 8px; border-radius: 20px; font-weight: 600; }
  .badge.ok { background: #dcfce7; color: #166534; }
  .badge.empty { background: #fef9c3; color: #854d0e; }
  .badge.err { background: #fee2e2; color: #991b1b; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 6px 8px; border: 1px solid var(--border); vertical-align: top; }
  th { background: #f3f4f6; width: 38%; }
  pre { margin: 8px 0 0; padding: 10px; font-size: 12px; overflow: auto; background: #f7f8fa; border: 1px solid var(--border); border-radius: 6px; max-height: 400px; }
  details summary { cursor: pointer; font-size: 12px; opacity: .75; }
  .unp-link { color: var(--accent); cursor: pointer; text-decoration: underline; }
  .toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
</style>
</head>
<body>
<header>
  <h1>ЕГР РБ — API explorer</h1>
  <p>Сырые данные из реестра, не официальная выписка. <a href="https://egr.gov.by/api/v2/api-docs" target="_blank">Swagger API</a></p>
</header>
<main>
  <div class="tabs">
    <div class="tab active" data-tab="unp">По УНП</div>
    <div class="tab" data-tab="name">По названию</div>
    <div class="tab" data-tab="period">За период</div>
    <div class="tab" data-tab="state">По состоянию</div>
    <div class="tab" data-tab="bulk">Массовые</div>
    <div class="tab" data-tab="custom">Произвольный</div>
  </div>

  <div id="panel-unp" class="panel active">
    <div class="row">
      <input id="unp" type="text" inputmode="numeric" placeholder="УНП, например 100390954" style="flex:1">
      <button id="go-unp">Найти</button>
    </div>
    <div class="opts">
      <label><input type="radio" name="scope" value="basic" checked> Основное (7 методов)</label>
      <label><input type="radio" name="scope" value="all"> Всё по УНП (включая историю и GO)</label>
      <label><input type="checkbox" id="scope-history"> + история</label>
      <label><input type="checkbox" id="scope-go"> + госорганы (GO)</label>
      <label><input type="checkbox" id="scope-other"> + ИП→ЮЛ</label>
    </div>
    <div class="status" id="status-unp"></div>
    <div class="toolbar"><button class="secondary" id="dl-unp" style="display:none">Скачать JSON</button></div>
    <div id="results-unp"></div>
  </div>

  <div id="panel-name" class="panel">
    <div class="row">
      <input id="name" type="text" placeholder="Название организации" style="flex:1">
      <button id="go-name">Искать</button>
    </div>
    <div class="status" id="status-name"></div>
    <div id="results-name"></div>
  </div>

  <div id="panel-period" class="panel">
    <div class="row">
      <input id="p-start" type="text" placeholder="Начало ДД.ММ.ГГГГ" value="01.01.2025">
      <input id="p-end" type="text" placeholder="Конец ДД.ММ.ГГГГ" value="31.12.2025">
      <select id="p-method"></select>
      <button id="go-period">Запросить</button>
    </div>
    <div class="status" id="status-period"></div>
    <div id="results-period"></div>
  </div>

  <div id="panel-state" class="panel">
    <div class="row">
      <select id="state"></select>
      <button id="go-state">Список УНП</button>
    </div>
    <div class="warn">Может вернуть очень большой список. Используйте для аналитики, не для единичного поиска.</div>
    <div class="status" id="status-state"></div>
    <div class="toolbar"><button class="secondary" id="dl-state" style="display:none">Скачать JSON</button></div>
    <div id="results-state"></div>
  </div>

  <div id="panel-bulk" class="panel">
    <div class="row">
      <select id="bulk-method"></select>
      <button id="go-bulk">Загрузить</button>
    </div>
    <div class="warn">Массовые выгрузки — большие объёмы данных, ответ может идти долго.</div>
    <div class="status" id="status-bulk"></div>
    <div class="toolbar"><button class="secondary" id="dl-bulk" style="display:none">Скачать JSON</button></div>
    <div id="results-bulk"></div>
  </div>

  <div id="panel-custom" class="panel">
    <p style="font-size:13px;opacity:.8">Любой метод из Swagger. Параметры — по одному на строку или через «/».</p>
    <div class="row"><input id="custom-method" type="text" placeholder="getBaseInfoByRegNum" style="flex:1"></div>
    <textarea id="custom-params" placeholder="100390954"></textarea>
    <div class="row"><button id="go-custom">Выполнить</button></div>
    <div class="status" id="status-custom"></div>
    <div id="results-custom"></div>
  </div>
</main>
<script>
const LABELS = {
  ngrn:"УНП", vnaim:"Полное наименование", vn:"Сокр. наименование", vfn:"Фирменное наименование",
  dfrom:"Дата регистрации", dto:"Дата исключения", vnsostk:"Состояние", vnvobp:"Вид объекта",
  vnvdnp:"Вид деятельности", vkodp:"Код ОКЭД", vfio:"ФИО", vregion:"Область", vdistrict:"Район",
  vnp:"Населённый пункт", vulitsa:"Улица", vdom:"Дом", vkorp:"Корпус", vpom:"Помещение", nindex:"Индекс",
};
const PERIOD = __PERIOD_JSON__;
const BULK = __BULK_JSON__;
const STATES = __STATES_JSON__;
let lastDownload = null;

document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(x => x.classList.remove("active"));
  t.classList.add("active");
  document.getElementById("panel-" + t.dataset.tab).classList.add("active");
}));

function esc(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function fmtDate(v){ return (typeof v==="string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) ? v.slice(0,10).split("-").reverse().join(".") : v; }
function flatten(o,out={}){ for(const k in o){ const v=o[k]; if(v&&typeof v==="object"&&!Array.isArray(v)) flatten(v,out); else if(!Array.isArray(v)&&v!=null&&v!=="") if(!(k in out)) out[k]=v; } return out; }

function renderTable(rec){
  const flat = flatten(rec);
  let rows = "";
  for(const k in LABELS) if(k in flat) rows += `<tr><th>${LABELS[k]}</th><td>${esc(fmtDate(flat[k]))}</td></tr>`;
  return rows ? `<table>${rows}</table>` : "";
}

function renderBlock(block){
  const title = block.title || block.method || "?";
  let badge, body = "";
  if(!block.ok){ badge='<span class="badge err">ошибка</span>'; body=`<div>${esc(block.data||"")}</div>`; }
  else if(block.data==null || (Array.isArray(block.data)&&!block.data.length)){ badge='<span class="badge empty">нет данных</span>'; }
  else {
    badge='<span class="badge ok">ок</span>';
    const arr = Array.isArray(block.data) ? block.data : [block.data];
    body = arr.map(renderTable).join("");
    const n = Array.isArray(block.data) ? block.data.length : 1;
    body += `<details><summary>JSON (${block.method}, ${n} зап.)</summary><pre>${esc(JSON.stringify(block.data,null,2))}</pre></details>`;
  }
  return `<div class="card"><h2>${esc(title)} ${badge}</h2>${body}</div>`;
}

function renderResults(container, data, orderedKeys){
  const blocks = orderedKeys ? orderedKeys.map(k => data[k]).filter(Boolean) : Object.values(data);
  container.innerHTML = blocks.map(renderBlock).join("");
}

function unpScope(){
  const all = document.querySelector('input[name="scope"][value="all"]').checked;
  if(all) return "all";
  let s = "basic";
  if(document.getElementById("scope-history").checked) s = s==="basic" ? "history" : "all";
  if(document.getElementById("scope-go").checked) s = s==="basic" ? "go" : "all";
  if(document.getElementById("scope-other").checked) s = s==="basic" ? "other" : "all";
  if(document.getElementById("scope-history").checked && document.getElementById("scope-go").checked) s = "all";
  return s;
}

function loadUnp(unp){
  document.getElementById("unp").value = unp;
  document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(x => x.classList.remove("active"));
  document.querySelector('[data-tab="unp"]').classList.add("active");
  document.getElementById("panel-unp").classList.add("active");
  searchUnp();
}

async function searchUnp(){
  const unp = document.getElementById("unp").value.trim();
  const status = document.getElementById("status-unp");
  const results = document.getElementById("results-unp");
  const dl = document.getElementById("dl-unp");
  if(!/^\d+$/.test(unp)){ status.textContent="Введите УНП цифрами."; return; }
  status.textContent = "Запрашиваю… (параллельно, API может тормозить)";
  results.innerHTML = ""; dl.style.display="none";
  try {
    const r = await fetch(`/lookup/unp?unp=${encodeURIComponent(unp)}&scope=${unpScope()}`);
    const data = await r.json();
    lastDownload = data;
    status.textContent = `Готово. УНП ${unp}, блоков: ${Object.keys(data).length}`;
    renderResults(results, data, Object.keys(data));
    dl.style.display = "inline-block";
  } catch(e){ status.textContent = "Ошибка: " + e; }
}

async function searchName(){
  const name = document.getElementById("name").value.trim();
  const status = document.getElementById("status-name");
  const results = document.getElementById("results-name");
  if(!name){ status.textContent="Введите название."; return; }
  status.textContent = "Ищу…";
  results.innerHTML = "";
  try {
    const r = await fetch(`/lookup/name?name=${encodeURIComponent(name)}`);
    const data = await r.json();
    if(!data.ok){ status.textContent = data.data || "Ошибка"; return; }
    const arr = data.data || [];
    status.textContent = `Найдено: ${arr.length}. Клик по УНП — полный профиль.`;
    results.innerHTML = arr.map(item => {
      const flat = flatten(item);
      const unp = flat.ngrn || "?";
      return `<div class="card"><h2><span class="unp-link" data-unp="${unp}">${unp}</span> — ${esc(flat.vnaim||flat.vn||"")}</h2>
        ${renderTable(item)}
        <div style="font-size:12px;opacity:.7">${esc(flat.vnsostk||"")}</div></div>`;
    }).join("");
    results.querySelectorAll(".unp-link").forEach(el => el.addEventListener("click", () => loadUnp(el.dataset.unp)));
  } catch(e){ status.textContent = "Ошибка: " + e; }
}

async function searchPeriod(){
  const start = document.getElementById("p-start").value.trim();
  const end = document.getElementById("p-end").value.trim();
  const method = document.getElementById("p-method").value;
  const status = document.getElementById("status-period");
  const results = document.getElementById("results-period");
  if(!/^\d{2}\.\d{2}\.\d{4}$/.test(start) || !/^\d{2}\.\d{2}\.\d{4}$/.test(end)){
    status.textContent = "Даты в формате ДД.ММ.ГГГГ"; return;
  }
  status.textContent = "Запрашиваю…";
  results.innerHTML = "";
  try {
    const r = await fetch(`/lookup/period?method=${method}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
    const data = await r.json();
    const block = data.result || data;
    status.textContent = block.ok ? `Готово: ${method}` : "Ошибка";
    results.innerHTML = renderBlock(block);
  } catch(e){ status.textContent = "Ошибка: " + e; }
}

async function searchState(){
  const state = document.getElementById("state").value;
  const status = document.getElementById("status-state");
  const results = document.getElementById("results-state");
  const dl = document.getElementById("dl-state");
  status.textContent = "Загружаю список… может занять время";
  results.innerHTML = ""; dl.style.display="none";
  try {
    const r = await fetch(`/lookup/state?state=${state}`);
    const data = await r.json();
    lastDownload = data;
    if(!data.ok){ status.textContent = data.data; return; }
    const arr = Array.isArray(data.data) ? data.data : [];
    const preview = arr.slice(0, 100);
    status.textContent = `Состояние «${STATES[state]}»: ${arr.length} УНП`;
    results.innerHTML = `<div class="card"><h2>УНП <span class="badge ok">${arr.length}</span></h2>
      <p style="font-size:13px">Показаны первые ${preview.length}. Клик — профиль по УНП.</p>
      <p>${preview.map(x => `<span class="unp-link" data-unp="${typeof x==='object'?x.ngrn:x}">${typeof x==='object'?x.ngrn:x}</span>`).join(", ")}</p>
      <details><summary>Полный JSON</summary><pre>${esc(JSON.stringify(data.data,null,2))}</pre></details></div>`;
    results.querySelectorAll(".unp-link").forEach(el => el.addEventListener("click", () => loadUnp(el.dataset.unp)));
    dl.style.display = "inline-block";
  } catch(e){ status.textContent = "Ошибка: " + e; }
}

async function searchBulk(){
  const method = document.getElementById("bulk-method").value;
  const status = document.getElementById("status-bulk");
  const results = document.getElementById("results-bulk");
  const dl = document.getElementById("dl-bulk");
  status.textContent = "Загружаю…";
  results.innerHTML = ""; dl.style.display="none";
  try {
    const r = await fetch(`/lookup/bulk?method=${method}`);
    const data = await r.json();
    lastDownload = data;
    const block = data.result || data;
    status.textContent = block.ok ? `Готово: ${method}` : "Ошибка";
    results.innerHTML = renderBlock(block);
    dl.style.display = "inline-block";
  } catch(e){ status.textContent = "Ошибка: " + e; }
}

async function searchCustom(){
  const method = document.getElementById("custom-method").value.trim();
  const params = document.getElementById("custom-params").value.trim();
  const status = document.getElementById("status-custom");
  const results = document.getElementById("results-custom");
  if(!method){ status.textContent="Укажите метод"; return; }
  status.textContent = "Выполняю…";
  results.innerHTML = "";
  try {
    const r = await fetch(`/lookup/custom?method=${encodeURIComponent(method)}&params=${encodeURIComponent(params)}`);
    const data = await r.json();
    const block = data.result || data;
    status.textContent = block.ok ? "Готово" : "Ошибка";
    results.innerHTML = renderBlock(block);
  } catch(e){ status.textContent = "Ошибка: " + e; }
}

function downloadJson(){
  if(!lastDownload) return;
  const blob = new Blob([JSON.stringify(lastDownload, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "egr-" + Date.now() + ".json";
  a.click();
}

// init selects
const pSel = document.getElementById("p-method");
PERIOD.forEach(([k,m,t]) => { const o=document.createElement("option"); o.value=m; o.textContent=t; pSel.appendChild(o); });
const bSel = document.getElementById("bulk-method");
BULK.forEach(([k,m,t]) => { const o=document.createElement("option"); o.value=m; o.textContent=t; bSel.appendChild(o); });
const sSel = document.getElementById("state");
Object.entries(STATES).forEach(([k,v]) => { const o=document.createElement("option"); o.value=k; o.textContent=`${k} — ${v}`; sSel.appendChild(o); });

document.getElementById("go-unp").addEventListener("click", searchUnp);
document.getElementById("unp").addEventListener("keydown", e => { if(e.key==="Enter") searchUnp(); });
document.getElementById("go-name").addEventListener("click", searchName);
document.getElementById("name").addEventListener("keydown", e => { if(e.key==="Enter") searchName(); });
document.getElementById("go-period").addEventListener("click", searchPeriod);
document.getElementById("go-state").addEventListener("click", searchState);
document.getElementById("go-bulk").addEventListener("click", searchBulk);
document.getElementById("go-custom").addEventListener("click", searchCustom);
document.getElementById("dl-unp").addEventListener("click", downloadJson);
document.getElementById("dl-state").addEventListener("click", downloadJson);
document.getElementById("dl-bulk").addEventListener("click", downloadJson);
</script>
</body>
</html>
"""


def build_html():
    html = INDEX_HTML
    html = html.replace("__PERIOD_JSON__", json.dumps(PERIOD_METHODS, ensure_ascii=False))
    html = html.replace("__BULK_JSON__", json.dumps(BULK_METHODS, ensure_ascii=False))
    html = html.replace("__STATES_JSON__", json.dumps(STATES, ensure_ascii=False))
    return html


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("  " + (fmt % args) + "\n")

    def _send(self, code, body, content_type):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        path = parsed.path

        if path in ("/", "/index.html"):
            self._send(200, build_html(), "text/html; charset=utf-8")
            return

        if path == "/lookup/unp":
            unp = qs.get("unp", [""])[0].strip()
            scope = qs.get("scope", ["basic"])[0]
            if not unp.isdigit():
                return json_response(self, 400, {"error": "УНП должен быть числом"})
            print(f"[unp] {unp} scope={scope}")
            data = fetch_parallel(unp_methods(scope), unp)
            return json_response(self, 200, data)

        if path == "/lookup/name":
            name = qs.get("name", [""])[0].strip()
            if not name:
                return json_response(self, 400, {"error": "Укажите название"})
            print(f"[name] {name[:40]}…")
            ok, data = call_api("getShortInfoByRegName", name)
            return json_response(self, 200, {"ok": ok, "method": "getShortInfoByRegName", "data": data})

        if path == "/lookup/period":
            method = qs.get("method", [""])[0].strip()
            start = qs.get("start", [""])[0].strip()
            end = qs.get("end", [""])[0].strip()
            allowed = {m for _, m, _ in PERIOD_METHODS}
            if method not in allowed:
                return json_response(self, 400, {"error": "Неизвестный метод"})
            print(f"[period] {method} {start}-{end}")
            ok, data = call_api(method, start, end)
            title = next((t for _, m, t in PERIOD_METHODS if m == method), method)
            return json_response(self, 200, {
                "result": {"ok": ok, "method": method, "title": title, "data": data},
            })

        if path == "/lookup/state":
            state = qs.get("state", ["1"])[0].strip()
            if state not in STATES:
                return json_response(self, 400, {"error": "Неверное состояние"})
            print(f"[state] {state}")
            ok, data = call_api("getRegNumByState", state)
            return json_response(self, 200, {
                "ok": ok, "method": "getRegNumByState", "title": f"УНП: {STATES[state]}", "data": data,
            })

        if path == "/lookup/bulk":
            method = qs.get("method", [""])[0].strip()
            allowed = {m for _, m, _ in BULK_METHODS}
            if method not in allowed:
                return json_response(self, 400, {"error": "Неизвестный метод"})
            print(f"[bulk] {method}")
            ok, data = call_api(method)
            title = next((t for _, m, t in BULK_METHODS if m == method), method)
            return json_response(self, 200, {
                "result": {"ok": ok, "method": method, "title": title, "data": data},
            })

        if path == "/lookup/custom":
            method = qs.get("method", [""])[0].strip()
            params_raw = qs.get("params", [""])[0].strip()
            if not method or not method.replace("_", "").isalnum():
                return json_response(self, 400, {"error": "Некорректное имя метода"})
            if "/" in params_raw:
                params = [p for p in params_raw.split("/") if p]
            elif params_raw:
                params = [p.strip() for p in params_raw.splitlines() if p.strip()]
            else:
                params = []
            print(f"[custom] {method} {params}")
            ok, data = call_api(method, *params)
            return json_response(self, 200, {
                "result": {"ok": ok, "method": method, "title": method, "data": data},
            })

        # обратная совместимость со старым URL
        if path == "/lookup":
            unp = qs.get("unp", [""])[0].strip()
            if unp.isdigit():
                data = fetch_parallel(UNP_BASIC, unp)
                return json_response(self, 200, data)

        self._send(404, json.dumps({"error": "not found"}), "application/json; charset=utf-8")


def main():
    port = PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    server = ThreadingHTTPServer((HOST, port), Handler)
    url = f"http://{HOST}:{port}"
    print("=" * 52)
    print("ЕГР РБ — API explorer")
    print(f"  Локально:  {url}")
    print(f"  Swagger:   {SWAGGER_URL}")
    print("  Остановить: Ctrl+C")
    print("=" * 52)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nОстановлено.")
        server.shutdown()


if __name__ == "__main__":
    main()
