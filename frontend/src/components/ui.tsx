import type { ReactNode } from "react";

const styles: Record<string, string> = {
  primary:
    "rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
  input:
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-slate-600 dark:bg-slate-900",
  select:
    "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-slate-600 dark:bg-slate-900",
  card: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900",
  warn: "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
}) {
  return (
    <button className={`${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${styles.input} ${className}`} {...props} />;
}

export function Select({
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${styles.select} ${className}`} {...props} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${styles.input} min-h-24 resize-y font-mono text-sm`}
      {...props}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.card} ${className}`}>{children}</div>;
}

export function Warning({ children }: { children: ReactNode }) {
  return <div className={styles.warn}>{children}</div>;
}

export function Spinner() {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-500">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      Загрузка…
    </div>
  );
}
