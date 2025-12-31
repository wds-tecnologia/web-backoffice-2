import { useState } from 'react';
import { X, Printer, FileText, Check, Truck, Building } from 'lucide-react';

interface ViewInvoiceModalProps {
  invoice: {
    id: string;
    number: string;
    date: string;
    supplierId: string;
    carrierId: string;
    products: Array<{
      id: string;
      name: string;
      quantity: number;
      value: number;
      weight: number;
      total: number;
      received: boolean;
      receivedQuantity: number;
    }>;
    taxValue: number;
    paid: boolean;
    paidDate: string | null;
    paidDollarRate: number | null;
    completed: boolean;
  };
  suppliers: Array<{ id: string; name: string }>;
  carriers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onComplete: (id: string) => void;
}

export function ViewInvoiceModal({
  invoice,
  suppliers,
  carriers,
  onClose,
  onComplete,
}: ViewInvoiceModalProps) {
  const [isOpen, setIsOpen] = useState(true);

  const supplier = suppliers.find((s) => s.id === invoice.supplierId);
  const carrier = carriers.find((c) => c.id === invoice.carrierId);

  const pendingProducts = invoice.products.filter((p) => !p.received);
  const receivedProducts = invoice.products.filter((p) => p.received);

  const subtotal = invoice.products.reduce((sum, product) => sum + product.total, 0);
  const shippingCost = 0; // Calcular frete aqui
  const taxCost = invoice.products.length * invoice.taxValue;
  const total = subtotal + shippingCost;

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  const handleComplete = () => {
    onComplete(invoice.id);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-medium">
              Invoice #<span>{invoice.number}</span>
            </h3>
            <p className="text-sm text-gray-600">
              Fornecedor: <span>{supplier?.name || 'Não informado'}</span>
            </p>
            <p className="text-sm text-gray-600">
              Data: <span>{new Date(invoice.date).toLocaleString('pt-BR')}</span>
            </p>
            <p className="text-sm text-gray-600">
              Freteiro: <span>{carrier?.name || 'Não informado'}</span>
            </p>
          </div>
          <div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                invoice.completed
                  ? 'bg-blue-100 text-blue-800'
                  : invoice.paid
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {invoice.completed ? 'Concluída' : invoice.paid ? 'Paga' : 'Pendente'}
            </span>
            <button onClick={handleClose} className="ml-2 text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Produtos Pendentes */}
        {pendingProducts.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium mb-2 text-blue-700 border-b pb-2">Produtos Pendentes</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qtd
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor ($)
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Peso (kg)
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total ($)
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingProducts.map((product, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {product.name}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                        {product.quantity}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatCurrency(product.value)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                        {product.weight ? product.weight.toFixed(2) + ' kg' : '-'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                        {formatCurrency(product.total)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-green-600 hover:text-green-900">
                          <Check size={16} className="mr-1 inline" />
                          Receber
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Produtos Recebidos */}
        {receivedProducts.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium mb-2 text-blue-700 border-b pb-2">Produtos Recebidos</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qtd
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor ($)
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor (R$)
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Peso (kg)
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total (R$)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {receivedProducts.map((product, index) => {
                    const totalReal = product.total * (invoice.paidDollarRate || 1);
                    const taxPerItem = invoice.taxValue * product.quantity;
                    const totalWithTax = totalReal + taxPerItem;

                    return (
                      <tr key={index} className="bg-green-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {product.name}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                          {product.receivedQuantity || product.quantity}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                          {formatCurrency(product.value)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                          {formatCurrency(product.value * (invoice.paidDollarRate || 1), 4)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                          {product.weight ? product.weight.toFixed(2) + ' kg' : '-'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                          {formatCurrency(totalWithTax, 4, 'BRL')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded border">
            <p className="text-sm text-gray-600">Subtotal:</p>
            <p className="text-lg font-semibold">{formatCurrency(subtotal)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <p className="text-sm text-gray-600">Frete:</p>
            <p className="text-lg font-semibold">{formatCurrency(shippingCost)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <p className="text-sm text-gray-600">Frete SP x ES:</p>
            <p className="text-lg font-semibold">{formatCurrency(taxCost, 2, 'BRL')}</p>
          </div>
        </div>

        {/* Total */}
        <div className="bg-blue-50 p-4 rounded border">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-blue-800">Total da Invoice:</p>
            <p className="text-xl font-bold text-blue-800">{formatCurrency(total)}</p>
          </div>
          {invoice.paid && invoice.paidDate && invoice.paidDollarRate && (
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-green-600">Pago em:</p>
              <p className="text-xs font-medium text-green-600">
                {new Date(invoice.paidDate).toLocaleDateString('pt-BR')} (R${' '}
                {invoice.paidDollarRate.toFixed(4)})
              </p>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="mt-6 flex justify-end">
          <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md mr-2">
            <Printer className="mr-2 inline" size={16} />
            Imprimir
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
            <FileText className="mr-2 inline" size={16} />
            Exportar
          </button>
          {!invoice.completed && (
            <button
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md ml-2"
            >
              <Check className="mr-2 inline" size={16} />
              Marcar como Concluída
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number, decimals = 2, currency = 'USD') {
  if (isNaN(value)) value = 0;
  if (currency === 'USD') {
    return `$ ${value.toFixed(decimals)}`;
  } else {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }
}