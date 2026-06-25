const DATE_RE = /^\d{4}-\d{2}-\d{2}T/;

export function fmtDate(value: unknown): string {
  if (typeof value === "string" && DATE_RE.test(value)) {
    return value.slice(0, 10).split("-").reverse().join(".");
  }
  return String(value ?? "");
}

export function flatten(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v as Record<string, unknown>));
    } else if (!Array.isArray(v) && v != null && v !== "") {
      if (!(k in out)) out[k] = v;
    }
  }
  return out;
}

export function downloadJson(data: unknown, prefix = "egr") {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${prefix}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function countRecords(data: unknown): number {
  if (data == null) return 0;
  return Array.isArray(data) ? data.length : 1;
}
