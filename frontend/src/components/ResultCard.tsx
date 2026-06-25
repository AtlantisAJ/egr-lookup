import type { ApiBlock } from "../types";
import { countRecords, flatten, fmtDate } from "../lib/format";

function Badge({ kind }: { kind: "ok" | "empty" | "err" }) {
  const map = {
    ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    empty: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    err: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  };
  const label = { ok: "ок", empty: "нет данных", err: "ошибка" }[kind];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[kind]}`}>
      {label}
    </span>
  );
}

function DataTable({
  record,
  labels,
}: {
  record: Record<string, unknown>;
  labels: Record<string, string>;
}) {
  const flat = flatten(record);
  const rows = Object.keys(labels)
    .filter((k) => k in flat)
    .map((k) => ({ key: k, label: labels[k], value: flat[k] }));

  if (!rows.length) return null;

  return (
    <table className="mt-3 w-full border-collapse text-sm">
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-slate-100 dark:border-slate-800">
            <th className="w-2/5 py-2 pr-3 text-left font-medium text-slate-500">
              {r.label}
            </th>
            <td className="py-2">{fmtDate(r.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ResultCard({
  block,
  labels,
}: {
  block: ApiBlock;
  labels: Record<string, string>;
}) {
  const { ok, title, method, data } = block;
  const empty = data == null || (Array.isArray(data) && data.length === 0);
  const kind = !ok ? "err" : empty ? "empty" : "ok";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">{title || method}</h3>
        <Badge kind={kind} />
        {!empty && ok && (
          <span className="text-xs text-slate-400">{countRecords(data)} зап.</span>
        )}
      </div>

      {!ok && (
        <p className="text-sm text-red-600 dark:text-red-400">{String(data ?? "")}</p>
      )}

      {ok && !empty && (
        <>
          {(Array.isArray(data) ? data : [data]).map((rec, i) => (
            <DataTable
              key={i}
              record={rec as Record<string, unknown>}
              labels={labels}
            />
          ))}
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
              JSON ({method})
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}

export function ResultList({
  blocks,
  labels,
}: {
  blocks: ApiBlock[];
  labels: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => (
        <ResultCard key={`${b.method}-${i}`} block={b} labels={labels} />
      ))}
    </div>
  );
}
