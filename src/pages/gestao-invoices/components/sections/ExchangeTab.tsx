import { useEffect, useState } from "react";
import { DollarSign, Loader2, Plus, Save } from "lucide-react";
import { formatCurrency } from "../../../cambiobackoffice/formatCurrencyUtil";
import { Product } from "./ProductsTab";
import { InvoiceData } from "./InvoiceHistory";
import { api } from "../../../../services/api";
import Swal from "sweetalert2";
import { useNotification } from "../../../../hooks/notification";

interface ExchangeTransaction {
  id: string;
  date: string;
  type: "compra" | "alocacao" | "devolucao";
  usd: number;
  taxa: number;
  descricao: string;
}

export interface FinancialTransaction {
  id: string;
  date: Date; // ISO string, pode usar `Date` se for convertido
  type: "BUY" | "PAYMENT";
  usd: number;
  rate: number;
  description: string;
  invoiceId: string;
  userId?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export function ExchangeTab() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [carriers, setCarriers] = useState<any[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaving2, setIsSaving2] = useState(false);
  const [isSaving3, setIsSaving3] = useState(false);
  const [loading, setLoading] = useState(true);

  const [historyPaymentBuy, setHistoryPaymentBuy] = useState<FinancialTransaction[] | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [valorRaw, setValorRaw] = useState("");
  const [valorRaw2, setValorRaw2] = useState("");

  const [dataPayment, setDataUpdated] = useState({
    invoiceId: "",
    date: new Date().toLocaleDateString("en-CA"),
    usd: 0,
  });
  const { setOpenNotification } = useNotification();

  const [valueRaw3, setValorRaw3] = useState("");
  const [valueRaw4, setValorRaw4] = useState("");

  const [dataCarrierPayment, setDataCarrierPayment] = useState({
    carrierId: "",
    date: new Date().toLocaleDateString("en-CA"),
    usd: 0,
  });

  const [addBalance, setAddBalance] = useState<{
    date: string;
    type: string;
    usd: number | string;
    rate: string | number;
    description: string;
  }>({
    date: new Date().toLocaleDateString("en-CA"),
    usd: "", // sempre resultará em "", mas mostra a estrutura
    rate: "", // sempre resultará em "", mas mostra a estrutura
    type: "BUY",
    description: "Compra de dólares",
  });

  console.log(addBalance);
  const [balance, setBalance] = useState<{ balance: number; averageRate: number }>();

  const getBalance = async () => {
    try {
      setLoading(true);
      const [getBalance] = await Promise.all([api.get("/invoice/exchange-balance")]);

      setBalance(getBalance.data);
    } catch (error) {
      console.error("Erro ao atualizar balance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputBalance = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAddBalance({ ...addBalance, [name]: value });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoiceResponse, getBalance, history, carriersResponse] = await Promise.all([
        api.get("/invoice/get"),
        api.get("/invoice/exchange-balance"),
        api.get("/invoice/exchange-records"),
        api.get("/invoice/carriers"),
      ]);

      setBalance(getBalance.data);
      setHistoryPaymentBuy(history.data);
      setInvoices(invoiceResponse.data);

      // Debug: verificar invoices pendentes
      const pendingInvoices = invoiceResponse.data.filter((inv: any) => !inv.completed && !inv.paid);
      console.log("📋 [EXCHANGE TAB] Total de invoices recebidas:", invoiceResponse.data.length);
      console.log("📋 [EXCHANGE TAB] Invoices pendentes (não pagas e não completas):", pendingInvoices.length);
      console.log(
        "📋 [EXCHANGE TAB] Detalhes das invoices pendentes:",
        pendingInvoices.map((inv: any) => ({
          id: inv.id,
          number: inv.number,
          subAmount: inv.subAmount,
          paid: inv.paid,
          completed: inv.completed,
        }))
      );

      // Buscar saldos dos freteiros
      const carriersWithBalance = await Promise.all(
        carriersResponse.data.map(async (carrier: any) => {
          try {
            const balanceRes = await api.get(`/invoice/box/transaction/${carrier.id}`);
            const transactions = balanceRes.data.TransactionBoxUserInvoice || [];

            // Buscar invoices do freteiro
            let invoices: any[] = [];
            try {
              const { data: listInvoicesByCarrier } = await api.get(`/invoice/list/carrier/${carrier.id}`);
              invoices = listInvoicesByCarrier.map((invoice: any) => ({
                id: invoice.id,
                date: invoice.date,
                description: invoice.number,
                value: invoice.subAmount,
                isInvoice: true,
                direction: "OUT", // Invoices são sempre saídas
              }));
            } catch (error) {
              console.error("Erro ao buscar invoices do freteiro:", error);
            }

            // Calcular saldo: seguindo a mesma lógica do componente Caixas.tsx
            // - Invoices = freteiro trabalhou, nós devemos = subtrai (negativo)
            // - Transações: IN soma (+), OUT subtrai (-)
            // Saldo negativo = devemos pagar (deve aparecer na lista)

            // Calcular transações do caixa (igual ao Caixas.tsx)
            const transactionBalance = transactions.reduce((acc: number, t: any) => {
              return acc + (t.direction === "IN" ? t.value : -t.value);
            }, 0);

            // Calcular total de invoices (nós devemos ao freteiro = subtrai)
            const invoiceBalance = invoices.reduce((acc: number, invoice: any) => {
              return acc - invoice.value; // Subtrai porque devemos
            }, 0);

            // Saldo final: negativo = devemos pagar, positivo = ele nos deve ou já pagamos demais
            const totalBalance = transactionBalance + invoiceBalance;

            // Debug log
            console.log(
              `[${carrier.name}] Invoices: ${invoices.length}, Total: ${invoices
                .reduce((s, i) => s + i.value, 0)
                .toFixed(2)}, Balance: ${invoiceBalance.toFixed(2)} | Transações: ${
                transactions.length
              }, Balance: ${transactionBalance.toFixed(2)} | TOTAL: ${totalBalance.toFixed(2)} ${
                totalBalance < 0 ? "← APARECE" : "← NÃO APARECE"
              }`
            );

            // Debug log
            console.log(`Freteiro ${carrier.name}:`, {
              invoices: invoices.length,
              invoiceTotal: invoices.reduce((sum, inv) => sum + inv.value, 0),
              invoiceBalance,
              transactions: transactions.length,
              transactionBalance,
              totalBalance,
              shouldAppear: totalBalance < 0,
            });
            return { ...carrier, balance: totalBalance };
          } catch (error) {
            return { ...carrier, balance: 0 };
          }
        })
      );
      setCarriers(carriersWithBalance);

      // Debug: mostrar todos os freteiros e seus saldos
      console.log("=== TODOS OS FRETEIROS E SEUS SALDOS ===");
      carriersWithBalance.forEach((carrier: any) => {
        console.log(
          `${carrier.name}: ${carrier.balance?.toFixed(2)} ${
            carrier.balance < 0 ? "← DEVEMOS PAGAR" : carrier.balance > 0 ? "← ELE NOS DEVE" : "← ZERADO"
          }`
        );
      });
      const withNegativeBalance = carriersWithBalance.filter((c: any) => (c.balance || 0) < 0);
      console.log(`Total com saldo negativo (devem aparecer): ${withNegativeBalance.length}`);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  const sendBuyDolar = async () => {
    if (!addBalance.date) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Selecione uma Data!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    if (!addBalance.rate) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Informe a Taxa de Câmbio (BRL)!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    if (!addBalance.usd) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Informe a Quantidade (USD)!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await api.post("/invoice/exchange-records", {
        ...addBalance,
        date: new Date(addBalance.date),
        rate: Number(addBalance.rate),
        usd: Number(addBalance.usd),
      });
      console.log(response.data);
      // Swal.fire({
      //   icon: "success",
      //   title: "Sucesso!",
      //   text: "Saldo adicionado com sucesso!",
      //   confirmButtonText: "Ok",
      //   buttonsStyling: false,
      //   customClass: {
      //     confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
      //   },
      // });
      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "Saldo adicionado com sucesso!",
      });
      setValorRaw("");
      setValorRaw2("");
      setAddBalance({
        date: new Date().toLocaleDateString("en-CA"),
        rate: "",
        usd: "",
        type: "BUY",
        description: "Compra de dólares",
      });

      await fetchData();
    } catch (error) {
      console.log("error");
      Swal.fire({
        icon: "error",
        title: "Atenção",
        text: "Erro ao Adicionar Saldo",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const registrarPagamento = async () => {
    if (!dataPayment.date) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Selecione uma Data!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    if (!dataPayment.invoiceId) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Informe a Invoice a ser paga!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    if (!balance) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Saldo ainda não validado!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    if (dataPayment.usd > balance.balance) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Saldo insuficiente!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    try {
      setIsSaving2(true);
      const response = await api.post("/invoice/exchange-records", {
        ...dataPayment,
        date: new Date(`${dataPayment.date}T${new Date().toTimeString().split(" ")[0]}`),
        usd: Number(dataPayment.usd),
        rate: balance?.averageRate,
      });
      // Swal.fire({
      //   icon: "success",
      //   title: "Sucesso!",
      //   text: "Pagamento realizado com sucesso!",
      //   confirmButtonText: "Ok",
      //   buttonsStyling: false,
      //   customClass: {
      //     confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
      //   },
      // });
      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "Pagamento realizado com sucesso!",
      });
      setValorRaw3("");
      setDataUpdated({
        invoiceId: "",
        date: new Date().toLocaleDateString("en-CA"),
        usd: 0,
      });

      await fetchData();
    } catch (error) {
      console.log("error");
      Swal.fire({
        icon: "error",
        title: "Atenção",
        text: "Erro ao Realizar pagamento",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
    } finally {
      setIsSaving2(false);
    }
  };

  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions((prev) =>
      prev.includes(transactionId) ? prev.filter((id) => id !== transactionId) : [...prev, transactionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTransactions.length === (historyPaymentBuy?.length || 0)) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(historyPaymentBuy?.map((t) => t.id) || []);
    }
  };

  const deleteSelectedTransactions = async () => {
    if (selectedTransactions.length === 0) return;

    try {
      const result = await Swal.fire({
        title: "Confirmar Exclusão em Massa",
        text: `Tem certeza que deseja deletar ${selectedTransactions.length} transação(ões)? O saldo será recalculado automaticamente.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Sim, deletar todas!",
        cancelButtonText: "Cancelar",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold mx-2",
          cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
        },
      });

      if (result.isConfirmed) {
        setLoading(true);

        // Deletar todas as transações selecionadas
        await Promise.all(selectedTransactions.map((id) => api.delete(`/invoice/exchange-records/${id}/recalculate`)));

        // Limpar seleção
        setSelectedTransactions([]);

        // Recarregar dados
        await Promise.all([getBalance(), fetchData()]);

        // Disparar evento customizado para atualizar outras abas
        window.dispatchEvent(new CustomEvent("invoiceUpdated"));

        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: `${selectedTransactions.length} transação(ões) deletada(s) e saldo recalculado!`,
        });
      }
    } catch (error) {
      console.error("Erro ao deletar transações:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao deletar transações em massa",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    try {
      const result = await Swal.fire({
        title: "Confirmar Exclusão",
        text: "Tem certeza que deseja deletar esta transação? O saldo será recalculado automaticamente.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Sim, deletar!",
        cancelButtonText: "Cancelar",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold mx-2",
          cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
        },
      });

      if (result.isConfirmed) {
        setLoading(true);

        // Chamar a API de deleção inteligente
        await api.delete(`/invoice/exchange-records/${transactionId}/recalculate`);

        // Recarregar dados
        await Promise.all([getBalance(), fetchData()]);

        // Disparar evento customizado para atualizar outras abas
        window.dispatchEvent(new CustomEvent("invoiceUpdated"));

        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: "Transação deletada e saldo recalculado com sucesso!",
        });
      }
    } catch (error) {
      console.error("Erro ao deletar transação:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao deletar transação",
      });
    } finally {
      setLoading(false);
    }
  };

  const reverseTransaction = async (transacao: FinancialTransaction) => {
    try {
      const isCarrierPayment = transacao.description.includes("PAGAMENTO CAIXA FRETEIRO");
      const carrierName = isCarrierPayment
        ? transacao.description.replace("PAGAMENTO CAIXA FRETEIRO - ", "").trim()
        : "";

      const result = await Swal.fire({
        title: "Confirmar Estorno",
        text: `Tem certeza que deseja estornar esta transação? ${
          isCarrierPayment
            ? `O pagamento de ${carrierName} será revertido e a dívida voltará.`
            : "O saldo será recalculado automaticamente."
        }`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Sim, estornar!",
        cancelButtonText: "Cancelar",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold mx-2",
          cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
        },
      });

      if (result.isConfirmed) {
        setLoading(true);

        // Se for pagamento de freteiro, deletar também a transação do caixa
        if (isCarrierPayment) {
          try {
            const carrier = carriers.find((c) => transacao.description.includes(c.name.toUpperCase()));

            if (carrier) {
              const balanceRes = await api.get(`/invoice/box/transaction/${carrier.id}`);
              const transactions = balanceRes.data.TransactionBoxUserInvoice || [];

              // Encontrar a transação de pagamento correspondente
              const boxTransaction = transactions.find(
                (t: any) =>
                  t.description === transacao.description &&
                  t.direction === "IN" &&
                  Math.abs(t.value - transacao.usd) < 0.01
              );

              if (boxTransaction) {
                // Deletar transação do caixa
                await api.delete(`/invoice/box/trasnsaction/user/${boxTransaction.id}`);
              }
            }
          } catch (error) {
            console.error("Erro ao deletar transação do caixa:", error);
          }
        }

        // Deletar registro de exchange e recalcular
        await api.delete(`/invoice/exchange-records/${transacao.id}/recalculate`);

        // Recarregar dados
        await Promise.all([getBalance(), fetchData()]);

        // Disparar evento customizado para atualizar outras abas
        window.dispatchEvent(new CustomEvent("invoiceUpdated"));

        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: isCarrierPayment
            ? "Pagamento estornado e dívida revertida com sucesso!"
            : "Transação estornada e saldo recalculado com sucesso!",
        });
      }
    } catch (error) {
      console.error("Erro ao estornar transação:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao estornar transação",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-6 text-blue-700 border-b pb-2">
        <DollarSign className="mr-2 inline" size={18} />
        Média Dólar
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Seção Compra de Dólares */}
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-medium mb-2">Registrar Compra de Dólares</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Data</label>
              <input
                type="date"
                name="date"
                value={addBalance.date}
                onChange={handleInputBalance}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantidade (USD)</label>
              <input
                type="text"
                step="0.01"
                name="usd"
                value={valorRaw2}
                placeholder="$0.00 ou $0,00"
                onChange={(e) => {
                  // Permite números, ponto decimal, vírgula e sinal negativo
                  let cleanedValue = e.target.value.replace(/[^0-9.,-]/g, "");

                  // Converte vírgula para ponto (padrão internacional)
                  cleanedValue = cleanedValue.replace(/,/g, ".");

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

                  setValorRaw2(newValue);

                  // Converte para número para o estado do pagamento
                  const numericValue = parseFloat(newValue) || 0;
                  setAddBalance({ ...addBalance, usd: newValue });
                }}
                onBlur={(e) => {
                  // Formata apenas se houver valor
                  if (valorRaw2) {
                    const numericValue = parseFloat(valorRaw2);
                    if (!isNaN(numericValue)) {
                      // Formata mantendo o sinal negativo se existir
                      const formattedValue = numericValue.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });
                      setValorRaw2(formattedValue);
                      setAddBalance({ ...addBalance, usd: numericValue.toString() });
                    }
                  }
                }}
                onFocus={(e) => {
                  // Remove formatação quando o input recebe foco
                  if (valorRaw2) {
                    const numericValue = parseFloat(valorRaw2.replace(/[^0-9.-]/g, ""));
                    if (!isNaN(numericValue)) {
                      setValorRaw2(numericValue.toString());
                    }
                  }
                }}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Taxa de Câmbio (BRL)</label>
              <input
                type="text"
                step="0.0001"
                name="rate"
                value={valorRaw}
                placeholder="$0.0000 ou $0,0000"
                onChange={(e) => {
                  // Permite números, ponto decimal, vírgula e sinal negativo
                  let cleanedValue = e.target.value.replace(/[^0-9.,-]/g, "");

                  // Converte vírgula para ponto (padrão internacional)
                  cleanedValue = cleanedValue.replace(/,/g, ".");

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
                  setAddBalance({ ...addBalance, rate: newValue });
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
                        maximumFractionDigits: 4,
                      });
                      setValorRaw(formattedValue);
                      setAddBalance({ ...addBalance, rate: numericValue.toString() });
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
                // onChange={handleInputBalance}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <button
              onClick={sendBuyDolar}
              className="bg-yellow-500 hover:bg-yellow-600 flex justify-center text-white px-4 py-2 rounded w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Salvando...
                </>
              ) : (
                <>Registrar Compra</>
              )}
            </button>
          </div>
        </div>

        {/* Seção Saldo e Custo Médio */}
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-medium mb-2">Saldo e Custo Médio</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">Saldo em Dólar:</span>
              <span className="font-bold">
                {loading ? "Carregando..." : formatCurrency(balance?.balance ?? 0, 2, "USD")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Custo Médio:</span>
              <span className="font-bold">
                {loading
                  ? "Carregando..."
                  : balance?.balance === 0
                  ? formatCurrency(0, 4)
                  : formatCurrency(balance?.averageRate ?? 0, 4)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Pagamentos de Caixas de Freteiros */}
      <style>{`
        .carrier-payment-select option:not(:first-child) {
          color: #dc2626 !important;
        }
      `}</style>
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h3 className="text-lg font-medium mb-4 text-blue-700 border-b pb-2">Pagar Caixas de Freteiros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Freteiro</label>
            <select
              onChange={(e) => {
                const carrierId = e.target.value;
                if (!carrierId) {
                  return setDataCarrierPayment({ carrierId: "", date: new Date().toLocaleDateString("en-CA"), usd: 0 });
                }
                const carrier = carriers.find((item) => item.id === carrierId);
                const balance = carrier?.balance || 0;
                // Se o saldo for negativo, devemos pagar (preencher com valor absoluto)
                // Se o saldo for positivo, ele nos deve (não precisa pagar, mas pode pagar parcialmente)
                const valueToPay = balance < 0 ? Math.abs(balance) : 0;
                setValorRaw4(
                  valueToPay > 0
                    ? valueToPay.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : ""
                );
                setDataCarrierPayment((prev) => ({
                  ...prev,
                  carrierId: carrierId,
                  usd: valueToPay,
                }));
              }}
              className="w-full h-11 border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 carrier-payment-select"
            >
              <option value="">Selecione um freteiro</option>
              {loading ? (
                <option>Carregando...</option>
              ) : (
                <>
                  {(() => {
                    const filteredCarriers = carriers.filter((carrier) => {
                      const balance = carrier.balance || 0;
                      const shouldShow = balance < 0;
                      if (!shouldShow && balance !== 0) {
                        console.log(`[FILTRO] ${carrier.name} não aparece - saldo: ${balance.toFixed(2)}`);
                      }
                      return shouldShow;
                    });
                    console.log(
                      `[FILTRO] Total de freteiros com saldo negativo: ${filteredCarriers.length} de ${carriers.length}`
                    );
                    return filteredCarriers
                      .sort((a, b) => (a.balance || 0) - (b.balance || 0)) // Ordenar: mais negativos primeiro
                      .map((carrier) => {
                        const balance = carrier.balance || 0;
                        const balanceValue = formatCurrency(Math.abs(balance), 2, "USD");
                        const balanceText = `Devemos: -${balanceValue}`;
                        console.log(`[LISTA] ${carrier.name} aparece - ${balanceText}`);
                        return (
                          <option key={carrier.id} value={carrier.id} className="text-red-600">
                            {carrier.name.toUpperCase()} - {balanceText}
                          </option>
                        );
                      });
                  })()}
                </>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pagamento</label>
            <input
              type="date"
              value={dataCarrierPayment.date}
              onChange={(e) => setDataCarrierPayment({ ...dataCarrierPayment, date: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="h-22 block text-sm font-medium text-gray-700 mb-1">Valor a Pagar ($)</label>
            <input
              type="text"
              step="0.01"
              value={valueRaw4}
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
                setValorRaw4(newValue);
                const numericValue = parseFloat(newValue) || 0;
                setDataCarrierPayment({ ...dataCarrierPayment, usd: numericValue });
              }}
              onBlur={(e) => {
                if (valueRaw4) {
                  const numericValue = parseFloat(valueRaw4.replace(/[^0-9.-]/g, ""));
                  if (!isNaN(numericValue)) {
                    const formattedValue = numericValue.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                    setValorRaw4(formattedValue);
                    setDataCarrierPayment({ ...dataCarrierPayment, usd: numericValue });
                  }
                }
              }}
              onFocus={(e) => {
                if (valueRaw4) {
                  const numericValue = parseFloat(valueRaw4.replace(/[^0-9.-]/g, ""));
                  if (!isNaN(numericValue)) {
                    setValorRaw4(numericValue.toString());
                  }
                }
              }}
              placeholder="Digite o valor"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={async () => {
              if (!dataCarrierPayment.carrierId) {
                Swal.fire({
                  icon: "warning",
                  title: "Atenção",
                  text: "Selecione um freteiro!",
                  confirmButtonText: "Ok",
                  buttonsStyling: false,
                  customClass: {
                    confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
                  },
                });
                return;
              }

              // Validar apenas se o valor digitado é válido
              if (!dataCarrierPayment.usd || dataCarrierPayment.usd <= 0) {
                Swal.fire({
                  icon: "warning",
                  title: "Atenção",
                  text: "Informe um valor válido para pagamento!",
                  confirmButtonText: "Ok",
                  buttonsStyling: false,
                  customClass: {
                    confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
                  },
                });
                return;
              }

              // Validar saldo da média dólar
              if (!balance || dataCarrierPayment.usd > balance.balance) {
                Swal.fire({
                  icon: "warning",
                  title: "Atenção",
                  text: "Saldo insuficiente na média dólar!",
                  confirmButtonText: "Ok",
                  buttonsStyling: false,
                  customClass: {
                    confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
                  },
                });
                return;
              }

              try {
                setIsSaving3(true);
                const carrier = carriers.find((c) => c.id === dataCarrierPayment.carrierId);

                // Criar transação no caixa do freteiro
                // Quando pagamos um freteiro, estamos reduzindo a dívida (saldo negativo)
                // Então é uma entrada (IN) no caixa dele, não uma saída (OUT)
                await api.post("/invoice/box/transaction", {
                  value: Math.abs(dataCarrierPayment.usd),
                  entityId: dataCarrierPayment.carrierId,
                  direction: "IN",
                  date: new Date(`${dataCarrierPayment.date}T${new Date().toTimeString().split(" ")[0]}`).toISOString(),
                  description: `PAGAMENTO CAIXA FRETEIRO - ${carrier?.name.toUpperCase()}`,
                  entityType: "CARRIER",
                });

                // Registrar pagamento na média dólar
                const paymentDate = new Date(`${dataCarrierPayment.date}T${new Date().toTimeString().split(" ")[0]}`);
                const rateValue = balance?.averageRate ? Number(balance.averageRate) : 0;

                console.log("💸 [PAGAMENTO FRETEIRO] Dados do pagamento:", {
                  date: paymentDate.toISOString(),
                  usd: Number(dataCarrierPayment.usd),
                  rate: rateValue,
                  type: "PAYMENT",
                  invoiceId: "",
                  description: `PAGAMENTO CAIXA FRETEIRO - ${carrier?.name.toUpperCase()}`,
                });

                await api.post("/invoice/exchange-records", {
                  date: paymentDate.toISOString(),
                  usd: Number(dataCarrierPayment.usd),
                  rate: rateValue,
                  type: "PAYMENT",
                  invoiceId: "",
                  description: `PAGAMENTO CAIXA FRETEIRO - ${carrier?.name.toUpperCase()}`,
                });

                setOpenNotification({
                  type: "success",
                  title: "Sucesso!",
                  notification: "Pagamento do caixa do freteiro realizado com sucesso!",
                });
                setValorRaw4("");
                setDataCarrierPayment({
                  carrierId: "",
                  date: new Date().toLocaleDateString("en-CA"),
                  usd: 0,
                });

                // Recarregar dados para atualizar o histórico
                await fetchData();

                // Garantir que o histórico seja atualizado
                const updatedHistory = await api.get("/invoice/exchange-records");
                setHistoryPaymentBuy(updatedHistory.data);
              } catch (error: any) {
                console.error("❌ [PAGAMENTO FRETEIRO] Erro ao realizar pagamento:", error);
                console.error("❌ [PAGAMENTO FRETEIRO] Resposta do erro:", error?.response?.data);

                const errorMessage = error?.response?.data?.message || error?.message || "Erro ao realizar pagamento";
                const errorDetails = error?.response?.data?.issues
                  ? `Detalhes: ${JSON.stringify(error.response.data.issues)}`
                  : "";

                Swal.fire({
                  icon: "error",
                  title: "Atenção",
                  text: `${errorMessage}${errorDetails ? `\n\n${errorDetails}` : ""}`,
                  confirmButtonText: "Ok",
                  buttonsStyling: false,
                  customClass: {
                    confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
                  },
                });
              } finally {
                setIsSaving3(false);
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center justify-center"
          >
            {isSaving3 ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                Salvando...
              </>
            ) : (
              <>Pagar Caixa do Freteiro</>
            )}
          </button>
        </div>
      </div>

      {/* Seção de Pagamentos */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h3 className="text-lg font-medium mb-4 text-blue-700 border-b pb-2">Registrar Pagamento de Invoice</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice</label>
            <select
              // value={paymentForm.invoiceId}
              onChange={(e) => {
                const invoiceId = e.target.value;
                if (!invoiceId)
                  return setDataUpdated({ invoiceId: "", date: new Date().toLocaleDateString("en-CA"), usd: 0 });
                const valueInvoice = invoices.find((item) => item.id === invoiceId);
                setValorRaw3(
                  valueInvoice && valueInvoice.subAmount !== undefined
                    ? valueInvoice.subAmount.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : ""
                );
                setDataUpdated((prev) => ({
                  ...prev,
                  invoiceId: invoiceId,
                  type: "PAYMENT",
                  usd: valueInvoice?.subAmount || 0,
                  description: `PAGAMENTO INVOICE - ${valueInvoice?.number.toUpperCase()}`,
                }));
              }}
              className="w-full h-11 border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione uma invoice</option>
              {loading ? (
                <option>Carregando...</option>
              ) : (
                <>
                  {(() => {
                    const filteredInvoices = invoices.filter((item) => {
                      // Verificar se tem supplier e subAmount válido
                      const hasValidSupplier = item.supplier && item.supplier.name;
                      const hasValidAmount =
                        item.subAmount !== undefined && item.subAmount !== null && item.subAmount > 0;
                      const isPending = !item.completed && !item.paid;
                      return hasValidSupplier && hasValidAmount && isPending;
                    });
                    console.log("📋 [EXCHANGE TAB] Invoices no dropdown:", filteredInvoices.length);
                    console.log(
                      "📋 [EXCHANGE TAB] Invoices no dropdown (detalhes):",
                      filteredInvoices.map((inv: any) => ({
                        id: inv.id,
                        number: inv.number,
                        subAmount: inv.subAmount,
                        paid: inv.paid,
                        completed: inv.completed,
                        hasSupplier: !!inv.supplier,
                        supplierName: inv.supplier?.name,
                      }))
                    );
                    return filteredInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.number.toUpperCase()} - {(invoice.supplier?.name || "Sem fornecedor").toUpperCase()} (
                        {formatCurrency(invoice.subAmount || 0)})
                      </option>
                    ));
                  })()}
                </>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pagamento</label>
            <input
              type="date"
              // @ts-ignore
              value={dataPayment.date}
              onChange={(e) => setDataUpdated({ ...dataPayment, date: e.target.value })}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="h-22 block text-sm font-medium text-gray-700 mb-1">Valor Pago ($)</label>
            <input
              type="text"
              step="0.01"
              // @ts-ignore
              value={valueRaw3}
              readOnly
              className="w-full border border-gray-300 rounded-md p-2 bg-gray-100 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={registrarPagamento}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded flex items-center justify-center"
          >
            {isSaving2 ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                Salvando...
              </>
            ) : (
              <>Registrar Pagamento</>
            )}
          </button>
          <div className="bg-blue-100 p-2 rounded hidden" id="infoAlocacao"></div>
        </div>
      </div>

      {/* Histórico de Transações */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">Histórico de Transações</h3>
          {selectedTransactions.length > 0 && (
            <button
              onClick={deleteSelectedTransactions}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold flex items-center"
            >
              🗑️ Deletar Selecionadas ({selectedTransactions.length})
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-200">
                <th className="py-2 px-4 border">
                  <input
                    type="checkbox"
                    checked={
                      selectedTransactions.length === (historyPaymentBuy?.length || 0) &&
                      (historyPaymentBuy?.length || 0) > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="py-2 px-4 border">Data</th>
                <th className="py-2 px-4 border">Tipo</th>
                <th className="py-2 px-4 border">USD</th>
                <th className="py-2 px-4 border">Taxa</th>
                <th className="py-2 px-4 border">Descrição</th>
                <th className="py-2 px-4 border">Usuário</th>
                <th className="py-2 px-4 border">Ações</th>
              </tr>
            </thead>
            <tbody>
              {historyPaymentBuy && historyPaymentBuy.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-gray-500">
                    Nenhuma transação registrada
                  </td>
                </tr>
              ) : (
                (historyPaymentBuy ?? []).map((transacao) => {
                  const rowClass =
                    transacao.type === "BUY"
                      ? "bg-green-50"
                      : transacao.type === "PAYMENT"
                      ? "bg-blue-50"
                      : "bg-yellow-50";

                  return (
                    <tr key={transacao.id} className="hover:bg-gray-50">
                      <td className={`py-2 px-4 border ${rowClass} text-center`}>
                        <input
                          type="checkbox"
                          checked={selectedTransactions.includes(transacao.id)}
                          onChange={() => handleSelectTransaction(transacao.id)}
                          className="rounded"
                        />
                      </td>
                      <td className={`py-2 px-2 border ${rowClass} text-center`}>
                        <i className="fas fa-clock text-green-500 mr-2"></i>

                        {new Date(new Date(transacao.date).getTime() + 3 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}
                      </td>
                      <td className={`py-2 px-4 border ${rowClass} text-center`}>
                        {transacao.type === "BUY" ? "COMPRA" : transacao.type === "PAYMENT" ? "PAGAMENTO" : "DEVOLUÇÃO"}
                      </td>
                      <td className={`py-2 px-4 border ${rowClass} text-center font-mono`}>
                        {transacao.type === "BUY" ? "+" : "-"}
                        {formatCurrency(transacao.usd, 2, "USD") || "-"}
                      </td>
                      <td className={`py-2 px-4 border ${rowClass} text-center font-mono`}>
                        {formatCurrency(transacao.rate, 4) || "-"}
                      </td>
                      <td className={`py-2 px-4 border ${rowClass} text-center`}>
                        {transacao.description.toUpperCase()}
                      </td>
                      <td className={`py-2 px-4 border ${rowClass} text-center text-sm`}>
                        {transacao.user ? (
                          <span title={transacao.user.email}>
                            {transacao.user.name || transacao.user.email || "Usuário"}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className={`py-2 px-4 border ${rowClass} text-center`}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => deleteTransaction(transacao.id)}
                            className="bg-red-600 hover:bg-red-800 text-white px-3 py-1 rounded text-sm font-semibold transition-colors duration-200"
                            title="Deletar transação e recalcular saldo"
                          >
                            🗑️
                          </button>
                          <button
                            onClick={() => reverseTransaction(transacao)}
                            className="bg-orange-600 hover:bg-orange-800 text-white px-3 py-1 rounded text-sm font-semibold transition-colors duration-200"
                            title="Estornar transação e reverter valores"
                          >
                            ↶
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {/* Paginação */}
          {invoices.length > itemsPerPage && (
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600">
                Página {currentPage + 1} de {Math.ceil(invoices.length / itemsPerPage)}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(invoices.length / itemsPerPage) - 1))
                }
                disabled={(currentPage + 1) * itemsPerPage >= invoices.length}
                className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
