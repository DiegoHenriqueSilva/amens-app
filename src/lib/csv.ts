/**
 * Leitor de CSV sem dependências (substitui a biblioteca xlsx nos fluxos de igrejas).
 * Lê só texto: fórmulas não são avaliadas. RFC 4180: aspas, aspas duplicadas, quebra de linha dentro de aspas.
 */

/** Decodifica o arquivo: UTF-8 (com ou sem BOM); se não for UTF-8 válido, Windows-1252 (CSV comum do Excel). */
export function decodeCsv(buffer: ArrayBuffer): { text: string; encoding: "utf-8" | "windows-1252" } {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return { text: (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text), encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(buffer), encoding: "windows-1252" };
  }
}

/** Escolhe o separador mais frequente fora de aspas na primeira linha (vírgula, ponto e vírgula ou tab). */
export function detectDelimiter(text: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === "\n" || ch === "\r")) break;
    else if (!inQuotes && ch in counts) counts[ch]++;
  }
  const [best, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return n > 0 ? best : ",";
}

/** Devolve as linhas com o número da linha no arquivo (1 = cabeçalho). Linhas totalmente vazias são puladas. */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): { line: number; cells: string[] }[] {
  const out: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  let rowStart = 1;
  const push = () => {
    cells.push(cell);
    if (cells.some((c) => c.trim() !== "")) out.push({ line: rowStart, cells });
    cells = [];
    cell = "";
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
    } else if (ch === '"' && cell === "") {
      inQuotes = true;
    } else if (ch === delimiter) {
      cells.push(cell);
      cell = "";
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      push();
      line++;
      rowStart = line;
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || cells.length > 0) push();
  return out;
}

/** Célula segura para abrir no Excel: neutraliza fórmula (=, +, -, @) com apóstrofo. */
function safeCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[";\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const BOM = String.fromCharCode(0xfeff);

export function toCsv(header: string[], rows: unknown[][]): string {
  return BOM + [header, ...rows].map((r) => r.map(safeCell).join(",")).join("\r\n");
}

export function downloadText(name: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Normaliza nome de coluna para comparar: minúsculas, sem acento, sem espaços extras. */
export function normalizeHeader(h: string): string {
  return h.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
