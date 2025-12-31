import { useState } from 'react';
import { TransacaoCambio } from './interface.types';
import { HistoricoTransacoes } from './components/HistoricoTransacoes';
import { SaldoInfo } from './components/SaldoInfo';
import { CambioForm } from './components/CambioForm';

export const CambioPage = () => {
  const [cambioState, setCambioState] = useState({
    saldoDolar: 0,
    custoMedioDolar: 0,
    transacoesCambio: [] as TransacaoCambio[],
  });

  const registrarCompra = (data: string, quantidade: number, taxa: number) => {
    const valorBRL = quantidade * taxa;
    let novoCustoMedio = taxa;
    
    if (cambioState.saldoDolar > 0) {
      novoCustoMedio = ((cambioState.saldoDolar * cambioState.custoMedioDolar) + (quantidade * taxa)) / 
                       (cambioState.saldoDolar + quantidade);
    }
    
    setCambioState(prev => ({
      saldoDolar: prev.saldoDolar + quantidade,
      custoMedioDolar: novoCustoMedio,
      transacoesCambio: [
        ...prev.transacoesCambio,
        {
          data,
          tipo: 'compra',
          usd: quantidade,
          taxa,
          descricao: 'Compra de dólares'
        }
      ]
    }));
  };

  const alocarDolar = (data: string, valorUSD: number, descricao: string) => {
    if (valorUSD > cambioState.saldoDolar) {
      alert('Saldo insuficiente de dólares');
      return;
    }
    
    setCambioState(prev => ({
      ...prev,
      saldoDolar: prev.saldoDolar - valorUSD,
      transacoesCambio: [
        ...prev.transacoesCambio,
        {
          data,
          tipo: 'alocacao',
          usd: -valorUSD,
          taxa: prev.custoMedioDolar,
          descricao
        }
      ]
    }));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 bg-black">
      <CambioForm 
        onRegistrarCompra={registrarCompra}
        onAlocarDolar={alocarDolar}
      />
      
      <SaldoInfo 
        saldoDolar={cambioState.saldoDolar}
        custoMedioDolar={cambioState.custoMedioDolar}
      />
      
      <HistoricoTransacoes transacoes={cambioState.transacoesCambio} />
    </div>
  );
};