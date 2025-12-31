import { formatCurrency } from "../formatCurrencyUtil";

interface SaldoInfoProps {
  saldoDolar: number;
  custoMedioDolar: number;
}

export const SaldoInfo = ({ saldoDolar, custoMedioDolar }: SaldoInfoProps) => {
  return (
    <div className="p-4 bg-gray-50 rounded">
      <h3 className="font-medium mb-2">Saldo e Custo Médio</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-700">Saldo em Dólar:</span>
          <span className="font-bold">{formatCurrency(saldoDolar, 2, 'USD')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Custo Médio:</span>
          <span className="font-bold">{formatCurrency(custoMedioDolar, 4)}</span>
        </div>
      </div>
    </div>
  );
};