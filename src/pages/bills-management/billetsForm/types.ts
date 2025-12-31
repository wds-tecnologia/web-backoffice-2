export interface Boleto {
  id: string;
  codigo: string;
  dataPagamento: string;
  valor: number;
  referencia: string;
  status: string;
}
