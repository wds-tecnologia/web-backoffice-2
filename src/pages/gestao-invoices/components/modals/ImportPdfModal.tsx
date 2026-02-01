import { useState, useRef } from "react";
import { Upload, X, Loader2, FileText, AlertCircle } from "lucide-react";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";

interface ImportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Recebe um único objeto (1 PDF) ou array de objetos (múltiplos PDFs) */
  onSuccess: (data: any) => void;
}

export function ImportPdfModal({ isOpen, onClose, onSuccess }: ImportPdfModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setOpenNotification } = useNotification();

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files || []);
    const pdfs = list.filter((f) => f.type === "application/pdf");
    if (pdfs.length < list.length) {
      setOpenNotification({
        type: "warning",
        title: "Arquivo Inválido",
        notification: "Apenas arquivos PDF são aceitos. Outros foram ignorados.",
      });
    }
    if (pdfs.length > 0) {
      setSelectedFiles((prev) => [...prev, ...pdfs]);
    }
  };

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setOpenNotification({
        type: "warning",
        title: "Atenção",
        notification: "Selecione ao menos um arquivo PDF para importar",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    const results: any[] = [];
    const errors: { name: string; message: string }[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setUploadProgress({ current: i + 1, total: selectedFiles.length });

      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await api.post("/invoice/import-from-pdf", formData);
        
        // Console.log com resposta bruta do backend (F12)
        console.log(`%c📄 [IMPORT PDF] Resposta bruta do backend para "${file.name}":`, 
          "color: #2563eb; font-weight: bold; font-size: 14px;", 
          response.data
        );
        
        results.push(response.data);
      } catch (error: any) {
        const msg =
          error.response?.data?.message ||
          (error.response?.status === 404
            ? "Endpoint não encontrado"
            : "Erro ao processar o PDF.");
        errors.push({ name: file.name, message: msg });
      }
    }

    setIsUploading(false);

    if (errors.length > 0) {
      setOpenNotification({
        type: "error",
        title: "Erro em alguns arquivos",
        notification: `${errors.length} de ${selectedFiles.length} falharam: ${errors.map((e) => e.name).join(", ")}`,
      });
    }

    if (results.length > 0) {
      setOpenNotification({
        type: "success",
        title: "Importação concluída",
        notification:
          results.length === 1
            ? `1 PDF processado! ${results[0].summary?.totalProducts ?? 0} produtos.`
            : `${results.length} PDFs processados. Revisando o primeiro; os demais na sequência.`,
      });
      onSuccess(results.length === 1 ? results[0] : results);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setDragActive(false);
    setUploadProgress({ current: 0, total: 0 });
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
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="pdf-upload"
            disabled={isUploading}
          />

          {selectedFiles.length === 0 ? (
            <>
              <div className="flex justify-center mb-4">
                <Upload size={48} className="text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Arraste e solte os PDFs aqui
              </p>
              <p className="text-sm text-gray-500 mb-4">ou</p>
              <label
                htmlFor="pdf-upload"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Selecionar Arquivo(s)
              </label>
              <p className="text-xs text-gray-400 mt-4">Apenas arquivos PDF são aceitos. Múltiplos permitidos.</p>
            </>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 bg-gray-50 rounded p-2">
                  <FileText size={20} className="text-red-600 flex-shrink-0" />
                  <div className="text-left min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-700 flex-shrink-0"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
              {!isUploading && (
                <label
                  htmlFor="pdf-upload"
                  className="block text-center text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  + Adicionar mais PDFs
                </label>
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
            disabled={selectedFiles.length === 0 || isUploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Processando {uploadProgress.current}/{uploadProgress.total}...
              </>
            ) : (
              <>
                <Upload size={18} />
                Importar {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

