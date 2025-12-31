import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModalFornecedor from "./ModalFornecedor";
import { formatCurrency, formatDate, formatDateIn } from "./format";
import ConfirmModal from "./ConfirmModal";
import { api } from "../../../services/api";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useNotification } from "../../../hooks/notification";
import { subtractHoursToLocaleBR } from "./RecolhedoresTab";
import PdfShareModal from "../../../components/PdfShareModal";
import { usePermissionStore } from "../../../store/permissionsStore";
interface Transacao {
  id: number;
  date: string;
  valor: number;
  descricao: string;
  tipo: "pagamento" | "credito" | "debito";
}

interface Fornecedor {
  id: number;
  name: string;
  tax: number;
  balance: number;
  transacoes: Transacao[];
}

export interface Payment {
  id: number;
  date: string;
  amount: number;
  description: string;
  collectorId?: number;
  supplierId?: number;
}

export interface Operacao {
  id: number;
  date: string;
  city: string;
  value: number;
  collectorId: number;
  supplierId: number;
  collectorTax: number;
  supplierTax: number;
  profit: number;
  comission: number;
  idOperation: number;
}

const FornecedoresTab: React.FC = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [fornecedorEdit, setFornecedorEdit] = useState<Fornecedor | undefined>(undefined);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null);
  const [valorPagamento, setValorPagamento] = useState<number | null>(null);
  const [descricaoPagamento, setDescricaoPagamento] = useState("");
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fornecedorToDelete, setFornecedorToDelete] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [newPaymentId, setNewPaymentId] = useState<string | null>(null);
  const [saldoAcumulado, setSaldoAcumulado] = useState(0);
  const [calculatedBalances, setCalculatedBalances] = useState<Record<number, number>>({});
  const [valorRaw, setValorRaw] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [tempStartDate, setTempStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]); // Estado temporário para data inicial
  const [tempEndDate, setTempEndDate] = useState<string>(new Date().toLocaleDateString("en-CA")); // Estado temporário para data final
  const itensPorPagina = 6;
  const [filterApplied, setFilterApplied] = useState(false);
  const { setOpenNotification } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { permissions, getPermissions, user } = usePermissionStore();

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fornecedoresResponse, operacoesResponse, paymentsResponse] = await Promise.all([
        api.get<Fornecedor[]>("/suppliers/list_suppliers"),
        api.get<Operacao[]>("/operations/list_operations"),
        api.get<Payment[]>("/api/payments"),
      ]);

      setFornecedores(fornecedoresResponse.data);
      setOperacoes(operacoesResponse.data);
      setPayments(paymentsResponse.data);

      const balances: Record<number, number> = {};
      fornecedoresResponse.data.forEach((f) => {
        balances[f.id] = computeBalance(f, operacoesResponse.data, paymentsResponse.data);
      });
      setCalculatedBalances(balances);

      const totalBalance = Object.values(balances).reduce((a, b) => a + b, 0);
      setSaldoAcumulado(totalBalance);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (newPaymentId) {
      const timer = setTimeout(() => {
        setNewPaymentId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [newPaymentId]);

  const salvarFornecedor = async (name: string, tax: number, balance: number) => {
    try {
      if (fornecedorEdit) {
        await api.put(`/suppliers/update_supplier/${fornecedorEdit.id}`, { name, tax, balance });
        fetchAllData();
      } else {
        const response = await api.post<Fornecedor>("/suppliers/create_supplier", { name, tax, balance });
        setFornecedores([...fornecedores, response.data]);
      }
      setShowModal(false);
      setFornecedorEdit(undefined);
    } catch (e: any) {
      alert(`Erro ao salvar fornecedor: ${e.message}`);
    }
  };

  const abrirCaixa = async (fornecedor: Fornecedor) => {
    setFornecedorSelecionado(fornecedor);
    try {
      const [fornecedorResponse, paymentsResponse] = await Promise.all([
        api.get<Fornecedor>(`/suppliers/list_supplier/${fornecedor.id}`),
        api.get<Payment[]>(`/api/payments?supplierId=${fornecedor.id}`),
      ]);

      setFornecedorSelecionado(fornecedorResponse.data);

      setPayments((prev) => {
        const updatedPayments = [...prev.filter((p) => p.supplierId !== fornecedor.id), ...paymentsResponse.data];

        const updatedBalances: Record<number, number> = {};
        fornecedores.forEach((f) => {
          updatedBalances[f.id] = computeBalance(f, operacoes, updatedPayments);
        });
        setCalculatedBalances(updatedBalances);

            setFilterStartDate(tempStartDate);
    setFilterEndDate(tempEndDate);
    setFilterApplied(true);
    setPaginaAtual(0);

        return updatedPayments;
      });
    } catch (error: any) {
      console.error("Erro ao buscar detalhes do fornecedor:", error.message);
      alert("Erro ao carregar detalhes do fornecedor.");
      setFornecedorSelecionado(null);
    }

  };

  const fecharCaixa = () => {
    setFornecedorSelecionado(null);
    setValorPagamento(null);
    setDescricaoPagamento("");
  };

  const registrarPagamento = async () => {
    if (!fornecedorSelecionado) return;
    if (!valorPagamento || !descricaoPagamento.trim()) {
      alert("Preencha todos os campos de pagamento.");
      return;
    }

    setIsProcessingPayment(true);

    try {
      const isHoje = dataPagamento === new Date().toLocaleDateString('en-CA');
      const dataFinal = isHoje ? new Date().toISOString() : new Date(`${dataPagamento}T00:00:00`).toISOString();

      const paymentData = {
        supplierId: fornecedorSelecionado.id,
        amount: valorPagamento,
        description: descricaoPagamento,
        date: dataFinal,
      };

      const response = await api.post("/api/payments", paymentData);
      const newPayment: Payment = response.data;

      const updatedPayments = [...payments, newPayment];
      setPayments(updatedPayments);

      const updatedBalances: Record<number, number> = {};
      fornecedores.forEach((f) => {
        updatedBalances[f.id] = computeBalance(f, operacoes, updatedPayments);
      });

      setCalculatedBalances(updatedBalances);
      setSaldoAcumulado(Object.values(updatedBalances).reduce((a, b) => a + b, 0));

      setValorPagamento(null);
      setDescricaoPagamento("");
      setDataPagamento(new Date().toLocaleDateString('en-CA'));

      setNewPaymentId(`pay-${newPayment.id}`);
      // alert("Pagamento registrado com sucesso!");
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
      console.log("error", e);
      alert(`Erro ao registrar pagamento: ${e.message}`);
    } finally {
      setIsProcessingPayment(false);
      setValorRaw("");
    }
  };

  const confirmarDeleteFornecedor = (id: number) => {
    setFornecedorToDelete(id);
    setShowConfirmModal(true);
  };

  const deletarFornecedor = async () => {
    if (fornecedorToDelete !== null) {
      try {
        await api.delete(`/suppliers/delete_supplier/${fornecedorToDelete}`);
        setFornecedores(fornecedores.filter((f) => f.id !== fornecedorToDelete));
        setFornecedorToDelete(null);
        fetchAllData();
      } catch (e: any) {
        alert(`Erro ao deletar fornecedor: ${e.message}`);
      }
    }
    setShowConfirmModal(false);
  };

  const deletarOperacao = async (id: number) => {
    try {
      await api.delete(`/operations/delete_operation/${id}`);

      const updatedOperacoes = operacoes.filter((op) => op.id !== id);
      setOperacoes(updatedOperacoes);

      const updatedBalances: Record<number, number> = {};
      fornecedores.forEach((f) => {
        updatedBalances[f.id] = computeBalance(f, updatedOperacoes, payments);
      });
      setCalculatedBalances(updatedBalances);

      const totalBalance = Object.values(updatedBalances).reduce((a, b) => a + b, 0);
      setSaldoAcumulado(totalBalance);

      alert("Operação deletada com sucesso.");
    } catch (e: any) {
      alert(`Erro ao deletar operação: ${e.message}`);
    }
  };

  const deletarPagamento = async (id: number) => {
    try {
      await api.delete(`/api/delete_payment/${id}`);

      const updatedPayments = payments.filter((p) => p.id !== id);
      setPayments(updatedPayments);

      const updatedBalances: Record<number, number> = {};
      fornecedores.forEach((f) => {
        updatedBalances[f.id] = computeBalance(f, operacoes, updatedPayments);
      });
      setCalculatedBalances(updatedBalances);

      const totalBalance = Object.values(updatedBalances).reduce((a, b) => a + b, 0);
      setSaldoAcumulado(totalBalance);
    } catch (e: any) {
      alert(`Erro ao deletar pagamento: ${e.message}`);
    }
  };

  const todasTransacoes = [
    ...(fornecedorSelecionado?.transacoes || []),
    ...operacoes
      .filter((op) => op.supplierId === fornecedorSelecionado?.id && op.comission !== 0 && op.comission === null)
      .map((op) => ({
        id: `op-${op.id}`,
        date: op.date || new Date().toISOString(),
        valor: -(op.value || 0) / (op.supplierTax || fornecedorSelecionado?.tax || 1),
        descricao: `OPERAÇÃO #${op.id} · ${op.city?.toUpperCase() || ""}`,
        tipo: "debito",
      })),
    ...payments
      .filter((p) => p.supplierId === fornecedorSelecionado?.id)
      .map((p) => ({
        id: `pay-${p.id}`,
        date: p.date,
        valor: p.amount,
        descricao: p.description.toUpperCase(),
        tipo: "pagamento",
      })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtrarTransacoesPorData = (transacoes: any[]) => {
    if (!filterStartDate && !filterEndDate) return transacoes;

       const start =  new Date(`${filterStartDate}T00:00:00`) 
    const end =  new Date(`${filterEndDate}T23:59:59`) 
    // end.setDate(end.getDate() + 1);

    return transacoes.filter((transacao) => {
          

      const dataTransacao = new Date(transacao.date);

    // Ajusta para o horário local sem afetar a data
    const localDataTransacao = new Date(
      dataTransacao.getFullYear(),
      dataTransacao.getMonth(),
      dataTransacao.getDate()
    );

    return (!start || localDataTransacao >= start) && (!end || localDataTransacao <= end);
    });
  };

  const transacoesFiltradas = useMemo(
    () => filtrarTransacoesPorData(todasTransacoes),
    [filterStartDate, filterEndDate, todasTransacoes]
  );

  const transacoesPaginadas = transacoesFiltradas.slice(
    paginaAtual * itensPorPagina,
    (paginaAtual + 1) * itensPorPagina
  );

  function computeBalance(f: Fornecedor, ops: Operacao[], pays: Payment[]) {
    const supplierOperations = ops
      .filter((o) => o.supplierId === f.id)
      .filter((o) => o.idOperation == null)
      .map((o) => ({
        date: o.date,
        value: -(o.value / (o.supplierTax || f.tax || 1)),
        type: "operation",
      }));

    const supplierPayments = pays
      .filter((p) => p.supplierId === f.id)
      .map((p) => ({
        date: p.date,
        value: p.amount,
        type: "payment",
      }));

    const allTransactions = [...supplierOperations, ...supplierPayments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let balance = 0;
    for (const transaction of allTransactions) {
      balance += transaction.value;
    }
    const arredondado =
      Math.abs(balance) < 0.01 ? 0 : balance < 0 ? Math.floor(balance * 100) / 100 : Math.ceil(balance * 100) / 100;

    return arredondado;
  }

  const getFornecedorPDF = () => {
    if (!fornecedorSelecionado) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Título
    doc.setFontSize(16);
    doc.setTextColor(40, 100, 40);
    doc.text(`Extrato de Transações - ${fornecedorSelecionado.name}`, 105, 15, { align: "center" });

    // Informações de emissão e período
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Data de emissão formatada
    const dataEmissao = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Período do filtro formatado
    const periodoFiltro =
      filterStartDate || filterEndDate
        ? `${filterStartDate ? new Date(filterStartDate).toLocaleDateString("pt-BR") : "início"} a ${
            filterEndDate ? new Date(filterEndDate).toLocaleDateString("pt-BR") : "fim"
          }`
        : "Período completo";

    doc.text(`Data de emissão: ${dataEmissao}`, 15, 25);
    doc.text(`Período: ${periodoFiltro}`, 15, 30);
    doc.text(`Saldo atual: ${formatCurrency(calculatedBalances[fornecedorSelecionado.id] || 0, 2, "USD")}`, 15, 35);

    // Preparar dados da tabela
    const tableData = transacoesFiltradas.map((t) => [
      subtractHoursToLocaleBR(t.date),
      t.descricao,
      formatCurrency(t.valor, 2, "USD"),
    ]);

    // Calcular totais
    const totalEntradas = transacoesFiltradas.filter((t) => t.valor > 0).reduce((sum, t) => sum + t.valor, 0);

    const totalSaidas = transacoesFiltradas.filter((t) => t.valor < 0).reduce((sum, t) => sum + t.valor, 0);

    const saldoPeriodo = totalEntradas + totalSaidas;

    // Gerar tabela
    autoTable(doc, {
      head: [["Data", "Descrição", "Valor (USD)"]],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 9,
        cellPadding: 2,
        halign: "left",
      },
      headStyles: {
        fillColor: [229, 231, 235],
        textColor: 0,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [240, 249, 255],
      },
      columnStyles: {
        0: { halign: "center" },
        2: { halign: "right" },
      },
    });

    // Adicionar totais
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");

    // doc.text(`Total de entradas: ${formatCurrency(totalEntradas, 2, "USD")}`, 15, finalY);
    // doc.text(`Total de saídas: ${formatCurrency(totalSaidas, 2, "USD")}`, 70, finalY);
    doc.text(`Saldo período selecionado: ${formatCurrency(saldoPeriodo, 2, "USD")}`, 15, finalY);

    // // Saldo total
    // doc.text(`Saldo atual: ${formatCurrency(calculatedBalances[fornecedorSelecionado.id] || 0, 2, "USD")}`, 15, finalY + 10);

    // Salvar PDF
    const pdfBlob =   doc.output("blob")
      // Converter blob para File

      const hoje = new Date();
const dia = String(hoje.getDate()).padStart(2, "0");
const mes = String(hoje.getMonth() + 1).padStart(2, "0"); // meses começam do zero
const ano = hoje.getFullYear();
    const fileName = `extrato_${fornecedorSelecionado.name.replace(/\s+/g, "_")}_${dia}-${mes}-${ano}.pdf`;
    return new File([pdfBlob], fileName, { type: "application/pdf" });
  };
  const generateFornecedorPDF = () => {
    if (!fornecedorSelecionado) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Título
    doc.setFontSize(16);
    doc.setTextColor(40, 100, 40);
    doc.text(`Extrato de Transações - ${fornecedorSelecionado.name}`, 105, 15, { align: "center" });

    // Informações de emissão e período
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Data de emissão formatada
    const dataEmissao = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Período do filtro formatado
    const periodoFiltro =
      filterStartDate || filterEndDate
        ? `${filterStartDate ? new Date(filterStartDate).toLocaleDateString("pt-BR") : "início"} a ${
            filterEndDate ? new Date(filterEndDate).toLocaleDateString("pt-BR") : "fim"
          }`
        : "Período completo";

    doc.text(`Data de emissão: ${dataEmissao}`, 15, 25);
    doc.text(`Período: ${periodoFiltro}`, 15, 30);
    doc.text(`Saldo atual: ${formatCurrency(calculatedBalances[fornecedorSelecionado.id] || 0, 2, "USD")}`, 15, 35);

    // Preparar dados da tabela
    const tableData = transacoesFiltradas.map((t) => [
      subtractHoursToLocaleBR(t.date),
      t.descricao,
      formatCurrency(t.valor, 2, "USD"),
    ]);

    // Calcular totais
    const totalEntradas = transacoesFiltradas.filter((t) => t.valor > 0).reduce((sum, t) => sum + t.valor, 0);

    const totalSaidas = transacoesFiltradas.filter((t) => t.valor < 0).reduce((sum, t) => sum + t.valor, 0);

    const saldoPeriodo = totalEntradas + totalSaidas;

    // Gerar tabela
    autoTable(doc, {
      head: [["Data", "Descrição", "Valor (USD)"]],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 9,
        cellPadding: 2,
        halign: "left",
      },
      headStyles: {
        fillColor: [229, 231, 235],
        textColor: 0,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [240, 249, 255],
      },
      columnStyles: {
        0: { halign: "center" },
        2: { halign: "right" },
      },
    });

    // Adicionar totais
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");

    // doc.text(`Total de entradas: ${formatCurrency(totalEntradas, 2, "USD")}`, 15, finalY);
    // doc.text(`Total de saídas: ${formatCurrency(totalSaidas, 2, "USD")}`, 70, finalY);
    doc.text(`Saldo período selecionado: ${formatCurrency(saldoPeriodo, 2, "USD")}`, 15, finalY);

    // // Saldo total
    // doc.text(`Saldo atual: ${formatCurrency(calculatedBalances[fornecedorSelecionado.id] || 0, 2, "USD")}`, 15, finalY + 10);

    // Salvar PDF

              const hoje = new Date();
const dia = String(hoje.getDate()).padStart(2, "0");
const mes = String(hoje.getMonth() + 1).padStart(2, "0"); // meses começam do zero
const ano = hoje.getFullYear();
    doc.save(
      `extrato_${fornecedorSelecionado.name.replace(/\s+/g, "_")}_${dia}-${mes}-${ano}.pdf`
    );
  };
const getFornecedorPDFDataJSON = () => {
    if (!fornecedorSelecionado) return null;

    const dataEmissao = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const periodoFiltro =
        filterStartDate || filterEndDate
        ? `${filterStartDate ? new Date(filterStartDate).toLocaleDateString("pt-BR") : "início"} a ${
            filterEndDate ? new Date(filterEndDate).toLocaleDateString("pt-BR") : "fim"
            }`
        : "Período completo";

    const tableData = transacoesFiltradas.map((t: any) => ({
        date: formatDate(t.date),
        description: t.descricao,
        value: formatCurrency(t.valor, 2, "USD"),
    }));

    const totalEntradas = transacoesFiltradas.filter((t: any) => t.valor > 0).reduce((sum: number, t: any) => sum + t.valor, 0);
    const totalSaidas = transacoesFiltradas.filter((t: any) => t.valor < 0).reduce((sum: number, t: any) => sum + t.valor, 0);
    const saldoPeriodo = totalEntradas + totalSaidas;

    return {
        title: `Extrato de Transações - ${fornecedorSelecionado.name}`,
        issueDate: dataEmissao,
        filterPeriod: periodoFiltro,
        currentBalance: formatCurrency(calculatedBalances[fornecedorSelecionado.id] || 0, 2, "USD"),
        transactions: tableData,
        summary: {
            totalEntries: formatCurrency(totalEntradas, 2, "USD"),
            totalExits: formatCurrency(totalSaidas, 2, "USD"),
            periodBalance: formatCurrency(saldoPeriodo, 2, "USD"),
        },
        reportName: fornecedorSelecionado.name, // Nome do fornecedor para o modal
    };
};
  useEffect(() => {
    let totalBalance = 0;
    fornecedores.forEach((fornecedor) => {
      totalBalance += computeBalance(fornecedor, operacoes, payments);
    });
    setSaldoAcumulado(totalBalance);
  }, [fornecedores, operacoes, payments]);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-64">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="inline-block w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mb-4"
          ></motion.div>
          <p className="text-lg text-green-700 font-medium">Carregando fornecedores...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-50 p-4 rounded-lg text-red-700 border border-red-200"
      >
        Erro ao carregar fornecedores: {error}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="fade-in">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white p-6 rounded-lg shadow mb-6"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold text-green-700">
              <i className="fas fa-truck mr-2"></i> FORNECEDORES
            </h2>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">SALDO ACUMULADO</h3>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(saldoAcumulado, 2, "USD")}</p>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setFornecedorEdit(undefined);
              setShowModal(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            <i className="fas fa-plus mr-2"></i> ADICIONAR
          </motion.button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-200">
                <th className="py-2 px-4 border">NOME</th>
                <th className="py-2 px-4 border">SALDO (USD)</th>
                <th className="py-2 px-4 border">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {user?.role !== "MASTER" && fornecedores.filter((fornecedor)=> permissions?.GERENCIAR_TOKENS.FORNECEDORES_PERMITIDOS.includes(fornecedor.name)).map((f) => (
                  <motion.tr
                    key={f.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="py-2 px-4 border text-center">{f.name.toUpperCase()}</td>
                    <td
                      className={`py-2 px-4 border text-center font-bold ${
                        Math.abs(calculatedBalances[f.id]) < 0.009
                          ? "text-gray-800"
                          : calculatedBalances[f.id] < 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {Math.abs(calculatedBalances[f.id]) < 0.009
                        ? formatCurrency(0)
                        : formatCurrency(calculatedBalances[f.id])}
                    </td>
                    <td className="py-2 px-4 border space-x-2 text-center">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => abrirCaixa(f)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                      >
                        Caixa
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setFornecedorEdit(f);
                          setShowModal(true);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                      >
                        Editar
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => confirmarDeleteFornecedor(f.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      >
                        <i className="fas fa-trash"></i>
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
                {user?.role === "MASTER" && fornecedores.map((f) => (
                  <motion.tr
                    key={f.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="py-2 px-4 border text-center">{f.name.toUpperCase()}</td>
                    <td
                      className={`py-2 px-4 border text-center font-bold ${
                        Math.abs(calculatedBalances[f.id]) < 0.009
                          ? "text-gray-800"
                          : calculatedBalances[f.id] < 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {Math.abs(calculatedBalances[f.id]) < 0.009
                        ? formatCurrency(0)
                        : formatCurrency(calculatedBalances[f.id])}
                    </td>
                    <td className="py-2 px-4 border space-x-2 text-center">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => abrirCaixa(f)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                      >
                        Caixa
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setFornecedorEdit(f);
                          setShowModal(true);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                      >
                        Editar
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => confirmarDeleteFornecedor(f.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      >
                        <i className="fas fa-trash"></i>
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      <AnimatePresence>
        {fornecedorSelecionado && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="bg-white p-6 rounded-lg shadow mb-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-green-700">
                <i className="fas fa-truck mr-2"></i> CAIXA DE {fornecedorSelecionado.name}
              </h2>
              <div>
                <span className="mr-3">
                  SALDO:{" "}
                  <span
                    className={`font-bold ${
                      calculatedBalances[fornecedorSelecionado.id] < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(calculatedBalances[fornecedorSelecionado.id] || 0)}
                  </span>
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={fecharCaixa}
                  className="ml-3 text-gray-500 hover:text-gray-700"
                >
                  <i className="fas fa-times"></i>
                </motion.button>
                <button
                  disabled={!filterApplied}
                  onClick={() => setIsModalOpen(true)}
                  className={`w-40 h-6 rounded-md text-sm font-medium flex items-center justify-center ${
                    !filterApplied
                      ? "cursor-not-allowed  bg-gray-200 text-gray-500 "
                      : "bg-white text-blue-600 border border-blue-600 hover:bg-blue-600 hover:text-white rounded-md text-sm font-medium h-6 px-4 mr-2 flex items-center justify-center transition-colors"
                  }`}
                >
                  Exportar extrato PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-50 p-4 rounded border"
              >
                <h3 className="font-medium mb-3 text-blue-700 border-b pb-2">
                  <i className="fas fa-hand-holding-usd mr-2"></i> REGISTRAR PAGAMENTO
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">DATA</label>
                    <input
                      type="date"
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                      value={dataPagamento}
                      onChange={(e) => setDataPagamento(e.target.value)}
                      disabled={isProcessingPayment}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">VALOR (USD)</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-left font-mono"
                      value={valorRaw}
                      onChange={(e) => {
                        const cleanedValue = e.target.value.replace(/[^0-9.-]/g, "");
                        let newValue = cleanedValue;
                        if ((cleanedValue.match(/-/g) || []).length > 1) {
                          newValue = cleanedValue.replace(/-/g, "");
                        }
                        if ((cleanedValue.match(/\./g) || []).length > 1) {
                          const parts = cleanedValue.split(".");
                          newValue = parts[0] + "." + parts.slice(1).join("");
                        }
                        setValorRaw(newValue);
                        const numericValue = parseFloat(newValue) || 0;
                        setValorPagamento(isNaN(numericValue) ? null : numericValue);
                      }}
                      onBlur={(e) => {
                        if (valorRaw) {
                          const numericValue = parseFloat(valorRaw);
                          if (!isNaN(numericValue)) {
                            const formattedValue = numericValue.toLocaleString("en-US", {
                              style: "currency",
                              currency: "USD",
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            });
                            setValorRaw(formattedValue);
                            setValorPagamento(numericValue);
                          }
                        }
                      }}
                      onFocus={(e) => {
                        if (valorRaw) {
                          const numericValue = parseFloat(valorRaw.replace(/[^0-9.-]/g, ""));
                          if (!isNaN(numericValue)) {
                            setValorRaw(numericValue.toString());
                          }
                        }
                      }}
                      disabled={isProcessingPayment}
                      placeholder="$0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">DESCRIÇÃO</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                      value={descricaoPagamento}
                      onChange={(e) => setDescricaoPagamento(e.target.value.toUpperCase())}
                      disabled={isProcessingPayment}
                    />
                  </div>
                  <motion.button
                    whileHover={!isProcessingPayment ? { scale: 1.02 } : {}}
                    whileTap={!isProcessingPayment ? { scale: 0.98 } : {}}
                    onClick={registrarPagamento}
                    className={`${
                      isProcessingPayment ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                    } text-white px-4 py-2 rounded w-full flex items-center justify-center`}
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                        ></motion.div>
                        PROCESSANDO...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check mr-2"></i> REGISTRAR
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>

              <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                <div className="mb-2 border-b w-full flex flex-row items-center justify-between max-w-[100%]">
                  <div className="w-full flex justify-between items-start  mb-4">
                    <div className="flex flex-col whitespace-nowrap">
                      <span className="text-xs font-medium text-gray-700 mb-1">
                        {filterStartDate || filterEndDate
                          ? `(Filtrado: ${filterStartDate ? formatDateIn(filterStartDate) : "início"} a ${
                              filterEndDate ? formatDateIn(filterEndDate) : "fim"
                            })`
                          : "(ÚLTIMOS 6)"}
                      </span>
                      <h3 className="font-medium">HISTÓRICO DE TRANSAÇÕES</h3>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-700 mb-1">Data Inicial</label>
                        <input
                          type="date"
                          value={tempStartDate}
                          onChange={(e) => setTempStartDate(e.target.value)}
                          className="w-24 h-6 border border-gray-300 rounded-md text-sm text-center leading-6 py-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                      <span className="text-sm font-medium">até</span>
                      <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-700 mb-1">Data Final</label>
                        <input
                          type="date"
                          value={tempEndDate}
                          onChange={(e) => setTempEndDate(e.target.value)}
                          className="w-24 h-6 border border-gray-300 rounded-md text-sm text-center leading-6 py-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (tempStartDate && tempEndDate && new Date(tempStartDate) > new Date(tempEndDate)) {
                            alert("A data inicial deve ser anterior ou igual à data final.");
                            return;
                          }
                          setFilterStartDate(tempStartDate);
                          setFilterEndDate(tempEndDate);
                          setFilterApplied(true);
                          setPaginaAtual(0);
                        }}
                        className="bg-white text-blue-600 border border-blue-600 hover:bg-blue-600 hover:text-white rounded-md text-sm font-medium h-6 px-4 mr-2 flex items-center justify-center transition-colors"
                      >
                        Filtrar
                      </button>
                      <button
                        onClick={() => {
                          setTempStartDate("");
                          setTempEndDate("");
                          setFilterStartDate("");
                          setFilterEndDate("");
                          setFilterApplied(false);
                          setPaginaAtual(0);
                        }}
                        className="bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md text-sm font-medium h-6 px-4 flex items-center justify-center transition-colors"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="py-2 px-4 border">DATA</th>
                        <th className="py-2 px-4 border">DESCRIÇÃO</th>
                        <th className="py-2 px-4 border">VALOR (USD)</th>
                        <th className="py-2 px-4 border">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {transacoesPaginadas.map((t) => (
                          <motion.tr
                            key={t.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="odd:bg-blue-50 even:bg-green-50"
                          >
                            <td className="py-2 px-4 border text-sm text-gray-700">
                              <div className="flex items-center gap-2" title={subtractHoursToLocaleBR(t.date)}>
                                <i className="fas fa-clock text-green-500 mr-2"></i>
                                {subtractHoursToLocaleBR(t.date)}
                              </div>
                            </td>
                            <td className="py-2 px-4 border text-sm text-gray-700">{t.descricao}</td>
                            <td
                              className={`py-2 px-4 border text-right ${
                                t.valor < 0 ? "text-red-600" : "text-green-600"
                              }`}
                            >
                              {formatCurrency(t.valor)}
                            </td>
                            <td className="py-2 px-4 border text-right">
                              {t.id.toString().startsWith("pay-") && (
                                <button
                                  onClick={() => deletarPagamento(Number(t.id.toString().replace("pay-", "")))}
                                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
                              {t.id.toString().startsWith("op-") && (
                                <button
                                  onClick={() => deletarOperacao(Number(t.id.toString().replace("op-", "")))}
                                  disabled={true}
                                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded justify-self-end cursor-not-allowed"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                      {transacoesPaginadas.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-4 text-gray-500">
                            {filterStartDate || filterEndDate
                              ? "Nenhuma transação encontrada no período"
                              : "Nenhuma transação registrada"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div className="flex justify-between items-center mt-4">
                    <button
                      onClick={() => setPaginaAtual((prev) => Math.max(0, prev - 1))}
                      disabled={paginaAtual === 0}
                      className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {paginaAtual + 1} de {Math.ceil(transacoesFiltradas.length / itensPorPagina)} • Mostrando{" "}
                      {transacoesFiltradas.length} de {todasTransacoes.length} transações
                    </span>
                    <button
                      onClick={() =>
                        setPaginaAtual((prev) =>
                          Math.min(prev + 1, Math.ceil(transacoesFiltradas.length / itensPorPagina) - 1)
                        )
                      }
                      disabled={(paginaAtual + 1) * itensPorPagina >= transacoesFiltradas.length}
                      className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ModalFornecedor
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={salvarFornecedor}
        fornecedorEdit={fornecedorEdit}
      />
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja deletar este fornecedor?"
        onConfirm={deletarFornecedor}
        onClose={() => setShowConfirmModal(false)}
      />

      {isModalOpen && <PdfShareModal onClose={() => setIsModalOpen(false)} getFileToSendPDF={getFornecedorPDF} generatePDF={generateFornecedorPDF} getPDFDataJSON={getFornecedorPDFDataJSON as () => any | null} />}
    </motion.div>
  );
};

export default FornecedoresTab;
