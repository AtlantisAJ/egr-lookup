import { useEffect, useState } from "react";
import { api } from "./api/client";
import { AppShell } from "./components/AppShell";
import { Spinner } from "./components/ui";
import type { Meta, TabId } from "./types";

export default function App() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>("unp");
  const [pendingUnp, setPendingUnp] = useState<string | null>(null);

  useEffect(() => {
    api
      .meta()
      .then(setMeta)
      .catch((e) => setError(String(e)));
  }, []);

  function openUnp(unp: string) {
    setPendingUnp(unp);
    setTab("unp");
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950">
          <p className="font-medium text-red-800 dark:text-red-200">Не удалось подключиться к API</p>
          <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Запустите бэкенд: <code className="rounded bg-white px-2 py-1 dark:bg-slate-900">cd backend && uvicorn app.main:app --port 8765</code>
          </p>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-br from-blue-600 to-blue-800 px-6 py-8 text-white shadow-lg">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold tracking-tight">ЕГР РБ</h1>
          <p className="mt-1 text-sm text-blue-100">
            Поиск по открытому API реестра.{" "}
            <a
              href={meta.swaggerUrl}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-white"
            >
              Swagger
            </a>
            {" · "}
            <span className="opacity-80">сырые данные, не официальная выписка</span>
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <AppShell
          meta={meta}
          activeTab={tab}
          onTabChange={setTab}
          onOpenUnp={openUnp}
          pendingUnp={pendingUnp}
          onPendingUnpHandled={() => setPendingUnp(null)}
        />
      </main>
    </div>
  );
}
