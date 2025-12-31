import React, { useEffect } from "react";
import { formatCurrency, formatDate } from "./format";

interface OperationDetailsModalProps {
  operation: any;
  recolhedorNome?: string;
  fornecedorNome?: string;
  onClose: () => void;
}

const OperationDetailsModal: React.FC<OperationDetailsModalProps> = ({
  operation,
  recolhedorNome = "",
  fornecedorNome = "",
  onClose,
}) => {
  // Efeito para lidar com o pressionar da tecla ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Função para fechar ao clicar no overlay (fora do modal)
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!operation) return null;

  console.log("operention", operation);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300"
      onClick={handleOverlayClick}
    >
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl shadow-lg transform transition-all duration-300">
        <h2 className="text-xl font-bold mb-4 text-blue-700 border-b pb-2">DETALHES DA OPERAÇÃO</h2>

        <div className="space-y-2 text-gray-700 mb-6">
          <p>
            <strong>DATA:</strong> {operation.date ? formatDate(operation.date) : "N/A"}
          </p>
          <p>
            <strong>LOCAL:</strong> {operation.city ? operation.city.toUpperCase() : "N/A"}
          </p>
          <p>
            <strong>RECOLHEDOR:</strong> {recolhedorNome ? recolhedorNome.toUpperCase() : "DESCONHECIDO"} (Taxa:{" "}
            {operation.collectorTax ?? "N/A"})
          </p>
          <p>
            <strong>FORNECEDOR:</strong> {fornecedorNome ? fornecedorNome.toUpperCase() : "DESCONHECIDO"} (Taxa:{" "}
            {operation.supplierTax ?? "N/A"})
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-blue-50 p-4 rounded">
            <p className="font-semibold">Valor da Operação</p>
            <p className="text-lg">{formatCurrency(operation.value || 0)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <p className="font-semibold">Seu Lucro</p>
            <p className="text-lg text-green-600">{formatCurrency(operation.profit || 0)}</p>
          </div>
          <div className="bg-red-50 p-4 rounded">
            <p className="font-semibold">Débito do Recolhedor</p>
            <p className="text-lg">{formatCurrency((operation.value || 0) / (operation.collectorTax || 0))}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded">
            <p className="font-semibold">Crédito do Fornecedor</p>
            <p className="text-lg">{formatCurrency((operation.value || 0) / (operation.supplierTax || 0))}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            <i className="fas fa-check mr-2"></i> OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationDetailsModal;