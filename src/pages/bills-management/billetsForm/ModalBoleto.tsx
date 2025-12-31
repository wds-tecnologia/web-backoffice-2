import React, { useState } from "react";
import { Boleto } from "./types";
import { formatCurrency, formatDate, formatStatus } from "./utils";
import { api } from "../../../services/api";

interface ModalBoletoProps {
  boleto: Boleto;
  closeModal: () => void;
  saveChanges: (novoStatus: string) => void;
}

const ModalBoleto: React.FC<ModalBoletoProps> = ({ boleto, closeModal, saveChanges }) => {
  const [novoStatus, setNovoStatus] = useState(boleto.status);

  const handleSave = async () => {
    try {
      await api.patch(`/billets/update_billet/${boleto.id}`, {
        status: novoStatus,
      });
  
      saveChanges(novoStatus); // atualiza no front
      closeModal();
    } catch (error) {
      console.error("Erro ao atualizar status do boleto:", error);
      alert("Erro ao atualizar o status do boleto.");
    }
  };
  
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Detalhes do Boleto</h3>
          <button onClick={closeModal} className="text-white hover:text-gray-200">
            <i className="lucide lucide-x" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h4 className="text-xl font-semibold text-gray-800">{boleto.referencia}</h4>
            <p className="text-gray-600 mt-1">Código: {boleto.codigo}</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Data de Pagamento:</span>
              <span className="font-medium">{formatDate(boleto.dataPagamento)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Valor:</span>
              <span className="font-medium">{formatCurrency(boleto.valor)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${formatStatus(boleto.status).class}`}>
                {formatStatus(boleto.status).text}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="modalBoletoNovoStatus" className="block text-sm font-medium text-gray-700 mb-1">Alterar Status:</label>
            <select
              id="modalBoletoNovoStatus"
              value={novoStatus}
              onChange={(e) => setNovoStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <button onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalBoleto;
