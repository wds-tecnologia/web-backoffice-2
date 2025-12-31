import { useState, useRef, useEffect } from "react";
import { Plus, FileUp, FileDown, Copy, Trash2, Edit, Trash, Calendar, Grid, FileText, Loader } from "lucide-react";
import type { Spreadsheet } from "./spreedsheet-utils";

interface SpreadsheetListProps {
  spreadsheets: Spreadsheet[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onDuplicate: (id: string) => void;
  onDeleteAll: () => void;
  isDeletingAllLoading: boolean;
  isDeletingLoading: boolean;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: (id: string) => void;
}

export function SpreadsheetList({
  spreadsheets,
  onEdit,
  onDelete,
  onCreate,
  onDuplicate,
  onDeleteAll,
  isDeletingAllLoading,
  isDeletingLoading,
  onImport,
  onExport,
}: SpreadsheetListProps) {
  console.log("spreadsheets na lista", spreadsheets);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [spreadsheetToDelete, setSpreadsheetToDelete] = useState<string | null>(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = (id: string) => {
    setSpreadsheetToDelete(id);
    setDeleteDialogOpen(true);
  };

  useEffect(() => {
    if (isDeletingLoading) {
      setTimeout(() => {
        setDeleteDialogOpen(false);
      }, 2000);
    }

    if (isDeletingAllLoading) {
      setTimeout(() => {
        setDeleteAllDialogOpen(false);
      }, 2000);
    }
  }, [isDeletingAllLoading, isDeletingLoading]);

  const confirmDelete = () => {
    if (spreadsheetToDelete) {
      onDelete(spreadsheetToDelete);
      setSpreadsheetToDelete(null);
    }
    if (isDeletingLoading) {
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteAll = () => {
    setDeleteAllDialogOpen(true);
  };

  const confirmDeleteAll = () => {
    onDeleteAll();
    if (isDeletingAllLoading) {
      setDeleteAllDialogOpen(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="bg-white shadow-sm rounded-lg">
        {/* Header */}
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl w-full text-blue font-bold">BlueSheets</h1>
          <div className="flex flex-col w-full md:flex-row items-center justify-center md:justify-end gap-2">
            <button
              type="button"
              onClick={onCreate}
              className="flex items-center w-full md:w-52 justify-center text-sm md:text-base gap-1 md:gap-2 px-3 md:px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nova Planilha
            </button>
            <>
              <input type="file" ref={fileInputRef} onChange={onImport} className="hidden" accept=".xlsx, .xls" />
              <button
                type="button"
                onClick={handleImportClick}
                className="flex items-center w-full md:w-40 justify-center text-black text-sm md:text-base gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <FileUp className="h-4 w-4" />
                Importar
              </button>
            </>
            <button
              type="button"
              onClick={handleDeleteAll}
              className="flex items-center w-full md:w-52 justify-center text-sm md:text-base px-2 md:px-4 py-2 rounded-md text-gray-100 bg-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Todas
            </button>
          </div>
        </div>

        {/* Lista de planilhas */}
        {spreadsheets.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg text-black font-medium mb-2">Nenhuma planilha encontrada</h3>
            <p className="text-gray-500 mb-4">Crie uma nova planilha para começar.</p>
            <button
              type="button"
              onClick={onCreate}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors mx-auto"
            >
              <Plus className="h-4 w-4" />
              Nova Planilha
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 w-[300px]">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Linhas</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Colunas</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Criada em</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Modificada em</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {spreadsheets.map((spreadsheet) => (
                  <tr key={spreadsheet.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">
                      <div className="flex items-center text-black gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        {spreadsheet.title}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center text-black gap-1">
                        <Grid className="h-4 w-4 text-gray-500" />
                        {spreadsheet.rowsCount}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center text-black gap-1">
                        <Grid className="h-4 w-4 text-gray-500" />
                        {spreadsheet.columns}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center text-black gap-1">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        {formatDate(spreadsheet.createdAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center text-black gap-1">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        {formatDate(spreadsheet.updatedAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(spreadsheet.id)}
                          title="Editar"
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicate(spreadsheet.id)}
                          title="Duplicar"
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onExport(spreadsheet.id)}
                          title="Exportar"
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full"
                        >
                          <FileDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(spreadsheet.id)}
                          title="Excluir"
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-full"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diálogo de confirmação para excluir planilha */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl text-black font-semibold mb-2">Excluir planilha</h2>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir esta planilha? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                className="px-4 py-2 border text-black border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 flex items-center justify-center gap-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {isDeletingLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <span className="flex w-full items-center gap-2">
                    <Trash2 className="h-4 w-4 text-white" />
                    <span>Excluir</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de confirmação para excluir todas as planilhas */}
      {deleteAllDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl text-black font-semibold mb-2">Excluir todas as planilhas</h2>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir todas as planilhas? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteAllDialogOpen(false)}
                className="px-4 py-2 text-black border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteAll}
                className="px-8 py-2 flex items-center justify-center gap-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {isDeletingAllLoading ? (
                  <span className="flex w-full items-center gap-2">
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Excluindo todas...</span>
                  </span>
                ) : (
                  <span className="flex w-full items-center gap-2">
                    <Trash2 className="h-4 w-4 text-white" />
                    <span>Excluir todas</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
