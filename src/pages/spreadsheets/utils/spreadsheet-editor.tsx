import type React from "react";
import { useState, useEffect, useRef } from "react";

// Material-UI icons
import {
  Add as PlusIcon,
  Delete as TrashIcon,
  Calculate as CalculatorIcon,
  KeyboardArrowDown as ChevronDownIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon,
  Percent as PercentIcon,
  AttachMoney as DollarSignIcon,
  TextFormat as TypeIcon,
  ArrowBack as ArrowLeftIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Print as PrinterIcon,
} from "@mui/icons-material";

import type { Spreadsheet } from "./spreedsheet-utils";
import { api } from "../../../services/api";
import { Loader } from "lucide-react";

// Fontes disponíveis
const FONTS = [
  { name: "Calibri", value: "Calibri, sans-serif" },
  { name: "Cambria", value: "Cambria, serif" },
  { name: "Candara", value: "Candara, sans-serif" },
  { name: "Consolas", value: "Consolas, monospace" },
  { name: "Constantia", value: "Constantia, serif" },
  { name: "Corbel", value: "Corbel, sans-serif" },
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Arial Black", value: "'Arial Black', sans-serif" },
  { name: "Comic Sans MS", value: "'Comic Sans MS', cursive" },
  { name: "Courier New", value: "'Courier New', monospace" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Impact", value: "Impact, sans-serif" },
  { name: "Lucida Console", value: "'Lucida Console', monospace" },
  { name: "Lucida Sans Unicode", value: "'Lucida Sans Unicode', sans-serif" },
  { name: "Palatino Linotype", value: "'Palatino Linotype', serif" },
  { name: "Segoe UI", value: "'Segoe UI', sans-serif" },
  { name: "Tahoma", value: "Tahoma, sans-serif" },
  { name: "Times New Roman", value: "'Times New Roman', serif" },
  { name: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { name: "Verdana", value: "Verdana, sans-serif" },
];

// Tamanhos de fonte disponíveis
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72];

// Largura mínima e máxima para colunas
const MIN_COLUMN_WIDTH = 50;
const MAX_COLUMN_WIDTH = 500;
const DEFAULT_COLUMN_WIDTH = 100;

interface SpreadsheetEditorProps {
  spreadsheet: Spreadsheet;
  onUpdate: (updatedSpreadsheet: Spreadsheet) => void;
  onBack: () => void;
}

export interface Cell {
  value: string;
  format: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    align: "left" | "center" | "right";
    fontFamily: string;
    fontSize: number;
    format: "text" | "number" | "currency-brl" | "currency-usd" | "percent" | "decimal";
    decimalPlaces: number;
  };
}

export function SpreadsheetEditor({ spreadsheet, onUpdate, onBack }: SpreadsheetEditorProps) {
  console.log("spreadSheets", spreadsheet);
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<Cell[][]>(() => {
    if (Array.isArray(spreadsheet.rows)) return spreadsheet.rows;
    // Cria uma nova matriz vazia de cells
    return Array.from({ length: 100 }, () =>
      Array.from({ length: 26 }, () => ({
        value: "",
        format: {
          bold: false,
          italic: false,
          underline: false,
          align: "left",
          fontFamily: "Arial, sans-serif",
          fontSize: 14,
          format: "text",
          decimalPlaces: 2,
        },
      }))
    );
  });
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isFormulaMode, setIsFormulaMode] = useState(false);
  const [columns, setColumns] = useState(spreadsheet.columns);
  const [rows, setRows] = useState(spreadsheet.rowsCount);
  const [ignoreBlur, setIgnoreBlur] = useState(false);
  const [spreadsheetName, setSpreadsheetName] = useState(spreadsheet.title);
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);

  // Estado para redimensionamento de colunas
  const [columnWidths, setColumnWidths] = useState<number[]>(() => {
    // Se a planilha já tiver larguras de colunas definidas, use-as
    if (spreadsheet.columnWidths && spreadsheet.columnWidths.length > 0) {
      return spreadsheet.columnWidths.slice(0, columns);
    }
    // Caso contrário, use a largura padrão
    return Array(columns).fill(DEFAULT_COLUMN_WIDTH);
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumnIndex, setResizingColumnIndex] = useState<number | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // Dropdown states
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [formulaMenuOpen, setFormulaMenuOpen] = useState(false);
  const [decimalMenuOpen, setDecimalMenuOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const fontMenuRef = useRef<HTMLDivElement>(null);
  const sizeMenuRef = useRef<HTMLDivElement>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const formulaMenuRef = useRef<HTMLDivElement>(null);
  const decimalMenuRef = useRef<HTMLDivElement>(null);

  const [history, setHistory] = useState<Cell[][][]>([data]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Inicializar dados da planilha
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Adicionar event listener para capturar cliques fora dos menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Fechar menus quando clicar fora deles
      if (fontMenuRef.current && !fontMenuRef.current.contains(event.target as Node)) {
        setFontMenuOpen(false);
      }
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(event.target as Node)) {
        setSizeMenuOpen(false);
      }
      if (formatMenuRef.current && !formatMenuRef.current.contains(event.target as Node)) {
        setFormatMenuOpen(false);
      }
      if (formulaMenuRef.current && !formulaMenuRef.current.contains(event.target as Node)) {
        setFormulaMenuOpen(false);
      }
      if (decimalMenuRef.current && !decimalMenuRef.current.contains(event.target as Node)) {
        setDecimalMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Adicionar event listener para capturar cliques na tabela
  useEffect(() => {
    const handleTableClick = () => {
      // Quando clicamos na tabela, ignoramos temporariamente o evento blur
      if (isFormulaMode) {
        setIgnoreBlur(true);
        // Resetamos após um curto período para permitir que o evento de clique seja processado
        setTimeout(() => {
          setIgnoreBlur(false);
        }, 100);
      }
    };

    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener("mousedown", handleTableClick);
    }

    return () => {
      if (tableElement) {
        tableElement.removeEventListener("mousedown", handleTableClick);
      }
    };
  }, [isFormulaMode]);

  // Adicionar event listeners para redimensionamento de colunas
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || resizingColumnIndex === null) return;

      const delta = e.clientX - startX;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, startWidth + delta));

      setColumnWidths((prevWidths) => {
        const newWidths = [...prevWidths];
        newWidths[resizingColumnIndex] = newWidth;
        return newWidths;
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizingColumnIndex(null);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, resizingColumnIndex, startX, startWidth]);

  // Iniciar redimensionamento de coluna
  const startResizing = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizingColumnIndex(index);
    setStartX(e.clientX);
    setStartWidth(columnWidths[index]);
  };

  // Salvar alterações na planilha
  const saveSpreadsheet = async () => {
    setIsCreatingLoading(true);
    try {
      let res;

      console.log("isEditring?", spreadsheet);

      if (spreadsheet.id !== "novo") {
        const payload = {
          title: spreadsheetName,
          rows: data,
          columns,
          columnWidths,
          updatedAt: new Date().toISOString(),
        };

        // Atualizar planilha existente
        res = await api.patch(`/sheets/${spreadsheet.id}`, payload);
        console.log("Planilha atualizada:", res.data);
      } else {
        const payload = {
          title: spreadsheetName,
          rows: data,
          columns,
          columnWidths,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        // Criar nova planilha
        res = await api.post("/sheets", payload);
        console.log("Planilha criada:", res.data);
      }

      // Atualiza o estado com a planilha retornada do backend
      onUpdate(res.data);
      onBack();
    } catch (error) {
      console.error("Erro ao salvar planilha:", error);
    } finally {
      setIsCreatingLoading(false);
    }
  };

  // Adicionar linha
  const addRow = () => {
    if (!selectedCell) return;
    const newRow = Array(data[0].length)
      .fill(null)
      .map(() => ({ value: "", format: { ...spreadsheet.defaultFormat } }));

    const newData = [...data];
    newData.splice(selectedCell.row + 1, 0, newRow);
    setData(newData);
    setRows(rows + 1);

    // Adicionar ao histórico
    addToHistory(newData);
  };

  // Adicionar coluna
  const addColumn = () => {
    if (!selectedCell) return;
    const newData = data.map((row) => {
      const newRow = [...row];
      newRow.splice(selectedCell.col + 1, 0, { value: "", format: { ...spreadsheet.defaultFormat } });
      return newRow;
    });
    setData(newData);
    setColumns(columns + 1);

    // Adicionar largura padrão para a nova coluna
    setColumnWidths((prevWidths) => {
      const newWidths = [...prevWidths];
      newWidths.splice(selectedCell.col + 1, 0, DEFAULT_COLUMN_WIDTH);
      return newWidths;
    });

    // Adicionar ao histórico
    addToHistory(newData);
  };

  // Remover linha
  const removeRow = () => {
    if (!selectedCell || data.length <= 1) return;
    const newData = [...data];
    newData.splice(selectedCell.row, 1);
    setData(newData);
    setRows(rows - 1);
    setSelectedCell(null);

    // Adicionar ao histórico
    addToHistory(newData);
  };

  // Remover coluna
  const removeColumn = () => {
    if (!selectedCell || data[0].length <= 1) return;
    const newData = data.map((row) => {
      const newRow = [...row];
      newRow.splice(selectedCell.col, 1);
      return newRow;
    });
    setData(newData);
    setColumns(columns - 1);

    // Remover largura da coluna removida
    setColumnWidths((prevWidths) => {
      const newWidths = [...prevWidths];
      newWidths.splice(selectedCell.col, 1);
      return newWidths;
    });

    setSelectedCell(null);

    // Adicionar ao histórico
    addToHistory(newData);
  };

  // Inserir fórmula
  const insertFormula = (formula: string) => {
    if (!selectedCell) return;
    const formulaText = `=${formula}(`;
    setEditValue(formulaText);
    setIsEditing(true);
    setIsFormulaMode(true);
    setFormulaMenuOpen(false);

    // Mostrar exemplo de uso da fórmula
    let exampleText = "";
    switch (formula.toLowerCase()) {
      case "soma":
        exampleText = "Exemplo: =SOMA(A1;A5) - Soma os valores no intervalo A1 até A5";
        break;
      case "media":
        exampleText = "Exemplo: =MEDIA(A1;A5) - Calcula a média dos valores no intervalo A1 até A5";
        break;
      case "sub":
        exampleText = "Exemplo: =SUB(A1;A2) - Subtrai o valor de A2 do valor de A1";
        break;
      case "mult":
        exampleText = "Exemplo: =MULT(A1;A2) - Multiplica o valor de A1 pelo valor de A2";
        break;
      case "div":
        exampleText = "Exemplo: =DIV(A1;A2) - Divide o valor de A1 pelo valor de A2";
        break;
      case "se":
        exampleText =
          'Exemplo: =SE(A1>A2;"Maior";"Menor") - Se A1 for maior que A2, retorna "Maior", senão retorna "Menor"';
        break;
      case "procv":
        exampleText =
          "Exemplo: =PROCV(A1;B1:C10;2) - Busca o valor de A1 na primeira coluna do intervalo B1:C10 e retorna o valor da segunda coluna";
        break;
    }

    if (exampleText) {
      alert(`Fórmula: ${formula.toUpperCase()}\n${exampleText}`);
    }

    // Garantir que o foco seja colocado no campo de entrada
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(formulaText.length, formulaText.length);
      }
    }, 10);
  };

  // Obter valor de uma célula específica
  const getCellValue = (cellRef: string): string | null => {
    const cell = parseCellReference(cellRef);
    if (!cell) return null;

    const { row, col } = cell;
    if (row < 0 || col < 0 || row >= data.length || col >= data[0].length) return null;

    const value = data[row][col].value;
    if (!value) return "0";

    // Se for uma fórmula, calcula o valor
    if (value.startsWith("=")) {
      return calculateCellValue(value, row, col);
    }

    return value;
  };

  // Calcular valor da célula
  const calculateCellValue = (value: string, row: number, col: number): string => {
    if (!value.startsWith("=")) return value;

    try {
      const formula = value.substring(1).toLowerCase();

      // Verificar se a fórmula está incompleta (falta parêntese de fechamento)
      if ((formula.includes("(") && !formula.includes(")")) || formula.endsWith("(")) {
        return value; // Retorna a própria fórmula sem tentar calcular
      }

      // SOMA
      if (formula.startsWith("soma(") && formula.endsWith(")")) {
        // Substituir ";" por ":" para manter compatibilidade com a função calculateSum
        const range = formula.substring(5, formula.length - 1).replace(";", ":");
        if (!range.trim()) return "#ERRO: Intervalo vazio";
        return calculateSum(range);
      }

      // MÉDIA
      if (formula.startsWith("media(") && formula.endsWith(")")) {
        // Substituir ";" por ":" para manter compatibilidade
        const range = formula.substring(6, formula.length - 1).replace(";", ":");
        if (!range.trim()) return "#ERRO: Intervalo vazio";
        const sum = calculateSum(range);
        const count = countCellsInRange(range);
        return count > 0 ? (Number(sum) / count).toString() : "0";
      }

      // SUBTRAÇÃO
      if (formula.startsWith("sub(") && formula.endsWith(")")) {
        const params = formula.substring(4, formula.length - 1).split(";");
        if (params.length !== 2) return "#ERRO: Formato deve ser SUB(A1;B1)";
        if (!params[0].trim() || !params[1].trim()) return "#ERRO: Parâmetros incompletos";

        const value1 = getCellValue(params[0].trim());
        const value2 = getCellValue(params[1].trim());

        if (value1 === null || value2 === null) return "#ERRO: Célula inválida";

        // Converter para número, tratando valores vazios como zero
        const num1 = value1 === "" ? 0 : Number(value1);
        const num2 = value2 === "" ? 0 : Number(value2);

        if (isNaN(num1) || isNaN(num2)) return "#ERRO: Valor não numérico";

        return (num1 - num2).toString();
      }

      // MULTIPLICAÇÃO
      if (formula.startsWith("mult(") && formula.endsWith(")")) {
        const params = formula.substring(5, formula.length - 1).split(";");
        if (params.length !== 2) return "#ERRO: Formato deve ser MULT(A1;B1)";
        if (!params[0].trim() || !params[1].trim()) return "#ERRO: Parâmetros incompletos";

        const value1 = getCellValue(params[0].trim());
        const value2 = getCellValue(params[1].trim());

        if (value1 === null || value2 === null) return "#ERRO: Célula inválida";

        // Converter para número, tratando valores vazios como zero
        const num1 = value1 === "" ? 0 : Number(value1);
        const num2 = value2 === "" ? 0 : Number(value2);

        if (isNaN(num1) || isNaN(num2)) return "#ERRO: Valor não numérico";

        return (num1 * num2).toString();
      }

      // DIVISÃO
      if (formula.startsWith("div(") && formula.endsWith(")")) {
        const params = formula.substring(4, formula.length - 1).split(";");
        if (params.length !== 2) return "#ERRO: Formato deve ser DIV(A1;B1)";
        if (!params[0].trim() || !params[1].trim()) return "#ERRO: Parâmetros incompletos";

        const value1 = getCellValue(params[0].trim());
        const value2 = getCellValue(params[1].trim());

        if (value1 === null || value2 === null) return "#ERRO: Célula inválida";

        // Converter para número, tratando valores vazios como zero
        const num1 = value1 === "" ? 0 : Number(value1);
        const num2 = value2 === "" ? 0 : Number(value2);

        if (isNaN(num1) || isNaN(num2)) return "#ERRO: Valor não numérico";
        if (num2 === 0) return "#ERRO: Divisão por zero";

        return (num1 / num2).toString();
      }

      // SE (condicional)
      if (formula.startsWith("se(") && formula.endsWith(")")) {
        const content = formula.substring(3, formula.length - 1);
        if (!content.trim()) return "#ERRO: Parâmetros incompletos";

        // Dividir a string em partes, respeitando as vírgulas dentro de strings
        const parts: string[] = [];
        let currentPart = "";
        let inString = false;

        for (let i = 0; i < content.length; i++) {
          const char = content[i];

          if (char === '"' || char === "'") {
            inString = !inString;
            currentPart += char;
          } else if (char === ";" && !inString) {
            parts.push(currentPart.trim());
            currentPart = "";
          } else {
            currentPart += char;
          }
        }

        if (currentPart) {
          parts.push(currentPart.trim());
        }

        if (parts.length !== 3) return "#ERRO: Formato deve ser SE(condição;valor_se_verdadeiro;valor_se_falso)";

        const condition = parts[0];
        const trueValue = parts[1];
        const falseValue = parts[2];

        // Avaliar a condição
        let result = false;

        if (condition.includes("=")) {
          const [left, right] = condition.split("=").map((s) => s.trim());
          const leftValue = getCellValue(left) || "";
          const rightValue = getCellValue(right) || "";

          // Comparação de strings ou números
          if (!isNaN(Number(leftValue)) && !isNaN(Number(rightValue))) {
            result = Number(leftValue) === Number(rightValue);
          } else {
            result = leftValue === rightValue;
          }
        } else if (condition.includes(">")) {
          const [left, right] = condition.split(">").map((s) => s.trim());
          const leftValue = getCellValue(left) || "0";
          const rightValue = getCellValue(right) || "0";

          const num1 = Number(leftValue);
          const num2 = Number(rightValue);

          if (isNaN(num1) || isNaN(num2)) return "#ERRO: Comparação com valor não numérico";

          result = num1 > num2;
        } else if (condition.includes("<")) {
          const [left, right] = condition.split("<").map((s) => s.trim());
          const leftValue = getCellValue(left) || "0";
          const rightValue = getCellValue(right) || "0";

          const num1 = Number(leftValue);
          const num2 = Number(rightValue);

          if (isNaN(num1) || isNaN(num2)) return "#ERRO: Comparação com valor não numérico";

          result = num1 < num2;
        }

        // Retornar o valor apropriado
        if (result) {
          // Se o valor verdadeiro for uma referência de célula
          if (/^[A-Za-z]+\d+$/.test(trueValue)) {
            return getCellValue(trueValue) || "";
          }
          // Se for uma string entre aspas
          if (
            (trueValue.startsWith('"') && trueValue.endsWith('"')) ||
            (trueValue.startsWith("'") && trueValue.endsWith("'"))
          ) {
            return trueValue.substring(1, trueValue.length - 1);
          }
          return trueValue;
        } else {
          // Se o valor falso for uma referência de célula
          if (/^[A-Za-z]+\d+$/.test(falseValue)) {
            return getCellValue(falseValue) || "";
          }
          // Se for uma string entre aspas
          if (
            (falseValue.startsWith('"') && falseValue.endsWith('"')) ||
            (falseValue.startsWith("'") && falseValue.endsWith("'"))
          ) {
            return falseValue.substring(1, falseValue.length - 1);
          }
          return falseValue;
        }
      }

      // PROCV (busca vertical)
      if (formula.startsWith("procv(") && formula.endsWith(")")) {
        const params = formula.substring(6, formula.length - 1).split(";");
        if (params.length !== 3) return "#ERRO: Formato deve ser PROCV(valor_procurado;intervalo;índice_coluna)";
        if (!params[0].trim() || !params[1].trim() || !params[2].trim()) return "#ERRO: Parâmetros incompletos";

        const searchValue = params[0].trim();
        let searchValueContent = searchValue;

        // Se for referência de célula, obter o valor
        if (/^[A-Za-z]+\d+$/.test(searchValue)) {
          const cellValue = getCellValue(searchValue);
          if (cellValue !== null) {
            searchValueContent = cellValue;
          }
        }

        // Substituir ";" por ":" no intervalo para manter compatibilidade
        const range = params[1].trim().replace(";", ":");
        const columnIndex = Number.parseInt(params[2].trim(), 10);

        if (isNaN(columnIndex) || columnIndex < 1) return "#ERRO: Índice de coluna inválido";

        // Dividir o intervalo em células
        const parts = range.split(":");
        if (parts.length !== 2) return "#ERRO: Intervalo inválido";

        const startCell = parseCellReference(parts[0]);
        const endCell = parseCellReference(parts[1]);

        if (!startCell || !endCell) return "#ERRO: Referência de célula inválida";

        // Verificar se o índice da coluna está dentro do intervalo
        if (startCell.col + columnIndex - 1 > endCell.col) return "#ERRO: Índice de coluna fora do intervalo";

        // Buscar o valor
        for (let r = startCell.row; r <= endCell.row; r++) {
          if (r >= data.length) continue;

          const cellValue = data[r][startCell.col].value;

          // Se encontrar o valor na primeira coluna
          if (cellValue === searchValueContent) {
            // Retornar o valor da coluna especificada
            const resultCol = startCell.col + columnIndex - 1;
            if (resultCol <= endCell.col && resultCol < data[r].length) {
              return data[r][resultCol].value || "";
            }
          }
        }

        return "#N/A";
      }

      // Se chegou aqui, a fórmula não foi reconhecida
      if (formula.trim() === "") return value; // Retorna a própria fórmula se estiver vazia
      return "#ERRO: Fórmula inválida";
    } catch (e) {
      console.error("Erro ao calcular fórmula:", e);
      return "#ERRO";
    }
  };

  // Calcular soma de um intervalo
  const calculateSum = (range: string): string => {
    const parts = range.split(":");
    if (parts.length !== 2) return "#ERRO";

    const startCell = parseCellReference(parts[0]);
    const endCell = parseCellReference(parts[1]);

    if (!startCell || !endCell) return "#ERRO";

    let sum = 0;
    for (let r = Math.min(startCell.row, endCell.row); r <= Math.max(startCell.row, endCell.row); r++) {
      for (let c = Math.min(startCell.col, endCell.col); c <= Math.max(startCell.col, endCell.col); c++) {
        if (r >= 0 && c >= 0 && r < data.length && c < data[0].length) {
          const cellValue = data[r][c].value;
          // Verifica se o valor é um número válido
          if (cellValue && !isNaN(Number(cellValue))) {
            sum += Number(cellValue);
          }
        }
      }
    }

    return sum.toString();
  };

  // Contar células em um intervalo
  const countCellsInRange = (range: string): number => {
    const parts = range.split(":");
    if (parts.length !== 2) return 0;

    const startCell = parseCellReference(parts[0]);
    const endCell = parseCellReference(parts[1]);

    if (!startCell || !endCell) return 0;

    let count = 0;
    for (let r = Math.min(startCell.row, endCell.row); r <= Math.max(startCell.row, endCell.row); r++) {
      for (let c = Math.min(startCell.col, endCell.col); c <= Math.max(startCell.col, endCell.col); c++) {
        if (r >= 0 && c >= 0 && r < data.length && c < data[0].length) {
          const cellValue = data[r][c].value;
          // Contar células com valores numéricos
          if (cellValue && !isNaN(Number(cellValue))) {
            count++;
          }
        }
      }
    }

    // Se não encontrou nenhuma célula com valor numérico, retorna o número total de células no intervalo
    if (count === 0) {
      const rowCount = Math.max(startCell.row, endCell.row) - Math.min(startCell.row, endCell.row) + 1;
      const colCount = Math.max(startCell.col, endCell.col) - Math.min(startCell.col, endCell.col) + 1;
      return rowCount * colCount;
    }

    return count;
  };

  // Converter referência de célula (ex: A1) para índices
  const parseCellReference = (ref: string): { row: number; col: number } | null => {
    const match = ref.trim().match(/^([A-Za-z]+)(\d+)$/);
    if (!match) return null;

    const colStr = match[1].toUpperCase();
    const rowIdx = Number.parseInt(match[2]) - 1;

    let colIdx = 0;
    for (let i = 0; i < colStr.length; i++) {
      colIdx = colIdx * 26 + (colStr.charCodeAt(i) - 64);
    }
    colIdx -= 1;

    // Não validamos os limites aqui para permitir referências a células que ainda não existem
    if (rowIdx < 0 || colIdx < 0) {
      return null;
    }

    return { row: rowIdx, col: colIdx };
  };

  // Converter índice de coluna para letra (ex: 0 -> A, 1 -> B)
  const columnIndexToLetter = (index: number): string => {
    let temp,
      letter = "";
    let i = index + 1;
    while (i > 0) {
      temp = (i - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      i = (i - temp - 1) / 26;
    }
    return letter;
  };

  // Manipular clique na célula
  const handleCellClick = (row: number, col: number) => {
    // Se estiver no modo de fórmula, adiciona a referência da célula
    if (isFormulaMode && isEditing) {
      const cellRef = `${columnIndexToLetter(col)}${row + 1}`;

      // Lógica para adicionar a referência à fórmula com ";" como separador
      if (editValue.endsWith("(")) {
        // Se a fórmula acabou de ser iniciada, apenas adiciona a referência
        setEditValue(editValue + cellRef);
      } else if (editValue.endsWith(";")) {
        // Se já termina com ";", apenas adiciona a referência
        setEditValue(editValue + cellRef);
      } else if (editValue.includes("(") && !editValue.includes(";") && !editValue.endsWith("(")) {
        // Se já tem uma referência mas não tem ";" ainda, adiciona ";" e a nova referência
        setEditValue(editValue + ";" + cellRef);
      } else {
        // Em outros casos, adiciona ";" e a nova referência
        setEditValue(editValue + ";" + cellRef);
      }

      // Mantém o foco no campo de edição
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
      return;
    }

    // Comportamento normal quando não está no modo de fórmula
    setSelectedCell({ row, col });
    const value = data[row][col].value;
    setEditValue(value);
    setIsEditing(false);
    setIsFormulaMode(false);
  };

  // Iniciar edição
  const startEditing = () => {
    if (!selectedCell) return;
    setIsEditing(true);
    // Se o valor atual for uma fórmula, ativa o modo de fórmula
    if (data[selectedCell.row][selectedCell.col].value.startsWith("=")) {
      setIsFormulaMode(true);
    }
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  // Adicionar alteração ao histórico
  const addToHistory = (newData: Cell[][]) => {
    // Limitar o histórico para evitar consumo excessivo de memória
    const maxHistorySize = 50;

    // Remover estados futuros se estiver no meio do histórico
    const newHistory = history.slice(0, historyIndex + 1);

    // Adicionar novo estado
    const updatedHistory = [...newHistory, JSON.parse(JSON.stringify(newData))].slice(-maxHistorySize);

    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

  // Desfazer última alteração
  const undoChange = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setData(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  // Refazer alteração desfeita
  const redoChange = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setData(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  // Finalizar edição
  const finishEditing = () => {
    if (!selectedCell || !isEditing) return;

    let finalValue = editValue;

    // Se for uma fórmula e não tiver parêntese de fechamento, adiciona automaticamente
    if (
      isFormulaMode &&
      finalValue.startsWith("=") &&
      finalValue.includes("(") &&
      !finalValue.endsWith(")") &&
      !finalValue.endsWith("(")
    ) {
      finalValue += ")";
    }

    const newData = [...data];
    newData[selectedCell.row][selectedCell.col] = {
      ...newData[selectedCell.row][selectedCell.col],
      value: finalValue,
    };
    setData(newData);

    // Adicionar ao histórico
    addToHistory(newData);

    setIsEditing(false);
    setIsFormulaMode(false);
  };

  // Manipular tecla pressionada
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      finishEditing();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setIsFormulaMode(false);
    } else if (e.key === "Tab") {
      e.preventDefault();
      finishEditing();
      if (selectedCell && selectedCell.col < data[0].length - 1) {
        setSelectedCell({ ...selectedCell, col: selectedCell.col + 1 });
      }
    }
  };

  // Manipular mudança no campo de edição
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditValue(value);

    // Ativa o modo de fórmula se o valor começar com "="
    if (value.startsWith("=")) {
      setIsFormulaMode(true);
    } else {
      setIsFormulaMode(false);
    }
  };

  // Manipular evento blur do campo de edição
  const handleInputBlur = () => {
    // Se ignoreBlur for true, não finalizamos a edição
    if (!ignoreBlur) {
      finishEditing();
    }
  };

  // Funções de formatação
  const toggleBold = () => {
    if (!selectedCell) return;
    const newData = [...data];
    const currentFormat = newData[selectedCell.row][selectedCell.col].format;
    newData[selectedCell.row][selectedCell.col].format = {
      ...currentFormat,
      bold: !currentFormat.bold,
    };
    setData(newData);

    // Adicionar ao histórico
    addToHistory(newData);
  };

  const toggleItalic = () => {
    if (!selectedCell) return;
    const newData = [...data];
    const currentFormat = newData[selectedCell.row][selectedCell.col].format;
    newData[selectedCell.row][selectedCell.col].format = {
      ...currentFormat,
      italic: !currentFormat.italic,
    };
    setData(newData);

    // Adicionar ao histórico
    addToHistory(newData);
  };

  const toggleUnderline = () => {
    if (!selectedCell) return;
    const newData = [...data];
    const currentFormat = newData[selectedCell.row][selectedCell.col].format;
    newData[selectedCell.row][selectedCell.col].format = {
      ...currentFormat,
      underline: !currentFormat.underline,
    };
    setData(newData);

    // Adicionar ao histórico
    addToHistory(newData);
  };

  const setAlignment = (align: "left" | "center" | "right") => {
    if (!selectedCell) return;
    const newData = [...data];
    const currentFormat = newData[selectedCell.row][selectedCell.col].format;
    newData[selectedCell.row][selectedCell.col].format = {
      ...currentFormat,
      align,
    };
    setData(newData);

    // Adicionar ao histórico
    addToHistory(newData);
  };

  const setFontFamily = (fontFamily: string) => {
    if (!selectedCell) return;
    const newData = [...data];
    const currentFormat = newData[selectedCell.row][selectedCell.col].format;
    newData[selectedCell.row][selectedCell.col].format = {
      ...currentFormat,
      fontFamily,
    };
    setData(newData);
    setFontMenuOpen(false);

    // Adicionar ao histórico
    addToHistory(newData);
  };

  const setFontSize = (fontSize: number) => {
    if (!selectedCell) return;
    const newData = [...data];
    const currentFormat = newData[selectedCell.row][selectedCell.col].format;
    newData[selectedCell.row][selectedCell.col].format = {
      ...currentFormat,
      fontSize,
    };

    setData(newData);
    setSizeMenuOpen(false);

    // Adicionar ao histórico
    addToHistory(newData);
  };

  const setNumberFormat = (format: string) => {
    if (!selectedCell) return;
    const newData = [...data];
    const currentFormat = newData[selectedCell.row][selectedCell.col].format;
    newData[selectedCell.row][selectedCell.col].format = {
      ...currentFormat,
      format: format as any,
    };
    setData(newData);
    setFormatMenuOpen(false);

    // Adicionar ao histórico
    addToHistory(newData);
  };

  const setDecimalPlaces = (places: number) => {
    if (!selectedCell) return;
    const newData = [...data];
    const currentFormat = newData[selectedCell.row][selectedCell.col].format;
    newData[selectedCell.row][selectedCell.col].format = {
      ...currentFormat,
      decimalPlaces: places,
    };
    setData(newData);
    setDecimalMenuOpen(false);

    // Adicionar ao histórico
    addToHistory(newData);
  };

  // Formatar valor para exibição
  const formatDisplayValue = (value: string, format: any): string => {
    if (!value || value.startsWith("=") || value.startsWith("#")) return value;

    let formattedValue = value;

    // Aplicar formatação numérica
    if (!isNaN(Number(value))) {
      const numValue = Number(value);

      switch (format.format) {
        case "currency-brl":
          formattedValue = numValue.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: format.decimalPlaces,
            maximumFractionDigits: format.decimalPlaces,
          });
          break;
        case "currency-usd":
          formattedValue = numValue.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: format.decimalPlaces,
            maximumFractionDigits: format.decimalPlaces,
          });
          break;
        case "percent":
          formattedValue =
            (numValue * 100).toLocaleString("pt-BR", {
              minimumFractionDigits: format.decimalPlaces,
              maximumFractionDigits: format.decimalPlaces,
            }) + "%";
          break;
        case "decimal":
          formattedValue = numValue.toLocaleString("pt-BR", {
            minimumFractionDigits: format.decimalPlaces,
            maximumFractionDigits: format.decimalPlaces,
          });
          break;
      }
    }

    return formattedValue;
  };

  // Obter a formatação atual da célula selecionada
  const getCurrentFormat = () => {
    if (!selectedCell) return spreadsheet.defaultFormat;
    return data[selectedCell.row][selectedCell.col].format;
  };

  // Editar nome da planilha
  const startNameEditing = () => {
    setIsNameEditing(true);
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 0);
  };

  const finishNameEditing = () => {
    setIsNameEditing(false);
    // Não permitir nomes vazios
    if (!spreadsheetName.trim()) {
      setSpreadsheetName(spreadsheet.title);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      finishNameEditing();
    } else if (e.key === "Escape") {
      setSpreadsheetName(spreadsheet.title);
      setIsNameEditing(false);
    }
  };

  // Adicionar suporte para atalhos de teclado (Ctrl+Z e Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se estiver editando uma célula
      if (isEditing) return;

      // Ctrl+Z para desfazer
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undoChange();
      }

      // Ctrl+Y para refazer
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        redoChange();
      }

      // Ctrl+P para imprimir
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [historyIndex, isEditing]);

  // Função para imprimir a planilha
  const handlePrint = () => {
    setIsPrinting(true);

    // Criar conteúdo HTML para impressão
    const printContent = generatePrintContent();

    // Usar um iframe para impressão para não afetar a página atual
    if (printFrameRef.current) {
      const frameDoc = printFrameRef.current.contentDocument;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(printContent);
        frameDoc.close();

        // Aguardar o carregamento do conteúdo antes de imprimir
        setTimeout(() => {
          try {
            printFrameRef.current?.contentWindow?.print();
            setIsPrinting(false);
          } catch (error) {
            console.error("Erro ao imprimir:", error);
            setIsPrinting(false);
          }
        }, 500);
      }
    }
  };

  // Gerar conteúdo HTML para impressão
  const generatePrintContent = () => {
    // Calcular valores para todas as células com fórmulas
    const calculatedData = data.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (cell.value.startsWith("=")) {
          return {
            ...cell,
            displayValue: calculateCellValue(cell.value, rowIndex, colIndex),
          };
        }
        return {
          ...cell,
          displayValue: cell.value,
        };
      })
    );

    // Criar HTML para impressão
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${spreadsheetName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
          }
          h1 {
            font-size: 18px;
            margin-bottom: 10px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 12px;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
            text-align: center;
          }
          .footer {
            font-size: 10px;
            color: #666;
            margin-top: 20px;
            text-align: center;
          }
          @media print {
            body {
              margin: 0;
              padding: 15px;
            }
            h1 {
              margin-top: 0;
            }
          }
        </style>
      </head>
      <body>
        <h1>${spreadsheetName}</h1>
        <table>
          <thead>
            <tr>
              <th></th>
              ${Array(columns)
                .fill(0)
                .map((_, index) => `<th>${columnIndexToLetter(index)}</th>`)
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${calculatedData
              .map(
                (row, rowIndex) => `
              <tr>
                <th>${rowIndex + 1}</th>
                ${row
                  .map((cell) => {
                    const displayValue = formatDisplayValue(cell.displayValue, cell.format);
                    const style = `
                      font-weight: ${cell.format.bold ? "bold" : "normal"};
                      font-style: ${cell.format.italic ? "italic" : "normal"};
                      text-decoration: ${cell.format.underline ? "underline" : "none"};
                      text-align: ${cell.format.align};
                      font-family: ${cell.format.fontFamily};
                      font-size: ${cell.format.fontSize}px;
                    `;
                    return `<td style="${style}">${displayValue}</td>`;
                  })
                  .join("")}
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <div class="footer">
          Gerado em ${new Date().toLocaleString("pt-BR")}
        </div>
      </body>
      </html>
    `;
  };

  if (!isClient) {
    return <div className="flex justify-center items-center h-screen">Carregando planilha...</div>;
  }

  // Obter o nome da fonte atual para exibição
  const getCurrentFontName = () => {
    if (!selectedCell) return "Arial";
    const fontFamily = getCurrentFormat().fontFamily;
    const font = FONTS.find((f) => f.value === fontFamily);
    return font ? font.name : "Arial";
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-full text-black hover:bg-gray-100"
            title="Voltar para a lista"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          {isNameEditing ? (
            <input
              ref={nameInputRef}
              value={spreadsheetName}
              onChange={(e) => setSpreadsheetName(e.target.value)}
              onBlur={finishNameEditing}
              onKeyDown={handleNameKeyDown}
              className="text-2xl font-bold border-b text-black border-gray-300 focus:outline-none focus:border-black min-w-[300px]"
            />
          ) : (
            <h1
              onClick={startNameEditing}
              className="text-2xl text-black font-bold cursor-pointer"
              title="Clique para editar"
            >
              {spreadsheetName}
            </h1>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-1 px-3 py-1.5 text-black border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            title="Imprimir planilha (Ctrl+P)"
          >
            <PrinterIcon className="h-4 w-4" />
            <span>Imprimir</span>
          </button>
          <button
            type="button"
            onClick={saveSpreadsheet}
            className="flex items-center gap-1 px-3 py-1.5 text-black border border-gray-300 rounded hover:bg-gray-300 hover:scale-105 duration-300"
          >
            {isCreatingLoading ? (
              <>
                <Loader className="h-4 w-4 text-black animate-spin" />
                <span className="text-black">Salvando...</span>
              </>
            ) : (
              <>
                <SaveIcon className="h-4 w-4 text-black" />
                <span className="text-black">Salvar Alterações</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg mb-4">
        {/* Barra de ferramentas de formatação */}
        <div className="flex flex-wrap items-center p-2 bg-gray-100 border-b border-gray-200 gap-2">
          {/* Fonte */}
          <div className="relative" ref={fontMenuRef}>
            <button
              type="button"
              onClick={() => setFontMenuOpen(!fontMenuOpen)}
              disabled={!selectedCell}
              className="flex items-center text-black justify-between w-32 px-2 py-1 border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="truncate">{getCurrentFontName()}</span>
              <ChevronDownIcon className="h-4 w-4 ml-1 text-black" />
            </button>
            {fontMenuOpen && (
              <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto">
                {FONTS.map((font) => (
                  <button
                    type="button"
                    key={font.value}
                    onClick={() => setFontFamily(font.value)}
                    className="w-full px-4 py-2 text-left text-black hover:bg-gray-100 truncate"
                    style={{ fontFamily: font.value }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tamanho da fonte */}
          <div className="relative" ref={sizeMenuRef}>
            <button
              type="button"
              onClick={() => setSizeMenuOpen(!sizeMenuOpen)}
              disabled={!selectedCell}
              className="flex items-center justify-between text-black w-20 px-2 py-1 border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{selectedCell ? getCurrentFormat().fontSize : 12}</span>
              <ChevronDownIcon className="h-4 w-4 ml-1 text-black" />
            </button>
            {sizeMenuOpen && (
              <div className="absolute z-10 mt-1 w-20 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto">
                {FONT_SIZES.map((size) => (
                  <button
                    type="button"
                    key={size}
                    onClick={() => setFontSize(size)}
                    className="w-full px-4 py-2 text-black text-left hover:bg-gray-100"
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-6 border-l border-gray-300 mx-1" />
          {/* Formatação de texto */}
          <div className="flex border border-gray-300 rounded overflow-hidden">
            <button
              type="button"
              onClick={toggleBold}
              disabled={!selectedCell}
              className={`p-1.5 ${
                selectedCell && getCurrentFormat().bold ? "bg-gray-200" : "bg-white"
              } hover:bg-gray-100 text-black disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Negrito"
            >
              <BoldIcon className="h-4 w-4 text-black" />
            </button>
            <button
              type="button"
              onClick={toggleItalic}
              disabled={!selectedCell}
              className={`p-1.5  ${
                selectedCell && getCurrentFormat().italic ? "bg-gray-200" : "bg-white"
              } hover:bg-gray-100 text-black disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Itálico"
            >
              <ItalicIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleUnderline}
              disabled={!selectedCell}
              className={`p-1.5 ${
                selectedCell && getCurrentFormat().underline ? "bg-gray-200" : "bg-white"
              } hover:bg-gray-100 text-black disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Sublinhado"
            >
              <UnderlineIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="h-6 border-l border-gray-300 mx-1" />
          {/* Alinhamento */}
          <div className="flex border border-gray-300 rounded overflow-hidden">
            <button
              type="button"
              onClick={() => setAlignment("left")}
              disabled={!selectedCell}
              className={`p-1.5 ${
                selectedCell && getCurrentFormat().align === "left" ? "bg-gray-200" : "bg-white"
              } hover:bg-gray-100 text-black disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Alinhar à esquerda"
            >
              <AlignLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setAlignment("center")}
              disabled={!selectedCell}
              className={`p-1.5 ${
                selectedCell && getCurrentFormat().align === "center" ? "bg-gray-200" : "bg-white"
              } hover:bg-gray-100 text-black disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Centralizar"
            >
              <AlignCenterIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setAlignment("right")}
              disabled={!selectedCell}
              className={`p-1.5 ${
                selectedCell && getCurrentFormat().align === "right" ? "bg-gray-200" : "bg-white"
              } hover:bg-gray-100 text-black disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Alinhar à direita"
            >
              <AlignRightIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="h-6 border-l border-gray-300 mx-1" />
          {/* Formatação numérica */}
          <div className="relative" ref={formatMenuRef}>
            <button
              type="button"
              onClick={() => setFormatMenuOpen(!formatMenuOpen)}
              disabled={!selectedCell}
              className="flex items-center text-black gap-1 px-2 py-1 border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TypeIcon className="h-4 w-4" />
              <span>Formato</span>
              <ChevronDownIcon className="h-4 w-4" />
            </button>
            {formatMenuOpen && (
              <div className="absolute text-black z-10 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg">
                <button
                  type="button"
                  onClick={() => setNumberFormat("text")}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                >
                  <span>Texto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNumberFormat("number")}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                >
                  <span>Número</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNumberFormat("currency-brl")}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                >
                  <span className="mr-2">R$</span>
                  <span>Real (R$)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNumberFormat("currency-usd")}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                >
                  <DollarSignIcon className="h-4 w-4 mr-2" />
                  <span>Dólar ($)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNumberFormat("percent")}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                >
                  <PercentIcon className="h-4 w-4 mr-2" />
                  <span>Porcentagem (%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNumberFormat("decimal")}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center"
                >
                  <span>Decimal (0.00)</span>
                </button>
              </div>
            )}
          </div>

          {/* Casas decimais */}
          <div className="relative" ref={decimalMenuRef}>
            <button
              type="button"
              onClick={() => setDecimalMenuOpen(!decimalMenuOpen)}
              disabled={!selectedCell}
              className="flex items-center text-black justify-between w-32 px-2 py-1 border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {selectedCell
                  ? `${getCurrentFormat().decimalPlaces} ${
                      getCurrentFormat().decimalPlaces === 1 ? "decimal" : "decimais"
                    }`
                  : "2 decimais"}
              </span>
              <ChevronDownIcon className="h-4 w-4 ml-1" />
            </button>
            {decimalMenuOpen && (
              <div className="absolute text-black z-10 mt-1 w-32 bg-white border border-gray-200 rounded shadow-lg">
                {[0, 1, 2, 3, 4].map((places) => (
                  <button
                    type="button"
                    key={places}
                    onClick={() => setDecimalPlaces(places)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100"
                  >
                    {places} {places === 1 ? "decimal" : "decimais"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Barra de ferramentas principal */}
        <div className="flex flex-wrap text-black items-center p-2 bg-gray-100 border-b border-gray-200 gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addRow}
              disabled={!selectedCell}
              className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Adicionar Linha</span>
            </button>
            <button
              type="button"
              onClick={addColumn}
              disabled={!selectedCell}
              className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Adicionar Coluna</span>
            </button>
          </div>

          <div className="h-6 border-l border-gray-300 mx-1 hidden sm:block" />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={removeRow}
              disabled={!selectedCell || data.length <= 1}
              className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Remover Linha</span>
            </button>
            <button
              type="button"
              onClick={removeColumn}
              disabled={!selectedCell || data[0].length <= 1}
              className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Remover Coluna</span>
            </button>
          </div>

          <div className="h-6 border-l border-gray-300 mx-1 hidden sm:block" />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={undoChange}
              disabled={historyIndex <= 0}
              className="p-1.5 border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Desfazer (Ctrl+Z)"
            >
              <UndoIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={redoChange}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refazer (Ctrl+Y)"
            >
              <RedoIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="h-6 border-l border-gray-300 mx-1 hidden sm:block" />

          <div className="relative" ref={formulaMenuRef}>
            <button
              type="button"
              onClick={() => setFormulaMenuOpen(!formulaMenuOpen)}
              className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded bg-white"
            >
              <CalculatorIcon className="h-4 w-4" />
              <span>Fórmulas</span>
              <ChevronDownIcon className="h-4 w-4" />
            </button>
            {formulaMenuOpen && (
              <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg">
                <button
                  type="button"
                  onClick={() => insertFormula("soma")}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100"
                >
                  SOMA
                </button>
                <button
                  type="button"
                  onClick={() => insertFormula("media")}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100"
                >
                  MÉDIA
                </button>
                <button
                  type="button"
                  onClick={() => insertFormula("sub")}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100"
                >
                  SUBTRAÇÃO
                </button>
                <button
                  type="button"
                  onClick={() => insertFormula("mult")}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100"
                >
                  MULTIPLICAÇÃO
                </button>
                <button
                  type="button"
                  onClick={() => insertFormula("div")}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100"
                >
                  DIVISÃO
                </button>
                <button
                  type="button"
                  onClick={() => insertFormula("se")}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100"
                >
                  SE (Condicional)
                </button>
                <button
                  type="button"
                  onClick={() => insertFormula("procv")}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100"
                >
                  PROCV (Busca)
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-1 overflow-x-auto ">
          <table ref={tableRef} className="border-collapse w-full ">
            <thead>
              <tr>
                <th className="bg-gray-100 font-bold text-center p-2 min-w-[40px] h-8 border border-gray-300" />
                {Array(columns)
                  .fill(0)
                  .map((_, index) => (
                    <th
                      key={index}
                      className="bg-gray-100 text-black font-bold text-center p-2 h-8 border border-gray-300 relative"
                      style={{ width: `${columnWidths[index]}px` }}
                    >
                      {columnIndexToLetter(index)}
                      {/* Alça de redimensionamento */}
                      <div
                        className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-black hover:opacity-50"
                        onMouseDown={(e) => startResizing(index, e)}
                      />
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <th className="bg-gray-100 text-black font-bold text-center p-2 w-[40px] h-8 border border-gray-300">
                    {rowIndex + 1}
                  </th>
                  {row.slice(0, Math.min(row.length, 26)).map((cell, colIndex) => {
                    const isSelected = selectedCell && selectedCell.row === rowIndex && selectedCell.col === colIndex;

                    // Não calcular o valor da fórmula se a célula estiver sendo editada
                    const rawValue =
                      isSelected && isEditing
                        ? cell.value
                        : cell.value.startsWith("=")
                        ? calculateCellValue(cell.value, rowIndex, colIndex)
                        : cell.value;

                    const displayValue = formatDisplayValue(rawValue, cell.format);

                    // Aplicar estilos
                    const cellStyle: React.CSSProperties = {
                      fontWeight: cell.format.bold ? "bold" : "normal",
                      fontStyle: cell.format.italic ? "italic" : "normal",
                      textDecoration: cell.format.underline ? "underline" : "none",
                      textAlign: cell.format.align,
                      fontFamily: cell.format.fontFamily,
                      fontSize: `${cell.format.fontSize}px`,
                      width: `${columnWidths[colIndex]}px`,
                    };

                    return (
                      <td
                        key={colIndex}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        onDoubleClick={() => {
                          handleCellClick(rowIndex, colIndex);
                          startEditing();
                        }}
                        className={`p-0 relative border border-gray-300 text-black h-8 ${
                          isSelected ? "bg-gray-100" : ""
                        } ${isSelected ? "outline outline-1 outline-black" : ""} ${
                          isFormulaMode ? "cursor-cell" : "cursor-default"
                        }`}
                        style={{ width: `${columnWidths[colIndex]}px` }}
                      >
                        {isSelected && isEditing ? (
                          <input
                            ref={inputRef}
                            value={editValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onBlur={handleInputBlur}
                            className="w-full h-full text-black p-2 border-none focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <div
                            className="p-2 h-full text-black overflow-hidden whitespace-nowrap text-ellipsis"
                            style={cellStyle}
                          >
                            {displayValue}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isFormulaMode && (
        <div className="fixed bottom-4 right-4 p-2 bg-gray-100 border border-gray-300 rounded shadow-md">
          <p className="text-sm font-medium">Modo Fórmula: Clique nas células para adicionar à fórmula</p>
        </div>
      )}

      {/* Frame oculto para impressão */}
      <iframe ref={printFrameRef} className="hidden" title="Impressão da planilha" />
    </div>
  );
}
