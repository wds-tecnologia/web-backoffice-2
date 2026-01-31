/**
 * Corrige data que veio invertida do backend (YYYY-DD-MM → YYYY-MM-DD).
 * Ex: "2025-28-11" → "2025-11-28"
 */
export function fixInvertedDateString(date: string): string {
  if (!date || typeof date !== "string") return date;
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return date;
  const [, year, part1, part2] = match;
  const num1 = parseInt(part1, 10);
  const num2 = parseInt(part2, 10);
  if (num1 > 12 && num2 <= 12) {
    return `${year}-${part2}-${part1}`;
  }
  return date;
}

/**
 * Formata data para exibição em formato brasileiro (DD/MM/YYYY).
 * Aceita: YYYY-MM-DD, YYYY-DD-MM (corrige antes), ou ISO.
 * Use apenas na renderização (texto); inputs type="date" continuam com value em YYYY-MM-DD.
 */
export function formatDateToBR(date: string | Date | null | undefined): string {
  if (date == null || date === "") return "";
  const str = typeof date === "string" ? fixInvertedDateString(date) : date;
  const d = typeof str === "string" ? new Date(str) : str;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formata data e hora para exibição em formato brasileiro (DD/MM/YYYY HH:mm).
 * Se não tiver hora (ou for 00:00), retorna só a data (DD/MM/YYYY).
 */
export function formatDateTimeToBR(date: string | Date | null | undefined): string {
  if (date == null || date === "") return "";
  const str = typeof date === "string" ? fixInvertedDateString(date) : date;
  const d = typeof str === "string" ? new Date(str) : str;
  if (Number.isNaN(d.getTime())) return "";
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
  if (!hasTime) return formatDateToBR(d);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency2(value: number, decimals = 2, currency = 'USD') {
    if (isNaN(value)) value = 0;
    if (currency === 'USD') {
      return `$ ${value.toFixed(decimals)}`;
    } else {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    }
  }

  export function formatCurrency(value: number, decimals = 2, currency = 'BRL') {
    if (isNaN(value)) return '0.00';
    
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value);
    } else {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value);
    }
  }