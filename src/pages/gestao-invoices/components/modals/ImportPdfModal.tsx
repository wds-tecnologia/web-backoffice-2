import { useState, useRef } from "react";
import { Upload, X, Loader2, FileText, AlertCircle } from "lucide-react";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";

interface ImportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export function ImportPdfModal({ isOpen, onClose, onSuccess }: ImportPdfModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setOpenNotification } = useNotification();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        setOpenNotification({
          type: "warning",
          title: "Arquivo Inválido",
          notification: "Por favor, selecione um arquivo PDF",
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        setOpenNotification({
          type: "warning",
          title: "Arquivo Inválido",
          notification: "Por favor, selecione um arquivo PDF",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setOpenNotification({
        type: "warning",
        title: "Atenção",
        notification: "Selecione um arquivo PDF para importar",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await api.post("/invoice/import-from-pdf", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: `PDF processado com sucesso! ${response.data.summary.totalProducts} produtos encontrados.`,
      });

      onSuccess(response.data);
      handleClose();
    } catch (error: any) {
      console.error("Erro ao importar PDF:", error);
      setOpenNotification({
        type: "error",
        title: "Erro ao Importar PDF",
        notification: error.response?.data?.message || "Erro ao processar o PDF. Tente novamente.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setDragActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Upload size={24} className="text-blue-600" />
              Importar Invoice PDF
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Faça upload do PDF da invoice para extrair automaticamente os produtos e IMEIs
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isUploading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            id="pdf-upload"
            disabled={isUploading}
          />

          {!selectedFile ? (
            <>
              <div className="flex justify-center mb-4">
                <Upload size={48} className="text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Arraste e solte o PDF aqui
              </p>
              <p className="text-sm text-gray-500 mb-4">ou</p>
              <label
                htmlFor="pdf-upload"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Selecionar Arquivo
              </label>
              <p className="text-xs text-gray-400 mt-4">Apenas arquivos PDF são aceitos</p>
            </>
          ) : (
            <div className="flex items-center justify-center gap-4">
              <FileText size={32} className="text-red-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {!isUploading && (
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">O que será extraído do PDF:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Número e data da invoice</li>
              <li>Lista de produtos com quantidades e valores</li>
              <li>IMEIs/números de série automaticamente</li>
              <li>Emails e fornecedores (se disponível)</li>
            </ul>
            <p className="mt-2 text-xs">
              Você poderá revisar e editar todos os dados antes de criar a invoice.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Processando...
              </>
            ) : (
              <>
                <Upload size={18} />
                Importar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

