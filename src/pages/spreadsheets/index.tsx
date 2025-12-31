import { useState, useEffect } from "react";
import { SpreadsheetList } from "./utils/spreadsheet-list";
import { SpreadsheetEditor } from "./utils/spreadsheet-editor";
import { CellFormat, type Spreadsheet, createEmptySpreadsheet } from "./utils/spreedsheet-utils";
import { api } from "../../services/api";
import * as XLSX from "xlsx";

export default function SpreadsheetApp() {
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [currentSpreadsheet, setCurrentSpreadsheet] = useState<Spreadsheet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);
  const [isDeletingAllLoading, setIsDeletingAllLoading] = useState(false);

  // Carregar planilhas do localStorage na inicialização
  useEffect(() => {
    loadSpreadsheets();
  }, [spreadsheets]);

  const loadSpreadsheets = async () => {
    try {
      // Usar um setTimeout para não bloquear a renderização inicial
      setTimeout(async () => {
        const response = await api.get("/sheets/all");
        console.log("response sheets", response.data);
        if (response?.data) {
          const data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
          setSpreadsheets(data); // Atualiza o estado com a planilha convertida
        } else {
          // Criar uma planilha de exemplo se não existir nenhuma
          const exampleSpreadsheet = createEmptySpreadsheet("Planilha de Exemplo");
          setSpreadsheets([exampleSpreadsheet]);
          localStorage.setItem("spreadsheets", JSON.stringify([exampleSpreadsheet]));
        }
        console.log("spreads", spreadsheets);
        setIsLoading(false);
      }, 100);
    } catch (error) {
      console.error("Erro ao carregar planilhas:", error);
      // Criar uma planilha de exemplo em caso de erro
      const exampleSpreadsheet = createEmptySpreadsheet("Planilha de Exemplo");
      setSpreadsheets([exampleSpreadsheet]);
      setIsLoading(false);
    }
  };

  // Criar nova planilha
  const createNewSpreadsheet = () => {
    const newSpreadsheet = createEmptySpreadsheet(`Nova Planilha ${spreadsheets.length + 1}`);
    setSpreadsheets([...spreadsheets, newSpreadsheet]);
    setCurrentSpreadsheet(newSpreadsheet);
  };

  // Editar planilha existente
  const editSpreadsheet = (id: string) => {
    const spreadsheet = spreadsheets.find((s) => s.id === id);
    if (spreadsheet) {
      setCurrentSpreadsheet(spreadsheet);
    }
  };

  // Excluir planilha
  const deleteSpreadsheet = async (id: string) => {
    setIsDeletingLoading(true);
    try {
      await api.delete(`/sheets/${id}`);
      const updatedSpreadsheets = spreadsheets.filter((s) => s.id !== id);
      setSpreadsheets(updatedSpreadsheets);

      // Se a planilha atual for excluída, voltar para a lista
      if (currentSpreadsheet && currentSpreadsheet.id === id) {
        setCurrentSpreadsheet(null);
      }
      loadSpreadsheets();
    } catch (err) {
      console.log("error", err);
      console.error("Erro ao deletar:", err);
    } finally {
      setIsDeletingLoading(false);
    }
  };

  // Duplicar planilha
  const duplicateSpreadsheet = async (id: string) => {
    try {
      const spreadsheet = spreadsheets.find((s) => s.id === id);

      if (spreadsheet) {
        const response = await api.post(`/sheets/${id}/duplicate`);
        const duplicated = response.data;

        setSpreadsheets([...spreadsheets, duplicated]);
      }
    } catch (err) {
      console.error("Erro ao duplicar planilha:", err);
      // Adicione aqui a notificação para o usuário se necessário
    }
  };
  // Excluir todas as planilhas
  const deleteAllSpreadsheets = async () => {
    setIsDeletingAllLoading(true);
    try {
      await api.delete("/sheets/all");
      loadSpreadsheets();
    } catch (err) {
      console.log("error", err);
      console.error("Erro ao deletar:", err);
    } finally {
      setIsDeletingAllLoading(false);
    }
  };

  // Importar planilha (simulação básica)
  const importSpreadsheet = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      let json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Convertendo para array de arrays

      // Ignorar linhas em branco (caso haja cabeçalhos vazios ou linhas vazias)
      json = json.filter((row: any) => row.some((cell: any) => cell !== undefined && cell !== null));

      console.log("json", json);

      try {
        const payload = {
          title: "teste",
          rows: json,
          columns: 26,
          columnWidths: 100,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        const res = await api.post("/sheets", payload);
        console.log("Planilha importada com sucesso:", res.data);
      } catch (err) {
        console.error("Erro ao importar planilha:", err);
      }
    };

    reader.readAsArrayBuffer(file);
  };
  // Exportar planilha (simulação básica)

  const exportSpreadsheet = (spreadsheetId: string) => {
    const spreadsheet = spreadsheets.find((s) => s.id === spreadsheetId);
    if (!spreadsheet) return;

    const worksheetData = spreadsheet.rows.map((row) => row.map((cell) => cell.value));
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, spreadsheet.title || "Planilha");

    XLSX.writeFile(workbook, `${spreadsheet.title || "planilha"}.xlsx`);
  };

  // Atualizar planilha após edição
  const updateSpreadsheet = (updatedSpreadsheet: Spreadsheet) => {
    const updatedSpreadsheets = spreadsheets.map((s) => (s.id === updatedSpreadsheet.id ? updatedSpreadsheet : s));
    setSpreadsheets(updatedSpreadsheets);
    setCurrentSpreadsheet(updatedSpreadsheet);
  };

  // Voltar para a lista de planilhas
  const backToList = () => {
    setCurrentSpreadsheet(null);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Carregando planilhas...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {currentSpreadsheet ? (
        <SpreadsheetEditor spreadsheet={currentSpreadsheet} onUpdate={updateSpreadsheet} onBack={backToList} />
      ) : (
        <SpreadsheetList
          spreadsheets={spreadsheets}
          onEdit={editSpreadsheet}
          onDelete={deleteSpreadsheet}
          onCreate={createNewSpreadsheet}
          onDuplicate={duplicateSpreadsheet}
          onDeleteAll={deleteAllSpreadsheets}
          isDeletingAllLoading={isDeletingAllLoading}
          isDeletingLoading={isDeletingLoading}
          onImport={importSpreadsheet}
          onExport={exportSpreadsheet}
        />
      )}
    </div>
  );
}
