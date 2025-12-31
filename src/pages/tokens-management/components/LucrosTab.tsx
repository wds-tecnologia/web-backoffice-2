import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "./format";
import { api } from "../../../services/api";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import { useNotification } from "../../../hooks/notification";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import PdfShareModal from "../../../components/PdfShareModal";
import { usePermissionStore } from "../../../store/permissionsStore";
interface Operacao {
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

interface Recolhedor {
  id: number;
  name: string;
}

interface Fornecedor {
  id: number;
  name: string;
}

const LucrosTab: React.FC = () => {
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [recolhedores, setRecolhedores] = useState<Recolhedor[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [itensPorPagina] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { permissions, getPermissions, user } = usePermissionStore();

  // Estados para filtro de data
  const [filterStartDate, setFilterStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  const [filterEndDate, setFilterEndDate] = useState<string>(new Date().toLocaleDateString("en-CA"));
  const [filteredOperations, setFilteredOperations] = useState<Operacao[]>([]);
  const [filterApplied, setFilterApplied] = useState(false);
  const [lucroPeriodoFiltro, setLucroPeriodoFiltro] = useState(0);
  const [comissaoPeriodoFiltro, setComissaoPeriodoFiltro] = useState(0);
  const { setOpenNotification } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchOperacoes = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/operations/list_operations`, {
          params: {
            _page: paginaAtual,
            _limit: itensPorPagina,
          },
        });

        

        const [fornecedoresResponse, recolhedoresResponse] = await Promise.all([
            api.get<Fornecedor[]>("/suppliers/list_suppliers"),
            api.get<Recolhedor[]>("/collectors/list_collectors")
        ]);

        const fornedoresFiltrados = user?.role==="MASTER"? fornecedoresResponse.data:fornecedoresResponse.data.filter((f) => permissions?.GERENCIAR_TOKENS.FORNECEDORES_PERMITIDOS.includes(f.name));
        const recolhedoresFiltrados = user?.role==="MASTER"? fornecedoresResponse.data:recolhedoresResponse.data.filter((r) => permissions?.GERENCIAR_TOKENS.RECOLHEDORES_PERMITIDOS.includes(r.name));

        const responseApi = (response.data as Operacao[]).filter((op)=> recolhedoresFiltrados.some((r) => r.id === op.collectorId) && fornedoresFiltrados.some((f) => f.id === op.supplierId));
        
        setOperacoes(responseApi);

        if (!filterStartDate && !filterEndDate) {
          setFilteredOperations(responseApi);
          setFilterApplied(false);
        }

      const startDate = filterStartDate
        ? new Date(`${filterStartDate}T00:00:00`)
        : null;

      const endDate = filterEndDate
        ? new Date(`${filterEndDate}T23:59:59`)
        : null

        // if (endDate) {
        //   endDate.setDate(endDate.getDate() + 1); // Inclui o dia final
        // }

        const filtered = responseApi.filter((op: any) => {
          // Ignora operações com idOperation
          if (op.idOperation) return false;

          const opDate = new Date(op.date);
          const isWithinRange =
            (!startDate || opDate >= startDate) &&
            (!endDate || opDate <= endDate);

          return isWithinRange;
        });

        setFilteredOperations(filtered);
        setFilterApplied(true);
        const lucroTotal = filtered.reduce((acc:any, op:any) => acc + (op.profit || 0), 0);
        const comissaoTotal = filtered.reduce((acc:any, op:any) => acc + (op.comission || 0), 0);

        setLucroPeriodoFiltro(lucroTotal);
        setComissaoPeriodoFiltro(comissaoTotal);

        // Inicialmente não aplicamos filtro
        // setFilteredOperations(responseApi);


        const totalCount = response.headers["x-total-count"];
        setTotalPaginas(totalCount ? Math.ceil(parseInt(totalCount, 10) / itensPorPagina) : 1);

        const collectorIds = Array.from(new Set<number>(responseApi.map((op: any) => op.collectorId)));
        const supplierIds = Array.from(new Set<number>(responseApi.map((op: any) => op.supplierId)));

        const fetchCollectors = Promise.all(
          collectorIds.map(async (id) => {
            try {
              const res = await api.get<Recolhedor>(`/collectors/list_collector/${id}`);
              return res.data;
            } catch (error) {
              console.error(`Erro ao buscar recolhedor com ID ${id}:`, error);
              return null;
            }
          })
        );

        const fetchSuppliers = Promise.all(
          supplierIds.map(async (id) => {
            try {
              const res = await api.get<Fornecedor>(`/suppliers/list_supplier/${id}`);
              return res.data;
            } catch (error) {
              console.error(`Erro ao buscar fornecedor com ID ${id}:`, error);
              return null;
            }
          })
        );

        const [collectorsData, suppliersData] = await Promise.all([fetchCollectors, fetchSuppliers]);

        setRecolhedores(collectorsData.filter((r): r is Recolhedor => r !== null));
        setFornecedores(suppliersData.filter((f): f is Fornecedor => f !== null));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOperacoes();
    
  }, [paginaAtual, itensPorPagina]);

  // Função para aplicar o filtro quando o botão for clicado
  const applyDateFilter = () => {
    if (!filterStartDate && !filterEndDate) {
      setFilteredOperations(operacoes);
      setFilterApplied(false);
      return;
    }

      const startDate = filterStartDate
        ? new Date(`${filterStartDate}T00:00:00`)
        : null;

      const endDate = filterEndDate
        ? new Date(`${filterEndDate}T23:59:59`)
        : null

        const filtered = operacoes.filter((op: any) => {
          // Ignora operações com idOperation
          if (op.idOperation) return false;

          const opDate = new Date(op.date);
          const isWithinRange =
            (!startDate || opDate >= startDate) &&
            (!endDate || opDate <= endDate);

          return isWithinRange;
        });

    setFilteredOperations(filtered);
    setFilterApplied(true);
    const lucroTotal = filtered.reduce((acc, op) => acc + (op.profit || 0), 0);
    const comissaoTotal = filtered.reduce((acc, op) => acc + (op.comission || 0), 0);

    setLucroPeriodoFiltro(lucroTotal);
    setComissaoPeriodoFiltro(comissaoTotal);
  };

  // Função para limpar o filtro
  const clearFilter = () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilteredOperations(operacoes);
    setFilterApplied(false);
  };

  const operacoesValidas = filteredOperations.filter(
    (op) =>
      (op.comission === undefined || op.comission === null || op.comission === 0) && !isNaN(new Date(op.date).getTime())
  );

  const lucroMesAtual = operacoesValidas
    // .filter((op) => new Date(op.date).getMonth() === new Date().getMonth())
    .reduce((acc, op) => acc + (op.profit || 0), 0);

  const lucroMesAnterior = operacoesValidas
    .filter((op) => {
      const data = new Date(op.date);
      const mesAtual = new Date().getMonth();
      return data.getMonth() === (mesAtual === 0 ? 11 : mesAtual - 1);
    })
    .reduce((acc, op) => acc + (op.profit || 0), 0);

  const totalAcumulado = operacoesValidas.reduce((acc, op) => acc + (op.profit || 0), 0);

  const getRecolhedorNome = (id: number) => recolhedores.find((r) => r?.id === id)?.name || "Desconhecido";
  const getFornecedorNome = (id: number) => fornecedores.find((f) => f?.id === id)?.name || "Desconhecido";

  const deletarOperacao = async (id: number) => {
    try {
      await api.delete(`/operations/delete_operation/${id}`);
      setOperacoes((prev) => prev.filter((op) => op.id !== id));
      setFilteredOperations((prev) => prev.filter((op) => op.id !== id));
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
        type: "success",
        title: "Sucesso!",
        notification: "Operação registrada com sucesso!",
      });
    } catch (e: any) {
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
    const pdfGeneratePDFLucros = () => {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Cabeçalho principal
      doc.setFontSize(16);
      doc.setTextColor(40, 100, 40);
      doc.text("Relatório de Lucros", 105, 15, { align: "center" });

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
        ? `${filterStartDate ? new Date(filterStartDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "início"} a ${
            filterEndDate ? new Date(filterEndDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "fim"
          }`
        : "Período completo";

      // Adicionar informações ao PDF
      doc.text(`Data de emissão: ${dataEmissao}`, 15, 22);
      doc.text(`Período: ${periodoFiltro}`, 15, 27);

      // Preparar dados da tabela
      const tableData = operacoesValidas
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((op) => [
          formatDate(op.date),
          op.city || "Desconhecido",
          getRecolhedorNome(op.collectorId),
          getFornecedorNome(op.supplierId),
          formatCurrency(op.value || 0),
          formatCurrency(op.profit || 0),
        ]);

      // Gerar tabela
      autoTable(doc, {
        head: [["Data", "Operação", "Recolhedor", "Fornecedor", "Valor Operação", "Lucro"]],
        body: tableData,
        startY: 32,
        styles: {
          fontSize: 9,
          cellPadding: 2,
          halign: "center",
        },
        headStyles: {
          fillColor: [229, 231, 235],
          textColor: 0,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [240, 249, 255],
        },
        didDrawPage: (data) => {
          doc.setFontSize(10);
          doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 15, doc.internal.pageSize.height - 10);
        },
      });

      // Adicionar totais
      const finalY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");

      if (filterApplied) {
        doc.text(`Lucro Por Período Selecionado: ${formatCurrency(lucroPeriodoFiltro)}`, 15, finalY);
        // doc.text(
        //   `Comissão Total: ${formatCurrency(comissaoPeriodoFiltro)}`,
        //   100,
        //   finalY
        // );
      } else {
        doc.text(`Lucro Mês Atual: ${formatCurrency(lucroMesAtual)}`, 15, finalY);
        doc.text(`Lucro Mês Anterior: ${formatCurrency(lucroMesAnterior)}`, 70, finalY);
        doc.text(`Total Acumulado: ${formatCurrency(totalAcumulado)}`, 150, finalY);
      }

      // Salvar PDF
      // doc.save(`relatorio_lucros_${new Date().toLocaleDateString('en-CA')}.pdf`);

          const pdfBlob =   doc.output("blob")
          const hoje = new Date();
          const dia = String(hoje.getDate()).padStart(2, "0");
          const mes = String(hoje.getMonth() + 1).padStart(2, "0"); // meses começam do zero
          const ano = hoje.getFullYear();
      // Converter blob para File
      const fileName = `relatorio_lucros_${dia}-${mes}-${ano}.pdf`;
      return new File([pdfBlob], fileName, { type: "application/pdf" });
    };
    const generatePDF = () => {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Cabeçalho principal
      doc.setFontSize(16);
      doc.setTextColor(40, 100, 40);
      doc.text("Relatório de Lucros", 105, 15, { align: "center" });

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
        ? `${filterStartDate ? new Date(filterStartDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "início"} a ${
            filterEndDate ? new Date(filterEndDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "fim"
          }`
        : "Período completo";

      // Adicionar informações ao PDF
      doc.text(`Data de emissão: ${dataEmissao}`, 15, 22);
      doc.text(`Período: ${periodoFiltro}`, 15, 27);

      // Preparar dados da tabela
      const tableData = operacoesValidas
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((op) => [
          formatDate(op.date),
          op.city || "Desconhecido",
          getRecolhedorNome(op.collectorId),
          getFornecedorNome(op.supplierId),
          formatCurrency(op.value || 0),
          formatCurrency(op.profit || 0),
        ]);

      // Gerar tabela
      autoTable(doc, {
        head: [["Data", "Operação", "Recolhedor", "Fornecedor", "Valor Operação", "Lucro"]],
        body: tableData,
        startY: 32,
        styles: {
          fontSize: 9,
          cellPadding: 2,
          halign: "center",
        },
        headStyles: {
          fillColor: [229, 231, 235],
          textColor: 0,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [240, 249, 255],
        },
        didDrawPage: (data) => {
          doc.setFontSize(10);
          doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 15, doc.internal.pageSize.height - 10);
        },
      });

      // Adicionar totais
      const finalY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");

      if (filterApplied) {
        doc.text(`Lucro Por Período Selecionado: ${formatCurrency(lucroPeriodoFiltro)}`, 15, finalY);
        // doc.text(
        //   `Comissão Total: ${formatCurrency(comissaoPeriodoFiltro)}`,
        //   100,
        //   finalY
        // );
      } else {
        doc.text(`Lucro Mês Atual: ${formatCurrency(lucroMesAtual)}`, 15, finalY);
        doc.text(`Lucro Mês Anterior: ${formatCurrency(lucroMesAnterior)}`, 70, finalY);
        doc.text(`Total Acumulado: ${formatCurrency(totalAcumulado)}`, 150, finalY);
      }
          const hoje = new Date();
          const dia = String(hoje.getDate()).padStart(2, "0");
          const mes = String(hoje.getMonth() + 1).padStart(2, "0"); // meses começam do zero
          const ano = hoje.getFullYear();
      // Salvar PDF
      doc.save(`relatorio_lucros_${dia}-${mes}-${ano}.pdf`);
    };
    const getProfitPDFDataJSON = () => {
    const dataEmissao = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const periodoFiltro = filterApplied
      ? `${filterStartDate ? new Date(filterStartDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "início"} a ${
            filterEndDate ? new Date(filterEndDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "fim"
          }`
      : "Período completo";

    const operationsData = operacoesValidas
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((op: any) => ({
        date: formatDate(op.date),
        city: op.city || "Desconhecido",
        collectorName: getRecolhedorNome(op.collectorId),
        supplierName: getFornecedorNome(op.supplierId),
        operationValue: formatCurrency(op.value || 0),
        profit: formatCurrency(op.profit || 0),
      }));

    const summaryData = filterApplied
        ? { filteredPeriodProfit: formatCurrency(lucroPeriodoFiltro) }
        : {
            currentMonthProfit: formatCurrency(lucroMesAtual),
            previousMonthProfit: formatCurrency(lucroMesAnterior),
            totalAccumulated: formatCurrency(totalAcumulado),
        };

    return {
        type: "profit", // O DISCRIMINADOR!
        title: "Relatório de Lucros",
        issueDate: dataEmissao,
        filterPeriod: periodoFiltro,
        operations: operationsData,
        summary: summaryData,
        reportName: "relatorio_lucros",
    };
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

  if (error) {
    return <div>Erro ao carregar dados: {error}</div>;
  }

  return (
    <div className="fade-in">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="w-full flex flex-row items-center justify-between max-w-[100%]">
          <div className="w-full flex justify-between items-start border-b pb-2 mb-4">
            <div className="flex flex-col whitespace-nowrap">
              <h2 className="text-xl font-semibold mt-4 text-green-700">
                <i className="fas fa-chart-line mr-2"></i> HISTÓRICO DE LUCROS
              </h2>
              <span className="text-xs font-medium text-gray-700 mb-1">
                {filterApplied
                  ? `(Filtrado: ${
                      filterStartDate
                        ? new Date(filterStartDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                        : "início"
                    } a ${
                      filterEndDate ? new Date(filterEndDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "fim"
                    })`
                  : ""}
              </span>
            </div>

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
                onClick={() => setIsModalOpen(true)}
                disabled={!filterApplied}
                className={`w-40 h-6 rounded-md text-sm font-medium flex items-center justify-center ${
                  !filterApplied
                    ? "cursor-not-allowed bg-gray-200 text-gray-500 "
                    : "bg-white text-blue-600 border border-blue-600 hover:bg-blue-600 hover:text-white rounded-md text-sm font-medium h-6 px-4 mr-2 flex items-center justify-center transition-colors"
                }`}
              >
                Exportar extrato PDF
              </button>
              <button
                onClick={clearFilter}
                className="bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md text-sm font-medium h-6 px-4 flex items-center justify-center transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>

        {filterApplied ? (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">LUCRO POR PERIODO SELECIONADO</h3>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(lucroPeriodoFiltro)}</p>
            </div>
            {/* <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">COMISSÃO RECEBIDA</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(comissaoPeriodoFiltro)}</p>
            </div> */}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">LUCRO TOTAL</h3>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(lucroMesAtual)}</p>
            </div>
            {/* <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">LUCRO MÊS ANTERIOR</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(lucroMesAnterior)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">TOTAL ACUMULADO</h3>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalAcumulado)}</p>
            </div> */}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-200">
                <th className="py-2 px-4 border">DATA</th>
                <th className="py-2 px-4 border">OPERAÇÃO</th>
                <th className="py-2 px-4 border">RECOLHEDOR</th>
                <th className="py-2 px-4 border">FORNECEDOR</th>
                <th className="py-2 px-4 border">VALOR OPERAÇÃO</th>
                <th className="py-2 px-4 border">LUCRO</th>
              </tr>
            </thead>
            <tbody>
              {operacoesValidas.length > 0 ? (
                operacoesValidas
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((op) => {
                    if (!op.date || isNaN(new Date(op.date).getTime())) return null;
                    const recolhedorNome = getRecolhedorNome(op.collectorId);
                    const fornecedorNome = getFornecedorNome(op.supplierId);

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
                        <td className="py-2 px-4 border text-center">{formatCurrency(op.profit || 0)}</td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-500">
                    {filterApplied ? "Nenhuma operação encontrada no período" : "Nenhuma operação registrada"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Página {paginaAtual} de {totalPaginas}
          </div>
          <div className="flex space-x-2">
            <button
              disabled={paginaAtual === 1}
              onClick={() => setPaginaAtual((prev) => prev - 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              ANTERIOR
            </button>
            <button
              disabled={paginaAtual === totalPaginas}
              onClick={() => setPaginaAtual((prev) => prev + 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              PRÓXIMA
            </button>
          </div>
        </div>
      </div>
      {isModalOpen && <PdfShareModal onClose={() => setIsModalOpen(false)} getFileToSendPDF={pdfGeneratePDFLucros} generatePDF={generatePDF} getPDFDataJSON={getProfitPDFDataJSON as () => any | null} />}
    </div>
  );
};

export default LucrosTab;
