export interface ApiBlock {
  ok: boolean;
  method: string;
  title: string;
  data: unknown;
}

export interface MethodDef {
  key: string;
  method: string;
  title: string;
}

export interface Meta {
  swaggerUrl: string;
  states: Record<string, string>;
  periodMethods: MethodDef[];
  bulkMethods: MethodDef[];
  fieldLabels: Record<string, string>;
}

export type TabId = "unp" | "name" | "period" | "state" | "bulk" | "custom";

export type UnpScope = "basic" | "all" | "history" | "go" | "other";
