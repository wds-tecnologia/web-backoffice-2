import type React from "react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModalRecolhedor from "./ModalRecolhedor";
import { formatCurrency, formatDate, formatDateIn } from "./format";
import ConfirmModal from "./ConfirmModal";
import { api } from "../../../services/api";
import Swal from "sweetalert2";
import { useNotification } from "../../../hooks/notification";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import PdfShareModal from "../../../components/PdfShareModal";
import { usePermissionStore } from "../../../store/permissionsStore";
interface Transacao {
  id: number;
  date: string;
  valor: number;
  descricao: string;
  tipo: string;
}

interface Recolhedor {
  id: number;
  name: string;
  tax: number;
  balance: number;
  comission: number;
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
  comission: number;
  supplierId: number;
  collectorTax: number;
  supplierTax: number;
  profit: number;
  idOperation: number;
}

export function addLocalTimeToDate(dateStr: string) {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  
  return `${dateStr}T${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function subtractHoursGetTime(dateStr:string, hours:number) {
  const date = new Date(dateStr);
  date.setHours(date.getHours() - hours);
  return date.toISOString().split('T')[1].split('.')[0];
}

function subtractHoursGetDate(dateStr:string, hours:number) {
  const date = new Date(dateStr);
  date.setHours(date.getHours() - hours);
  return date.toISOString().split('T')[0];
}



export function subtractHoursToLocaleBR(dateStr:string) {
  const date = new Date(dateStr);

  return date.toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

const RecolhedoresTab: React.FC = () => {
  const [recolhedores, setRecolhedores] = useState<Recolhedor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [recolhedorEdit, setRecolhedorEdit] = useState<Recolhedor | undefined>(undefined);
  const [selectedRecolhedor, setSelectedRecolhedor] = useState<Recolhedor | null>(null);
  const [valorPagamento, setValorPagamento] = useState<number | null>(null);
  //const [valorPagamento, setValorPagamento] = useState<string>('');
  const [descricaoPagamento, setDescricaoPagamento] = useState("");
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recolhedorToDelete, setRecolhedorToDelete] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [newPaymentId, setNewPaymentId] = useState<string | null>(null);
  const [saldoAcumulado, setSaldoAcumulado] = useState(0);
  const [calculatedBalances, setCalculatedBalances] = useState<Record<number, number>>({});
  const [valorRaw, setValorRaw] = useState(""); // Controla o valor digitado
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [filterApplied, setFilterApplied] = useState(false); //Estado pra saber se o filtro já foi acionado ou não!
  const itensPorPagina = 6;
  const [filterStartDate, setFilterStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  const [filterEndDate, setFilterEndDate] = useState<string>(new Date().toLocaleDateString("en-CA"));
  const [activeFilterStartDate, setActiveFilterStartDate] = useState<string>("");
  const [activeFilterEndDate, setActiveFilterEndDate] = useState<string>("");
  const { setOpenNotification } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {permissions, getPermissions, user} = usePermissionStore();

  const fetchRecolhedores = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Recolhedor[]>("/collectors/list_collectors");
      setRecolhedores(response.data);

      // Calcular saldos iniciais
      const balances: Record<number, number> = {};
      response.data.forEach((r) => {
        balances[r.id] = computeBalance(r, operacoes, payments);
      });
      setCalculatedBalances(balances);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Primeiro carregue as operações (não dependem de outros dados)
      const operacoesResponse = await api.get<Operacao[]>("/operations/list_operations");
      setOperacoes(operacoesResponse.data);

      // 2. Carregue todos os recolhedores
      const recolhedoresResponse = await api.get<Recolhedor[]>("/collectors/list_collectors");
      setRecolhedores(recolhedoresResponse.data);

      // 3. Carregue todos os pagamentos (sem filtro inicial)
      const paymentsResponse = await api.get<Payment[]>("/api/payments");
      setPayments(paymentsResponse.data);

      // 4. Agora calcule os saldos iniciais com todos os dados disponíveis
      const initialBalances: Record<number, number> = {};
      recolhedoresResponse.data.forEach((r) => {
        initialBalances[r.id] = computeBalance(r, operacoesResponse.data, paymentsResponse.data);
      });
      setCalculatedBalances(initialBalances);

      // 5. Calcule o saldo acumulado
      const totalBalance = Object.values(initialBalances).reduce((a, b) => a + b, 0);
      setSaldoAcumulado(totalBalance);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Substitua o useEffect inicial por:
  useEffect(() => {
    fetchAllData();
  }, []);

  // Atualize a função abrirCaixa para lidar com o carregamento específico:
  const abrirCaixa = async (recolhedor: Recolhedor) => {
    setSelectedRecolhedor(recolhedor);
    try {
      // Carrega os dados específicos do recolhedor
      const [recolhedorDetalhes, paymentsFiltrados] = await Promise.all([
        api.get<Recolhedor>(`/collectors/list_collector/${recolhedor.id}`),
        api.get<Payment[]>(`/api/payments?collectorId=${recolhedor.id}`),
      ]);

      // Atualiza os pagamentos mantendo os existentes e adicionando os filtrados
      setPayments((prevPayments) => {
        const updatedPayments = [
          ...prevPayments.filter((p) => p.collectorId !== recolhedor.id),
          ...paymentsFiltrados.data,
        ];

        // Recalcula os saldos com os novos dados
        const updatedBalances: Record<number, number> = {};
        recolhedores.forEach((r) => {
          updatedBalances[r.id] = computeBalance(r, operacoes, updatedPayments);
        });
        setCalculatedBalances(updatedBalances);

        return updatedPayments;
      });

      setSelectedRecolhedor(recolhedorDetalhes.data);
      setActiveFilterStartDate(filterStartDate);
      setActiveFilterEndDate(filterEndDate);
      setFilterApplied(true);
      setPaginaAtual(0);
    } catch (error: any) {
      console.error("Erro ao buscar detalhes do recolhedor:", error.message);
      alert("Erro ao carregar detalhes do recolhedor.");
      setSelectedRecolhedor(null);
    }
  };

  // Clear new payment highlight after 3 seconds
  useEffect(() => {
    if (newPaymentId) {
      const timer = setTimeout(() => {
        setNewPaymentId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [newPaymentId]);

  const salvarRecolhedor = async (name: string, tax: number, balance: number, comission: number) => {
    try {
      if (recolhedorEdit) {
        await api.put(`/collectors/update_collector/${recolhedorEdit.id}`, { name, tax, balance, comission });
        fetchRecolhedores(); // Refetch after successful edit
      } else {
        const response = await api.post<Recolhedor>("/collectors/create_collector", { name, tax, balance, comission });
        setRecolhedores([...recolhedores, response.data]);
      }
      setShowModal(false);
      setRecolhedorEdit(undefined);
    } catch (e: any) {
      alert(`Erro ao salvar recolhedor: ${e.message}`);
    }
  };
  const fecharCaixa = () => {
    setSelectedRecolhedor(null);
    setValorPagamento(null);
    setDescricaoPagamento("");
  };

  const registrarPagamento = async () => {
    if (!selectedRecolhedor) return;
    if (!valorPagamento || !descricaoPagamento.trim()) {
      alert("Preencha todos os campos de pagamento.");
      return;
    }

    setIsProcessingPayment(true);

    try {
      const isHoje = dataPagamento === new Date().toLocaleDateString('en-CA');
      const dataOk = addLocalTimeToDate(dataPagamento);
      const dataFinal = isHoje ? new Date().toISOString() : new Date(`${dataPagamento}T00:00:00`).toISOString();

      const paymentData = {
        collectorId: selectedRecolhedor.id,
        amount: valorPagamento,
        description: descricaoPagamento,
        date: dataOk,
      };

      const response = await api.post("/api/payments", paymentData);
      const newPayment: Payment = response.data;

      // Atualizar a lista de pagamentos
      const updatedPayments = [...payments, newPayment];
      setPayments(updatedPayments);

      // Recalcular o saldo para este recolhedor
      const updatedBalance = computeBalance(selectedRecolhedor, operacoes, updatedPayments);

      // Atualizar o estado de saldos calculados
      setCalculatedBalances((prev) => ({
        ...prev,
        [selectedRecolhedor.id]: updatedBalance,
      }));

      // Atualizar o saldo acumulado
      setSaldoAcumulado(Object.values(calculatedBalances).reduce((a, b) => a + b, 0) + Number(valorPagamento));

      // Resetar o formulário
      setValorPagamento(null);
      setDescricaoPagamento("");
      setDataPagamento(new Date().toLocaleDateString('en-CA'));

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
    } catch (e: any) {
      console.log("error", e);
      alert(`Erro ao registrar pagamento: ${e.message}`);
    } finally {
      setValorRaw("");
      setIsProcessingPayment(false);
      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "Pagamento registrado com sucesso!",
      });
    }
  };

  const confirmarDeleteRecolhedor = (id: number) => {
    setRecolhedorToDelete(id);
    setShowConfirmModal(true);
  };

  const deletarRecolhedor = async () => {
    if (recolhedorToDelete !== null) {
      try {
        await api.delete(`/collectors/delete_collector/${recolhedorToDelete}`);
        setRecolhedores(recolhedores.filter((r) => r.id !== recolhedorToDelete));
        setRecolhedorToDelete(null);
      } catch (e: any) {
        alert(`Erro ao deletar recolhedor: ${e.message}`);
      }
    }
    setShowConfirmModal(false);
  };

  const deletarOperacao = async (id: number) => {
    try {
      await api.delete(`/operations/delete_operation/${id}`);

      // Atualiza as operações
      const updatedOperacoes = operacoes.filter((op) => op.id !== id).filter((op) => op.idOperation !== id);

      setOperacoes(updatedOperacoes);

      // Recalcula todos os saldos
      const updatedBalances: Record<number, number> = {};
      recolhedores.forEach((r) => {
        updatedBalances[r.id] = computeBalance(r, updatedOperacoes, payments);
      });
      setCalculatedBalances(updatedBalances);

      // Atualiza o saldo acumulado
      const totalBalance = Object.values(updatedBalances).reduce((a, b) => a + b, 0);
      setSaldoAcumulado(totalBalance);

      // Swal.fire({
      //   icon: "success",
      //   title: "Sucesso!",
      //   text: "Operação deletada com sucesso!",
      //   confirmButtonText: "Ok",
      //   buttonsStyling: false,
      //   customClass: {
      //     confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
      //   },
      // });
      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "Operação deletada com sucesso!",
      });
    } catch (e: any) {
      alert(`Erro ao deletar operação: ${e.message}`);
    }
  };

  const deletarPagamento = async (id: number) => {
    try {
      await api.delete(`/api/delete_payment/${id}`);

      // Atualiza os pagamentos
      const updatedPayments = payments.filter((p) => p.id !== id);
      setPayments(updatedPayments);

      // Recalcula todos os saldos
      const updatedBalances: Record<number, number> = {};
      recolhedores.forEach((r) => {
        updatedBalances[r.id] = computeBalance(r, operacoes, updatedPayments);
      });
      setCalculatedBalances(updatedBalances);

      // Atualiza o saldo acumulado
      const totalBalance = Object.values(updatedBalances).reduce((a, b) => a + b, 0);
      setSaldoAcumulado(totalBalance);

      // alert("Pagamento deletado com sucesso.");
    } catch (e: any) {
      alert(`Erro ao deletar pagamento: ${e.message}`);
    }
  };

  const todasTransacoes = [
    ...(selectedRecolhedor!?.transacoes || []),
    ...operacoes
      .filter((op) => op.collectorId === selectedRecolhedor!?.id)
      .map((op) => ({
        id: `op-${op.id}`,
        date: op.date || new Date().toISOString(),
        valor:
          -op.comission > 0 || op.comission !== null
            ? -op.comission
            : -(op.value || 0) / (op.collectorTax || selectedRecolhedor!?.tax || 1),
        descricao:
          op.comission > 0 || op.comission !== null
            ? `COMISSÃO #${op.idOperation} · ${op.city?.toUpperCase() || ""}`
            : `OPERAÇÃO #${op.id} · ${op.city?.toUpperCase() || ""}`,
        tipo: "debito",
      })),
    ...payments
      .filter((p) => p.collectorId === selectedRecolhedor!?.id)
      .map((p) => ({
        id: `pay-${p.id}`,
        date: p.date,
        valor: p.amount,
        descricao: p.description,
        tipo: "pagamento",
      })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const filtrarTransacoesPorData = (transacoes: any[]) => {
    if (!activeFilterStartDate && !activeFilterEndDate) return transacoes;


       const start =  new Date(`${activeFilterStartDate}T00:00:00`) 
    const end =  new Date(`${activeFilterEndDate}T23:59:59`) 
    // end.setDate(end.getDate() + 1); // Inclui o dia final

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
  const transacoesFiltradas = filtrarTransacoesPorData(todasTransacoes);

  const transacoesPaginadas = transacoesFiltradas.slice(
    paginaAtual * itensPorPagina,
    (paginaAtual + 1) * itensPorPagina
  );

  function computeBalance(r: Recolhedor, ops: Operacao[], payments: Payment[]) {
    const collectorOperations = ops
      .filter((o) => o.collectorId === r.id)
      .map((o) => ({
        date: o.date,
        value: !o.idOperation ? -(o.value / (o.collectorTax || r.tax || 1)) : -o.value,
        type: "operation",
      }));

    const collectorPayments = payments
      .filter((p) => p.collectorId === r.id)
      .map((p) => ({
        date: p.date,
        value: p.amount,
        type: "payment",
      }));

    // Combine and sort by date
    const allTransactions = [...collectorOperations, ...collectorPayments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate running balance
    let balance = 0;
    for (const transaction of allTransactions) {
      balance += transaction.value;
    }

    const arredondado =
      Math.abs(balance) < 0.01 ? 0 : balance < 0 ? Math.floor(balance * 100) / 100 : Math.ceil(balance * 100) / 100;

    return arredondado;
  }
  useEffect(() => {
    let totalBalance = 0;
    recolhedores.forEach((recolhedor) => {
      totalBalance += computeBalance(recolhedor, operacoes, payments);
    });
    setSaldoAcumulado(totalBalance);
  }, [recolhedores, operacoes, payments]);

  const getPDFRecolhedorToSendEmail = () => {
    if (!selectedRecolhedor) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Título
    doc.setFontSize(16);
    doc.setTextColor(40, 100, 40);
    doc.text(`Extrato de Transações - ${selectedRecolhedor.name}`, 105, 15, { align: "center" });

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
    const periodoFiltro = filterApplied
      ? `${activeFilterStartDate ? new Date(activeFilterStartDate).toLocaleDateString("pt-BR") : "início"} a ${
          activeFilterEndDate ? new Date(activeFilterEndDate).toLocaleDateString("pt-BR") : "fim"
        }`
      : "Período completo";

    doc.text(`Data de emissão: ${dataEmissao}`, 15, 25);
    doc.text(`Período: ${periodoFiltro}`, 15, 30);
    doc.text(`Saldo atual: ${formatCurrency(calculatedBalances[selectedRecolhedor.id] || 0, 2, "USD")}`, 15, 35);

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
    // doc.text(`Saldo do período: ${formatCurrency(saldoPeriodo, 2, "USD")}`, 130, finalY);

    // // Saldo total
    // doc.text(`Saldo atual: ${formatCurrency(calculatedBalances[selectedRecolhedor.id] || 0, 2, "USD")}`, 15, finalY + 10);
    doc.text(`Saldo período selecionado: ${formatCurrency(saldoPeriodo, 2, "USD")}`, 15, finalY);

    // Salvar PDF
    // doc.save(`extrato_${selectedRecolhedor.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);


    const pdfBlob =   doc.output("blob")

    const hoje = new Date();
const dia = String(hoje.getDate()).padStart(2, "0");
const mes = String(hoje.getMonth() + 1).padStart(2, "0"); // meses começam do zero
const ano = hoje.getFullYear();
      // Converter blob para File
    const fileName = `extrato_${selectedRecolhedor.name.replace(/\s+/g, "_")}_${dia}-${mes}-${ano}.pdf`;
    return new File([pdfBlob], fileName, { type: "application/pdf" });

  };
  const generateRecolhedorPDF = () => {
    if (!selectedRecolhedor) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Título
    doc.setFontSize(16);
    doc.setTextColor(40, 100, 40);
    doc.text(`Extrato de Transações - ${selectedRecolhedor.name}`, 105, 15, { align: "center" });

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
    const periodoFiltro = filterApplied
      ? `${activeFilterStartDate ? new Date(activeFilterStartDate).toLocaleDateString("pt-BR") : "início"} a ${
          activeFilterEndDate ? new Date(activeFilterEndDate).toLocaleDateString("pt-BR") : "fim"
        }`
      : "Período completo";

    doc.text(`Data de emissão: ${dataEmissao}`, 15, 25);
    doc.text(`Período: ${periodoFiltro}`, 15, 30);
    doc.text(`Saldo atual: ${formatCurrency(calculatedBalances[selectedRecolhedor.id] || 0, 2, "USD")}`, 15, 35);

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
    // doc.text(`Saldo do período: ${formatCurrency(saldoPeriodo, 2, "USD")}`, 130, finalY);

    // // Saldo total
    // doc.text(`Saldo atual: ${formatCurrency(calculatedBalances[selectedRecolhedor.id] || 0, 2, "USD")}`, 15, finalY + 10);
    doc.text(`Saldo período selecionado: ${formatCurrency(saldoPeriodo, 2, "USD")}`, 15, finalY);

          const hoje = new Date();
const dia = String(hoje.getDate()).padStart(2, "0");
const mes = String(hoje.getMonth() + 1).padStart(2, "0"); // meses começam do zero
const ano = hoje.getFullYear();
    // Salvar PDF
    doc.save(`extrato_${selectedRecolhedor.name.replace(/\s+/g, "_")}_${dia}-${mes}-${ano}.pdf`);
  };
  const getRecolhedorPDFDataJSON = () => {
    if (!selectedRecolhedor) return null;

    const dataEmissao = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const periodoFiltro = filterApplied
        ? `${activeFilterStartDate ? new Date(activeFilterStartDate).toLocaleDateString("pt-BR") : "início"} a ${
            activeFilterEndDate ? new Date(activeFilterEndDate).toLocaleDateString("pt-BR") : "fim"
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
        title: `Extrato de Transações - ${selectedRecolhedor.name}`,
        issueDate: dataEmissao,
        filterPeriod: periodoFiltro,
        currentBalance: formatCurrency(calculatedBalances[selectedRecolhedor.id] || 0, 2, "USD"),
        transactions: tableData,
        summary: {
            totalEntries: formatCurrency(totalEntradas, 2, "USD"),
            totalExits: formatCurrency(totalSaidas, 2, "USD"),
            periodBalance: formatCurrency(saldoPeriodo, 2, "USD"),
        },
        reportName: selectedRecolhedor.name, // Nome do recolhedor para o modal
    };
};
  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-64">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4"
          ></motion.div>
          <p className="text-lg text-blue-700 font-medium">Carregando recolhedores...</p>
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
        Erro ao carregar recolhedores: {error}
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
            <h2 className="text-xl font-semibold text-blue-700">
              <i className="fas fa-users mr-2"></i> RECOLHEDORES
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
              setRecolhedorEdit(undefined);
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
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
                {user?.role !== "MASTER" && recolhedores.filter((recolhedor)=> permissions?.GERENCIAR_TOKENS.RECOLHEDORES_PERMITIDOS.includes(recolhedor.name)).map((r) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="py-2 px-4 border text-center">{r.name.toUpperCase()}</td>
                    <td
                      className={`py-2 px-4 border text-center font-bold ${
                        Math.abs(calculatedBalances[r.id]) < 0.009
                          ? "text-gray-800"
                          : calculatedBalances[r.id] < 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {Math.abs(calculatedBalances[r.id]) < 0.009
                        ? formatCurrency(0)
                        : formatCurrency(calculatedBalances[r.id])}
                    </td>
                    <td className="py-2 px-4 border space-x-2 text-center">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => abrirCaixa(r)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                      >
                        Caixa
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setRecolhedorEdit(r);
                          setShowModal(true);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                      >
                        Editar
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => confirmarDeleteRecolhedor(r.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      >
                        <i className="fas fa-trash"></i>
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
                {user?.role === "MASTER" && recolhedores.map((r) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="py-2 px-4 border text-center">{r.name.toUpperCase()}</td>
                    <td
                      className={`py-2 px-4 border text-center font-bold ${
                        Math.abs(calculatedBalances[r.id]) < 0.009
                          ? "text-gray-800"
                          : calculatedBalances[r.id] < 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {Math.abs(calculatedBalances[r.id]) < 0.009
                        ? formatCurrency(0)
                        : formatCurrency(calculatedBalances[r.id])}
                    </td>
                    <td className="py-2 px-4 border space-x-2 text-center">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => abrirCaixa(r)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                      >
                        Caixa
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setRecolhedorEdit(r);
                          setShowModal(true);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                      >
                        Editar
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => confirmarDeleteRecolhedor(r.id)}
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
        {selectedRecolhedor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="bg-white p-6 rounded-lg shadow mb-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-blue-700">
                <i className="fas fa-user mr-2"></i> CAIXA DE {selectedRecolhedor.name}
              </h2>
              <div>
                <span className="mr-3">
                  SALDO:{" "}
                  <span
                    className={`font-bold ${
                      calculatedBalances[selectedRecolhedor.id] < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(calculatedBalances[selectedRecolhedor.id] || 0)}
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
                  className={`w-40 h-6 rounded-md text-sm font-medium flex items-center justify-center  
                    ${
                      !filterApplied
                        ? " bg-gray-200 text-gray-500 cursor-not-allowed"
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
                        setValorPagamento(isNaN(numericValue) ? null : numericValue);
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
                            setValorPagamento(numericValue);
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

              {/* Histórico */}
              <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                <div className="mb-2 border-b w-full flex flex-row items-center justify-between max-w-[100%]">
                  <div className="w-full flex justify-between items-start mb-4">
                    {/* ─── LADO ESQUERDO: LABEL + TÍTULO ───────────────────────────────────────────────────────── */}
                    <div className="flex flex-col whitespace-nowrap">
                      {/* Label “(ÚLTIMOS 6)” em texto menor */}
                      <span className="text-xs font-medium text-gray-700 mb-1">
                        {activeFilterStartDate || activeFilterEndDate
                          ? `(Filtrado: ${activeFilterStartDate ? formatDateIn(activeFilterStartDate) : "início"} a ${
                              activeFilterEndDate ? formatDateIn(activeFilterEndDate) : "fim"
                            })`
                          : "(ÚLTIMOS 6)"}
                      </span>
                      {/* Título principal */}
                      <h3 className="font-medium">HISTÓRICO DE TRANSAÇÕES</h3>
                    </div>

                    {/* ─── LADO DIREITO: FILTROS DE DATA + BOTÕES ─────────────────────────────────────────────── */}
                    <div className="flex items-end gap-2">
                      {/* Input Data Inicial */}
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

                      {/* Input Data Final */}
                      <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-700 mb-1">Data Final</label>
                        <input
                          type="date"
                          value={filterEndDate}
                          onChange={(e) => setFilterEndDate(e.target.value)}
                          className="w-24 h-6 border border-gray-300 rounded-md text-sm text-center leading-6 py-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>

                      {/* Botão Filtrar */}
                      <button
                        onClick={() => {
                          setActiveFilterStartDate(filterStartDate);
                          setActiveFilterEndDate(filterEndDate);
                          setFilterApplied(true);
                          setPaginaAtual(0);
                        }}
                        className="bg-white text-blue-600 border border-blue-600 hover:bg-blue-600 hover:text-white rounded-md text-sm font-medium h-6 px-4 mr-2 flex items-center justify-center transition-colors"
                      >
                        Filtrar
                      </button>
                      {/* Botão Limpar */}
                      <button
                        onClick={() => {
                          setFilterStartDate("");
                          setFilterEndDate("");
                          setActiveFilterStartDate("");
                          setFilterApplied(false);
                          setActiveFilterEndDate("");
                          setPaginaAtual(0);
                        }}
                        className="bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md text-sm font-medium h-6 px-4 flex items-center justify-center transition-colors"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                </div>

                {/* <h3 className="font-medium mb-2 border-b pb-2">HISTÓRICO DE TRANSAÇÕES (ÚLTIMOS 6)</h3> */}

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
                            animate={{
                              opacity: 1,
                              y: 0,
                              backgroundColor: newPaymentId === t.id ? ["#f0fdf4", "#dcfce7", "#f0fdf4"] : undefined,
                            }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{
                              duration: 0.3,
                              backgroundColor: {
                                duration: 1.5,
                                repeat: newPaymentId === t.id ? 2 : 0,
                                repeatType: "reverse",
                              },
                            }}
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
                                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded justify-self-end"
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
                        {transacoesPaginadas.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center py-4 text-gray-500">
                              {filterStartDate || filterEndDate
                                ? "Nenhuma transação encontrada no período"
                                : "Nenhuma transação registrada"}
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
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
      <ModalRecolhedor
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={salvarRecolhedor}
        recolhedorEdit={recolhedorEdit}
      />
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja deletar este recolhedor?"
        onConfirm={deletarRecolhedor}
        onClose={() => setShowConfirmModal(false)}
      />

      {isModalOpen && <PdfShareModal onClose={() => setIsModalOpen(false)} getFileToSendPDF={getPDFRecolhedorToSendEmail} generatePDF={generateRecolhedorPDF}      getPDFDataJSON={getRecolhedorPDFDataJSON as () => any | null}/>}
    </motion.div>
  );
};

export default RecolhedoresTab;
