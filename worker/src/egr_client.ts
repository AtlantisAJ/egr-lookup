const API_BASE = "http://egr.gov.by/api/v2/egr";
const RETRIES = 6;
const RETRY_SLEEP_MS = 1500;
const TIMEOUT_MS = 25_000;
const MAX_CONCURRENCY = 8;

let active = 0;
const queue: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENCY) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function release(): void {
  const next = queue.shift();
  if (next) next();
  else active -= 1;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callApi(
  method: string,
  ...pathArgs: string[]
): Promise<[boolean, unknown]> {
  const segments = [method, ...pathArgs.map(String)];
  const url =
    API_BASE + "/" + segments.map((s) => encodeURIComponent(s)).join("/");
  let lastErr: string | null = null;

  await acquire();
  try {
    for (let i = 0; i < RETRIES; i++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const resp = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "egr-lookup/3.0",
          },
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (resp.status === 204) return [true, null];
        if (resp.status === 200) {
          const text = await resp.text();
          if (!text) {
            lastErr = "пустой ответ от сервера";
            await sleep(RETRY_SLEEP_MS);
            continue;
          }
          return [true, JSON.parse(text)];
        }
        lastErr = `HTTP ${resp.status}`;
        await sleep(RETRY_SLEEP_MS);
      } catch (exc) {
        lastErr = exc instanceof Error ? exc.message : String(exc);
        await sleep(RETRY_SLEEP_MS);
      }
    }
  } finally {
    release();
  }

  return [false, lastErr ?? "неизвестная ошибка"];
}

export async function fetchParallel(
  methods: Array<{ key: string; method: string; title: string }>,
  ...pathArgs: string[]
): Promise<Record<string, { ok: boolean; method: string; title: string; data: unknown }>> {
  const pairs = await Promise.all(
    methods.map(async (m) => {
      const [ok, data] = await callApi(m.method, ...pathArgs);
      return [m.key, { ok, method: m.method, title: m.title, data }] as const;
    }),
  );
  return Object.fromEntries(pairs);
}
