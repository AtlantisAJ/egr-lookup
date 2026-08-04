# ЕГР РБ Lookup

Локальный и онлайн-интерфейс к открытому API [egr.gov.by](http://egr.gov.by/api/v2/egr).

**Онлайн:** [https://AtlantisAJ.github.io/egr-lookup/](https://AtlantisAJ.github.io/egr-lookup/)  
**Стек:** FastAPI / Cloudflare Worker (прокси) + React + Vite + Tailwind CSS

## Быстрый старт (локально)

```bash
chmod +x start.sh
./start.sh
```

Открой **http://127.0.0.1:5173**

## Ручной запуск

```bash
# Терминал 1 — бэкенд
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8765

# Терминал 2 — фронтенд
cd frontend
npm install
npm run dev
```

Локально фронт ходит в FastAPI через Vite proxy. В проде — в Cloudflare Worker (`VITE_API_BASE`).

## Онлайн-деплой (GitHub Pages + Cloudflare Worker)

### 1. Cloudflare Worker

1. Создай аккаунт на [Cloudflare](https://dash.cloudflare.com/)
2. Account ID: Workers & Pages → Overview (справа)
3. API Token: My Profile → API Tokens → Create Token → шаблон **Edit Cloudflare Workers**
4. В репозитории GitHub: **Settings → Secrets and variables → Actions → Secrets**
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
5. Запусти workflow **Deploy Cloudflare Worker** (Actions → Run workflow) или сделай push в `main` с изменениями в `worker/`
6. Скопируй URL вида `https://egr-lookup.<subdomain>.workers.dev`

Локальная проверка Worker:

```bash
cd worker
npm install
npm run dev
```

### 2. GitHub Pages

1. **Settings → Pages → Build and deployment → Source:** GitHub Actions
2. **Settings → Secrets and variables → Actions → Variables:** добавь `VITE_API_BASE` = URL Worker из шага выше (без слэша в конце)
3. Запусти workflow **Deploy GitHub Pages** или push в `main` с изменениями в `frontend/`

Сайт: **https://AtlantisAJ.github.io/egr-lookup/**

## Возможности

- Поиск по УНП (основное / история / GO / всё сразу)
- Поиск по названию
- Запросы за период
- Список УНП по состоянию (`getRegNumByState`)
- Массовые выгрузки
- Произвольный метод из [Swagger](https://egr.gov.by/api/v2/api-docs)
- Скачивание JSON

## Структура

```
egr-lookup/
├── backend/          # FastAPI + httpx (локальная разработка)
├── worker/           # Cloudflare Worker (прод-прокси)
├── frontend/         # React + Vite + Tailwind → GitHub Pages
├── egr_lookup.py     # legacy (один файл, v2)
└── start.sh          # локальный запуск
```

## Примечание

Данные из API — **сырые сведения реестра**, не официальная выписка с ЭЦП.
