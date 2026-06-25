import type { ApiBlock, Meta, UnpScope } from "../types";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  meta: () => get<Meta>("/api/meta"),

  unp: (unp: string, scope: UnpScope) =>
    get<Record<string, ApiBlock>>(
      `/api/lookup/unp?unp=${encodeURIComponent(unp)}&scope=${scope}`,
    ),

  name: (name: string) =>
    get<ApiBlock>(`/api/lookup/name?name=${encodeURIComponent(name)}`),

  period: (method: string, start: string, end: string) =>
    get<ApiBlock>(
      `/api/lookup/period?method=${method}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    ),

  state: (state: string) =>
    get<ApiBlock>(`/api/lookup/state?state=${state}`),

  bulk: (method: string) =>
    get<ApiBlock>(`/api/lookup/bulk?method=${method}`),

  custom: (method: string, params: string) =>
    get<ApiBlock>(
      `/api/lookup/custom?method=${encodeURIComponent(method)}&params=${encodeURIComponent(params)}`,
    ),
};
