import { useEffect, useState } from "react";
import type { Meta, TabId } from "../types";
import { api } from "../api/client";
import { downloadJson } from "../lib/format";
import { Button, Card, Input, Select, Spinner, Textarea, Warning } from "./ui";
import { ResultCard, ResultList } from "./ResultCard";
import type { ApiBlock, UnpScope } from "../types";
import { flatten } from "../lib/format";

const TABS: { id: TabId; label: string }[] = [
  { id: "unp", label: "По УНП" },
  { id: "name", label: "По названию" },
  { id: "period", label: "За период" },
  { id: "state", label: "По состоянию" },
  { id: "bulk", label: "Массовые" },
  { id: "custom", label: "Произвольный" },
];

interface Props {
  meta: Meta;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onOpenUnp: (unp: string) => void;
  pendingUnp: string | null;
  onPendingUnpHandled: () => void;
}

export function AppShell({
  meta,
  activeTab,
  onTabChange,
  onOpenUnp,
  pendingUnp,
  onPendingUnpHandled,
}: Props) {
  const labels = meta.fieldLabels;

  // UNP
  const [unp, setUnp] = useState("100390954");
  const [scopeMode, setScopeMode] = useState<"basic" | "all" | "custom">("basic");
  const [extraHistory, setExtraHistory] = useState(false);
  const [extraGo, setExtraGo] = useState(false);
  const [extraOther, setExtraOther] = useState(false);
  const [unpResults, setUnpResults] = useState<ApiBlock[]>([]);
  const [unpRaw, setUnpRaw] = useState<unknown>(null);
  const [unpLoading, setUnpLoading] = useState(false);
  const [unpStatus, setUnpStatus] = useState("");

  // Name
  const [name, setName] = useState("");
  const [nameResults, setNameResults] = useState<Record<string, unknown>[]>([]);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameStatus, setNameStatus] = useState("");

  // Period
  const [pStart, setPStart] = useState("01.01.2025");
  const [pEnd, setPEnd] = useState("31.12.2025");
  const [pMethod, setPMethod] = useState(meta.periodMethods[0]?.method ?? "");
  const [periodResult, setPeriodResult] = useState<ApiBlock | null>(null);
  const [periodLoading, setPeriodLoading] = useState(false);

  // State
  const [state, setState] = useState("1");
  const [stateResult, setStateResult] = useState<ApiBlock | null>(null);
  const [stateLoading, setStateLoading] = useState(false);

  // Bulk
  const [bulkMethod, setBulkMethod] = useState(meta.bulkMethods[0]?.method ?? "");
  const [bulkResult, setBulkResult] = useState<ApiBlock | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Custom
  const [customMethod, setCustomMethod] = useState("getBaseInfoByRegNum");
  const [customParams, setCustomParams] = useState("100390954");
  const [customResult, setCustomResult] = useState<ApiBlock | null>(null);
  const [customLoading, setCustomLoading] = useState(false);

  function resolveScope(): UnpScope {
    if (scopeMode === "all") return "all";
    if (scopeMode === "basic" && !extraHistory && !extraGo && !extraOther) return "basic";
    if (extraHistory && extraGo) return "all";
    if (extraHistory && extraOther) return "all";
    if (extraGo && extraOther) return "all";
    if (extraHistory) return "history";
    if (extraGo) return "go";
    if (extraOther) return "other";
    return "basic";
  }

  async function searchUnp(targetUnp?: string) {
    const value = (targetUnp ?? unp).trim();
    if (!/^\d+$/.test(value)) {
      setUnpStatus("Введите УНП цифрами.");
      return;
    }
    setUnp(value);
    setUnpLoading(true);
    setUnpStatus("Запрашиваю данные…");
    setUnpResults([]);
    try {
      const data = await api.unp(value, resolveScope());
      setUnpRaw(data);
      const blocks = Object.values(data);
      setUnpResults(blocks);
      setUnpStatus(`Готово. УНП ${value}, блоков: ${blocks.length}`);
    } catch (e) {
      setUnpStatus(`Ошибка: ${e}`);
    } finally {
      setUnpLoading(false);
    }
  }

  async function searchName() {
    if (!name.trim()) return;
    setNameLoading(true);
    setNameStatus("Ищу…");
    setNameResults([]);
    try {
      const res = await api.name(name.trim());
      const arr = Array.isArray(res.data) ? res.data : [];
      setNameResults(arr as Record<string, unknown>[]);
      setNameStatus(`Найдено: ${arr.length}`);
    } catch (e) {
      setNameStatus(`Ошибка: ${e}`);
    } finally {
      setNameLoading(false);
    }
  }

  async function searchPeriod() {
    setPeriodLoading(true);
    setPeriodResult(null);
    try {
      setPeriodResult(await api.period(pMethod, pStart, pEnd));
    } finally {
      setPeriodLoading(false);
    }
  }

  async function searchState() {
    setStateLoading(true);
    setStateResult(null);
    try {
      setStateResult(await api.state(state));
    } finally {
      setStateLoading(false);
    }
  }

  async function searchBulk() {
    setBulkLoading(true);
    setBulkResult(null);
    try {
      setBulkResult(await api.bulk(bulkMethod));
    } finally {
      setBulkLoading(false);
    }
  }

  async function searchCustom() {
    setCustomLoading(true);
    setCustomResult(null);
    try {
      setCustomResult(await api.custom(customMethod, customParams));
    } finally {
      setCustomLoading(false);
    }
  }

  useEffect(() => {
    if (pendingUnp && activeTab === "unp") {
      void searchUnp(pendingUnp);
      onPendingUnpHandled();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUnp, activeTab]);

  return (
  <>
    <nav className="mb-6 flex flex-wrap gap-2">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === t.id
              ? "bg-blue-600 text-white shadow"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>

    {activeTab === "unp" && (
      <section className="space-y-4">
        <Card>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[200px] flex-1">
              <Input
                value={unp}
                onChange={(e) => setUnp(e.target.value)}
                placeholder="УНП, например 100390954"
                onKeyDown={(e) => e.key === "Enter" && searchUnp()}
              />
            </div>
            <Button onClick={() => searchUnp()} disabled={unpLoading}>
              Найти
            </Button>
            {unpRaw != null && (
              <Button variant="secondary" onClick={() => downloadJson(unpRaw, `unp-${unp}`)}>
                Скачать JSON
              </Button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={scopeMode === "basic"}
                onChange={() => setScopeMode("basic")}
              />
              Основное (7)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={scopeMode === "all"}
                onChange={() => setScopeMode("all")}
              />
              Всё по УНП
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={extraHistory}
                onChange={(e) => { setScopeMode("custom"); setExtraHistory(e.target.checked); }}
              />
              + история
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={extraGo}
                onChange={(e) => { setScopeMode("custom"); setExtraGo(e.target.checked); }}
              />
              + GO
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={extraOther}
                onChange={(e) => { setScopeMode("custom"); setExtraOther(e.target.checked); }}
              />
              + ИП→ЮЛ
            </label>
          </div>
          {unpStatus && <p className="mt-3 text-sm text-slate-500">{unpStatus}</p>}
        </Card>
        {unpLoading && <Spinner />}
        <ResultList blocks={unpResults} labels={labels} />
      </section>
    )}

    {activeTab === "name" && (
      <section className="space-y-4">
        <Card>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[200px] flex-1">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название организации"
                onKeyDown={(e) => e.key === "Enter" && searchName()}
              />
            </div>
            <Button onClick={searchName} disabled={nameLoading}>Искать</Button>
          </div>
          {nameStatus && <p className="mt-3 text-sm text-slate-500">{nameStatus}</p>}
        </Card>
        {nameLoading && <Spinner />}
        <div className="space-y-3">
          {nameResults.map((item, i) => {
            const flat = flatten(item);
            const regNum = String(flat.ngrn ?? "");
            return (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <button
                  className="text-left text-blue-600 hover:underline dark:text-blue-400"
                  onClick={() => onOpenUnp(regNum)}
                >
                  УНП {regNum}
                </button>
                <p className="mt-1 font-medium">{String(flat.vnaim ?? flat.vn ?? "")}</p>
                <p className="text-sm text-slate-500">{String(flat.vnsostk ?? "")}</p>
              </div>
            );
          })}
        </div>
      </section>
    )}

    {activeTab === "period" && (
      <section className="space-y-4">
        <Card>
          <div className="flex flex-wrap gap-3">
            <Input value={pStart} onChange={(e) => setPStart(e.target.value)} placeholder="ДД.ММ.ГГГГ" className="w-36" />
            <Input value={pEnd} onChange={(e) => setPEnd(e.target.value)} placeholder="ДД.ММ.ГГГГ" className="w-36" />
            <Select value={pMethod} onChange={(e) => setPMethod(e.target.value)} className="min-w-[220px]">
              {meta.periodMethods.map((m) => (
                <option key={m.method} value={m.method}>{m.title}</option>
              ))}
            </Select>
            <Button onClick={searchPeriod} disabled={periodLoading}>Запросить</Button>
          </div>
        </Card>
        {periodLoading && <Spinner />}
        {periodResult && <ResultCard block={periodResult} labels={labels} />}
      </section>
    )}

    {activeTab === "state" && (
      <section className="space-y-4">
        <Warning>Может вернуть очень большой список УНП.</Warning>
        <Card>
          <div className="flex flex-wrap gap-3">
            <Select value={state} onChange={(e) => setState(e.target.value)} className="min-w-[280px]">
              {Object.entries(meta.states).map(([k, v]) => (
                <option key={k} value={k}>{k} — {v}</option>
              ))}
            </Select>
            <Button onClick={searchState} disabled={stateLoading}>Список УНП</Button>
            {stateResult?.ok && (
              <Button variant="secondary" onClick={() => downloadJson(stateResult, "state")}>
                Скачать JSON
              </Button>
            )}
          </div>
        </Card>
        {stateLoading && <Spinner />}
        {stateResult && (
          <>
            <ResultCard block={stateResult} labels={labels} />
            {Array.isArray(stateResult.data) && stateResult.data.length > 0 && (
              <Card>
                <p className="mb-2 text-sm text-slate-500">
                  Первые 80 УНП (клик — профиль):
                </p>
                <p className="flex flex-wrap gap-2 text-sm">
                  {stateResult.data.slice(0, 80).map((x, i) => {
                    const n = typeof x === "object" && x && "ngrn" in x
                      ? String((x as { ngrn: number }).ngrn)
                      : String(x);
                    return (
                      <button
                        key={i}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-blue-600 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                        onClick={() => onOpenUnp(n)}
                      >
                        {n}
                      </button>
                    );
                  })}
                </p>
              </Card>
            )}
          </>
        )}
      </section>
    )}

    {activeTab === "bulk" && (
      <section className="space-y-4">
        <Warning>Массовые выгрузки — большой объём, ответ может идти долго.</Warning>
        <Card>
          <div className="flex flex-wrap gap-3">
            <Select value={bulkMethod} onChange={(e) => setBulkMethod(e.target.value)} className="min-w-[260px]">
              {meta.bulkMethods.map((m) => (
                <option key={m.method} value={m.method}>{m.title}</option>
              ))}
            </Select>
            <Button onClick={searchBulk} disabled={bulkLoading}>Загрузить</Button>
            {bulkResult?.ok && (
              <Button variant="secondary" onClick={() => downloadJson(bulkResult, "bulk")}>
                Скачать JSON
              </Button>
            )}
          </div>
        </Card>
        {bulkLoading && <Spinner />}
        {bulkResult && <ResultCard block={bulkResult} labels={labels} />}
      </section>
    )}

    {activeTab === "custom" && (
      <section className="space-y-4">
        <Card className="space-y-3">
          <p className="text-sm text-slate-500">
            Любой метод из{" "}
            <a href={meta.swaggerUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              Swagger
            </a>
            . Параметры — по строке или через «/».
          </p>
          <Input
            value={customMethod}
            onChange={(e) => setCustomMethod(e.target.value)}
            placeholder="getBaseInfoByRegNum"
          />
          <Textarea
            value={customParams}
            onChange={(e) => setCustomParams(e.target.value)}
            placeholder="100390954"
          />
          <Button onClick={searchCustom} disabled={customLoading}>Выполнить</Button>
        </Card>
        {customLoading && <Spinner />}
        {customResult && <ResultCard block={customResult} labels={labels} />}
      </section>
    )}
  </>
  );
}
