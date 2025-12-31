import { formatCurrency } from "../formatCurrencyUtil";
import { TransacaoCambio } from "../interface.types";

interface HistoricoTransacoesProps {
  transacoes: TransacaoCambio[];
}

export const HistoricoTransacoes = ({ transacoes }: HistoricoTransacoesProps) => {
  console.log("transações", transacoes);

  if (transacoes.length === 0) {
    return (
      <div className="mt-6">
        <h3 className="font-medium mb-2 border-b pb-2">Histórico de Transações</h3>
        <p className="text-center text-gray-500 py-4">Nenhuma transação registrada</p>
      </div>
    );
  }

  // Ordenar por data (mais recente primeiro)
  const transacoesOrdenadas = [...transacoes].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <div className="mt-6">
      <h3 className="font-medium mb-2 border-b pb-2">Histórico de Transações</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-200">
              <th className="py-2 px-4 border">Data</th>
              <th className="py-2 px-4 border">Tipo</th>
              <th className="py-2 px-4 border">USD</th>
              <th className="py-2 px-4 border">Taxa</th>
              <th className="py-2 px-4 border">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {transacoesOrdenadas.map((transacao, index) => {
              const rowClass = transacao.tipo === "compra" ? "bg-green-50" : "bg-blue-50";

              return (
                <tr key={index} className="hover:bg-gray-50">
                  <td className={`py-2 px-2 border ${rowClass} text-center`}>{transacao.data}</td>
                  <td className={`py-2 px-4 border ${rowClass} text-center`}>
                    {transacao.tipo === "compra" ? "Compra" : "Retirado"}
                  </td>
                  <td className={`py-2 px-4 border ${rowClass} text-center font-mono`}>
                    {transacao.usd > 0 ? "+" : ""}
                    {formatCurrency(transacao.usd, 2, "USD")}
                  </td>
                  <td className={`py-2 px-4 border ${rowClass} text-center font-mono`}>
                    {formatCurrency(transacao.taxa, 4)}
                  </td>
                  <td className={`py-2 px-4 border ${rowClass} text-center`}>{transacao.descricao}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
