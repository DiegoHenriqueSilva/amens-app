import { useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, FileUp } from "lucide-react";
import { adminRpc } from "@/lib/admin-rpc";
import { decodeCsv, downloadText, normalizeHeader, parseCsv, toCsv } from "@/lib/csv";
import { plural } from "./shared";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 50000;
const CHUNK = 500;

type Field = "name" | "city" | "state" | "address";
const HEADERS: Record<Field, string[]> = {
  name: ["nome", "name", "igreja", "paroquia", "nome da igreja", "nome da paroquia"],
  city: ["cidade", "city", "municipio"],
  state: ["estado", "uf", "state"],
  address: ["endereco", "address", "logradouro"],
};
const FIELD_LABEL: Record<Field, string> = { name: "nome", city: "cidade", state: "estado", address: "endereço" };

type Row = { line: number; name: string; city: string; state: string; address: string };
type Result = "ok" | "duplicate_db" | "duplicate_file" | "error" | "not_sent";
type Checked = Row & { result: Result; message?: string; key?: string; saved?: boolean };
type ServerRow = { line: number; result: Exclude<Result, "not_sent">; message?: string; key?: string };
type ServerRes = { ok: number; duplicates: number; errors: number; rows: ServerRow[] };

type Step = "file" | "checking" | "preview" | "saving" | "done";
type Filter = "error" | "dup" | "ok";

const RESULT_TEXT: Record<Result, string> = {
  ok: "Pronta",
  duplicate_db: "Já existe",
  duplicate_file: "Repetida no arquivo",
  error: "Com erro",
  not_sent: "Não gravada",
};

function mapHeader(header: string[]): { idx: Partial<Record<Field, number>>; ignored: string[] } {
  const idx: Partial<Record<Field, number>> = {};
  const ignored: string[] = [];
  header.forEach((h, i) => {
    const n = normalizeHeader(h);
    const f = (Object.keys(HEADERS) as Field[]).find((k) => HEADERS[k].includes(n));
    if (f && idx[f] === undefined) idx[f] = i;
    else if (h.trim()) ignored.push(h.trim());
  });
  return { idx, ignored };
}

export function ChurchImportDialog({ open, onOpenChange, onImported }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef(false);
  const [step, setStep] = useState<Step>("file");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string[]>([]);
  const [rows, setRows] = useState<Checked[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [filter, setFilter] = useState<Filter>("error");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);

  function reset() {
    setStep("file"); setFileName(""); setFileError(null); setNotice([]); setRows([]);
    setProgress({ done: 0, total: 0 }); setSaveError(null); setStopped(false); stopRef.current = false;
    if (fileRef.current) fileRef.current.value = "";
  }

  const busy = step === "checking" || step === "saving";
  const count = (pred: (r: Checked) => boolean) => rows.filter(pred).length;
  const nOk = count((r) => r.result === "ok");
  const nDup = count((r) => r.result === "duplicate_db" || r.result === "duplicate_file");
  const nErr = count((r) => r.result === "error");
  const nSaved = count((r) => !!r.saved);
  const nNotSent = count((r) => r.result === "not_sent");

  async function readFile(file: File) {
    reset();
    setFileName(file.name);
    if (!/\.csv$/i.test(file.name)) return setFileError("Escolha um arquivo .csv. Se a planilha estiver em Excel, use Arquivo › Salvar como › CSV UTF-8.");
    if (file.size > MAX_BYTES) return setFileError("O arquivo tem mais de 10 MB. Divida em partes menores.");

    const { text, encoding } = decodeCsv(await file.arrayBuffer());
    const parsed = parseCsv(text);
    if (parsed.length < 2) return setFileError("O arquivo não tem linhas além do cabeçalho.");
    const { idx, ignored } = mapHeader(parsed[0].cells);
    const missing = (["name", "city", "state"] as Field[]).filter((f) => idx[f] === undefined).map((f) => FIELD_LABEL[f]);
    if (missing.length) return setFileError(`Faltam as colunas: ${missing.join(", ")}. A primeira linha precisa ter os nomes das colunas (nome, cidade, estado e, se quiser, endereço).`);
    const body = parsed.slice(1);
    if (body.length > MAX_ROWS) return setFileError(`O arquivo tem ${body.length.toLocaleString("pt-BR")} linhas. O limite é ${MAX_ROWS.toLocaleString("pt-BR")} por importação: divida em partes.`);

    const msgs: string[] = [];
    if (encoding === "windows-1252") msgs.push("O arquivo não está em UTF-8 e foi lido como CSV do Excel (Windows). Confira os acentos na prévia.");
    if (ignored.length) msgs.push(`Colunas ignoradas: ${ignored.join(", ")}. A situação de cada igreja importada é sempre "Ativa".`);
    setNotice(msgs);

    const cell = (c: string[], f: Field) => (idx[f] === undefined ? "" : (c[idx[f]!] ?? ""));
    const all: Row[] = body.map(({ line, cells }) => ({
      line, name: cell(cells, "name"), city: cell(cells, "city"), state: cell(cells, "state"), address: cell(cells, "address"),
    }));
    await check(all);
  }

  // Prévia: o servidor valida e procura duplicadas; nada é gravado.
  async function check(all: Row[]) {
    setStep("checking");
    setProgress({ done: 0, total: all.length });
    const seen = new Set<string>();
    const out: Checked[] = [];
    try {
      for (let i = 0; i < all.length; i += CHUNK) {
        const part = all.slice(i, i + CHUNK);
        const res = await adminRpc<ServerRes>("admin_import_churches", { p_rows: part, p_dry_run: true });
        const byLine = new Map(res.rows.map((r) => [r.line, r]));
        for (const r of part) {
          const s = byLine.get(r.line)!;
          // Repetida entre lotes: o servidor só enxerga o lote atual.
          if (s.result === "ok" && s.key && seen.has(s.key)) out.push({ ...r, result: "duplicate_file", message: "Repetida no próprio arquivo.", key: s.key });
          else out.push({ ...r, result: s.result, message: s.message, key: s.key });
          if (s.key) seen.add(s.key);
        }
        setProgress({ done: Math.min(i + CHUNK, all.length), total: all.length });
      }
    } catch (e) {
      setStep("file");
      return setFileError(`Não foi possível conferir o arquivo: ${e instanceof Error ? e.message : "erro de conexão"}. Nada foi gravado.`);
    }
    setRows(out);
    setFilter(out.some((r) => r.result === "error") ? "error" : out.some((r) => r.result !== "ok") ? "dup" : "ok");
    setStep("preview");
  }

  async function save() {
    const toSend = rows.filter((r) => r.result === "ok");
    const batch = crypto.randomUUID();
    stopRef.current = false;
    setSaveError(null);
    setStopped(false);
    setStep("saving");
    setProgress({ done: 0, total: toSend.length });
    const updated = new Map(rows.map((r) => [r.line, r]));
    let failed = false;
    for (let i = 0; i < toSend.length; i += CHUNK) {
      if (stopRef.current) { setStopped(true); break; }
      const part = toSend.slice(i, i + CHUNK);
      try {
        const res = await adminRpc<ServerRes>("admin_import_churches", {
          p_rows: part.map(({ line, name, city, state, address }) => ({ line, name, city, state, address })),
          p_dry_run: false, p_batch: batch, p_file_name: fileName,
        });
        for (const s of res.rows) {
          const r = updated.get(s.line)!;
          updated.set(s.line, { ...r, result: s.result, message: s.message, saved: s.result === "ok" });
        }
      } catch (e) {
        failed = true;
        setSaveError(e instanceof Error ? e.message : "erro de conexão");
        break;
      }
      setProgress({ done: Math.min(i + CHUNK, toSend.length), total: toSend.length });
    }
    // O que estava pronto e não foi enviado (parou ou falhou) fica marcado, para o relatório não mentir.
    for (const r of toSend) {
      const u = updated.get(r.line)!;
      if (u.result === "ok" && !u.saved) updated.set(r.line, { ...u, result: "not_sent", message: failed ? "Não gravada: a importação parou com erro." : "Não gravada: você parou a importação." });
    }
    setRows([...updated.values()].sort((a, b) => a.line - b.line));
    setStep("done");
    onImported();
  }

  function report() {
    downloadText(
      `relatorio-importacao-${fileName.replace(/\.csv$/i, "")}.csv`,
      toCsv(["linha", "nome", "cidade", "estado", "endereco", "resultado", "motivo"],
        rows.map((r) => [r.line, r.name, r.city, r.state, r.address, r.saved ? "Gravada" : RESULT_TEXT[r.result], r.message ?? ""])),
    );
  }

  const shown = rows.filter((r) =>
    filter === "error" ? r.result === "error" || r.result === "not_sent"
      : filter === "dup" ? r.result === "duplicate_db" || r.result === "duplicate_file"
        : r.result === "ok" || r.saved);
  const LIMIT = 200;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (busy) return; if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar igrejas (CSV)</DialogTitle>
          <DialogDescription asChild>
            <ol className="flex flex-wrap gap-x-3 text-xs" aria-label="Etapas">
              {[["file", "1. Arquivo"], ["preview", "2. Prévia"], ["done", "3. Resultado"]].map(([s, l]) => {
                const current = s === step || (s === "file" && step === "checking") || (s === "preview" && step === "saving");
                return <li key={s} aria-current={current ? "step" : undefined} className={current ? "font-semibold text-foreground" : ""}>{l}</li>;
              })}
            </ol>
          </DialogDescription>
        </DialogHeader>

        {(step === "file" || step === "checking") && (
          <div className="space-y-3 text-sm">
            <p>Envie um arquivo CSV com as colunas <strong>nome</strong>, <strong>cidade</strong> e <strong>estado</strong> (sigla ou nome). <strong>Endereço</strong> é opcional. Até 10 MB e 50.000 linhas.</p>
            <p className="text-muted-foreground">Nada é gravado antes da sua confirmação. Igrejas que já existem na mesma cidade são ignoradas, nunca substituídas.</p>
            <div className="space-y-1.5">
              <Label htmlFor="church-import-file">Arquivo</Label>
              <input
                id="church-import-file"
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                disabled={busy}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); }}
              />
            </div>
            {step === "checking" && (
              <div role="status" className="space-y-1">
                <p>Conferindo {fileName}… {progress.done.toLocaleString("pt-BR")} de {progress.total.toLocaleString("pt-BR")} linhas</p>
                <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} aria-label="Progresso da conferência" />
              </div>
            )}
            {fileError && (
              <div role="alert" className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{fileError}</span>
              </div>
            )}
          </div>
        )}

        {(step === "preview" || step === "saving" || step === "done") && (
          <div className="space-y-3 text-sm">
            <p className="font-medium break-all">{fileName} · {plural(rows.length, "linha", "linhas")}</p>
            {notice.map((n) => <p key={n} className="text-xs text-muted-foreground">{n}</p>)}

            {step === "done" ? (
              <div role="status" className={`rounded-md border px-3 py-2 ${saveError || stopped ? "border-amber-500/50 bg-amber-500/5" : "border-border bg-muted/40"}`}>
                <p className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary" aria-hidden="true" /> {plural(nSaved, "igreja importada", "igrejas importadas")}.
                </p>
                {(saveError || stopped) && (
                  <p className="mt-1">
                    {saveError ? `A importação parou com erro: ${saveError}. ` : "Você parou a importação. "}
                    {plural(nNotSent, "linha pronta não foi gravada", "linhas prontas não foram gravadas")}. Envie o mesmo arquivo de novo: as já gravadas aparecem como "Já existe".
                  </p>
                )}
                <p className="mt-1 text-muted-foreground">{plural(nDup, "ignorada por já existir ou se repetir", "ignoradas por já existirem ou se repetirem")} · {plural(nErr, "com erro", "com erro")}.</p>
              </div>
            ) : (
              <ul className="space-y-1" aria-label="Resumo da prévia">
                <li>✔ <strong>{nOk.toLocaleString("pt-BR")}</strong> {nOk === 1 ? "pronta para entrar" : "prontas para entrar"}</li>
                <li>↺ <strong>{nDup.toLocaleString("pt-BR")}</strong> {nDup === 1 ? "já existe ou se repete (será ignorada)" : "já existem ou se repetem (serão ignoradas)"}</li>
                <li>✖ <strong>{nErr.toLocaleString("pt-BR")}</strong> com erro (não {nErr === 1 ? "entra" : "entram"})</li>
              </ul>
            )}

            {step === "saving" && (
              <div role="status" className="space-y-1">
                <p>Gravando… {progress.done.toLocaleString("pt-BR")} de {progress.total.toLocaleString("pt-BR")}</p>
                <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} aria-label="Progresso da gravação" />
              </div>
            )}

            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar linhas">
              {([["error", "Com erro"], ["dup", "Ignoradas"], ["ok", step === "done" ? "Gravadas" : "Prontas"]] as [Filter, string][]).map(([f, l]) => (
                <Button key={f} type="button" size="sm" variant={filter === f ? "default" : "outline"} aria-pressed={filter === f} onClick={() => setFilter(f)}>{l}</Button>
              ))}
            </div>
            <ul className="max-h-60 overflow-y-auto rounded-md border border-border divide-y divide-border" aria-label="Linhas do arquivo">
              {shown.length === 0 && <li className="px-3 py-2 text-muted-foreground">Nenhuma linha neste filtro.</li>}
              {shown.slice(0, LIMIT).map((r) => (
                <li key={r.line} className="px-3 py-2">
                  <p className="break-words"><span className="text-muted-foreground">Linha {r.line} ·</span> {r.name || <em>sem nome</em>} <span className="text-muted-foreground">· {[r.city, r.state].filter(Boolean).join("/") || "sem cidade"}</span></p>
                  {r.message && <p className={`text-xs ${r.result === "error" || r.result === "not_sent" ? "text-destructive" : "text-muted-foreground"}`}>{r.message}</p>}
                </li>
              ))}
            </ul>
            {shown.length > LIMIT && <p className="text-xs text-muted-foreground">Mostrando {LIMIT} de {shown.length.toLocaleString("pt-BR")}. O relatório tem todas as linhas.</p>}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
          {(step === "preview" || step === "done") && (
            <Button type="button" variant="outline" onClick={report}>Baixar relatório</Button>
          )}
          {step === "preview" && (
            <>
              <Button type="button" variant="outline" onClick={reset}>Outro arquivo</Button>
              <Button type="button" onClick={() => void save()} disabled={nOk === 0}>
                <FileUp className="w-4 h-4 mr-1" aria-hidden="true" /> Importar {nOk.toLocaleString("pt-BR")}
              </Button>
            </>
          )}
          {step === "saving" && (
            <Button type="button" variant="outline" onClick={() => { stopRef.current = true; }}>Parar depois deste lote</Button>
          )}
          {(step === "file" || step === "done") && (
            <Button type="button" onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
