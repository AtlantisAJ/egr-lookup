# ЕГР РБ Lookup

Локальный интерфейс к открытому API [egr.gov.by](http://egr.gov.by/api/v2/egr).

**Стек:** FastAPI (прокси) + React + Vite + Tailwind CSS

## Быстрый старт

```bash
cd ~/egr-lookup
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
├── backend/          # FastAPI + httpx
├── frontend/         # React + Vite + Tailwind
├── egr_lookup.py     # legacy (один файл, v2)
└── start.sh          # запуск всего
```

## Примечание

Данные из API — **сырые сведения реестра**, не официальная выписка с ЭЦП.
