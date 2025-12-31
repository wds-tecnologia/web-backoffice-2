import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate, formatDateIn } from "./format";
import { api } from "../../../services/api";
import { motion } from "framer-motion";
import { GenericSearchSelect } from "../../gestao-invoices/components/sections/SearchSelect";
import { usePermissionStore } from "../../../store/permissionsStore";

interface Fornecedor {
  id: number;
  name: string;
}

interface Recolhedor {
  id: number;
  name: string;
  tax: number;
  comission: number;
}

export interface Operacao {
  id: number;
  date: string;
  city: string;
  value: number;
  profit: number;
  collectorId: number;
  supplierId: number;
  collectorTax: number;
  supplierTax: number;
  comission: number;
}

const LucrosRecolhedoresFusionTab: React.FC = () => {
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [recolhedores, setRecolhedores] = useState<Recolhedor[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [selectedRecolhedor, setSelectedRecolhedor] = useState<Recolhedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [paginaAtual, setPaginaAtual] = useState(0);
  const itensPorPagina = 10;

  // Estados para filtro de data
  const [filterStartDate, setFilterStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  const [filterEndDate, setFilterEndDate] = useState<string>(new Date().toLocaleDateString("en-CA"));
  const [lucroTotal, setLucroTotal] = useState(0);
  const [comissaoTotal, setComissaoTotal] = useState(0);
  // Estado para controlar se o filtro foi aplicado
  const [filterApplied, setFilterApplied] = useState(false);
  // Estado para as operações filtradas
  const [operacoesFiltradas, setOperacoesFiltradas] = useState<Operacao[]>([]);
  const { permissions, getPermissions, user } = usePermissionStore();

  const calcularTotais = (operacoes: Operacao[])=>{
    let lucro = 0
    let comissao = 0
    operacoes.forEach((op)=>{
      const tax = op.collectorTax || 1;
      const lucroOp = op.value - (op.value / tax);
      lucro += lucroOp
      comissao += lucroOp * (selectedRecolhedor?.comission || 0)/100;
    })

    setLucroTotal(lucro)
    setComissaoTotal(comissao)
  }


  // Função para aplicar o filtro quando o botão for clicado
  const applyDateFilter = () => {
    if (!filterStartDate && !filterEndDate) {
      // Se não há datas, mostra todas as operações
      setOperacoesFiltradas(operacoes);
      setFilterApplied(false);
      return;
    }

    const startDate = new Date(filterStartDate);
    const endDate = new Date(filterEndDate);
    endDate.setDate(endDate.getDate() + 1); // Inclui o dia final

    const filtered = operacoes.filter((op) => {
      const opDate = new Date(op.date);
      return opDate >= startDate && opDate < endDate;
    });

    setOperacoesFiltradas(filtered);
      // Força recálculo dos totais
    setTimeout(() => {
      if (selectedRecolhedor) {
        const opsFiltradas = selectedRecolhedor
          ? filtered.filter(
              (op) => op.collectorId === selectedRecolhedor.id && (!op.comission || op.comission <= 0)
            )
          : filtered.filter((op) => !op.comission || op.comission <= 0);
          
        calcularTotais(opsFiltradas);
      }
    }, 0);
    setFilterApplied(true);
    setPaginaAtual(0); // Resetar para a primeira página
  };

  // Função para limpar o filtro
  const clearFilter = () => {
  setFilterStartDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  setFilterEndDate(new Date().toLocaleDateString("en-CA"));
    setOperacoesFiltradas(operacoes);
    setFilterApplied(false);
    setPaginaAtual(0);
  };
  const clearFilter2 = () => {
  setFilterStartDate('');
  setFilterEndDate('');
    setOperacoesFiltradas(operacoes);
    setFilterApplied(false);
    setPaginaAtual(0);
  };

  // Inicializar as operações filtradas com todas as operações
  useEffect(() => {
    setOperacoesFiltradas(operacoes);
  }, [operacoes]);

  // Operações a serem exibidas (filtradas por recolhedor e por data, se aplicado)
  const operacoesPorRecolhedor = selectedRecolhedor
    ? operacoesFiltradas.filter(
        (op) => op.collectorId === selectedRecolhedor.id && (!op.comission || op.comission <= 0)
      )
    : operacoesFiltradas.filter((op) => !op.comission || op.comission <= 0);

  const operacoesPaginadas = operacoesPorRecolhedor.slice(
    paginaAtual * itensPorPagina,
    (paginaAtual + 1) * itensPorPagina
  );

  // Funções auxiliares
  const getRecolhedorNome = (id: number) => recolhedores.find((r) => r.id === id)?.name || "Desconhecido";

  const getFornecedorNome = (id: number) => fornecedores.find((f) => f.id === id)?.name || "Desconhecido";

  // Cálculo de lucros considerando o filtro de data
  const calcularLucro = (operacoes: Operacao[]) =>
    operacoes.reduce((acc, op) => acc + (op.value - (op.value || 0) / (op.collectorTax || 0) || 0), 0);

  const lucroMesAtual = calcularLucro(
    operacoesPorRecolhedor.filter(
      (op) =>
        new Date(op.date).getMonth() === new Date().getMonth() &&
        new Date(op.date).getFullYear() === new Date().getFullYear()
    )
  );
  useEffect(()=>{
    if(selectedRecolhedor && operacoesPorRecolhedor.length>0){
      calcularTotais(operacoesPorRecolhedor)
      applyDateFilter()
    } else {
      setLucroTotal(0)
      setComissaoTotal(0)
    }
  }, [operacoesPorRecolhedor, selectedRecolhedor])

  const lucroMesAnterior = calcularLucro(
    operacoesPorRecolhedor.filter((op) => {
      const d = new Date(op.date);
      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();
      const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
      const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

      return d.getMonth() === mesAnterior && d.getFullYear() === anoAnterior;
    })
  );

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [response] = await Promise.all([
        api.get("/operations/list_operations"),
      ]);
        const [fornecedoresResponse, recolhedoresResponse] = await Promise.all([
            api.get<Fornecedor[]>("/suppliers/list_suppliers"),
            api.get<Recolhedor[]>("/collectors/list_collectors")
        ]);

        const fornedoresFiltrados = user?.role==="MASTER"? fornecedoresResponse.data : fornecedoresResponse.data.filter((f) => permissions?.GERENCIAR_TOKENS.FORNECEDORES_PERMITIDOS.includes(f.name));
        const recolhedoresFiltrados = user?.role==="MASTER"? recolhedoresResponse.data : recolhedoresResponse.data.filter((r) => permissions?.GERENCIAR_TOKENS.RECOLHEDORES_PERMITIDOS.includes(r.name));

        const responseApi = (response.data as Operacao[]).filter((op)=> recolhedoresFiltrados.some((r) => r.id === op.collectorId) && fornedoresFiltrados.some((f) => f.id === op.supplierId));
        
        setOperacoes(responseApi);

      setRecolhedores(recolhedoresFiltrados);
      setFornecedores(fornedoresFiltrados);
      setLoading(false);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-64">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="inline-block w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mb-4"
          ></motion.div>
          <p className="text-lg text-green-700 font-medium">Carregando Lucros...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="fade-in">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="w-full flex flex-row items-center justify-between max-w-[100%]">
          <div className="w-full flex justify-between items-start border-b pb-2 mb-4">
            {/* Cabeçalho com indicador de filtro */}
            <div className="flex flex-col whitespace-nowrap">
              <h2 className="text-xl font-semibold mt-4 text-green-700">
                <i className="fas fa-chart-line mr-2"></i> HISTÓRICO DE LUCROS
              </h2>
              <span className="text-xs font-medium text-gray-700 mb-1">
                {filterApplied ? `(Filtrado: ${formatDateIn(filterStartDate) || "início"} a ${formatDateIn(filterEndDate) || "fim"})` : ""}
              </span>
            </div>

            {/* Filtros de data */}
            {selectedRecolhedor && (
              <div className="flex items-end gap-2">
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Data Inicial</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-24 h-6 border border-gray-300 rounded-md text-sm text-center leading-6 py-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <span className="text-sm font-medium">até</span>

                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Data Final</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-24 h-6 border border-gray-300 rounded-md text-sm text-center leading-6 py-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <button
                  onClick={applyDateFilter}
                  className="bg-white text-blue-600 border border-blue-600 hover:bg-blue-600 hover:text-white rounded-md text-sm font-medium h-6 px-4 mr-2 flex items-center justify-center transition-colors"
                >
                  Filtrar
                </button>

                <button
                  onClick={clearFilter2}
                  className="bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md text-sm font-medium h-6 px-4 flex items-center justify-center transition-colors"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>
        </div>

        {selectedRecolhedor && (
          <>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">LUCRO</h3>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(lucroTotal)}</p>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg">
                <h3 className="font-medium mb-2">COMISSÃO</h3>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(comissaoTotal)}</p>
              </div>
              {/* <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">LUCRO MÊS ANTERIOR</h3>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(lucroMesAnterior)}</p>
              </div> */}
              {/* <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">TOTAL ACUMULADO</h3>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(lucroMesAtual + lucroMesAnterior)}</p>
              </div> */}
            </div>
          </>
        )}

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center space-x-4">
            <GenericSearchSelect
              items={user?.role === "MASTER" || user?.role === "ADMIN" ? recolhedores : recolhedores.filter((item) => permissions?.GERENCIAR_TOKENS?.RECOLHEDORES_PERMITIDOS?.includes(item.name) || permissions?.GERENCIAR_TOKENS?.FORNECEDORES_PERMITIDOS?.includes(item.name))}
              value={selectedRecolhedor?.id.toString() || ""}
              getLabel={(r) => r.name}
              getId={(r) => r.id.toString()}
              onChange={(id) => {
                const rec = recolhedores.find((r) => r.id.toString() === id);
                setSelectedRecolhedor(rec || null);
                // Resetar filtros ao mudar recolhedor
                clearFilter(); // Isso também reseta o filtro de data e a paginação
              }}
              label="Selecione um recolhedor"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {selectedRecolhedor && (
            <>
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 border">DATA</th>
                    <th className="py-2 px-4 border">OPERAÇÃO</th>
                    <th className="py-2 px-4 border">RECOLHEDOR</th>
                    <th className="py-2 px-4 border">FORNECEDOR</th>
                    <th className="py-2 px-4 border">VALOR OPERAÇÃO</th>
                    <th className="py-2 px-4 border">LUCRO</th>
                    <th className="py-2 px-4 border">COMISSÃO %</th>
                  </tr>
                </thead>
                <tbody>
                  {operacoesPaginadas.length > 0 ? (
                    operacoesPaginadas
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((op) => {
                        if (!op.date || isNaN(new Date(op.date).getTime())) return null;

                        const recolhedorNome = getRecolhedorNome(op.collectorId);
                        const fornecedorNome = getFornecedorNome(op.supplierId);
                        const lucro = op.value - op.value / (op.collectorTax || 0);
                        const comissao = lucro * (selectedRecolhedor.comission / 100);

                        return (
                          <tr key={op.id} className="odd:bg-blue-50 even:bg-green-50">
                            <td className="py-2 px-4 text-center border">
                              <i className="fas fa-clock text-green-500 mr-2"></i>
                              {formatDate(op.date)}
                            </td>
                            <td className="py-2 px-4 text-center border">{op.city || "Desconhecido"}</td>
                            <td className="py-2 px-4 text-center border">{recolhedorNome}</td>
                            <td className="py-2 px-4 text-center border">{fornecedorNome}</td>
                            <td className="py-2 px-4 border text-center">{formatCurrency(op.value || 0)}</td>
                            <td className="py-2 px-4 border text-center font-semibold text-green-600 bg-yellow-50 rounded">
                              {formatCurrency(lucro)}
                            </td>
                            <td className="py-2 px-4 border text-center font-semibold text-blue-600 bg-yellow-50 rounded">
                              {formatCurrency(comissao)}
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-gray-500">
                        {filterApplied ? "Nenhuma operação encontrada no período" : "Nenhuma operação registrada"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Página {paginaAtual + 1} de {Math.ceil(operacoesPorRecolhedor.length / itensPorPagina)} • Mostrando{" "}
                  {operacoesPaginadas.length} de {operacoesPorRecolhedor.length} registros
                </div>

                <div className="flex space-x-2">
                  <button
                    disabled={paginaAtual === 0}
                    onClick={() => setPaginaAtual((prev) => Math.max(0, prev - 1))}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <button
                    disabled={(paginaAtual + 1) * itensPorPagina >= operacoesPorRecolhedor.length}
                    onClick={() =>
                      setPaginaAtual((prev) =>
                        Math.min(prev + 1, Math.ceil(operacoesPorRecolhedor.length / itensPorPagina) - 1)
                      )
                    }
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LucrosRecolhedoresFusionTab;
