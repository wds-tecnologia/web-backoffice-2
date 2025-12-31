import React from 'react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    number: string;
    supplier: string;
    date: string;
    carrier: string;
    status: string;
    pendingProducts: Product[];
    receivedProducts: Product[];
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    paidDate?: string;
    dollarRate?: number;
  };
}

interface Product {
  name: string;
  quantity: number;
  valueUSD: number;
  weight: number;
  totalUSD: number;
  valueBRL?: number;
  totalBRL?: number;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, invoice }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium">Invoice #{invoice.number}</h3>
            <p className="text-sm text-gray-600">Fornecedor: {invoice.supplier}</p>
            <p className="text-sm text-gray-600">Data: {invoice.date}</p>
            <p className="text-sm text-gray-600">Freteiro: {invoice.carrier}</p>
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-medium">{invoice.status}</span>
            <button onClick={onClose} className="ml-2 text-gray-500 hover:text-gray-700">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-medium mb-2 text-blue-700 border-b pb-2">Produtos Pendentes</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor ($)</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Peso (kg)</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total ($)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.pendingProducts.map((product, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm text-gray-700">{product.name}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-700">{product.quantity}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-700">${product.valueUSD.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-700">{product.weight.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-700">${product.totalUSD.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-medium mb-2 text-blue-700 border-b pb-2">Produtos Recebidos</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor ($)</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor (R$)</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Peso (kg)</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (R$)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.receivedProducts.map((product, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm text-gray-700">{product.name}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-700">{product.quantity}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-700">${product.valueUSD.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-700">R$ {product.valueBRL?.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-700">{product.weight.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-700">R$ {product.totalBRL?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded border">
            <p className="text-sm text-gray-600">Subtotal:</p>
            <p className="text-lg font-semibold">$ {invoice.subtotal.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <p className="text-sm text-gray-600">Frete:</p>
            <p className="text-lg font-semibold">$ {invoice.shipping.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <p className="text-sm text-gray-600">Frete SP x ES:</p>
            <p className="text-lg font-semibold">R$ {invoice.tax.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded border">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-blue-800">Total da Invoice:</p>
            <p className="text-xl font-bold text-blue-800">$ {invoice.total.toFixed(2)}</p>
          </div>
          {invoice.paidDate && invoice.dollarRate && (
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-green-600">Pago em:</p>
              <p className="text-xs font-medium text-green-600">{invoice.paidDate} (R$ {invoice.dollarRate.toFixed(2)})</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md mr-2">
            <i className="fas fa-print mr-2"></i>Imprimir
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
            <i className="fas fa-file-export mr-2"></i>Exportar
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md ml-2">
            <i className="fas fa-check mr-2"></i>Marcar como Concluída
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
