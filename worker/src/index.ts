import {
  BULK_METHODS,
  FIELD_LABELS,
  PERIOD_METHODS,
  STATES,
  unpMethods,
} from "./catalog";
import { callApi, fetchParallel } from "./egr_client";

export interface Env {
  SWAGGER_URL: string;
}

const ALLOWED_ORIGINS = new Set([
  "https://atlantisaj.github.io",
  "https://AtlantisAJ.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(origin: string | null): HeadersInit {
  const allowed =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://atlantisaj.github.io";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

function error(detail: string, status: number, origin: string | null): Response {
  return json({ detail }, status, origin);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "GET") {
      return error("Method Not Allowed", 405, origin);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (path === "/api/health") {
        return json({ status: "ok" }, 200, origin);
      }

      if (path === "/api/meta") {
        return json(
          {
            swaggerUrl: env.SWAGGER_URL,
            states: STATES,
            periodMethods: PERIOD_METHODS,
            bulkMethods: BULK_METHODS,
            fieldLabels: FIELD_LABELS,
          },
          200,
          origin,
        );
      }

      if (path === "/api/lookup/unp") {
        const unp = url.searchParams.get("unp") ?? "";
        const scope = url.searchParams.get("scope") ?? "basic";
        if (!unp) return error("УНП обязателен", 400, origin);
        if (!/^\d+$/.test(unp)) return error("УНП должен быть числом", 400, origin);
        const data = await fetchParallel(unpMethods(scope), unp);
        return json(data, 200, origin);
      }

      if (path === "/api/lookup/name") {
        const name = url.searchParams.get("name") ?? "";
        if (!name) return error("name обязателен", 400, origin);
        const [ok, data] = await callApi("getShortInfoByRegName", name);
        return json(
          { ok, method: "getShortInfoByRegName", title: "Поиск по названию", data },
          200,
          origin,
        );
      }

      if (path === "/api/lookup/period") {
        const method = url.searchParams.get("method") ?? "";
        const start = url.searchParams.get("start") ?? "";
        const end = url.searchParams.get("end") ?? "";
        const allowed = new Set(PERIOD_METHODS.map((m) => m.method));
        if (!allowed.has(method)) return error("Неизвестный метод", 400, origin);
        if (!start || !end) return error("start и end обязательны", 400, origin);
        const [ok, data] = await callApi(method, start, end);
        const title =
          PERIOD_METHODS.find((m) => m.method === method)?.title ?? method;
        return json({ ok, method, title, data }, 200, origin);
      }

      if (path === "/api/lookup/state") {
        const state = url.searchParams.get("state") ?? "1";
        if (!(state in STATES)) return error("Неверное состояние", 400, origin);
        const [ok, data] = await callApi("getRegNumByState", state);
        return json(
          {
            ok,
            method: "getRegNumByState",
            title: `УНП: ${STATES[state]}`,
            data,
          },
          200,
          origin,
        );
      }

      if (path === "/api/lookup/bulk") {
        const method = url.searchParams.get("method") ?? "";
        const allowed = new Set(BULK_METHODS.map((m) => m.method));
        if (!allowed.has(method)) return error("Неизвестный метод", 400, origin);
        const [ok, data] = await callApi(method);
        const title =
          BULK_METHODS.find((m) => m.method === method)?.title ?? method;
        return json({ ok, method, title, data }, 200, origin);
      }

      if (path === "/api/lookup/custom") {
        const method = url.searchParams.get("method") ?? "";
        const params = url.searchParams.get("params") ?? "";
        if (!/^[A-Za-z0-9_]+$/.test(method)) {
          return error("Некорректное имя метода", 400, origin);
        }
        let args: string[];
        if (params.includes("/")) {
          args = params.split("/").filter(Boolean);
        } else if (params.trim()) {
          args = params
            .split(/\r?\n/)
            .map((p) => p.trim())
            .filter(Boolean);
        } else {
          args = [];
        }
        const [ok, data] = await callApi(method, ...args);
        return json({ ok, method, title: method, data }, 200, origin);
      }

      return error("Not Found", 404, origin);
    } catch (exc) {
      const detail = exc instanceof Error ? exc.message : String(exc);
      return error(detail, 500, origin);
    }
  },
};
