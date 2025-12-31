import { useState } from 'react';
import { formatCurrency } from '../formatCurrencyUtil';

interface CambioFormProps {
  onRegistrarCompra: (data: string, quantidade: number, taxa: number) => void;
  onAlocarDolar: (data: string, valorUSD: number, descricao: string) => void;
}

export const CambioForm = ({ onRegistrarCompra, onAlocarDolar }: CambioFormProps) => {
  const [compraData, setCompraData] = useState(new Date().toISOString().split('T')[0]);
  const [compraQuantidade, setCompraQuantidade] = useState(''); // Inicia como string vazia
  const [compraTaxa, setCompraTaxa] = useState('');         // Inicia como string vazia

  const [alocacaoData, setAlocacaoData] = useState(new Date().toISOString().split('T')[0]);
  const [alocacaoValor, setAlocacaoValor] = useState('');   // Inicia como string vazia
  const [alocacaoDescricao, setAlocacaoDescricao] = useState('');
  const [showAlocacaoInfo, setShowAlocacaoInfo] = useState(false);
  const [custoMedioAplicado, setCustoMedioAplicado] = useState(0);

  const handleRegistrarCompra = () => {
    const quantidade = parseFloat(compraQuantidade) || 0;
    const taxa = parseFloat(compraTaxa) || 0;

    if (quantidade <= 0 || taxa <= 0) {
      alert('Por favor, informe valores válidos');
      return;
    }

    onRegistrarCompra(compraData, quantidade, taxa);
    setCompraQuantidade('');
    setCompraTaxa('');
  };

  const handleAlocarDolar = () => {
    const valorUSD = parseFloat(alocacaoValor) || 0;

    if (valorUSD <= 0 || !alocacaoDescricao) {
      alert('Por favor, informe valores válidos e uma descrição');
      return;
    }

    onAlocarDolar(alocacaoData, valorUSD, alocacaoDescricao);
    setCustoMedioAplicado(parseFloat(compraTaxa) || 0); // Mantém a conversão aqui
    setShowAlocacaoInfo(true);
    setAlocacaoValor('');
    setAlocacaoDescricao('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-8">
      <h2 className="text-xl font-semibold mb-4 text-yellow-600 border-b pb-2">
        <i className="fas fa-coins mr-2"></i>Gestão de Câmbio e Dólares
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Seção Compra de Dólares */}
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-medium mb-2">Registrar Compra de Dólares</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Data</label>
              <input
                type="date"
                value={compraData}
                onChange={(e) => setCompraData(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantidade (USD)</label>
              <input
                type="number"
                step="0.01"
                value={compraQuantidade}
                onChange={(e) => setCompraQuantidade(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Taxa de Câmbio (BRL)</label>
              <input
                type="number"
                step="0.0001"
                value={compraTaxa}
                onChange={(e) => setCompraTaxa(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <button
              onClick={handleRegistrarCompra}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded w-full"
            >
              Registrar Compra
            </button>
          </div>
        </div>

        {/* Seção Retirada para Produtos */}
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-medium mb-2">Retirar para Produtos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Data</label>
              <input
                type="date"
                value={alocacaoData}
                onChange={(e) => setAlocacaoData(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Valor em USD</label>
              <input
                type="number"
                step="0.01"
                value={alocacaoValor}
                onChange={(e) => setAlocacaoValor(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Descrição</label>
              <input
                type="text"
                value={alocacaoDescricao}
                onChange={(e) => setAlocacaoDescricao(e.target.value.toUpperCase())}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                placeholder="Nota fiscal, produto, etc."
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <button
                onClick={handleAlocarDolar}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full"
              >
                Retirar
              </button>
            </div>
            {showAlocacaoInfo && (
              <div className="bg-blue-100 p-2 rounded">
                <p className="text-sm">
                  Custo Médio Aplicado: <span className="font-bold">{formatCurrency(custoMedioAplicado, 4)}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};