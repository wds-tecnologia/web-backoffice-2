import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate, formatDateIn } from "./format";
import SuccessModal from "./SuccessModal";
import OperationDetailsModal from "./OperationDetailsModal";
import { api } from "../../../services/api";
import { NumericCellType } from "handsontable/cellTypes";
import Swal from "sweetalert2";
import { Loader2, Save } from "lucide-react";
import { useNotification } from "../../../hooks/notification";

interface Operacao {
  id: number;
  date: string;
  city: string;
  value: number;
  collectorId: number;
  supplierId: number;
  comission: number;
  collectorTax: number;
  supplierTax: number;
  profit: number;
}

interface Recolhedor {
  id: number;
  name: string;
  tax: number;
  comission: number;
  balance: number;
}

interface Fornecedor {
  id: number;
  name: string;
  tax: number;
  balance: number;
}

const OperacoesTab: React.FC = () => {
  const [recolhedores, setRecolhedores] = useState<Recolhedor[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);

  const [dataOperacao, setDataOperacao] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [localOperacao, setLocalOperacao] = useState("");
  const [valorOperacao, setValorOperacao] = useState<number | null>(null);
  // const [valorOperacao2, setValorOperacao2] = useState(""); // Controla o valor digitado
  const [recolhedorOperacao, setRecolhedorOperacao] = useState<number | "">("");
  const [fornecedorOperacao, setFornecedorOperacao] = useState<number | "">("");
  const [taxaRecolhedorOperacao, setTaxaRecolhedorOperacao] = useState<number>(1.025);
  const [taxaFornecedorOperacao, setTaxaFornecedorOperacao] = useState<number>(1.05);
  const [valorRaw, setValorRaw] = useState(""); 

  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [selectedOperation, setSelectedOperation] = useState<Operacao | null>(null);
  const [showOperationModal, setShowOperationModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const { setOpenNotification } = useNotification();
  const itemsPerPage = 6; // ou o número que preferir

  useEffect(() => {
    const rec = recolhedores.find((r) => r.id === recolhedorOperacao);
    if (rec) {
      setTaxaRecolhedorOperacao(rec.tax);
    }
  }, [recolhedorOperacao]);

  useEffect(() => {
    const forn = fornecedores.find((f) => f.id === fornecedorOperacao);
    if (forn) {
      setTaxaFornecedorOperacao(forn.tax);
    }
  }, [fornecedorOperacao]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const recolhedoresResponse = await api.get<Recolhedor[]>("/collectors/list_collectors");
      setRecolhedores(recolhedoresResponse.data);

      const fornecedoresResponse = await api.get<Fornecedor[]>("/suppliers/list_suppliers");
      setFornecedores(fornecedoresResponse.data);

      const operacoesResponse = await api.get<Operacao[]>("/operations/list_operations");
      setOperacoes(operacoesResponse.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setSuccessMessage("Erro ao carregar os dados. Por favor, tente novamente.");
      setShowSuccessModal(true);
    }
  };

  const calcularResumo = () => {
    if (!valorOperacao) return { valorFornecedor: 0, valorRecolhedor: 0, lucro: 0 };
    const valorFornecedor = valorOperacao / taxaFornecedorOperacao;
    const valorRecolhedor = valorOperacao / taxaRecolhedorOperacao;
    const lucro = valorRecolhedor - valorFornecedor;
    return { valorFornecedor, valorRecolhedor, lucro };
  };

  const { valorFornecedor, valorRecolhedor, lucro } = calcularResumo();



  const registrarOperacao = async () => {
    if (!dataOperacao || !localOperacao || !valorOperacao || !recolhedorOperacao || !fornecedorOperacao) {
      setSuccessMessage("Por favor, preencha todos os campos corretamente!");
      setShowSuccessModal(true);
      return;
    }

    // Combina a data selecionada (apenas o dia) com o horário atual
    const selectedDateOnly = dataOperacao.split("T")[0]; // ex: "2025-05-02"
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8); // ex: "14:37:00"
    const finalDate = new Date(`${selectedDateOnly}T${currentTime}`);
    const formattedDate = finalDate.toISOString(); // Envia como UTC
    const getRecolhedorComission = (id: number) => recolhedores.find((r) => r.id === id)?.comission || 0;
    const comissionPercentage = getRecolhedorComission(recolhedorOperacao); // % de comissão

    const valorRecolhedor = valorOperacao / taxaRecolhedorOperacao;
    const valorFornecedor = valorOperacao / taxaFornecedorOperacao;
    const lucro = valorRecolhedor - valorFornecedor;

    // ✅ Correção da lógica do comissionValue:
    const debitoRecolhedor = valorOperacao / taxaRecolhedorOperacao;
    const comissionValue = Number(((valorOperacao - debitoRecolhedor) * (comissionPercentage / 100)).toFixed(2));

    // const lucro = valorOperacao - valorOperacao / (taxaRecolhedorOperacao || 1); // Cálculo do lucro
    //  const comissionValue = lucro * (comissionPercentage / 100); // Valor da comissão (sem arredondamento)
    const novaOperacao = {
      date: formattedDate,
      city: localOperacao.toUpperCase(),
      value: valorOperacao,
      collectorId: recolhedorOperacao,
      supplierId: fornecedorOperacao,
      collectorTax: taxaRecolhedorOperacao,
      supplierTax: taxaFornecedorOperacao,
      profit: lucro, // O lucro já foi calculado
    };
    const comissaoOperacao = {
      date: formattedDate,
      city: localOperacao.toUpperCase(),
      value: comissionValue,
      collectorId: recolhedorOperacao,
      supplierId: fornecedorOperacao,
      collectorTax: taxaRecolhedorOperacao,
      comission: comissionValue,
      supplierTax: taxaFornecedorOperacao,
      profit: comissionValue,
    };

    const collector = recolhedorOperacao;

    setIsSaving(true);
    try {
      const responseNewOperation = await api.post<Operacao>("/operations/create_operation", novaOperacao);

      if (comissionValue > 0) {
        await api.post<Operacao>("/operations/create_operation", {...comissaoOperacao, idOperation: responseNewOperation.data.id});
      }
      // Recarrega dados para atualizar a interface
      await fetchData();

      // Resetar campos
      setLocalOperacao("");
      setValorOperacao(0);
      setRecolhedorOperacao("");
      setFornecedorOperacao("");
      setTaxaRecolhedorOperacao(1.025);
      setTaxaFornecedorOperacao(1.05);

      // Swal.fire({
      //   icon: "success",
      //   title: "Sucesso!",
      //   text: "Operação registrada com sucesso!",
      //   confirmButtonText: "Ok",
      //   buttonsStyling: false,
      //   customClass: {
      //     confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
      //   },
      // });
      setOpenNotification({
        type: 'success',
        title: 'Sucesso!',
        notification: 'Operação registrada com sucesso!'
      });
      setSuccessMessage("Operação registrada com sucesso!");
      // setShowSuccessModal(true);
    } catch (error: any) {
      console.error("Erro ao registrar operação:", error);
      setSuccessMessage("Erro ao registrar a operação. Por favor, tente novamente.");
      setShowSuccessModal(true);
    } finally {
      setIsSaving(false);
      setValorRaw("")
    }
  };

  const getRecolhedorNome = (id: number) => recolhedores.find((r) => r.id === id)?.name || "DESCONHECIDO";
  const getFornecedorNome = (id: number) => fornecedores.find((f) => f.id === id)?.name || "DESCONHECIDO";

  const abrirDetalhesOperacao = (operacao: Operacao) => {
    setSelectedOperation(operacao);
    setShowOperationModal(true);
  };

    const deletarOperacao = async (id: number) => {
      try {
        await api.delete(`/operations/delete_operation/${id}`);
  
        // Atualiza as operações
        const updatedOperacoes = operacoes.filter((op) => op.id !== id);
        setOperacoes(updatedOperacoes);

    
        // Swal.fire({
        //   icon: "success",
        //   title: "Sucesso!",
        //   text: "Operação registrada com sucesso!",
        //   confirmButtonText: "Ok",
        //   buttonsStyling: false,
        //   customClass: {
        //     confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        //   },
        // });
        setOpenNotification({
          type: 'success',
          title: 'Sucesso!',
          notification: 'Operação registrada com sucesso!'
        });

      } catch (e: any) {
        // alert(`Erro ao deletar operação: ${e.message}`);
       Swal.fire({
                icon: "error",
                title: "Error!",
                text: "Erroao deletar operação!",
                confirmButtonText: "Ok",
                buttonsStyling: false,
                customClass: {
                  confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
                },
        });
      }
    };
  

  return (
    <div className="fade-in">
      {/* Success Modal */}
      <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} message={successMessage} />

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b pb-2">
          <i className="fas fa-handshake mr-2"></i> NOVA OPERAÇÃO
        </h2>

        {/* Campos de entrada para nova operação */}
        <div className=" grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">DATA</label>
            <input
              type="date"
              className="mt-1  block w-full border border-gray-300 rounded-md p-2"
              value={dataOperacao}
              onChange={(e) => setDataOperacao(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">LOCAL (CIDADE)</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={localOperacao}
              onChange={(e) => setLocalOperacao(e.target.value.toUpperCase())}
              placeholder="EX: GOIÂNIA"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">VALOR (USD)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="$0.00"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={valorRaw}
              onChange={(e) => {
                // Permite números, ponto decimal e sinal negativo
                const cleanedValue = e.target.value.replace(/[^0-9.-]/g, "");

                // Garante que há apenas um sinal negativo no início
                let newValue = cleanedValue;
                if ((cleanedValue.match(/-/g) || []).length > 1) {
                  newValue = cleanedValue.replace(/-/g, "");
                }

                // Garante que há apenas um ponto decimal
                if ((cleanedValue.match(/\./g) || []).length > 1) {
                  const parts = cleanedValue.split(".");
                  newValue = parts[0] + "." + parts.slice(1).join("");
                }

                setValorRaw(newValue);

                // Converte para número para o estado do pagamento
                const numericValue = parseFloat(newValue) || 0;
                setValorOperacao(isNaN(numericValue) ? null : numericValue);
              }}

              onBlur={(e) => {
                // Formata apenas se houver valor
                if (valorRaw) {
                  const numericValue = parseFloat(valorRaw);
                  if (!isNaN(numericValue)) {
                    // Formata mantendo o sinal negativo se existir
                    const formattedValue = numericValue.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                    setValorRaw(formattedValue);
                    setValorOperacao(numericValue);
                  }
                }
              }}
              onFocus={(e) => {
                // Remove formatação quando o input recebe foco
                if (valorRaw) {
                  const numericValue = parseFloat(valorRaw.replace(/[^0-9.-]/g, ""));
                  if (!isNaN(numericValue)) {
                    setValorRaw(numericValue.toString());
                  }
                }
              }}

            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">RECOLHEDOR</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={recolhedorOperacao}
              onChange={(e) => setRecolhedorOperacao(Number(e.target.value))}
            >
              <option value="">SELECIONE UM RECOLHEDOR</option>
              {recolhedores.map((rec) => (
                <option key={rec.id} value={rec.id}>
                  {rec.name}
                </option>
              ))}
            </select>
            <div className="mt-1 flex items-center">
              <span className="text-xs text-gray-500 mr-2">TAXA:</span>
              <input
                type="number"
                className="text-xs w-16 border border-gray-300 rounded p-1"
                value={taxaRecolhedorOperacao}
                onChange={(e) => setTaxaRecolhedorOperacao(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">FORNECEDOR</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              value={fornecedorOperacao}
              onChange={(e) => setFornecedorOperacao(Number(e.target.value))}
            >
              <option value="">SELECIONE UM FORNECEDOR</option>
              {fornecedores.map((forn) => (
                <option key={forn.id} value={forn.id}>
                  {forn.name}
                </option>
              ))}
            </select>
            <div className="mt-1 flex items-center">
              <span className="text-xs text-gray-500 mr-2">TAXA:</span>
              <input
                type="number"
                className="text-xs w-16 border border-gray-300 rounded p-1"
                value={taxaFornecedorOperacao}
                onChange={(e) => setTaxaFornecedorOperacao(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 p-4 rounded">
          <h3 className="font-medium mb-2">RESUMO DA OPERAÇÃO</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-700">PARA FORNECEDOR:</p>
              <p className="font-bold">{formatCurrency(valorFornecedor)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700">DÉBITO DO RECOLHEDOR:</p>
              <p className="font-bold">{formatCurrency(valorRecolhedor)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700">SEU LUCRO:</p>
              <p className="font-bold text-green-600">{formatCurrency(lucro)}</p>
            </div>
          </div>
        </div>

        <button
          onClick={registrarOperacao}
          className="w-full bg-blue-600 mt-4 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="animate-spin mr-2" size={18} />
              Resgistrando...
            </>
          ) : (
            <>
              <Save className="mr-2" size={18} />
              {/* <i className="fas fa-save mr-2"></i> */}
              REGISTRAR OPERAÇÃO
            </>
          )}
        </button>

        {/* <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md w-full">
           onClick={registrarOperacao}        
        <i className="fas fa-save mr-2"></i> REGISTRAR OPERAÇÃO
        </button>*/}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b pb-2">
          <i className="fas fa-history mr-2"></i> ÚLTIMAS OPERAÇÕES
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-200">
                <th className="py-2 text-center px-4 border">DATA</th>
                <th className="py-2 text-center px-4 border">LOCAL</th>
                <th className="py-2 px-4 border text-center">RECOLHEDOR</th>
                <th className="py-2 px-4 border text-center">FORNECEDOR</th>
                <th className="py-2 px-4 border text-center">VALOR (USD)</th>
                <th className="py-2 px-4 border text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {operacoes
                .filter((op) => op.comission == 0 || op.comission == null)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
                .map((op) => (
                  <tr key={op.id} className="odd:bg-blue-50 even:bg-green-50">
                    <td className="py-2 px-4 border text-center align-middle">
                      <i className="fas fa-clock text-green-500 mr-2"></i>
                      {formatDateIn(new Date(op.date))}
                    </td>
                    <td className="py-2 px-4 border align-middle text-center">{op.city}</td>
                    <td className="py-2 px-4 border align-middle text-center">{getRecolhedorNome(op.collectorId)}</td>
                    <td className="py-2 px-4 border align-middle text-center">{getFornecedorNome(op.supplierId)}</td>
                    <td className="py-2 px-4 border text-center align-middle">{formatCurrency(op.value)}</td>
                    <td className="py-2 px-4 border text-center align-middle">
                      <button onClick={() => abrirDetalhesOperacao(op)} className="text-blue-600 hover:text-blue-800">
                        <i className="fas fa-eye"></i>
                      </button>
                      <button onClick={() => deletarOperacao(op.id)} className="text-red-600 ml-4 hover:text-red-800">
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {operacoes.filter((op) => op.comission == 0 || op.comission == null).length > itemsPerPage && (
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600">
                Página {currentPage + 1} de{" "}
                {Math.ceil(operacoes.filter((op) => op.comission == 0 || op.comission == null).length / itemsPerPage)}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(
                      prev + 1,
                      Math.ceil(
                        operacoes.filter((op) => op.comission == 0 || op.comission == null).length / itemsPerPage
                      ) - 1
                    )
                  )
                }
                disabled={
                  (currentPage + 1) * itemsPerPage >=
                  operacoes.filter((op) => op.comission == 0 || op.comission == null).length
                }
                className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Operation Details Modal */}
      {showOperationModal && selectedOperation && (
        <OperationDetailsModal
          operation={selectedOperation}
          recolhedorNome={getRecolhedorNome(selectedOperation.collectorId)}
          fornecedorNome={getFornecedorNome(selectedOperation.supplierId)}
          onClose={() => setShowOperationModal(false)}
        />
      )}
    </div>
  );
};

export default OperacoesTab;
