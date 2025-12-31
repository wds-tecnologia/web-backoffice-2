// Tipo para formatação de célula
export type CellFormat = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  fontFamily: string;
  fontSize: number;
  format: "text" | "number" | "currency-brl" | "currency-usd" | "percent" | "decimal";
  decimalPlaces: number;
};

// Tipo para célula com valor e formatação
export type Cell = {
  value: string;
  format: CellFormat;
};

// Atualizar o tipo Spreadsheet para incluir larguras de colunas
export type Spreadsheet = {
  id: string;
  title: string;
  rows: Cell[][];
  rowsCount: number;
  columns: number;
  createdAt: string;
  updatedAt: string;
  defaultFormat: CellFormat;
  columnWidths: number[]; // Adicionado para armazenar larguras de colunas
};

// Formato padrão para células
export const DEFAULT_FORMAT: CellFormat = {
  bold: false,
  italic: false,
  underline: false,
  align: "left",
  fontFamily: "Arial, sans-serif",
  fontSize: 12,
  format: "text",
  decimalPlaces: 2,
};

// Atualizar a função createEmptySpreadsheet para incluir larguras de colunas padrão
export function createEmptySpreadsheet(name: string): Spreadsheet {
  const rowsCount = 100;
  const columns = 26;

  // Criar dados iniciais de forma mais eficiente
  const emptyCell = {
    value: "",
    format: { ...DEFAULT_FORMAT },
  };

  const emptyRow = Array(columns)
    .fill(null)
    .map(() => ({ ...emptyCell }));
  const rows = Array(rowsCount)
    .fill(null)
    .map(() =>
      // Criar uma nova cópia do array para cada linha
      [...emptyRow.map((cell) => ({ ...cell }))]
    );

  // Larguras padrão para todas as colunas (100px)
  const columnWidths = Array(columns).fill(100);

  return {
    id: "novo",
    title: name,
    rowsCount,
    rows,
    columns,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultFormat: { ...DEFAULT_FORMAT },
    columnWidths,
  };
} // Converter índice de coluna para letra (ex: 0 -> A, 1 -> B)
export function columnIndexToLetter(index: number): string {
  let temp,
    letter = "";
  let i = index + 1;
  while (i > 0) {
    temp = (i - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    i = (i - temp - 1) / 26;
  }
  return letter;
}
