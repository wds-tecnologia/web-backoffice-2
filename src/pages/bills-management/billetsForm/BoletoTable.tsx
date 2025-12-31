import React from "react";
import { Boleto } from "./types";
import { formatCurrency, formatDate, formatStatus } from "./utils";
import { Eye } from "lucide-react";

interface BoletoTableProps {
  boletos: Boleto[];
  openModal: (boletoId: string) => void;
}

const BoletoTable: React.FC<BoletoTableProps> = ({ boletos, openModal }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Data Pagamento
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Valor
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Referência
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Código Boleto
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {boletos.map((boleto) => {
            const status = formatStatus(boleto.status);
            return (
              <tr key={boleto.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {formatDate(boleto.dataPagamento)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {formatCurrency(boleto.valor)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {boleto.referencia}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.class}`}
                  >
                    {status.text}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 codigo-boleto" title={boleto.codigo}>
                  {boleto.codigo.substring(0, 20)}...
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => openModal(boleto.id)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default BoletoTable;