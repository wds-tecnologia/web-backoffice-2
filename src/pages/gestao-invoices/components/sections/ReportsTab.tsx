import { useEffect, useState } from "react";
import { ChartBar, Eye } from "lucide-react";
import { formatCurrency } from "../../../cambiobackoffice/formatCurrencyUtil";
import { InvoiceData, InvoiceHistory } from "./InvoiceHistory";
import { api } from "../../../../services/api";
import { InvoiceHistoryReport } from "./InvoiceHistoryReport";

export function ReportsTab() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isSaving2, setIsSaving2] = useState(false);
  const [loading, setLoading] = useState(true);

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoiceResponse, suppliersget] = await Promise.all([
        api.get("/invoice/get"),
        api.get("/invoice/supplier"),
      ]);
      setSuppliers(suppliersget.data);
      setInvoices(invoiceResponse.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  // Calcular data de 2 meses atrás
  const getTwoMonthsAgo = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 2);
    return date.toISOString().split("T")[0];
  };

  const [filters, setFilters] = useState({
    startDate: getTwoMonthsAgo(),
    endDate: new Date().toLocaleDateString("en-CA"),
    status: "all",
    supplier: "all",
  });

  const filteredInvoices = invoices.filter((invoice) => {

          const dataTransacao = new Date(invoice.date);

    // Ajusta para o horário local sem afetar a data
    const localDataTransacao = new Date(
      dataTransacao.getFullYear(),
      dataTransacao.getMonth(),
      dataTransacao.getDate()
    );


    // Filtrar por data
    if (filters.startDate && new Date(invoice.date) < new Date(filters.startDate)) {
      return false;
    }
    if (new Date(`${filters.endDate}T23:59:59`) && new Date(invoice.date) > new Date(`${filters.endDate}T23:59:59`)) {
      return false;
    }
    // Filtrar por fornecedor
    if (filters.supplier !== "all" && invoice.supplierId !== filters.supplier) {
      return false;
    }

    // Filtrar por status
    if (filters.status !== "all") {
      if (filters.status === "pending") {
        return !invoice.completed && !invoice.paid;
      }
      if (filters.status === "paid") {
        return invoice.paid && !invoice.completed;
      }
      if (filters.status === "completed") {
        return invoice.completed && invoice.paid;
      }
    }
    return true;
  });

  const pendingCount = invoices.filter((inv) => !inv.completed && !inv.paid).length;
  const paidCount = invoices.filter((inv) => inv.paid && !inv.completed).length;
  const completedCount = invoices.filter((inv) => inv.completed && inv.paid).length;
  const totalInvoices = invoices.length;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-6 text-blue-700 border-b pb-2">
        <ChartBar className="mr-2 inline" size={18} />
        Relatórios
      </h2>

      {/* Filtros */}
      <div className="bg-gray-50 p-6 rounded-lg border mb-8">
        <h3 className="text-lg font-medium mb-4 text-blue-700 border-b pb-2">Filtrar Relatório</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="paid">Pagas</option>
              <option value="completed">Concluídas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
            <select
              value={filters.supplier}
              onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          {/* <button
            onClick={() => setFilters({ ...filters })}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Gerar Relatório
          </button> */}
        </div>
      </div>

      {/* Dashboard de Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <button
          onClick={() => setFilters({ ...filters, status: "pending" })}
          className="bg-white p-6 rounded-lg border text-center"
        >
          <h3 className="text-lg font-medium mb-2 text-blue-700">Pendentes</h3>
          <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-sm text-gray-600">Invoices aguardando pagamento</p>
        </button>
        <button
          onClick={() => setFilters({ ...filters, status: "paid" })}
          className="bg-white p-6 rounded-lg border text-center"
        >
          <h3 className="text-lg font-medium mb-2 text-blue-700">Pagas</h3>
          <p className="text-3xl font-bold text-green-600">{paidCount}</p>
          <p className="text-sm text-gray-600">Invoices pagas</p>
        </button>
        <button
          onClick={() => setFilters({ ...filters, status: "completed" })}
          className="bg-white p-6 rounded-lg border text-center"
        >
          <h3 className="text-lg font-medium mb-2 text-blue-700">Concluídas</h3>
          <p className="text-3xl font-bold text-blue-600">{completedCount}</p>
          <p className="text-sm text-gray-600">Invoices finalizadas</p>
        </button>
        <button
          onClick={() => setFilters({ ...filters, status: "all" })}
          className="bg-white p-6 rounded-lg border text-center"
        >
          <h3 className="text-lg font-medium mb-2 text-indigo-700">Total</h3>
          <p className="text-3xl font-bold text-indigo-600">{totalInvoices}</p>
          <p className="text-sm text-gray-600">Total de Invoices</p>
        </button>
      </div>

      {/* Tabela de Relatórios */}
      {/* <InvoiceHistoryReport invoiceHistory={filteredInvoices} setInvoiceHistory={setInvoices} /> */}
      <InvoiceHistoryReport
        invoiceHistory={filteredInvoices as unknown as import("./InvoiceHistoryReport").InvoiceData[]}
        setInvoiceHistory={
          setInvoices as unknown as React.Dispatch<React.SetStateAction<import("./InvoiceHistoryReport").InvoiceData[]>>
        }
      />
    </div>
  );
}
