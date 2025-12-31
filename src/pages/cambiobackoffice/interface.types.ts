export interface TransacaoCambio {
  data: string;
  tipo: 'compra' | 'alocacao';
  usd: number;
  taxa: number;
  descricao: string;
}

export interface CambioState {
  saldoDolar: number;
  custoMedioDolar: number;
  transacoesCambio: TransacaoCambio[];
}