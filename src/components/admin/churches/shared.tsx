import { Badge } from "@/components/ui/badge";

export type ChurchStatus = "pending_review" | "active" | "inactive" | "rejected";
export type ChurchSource = "import" | "app" | "admin";

export type Church = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  status: ChurchStatus;
  source: ChurchSource;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  merged_into: string | null;
  merged_into_name: string | null;
  linked_profiles: number;
};

export const STATES: { uf: string; name: string }[] = [
  { uf: "AC", name: "Acre" }, { uf: "AL", name: "Alagoas" }, { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" }, { uf: "BA", name: "Bahia" }, { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" }, { uf: "ES", name: "Espírito Santo" }, { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" }, { uf: "MT", name: "Mato Grosso" }, { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" }, { uf: "PA", name: "Pará" }, { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" }, { uf: "PE", name: "Pernambuco" }, { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" }, { uf: "RN", name: "Rio Grande do Norte" }, { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" }, { uf: "RR", name: "Roraima" }, { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" }, { uf: "SE", name: "Sergipe" }, { uf: "TO", name: "Tocantins" },
];

const UF_BY_NAME = Object.fromEntries(STATES.map((s) => [s.name, s.uf]));

/** "Santos/SP" — cidade e sigla, para caber em qualquer largura. */
export function place(c: { city: string | null; state: string | null }): string {
  const uf = c.state ? UF_BY_NAME[c.state] ?? c.state : "";
  return [c.city, uf].filter(Boolean).join("/") || "Sem cidade";
}

export const SOURCE_LABELS: Record<ChurchSource, string> = {
  import: "Importada",
  app: "Sugestão do app",
  admin: "Criada no painel",
};

export function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;
}

export function statusLabel(c: Pick<Church, "status" | "deleted_at" | "merged_into">): string {
  if (c.deleted_at) return "Removida";
  if (c.merged_into) return "Mesclada";
  return { pending_review: "Em revisão", active: "Ativa", inactive: "Inativa", rejected: "Rejeitada" }[c.status];
}

export function StatusBadge({ c }: { c: Pick<Church, "status" | "deleted_at" | "merged_into"> }) {
  const label = statusLabel(c);
  if (c.deleted_at) return <Badge variant="destructive">{label}</Badge>;
  if (c.status === "active") return <Badge>{label}</Badge>;
  if (c.status === "rejected") return <Badge variant="outline" className="text-destructive border-destructive/40">{label}</Badge>;
  if (c.status === "pending_review") return <Badge variant="secondary" className="border-amber-500/40">{label}</Badge>;
  return <Badge variant="secondary">{label}</Badge>;
}

export function linkedText(n: number): string {
  return n === 0 ? "Nenhum perfil ligado" : plural(n, "perfil ligado", "perfis ligados");
}

export function sinceText(iso: string): string {
  const d = new Date(iso);
  return `desde ${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
