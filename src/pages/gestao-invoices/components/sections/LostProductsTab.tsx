import { useState, useEffect } from "react";
import { AlertTriangle, Edit, Trash2, Plus, Loader2, Eye, CheckCircle, ChevronDown } from "lucide-react";
import Swal from "sweetalert2";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";
import { formatCurrency } from "../../../cambiobackoffice/formatCurrencyUtil";
import { usePermissionStore } from "../../../../store/permissionsStore";

interface LostProduct {
  id: string;
  invoiceProductId: string;
  quantity: number;
  freightPercentage: number;
  freightValue: number;
  refundValue: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  invoiceProduct: {
    id: string;
    productId: string;
    value: number;
    weight: number;
    product: {
      id: string;
      name: string;
      code: string;
    };
    invoice: {
      id: string;
      number: string;
      supplier: {
        name: string;
      };
    };
  };
}

interface LostProductsSummary {
  summary: {
    totalLostProducts: number;
    totalRefund: number;
    totalFreightValue: number;
  };
  groupedByInvoice: Array<{
    invoiceNumber: string;
    supplierName: string;
    products: LostProduct[];
    totalRefund: number;
  }>;
  allProducts: LostProduct[];
}

export function LostProductsTab() {
  const [lostProducts, setLostProducts] = useState<LostProduct[]>([]);
  const [summary, setSummary] = useState<LostProductsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LostProduct | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    invoiceId: "",
    productId: "",
    quantity: "",
    freightPercentage: "",
    notes: "",
  });
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [freightPercentages, setFreightPercentages] = useState<Record<string, number>>({});
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const { setOpenNotification } = useNotification();
  const { user } = usePermissionStore();

  useEffect(() => {
    fetchLostProducts();
    fetchSummary();
    fetchInvoicesAndProducts();
  }, []);

  const fetchInvoicesAndProducts = async () => {
    try {
      const [invoiceResponse, productsResponse, carriersResponse] = await Promise.all([
        api.get("/invoice/get"),
        api.get("/invoice/product", { params: { limit: 1000 } }),
        api.get("/invoice/carriers"),
      ]);
      setInvoices(invoiceResponse.data || []);
      const productsData = Array.isArray(productsResponse.data) 
        ? productsResponse.data 
        : productsResponse.data.products || [];
      setProducts(productsData.filter((p: any) => p.active !== false));
      setCarriers(carriersResponse.data || []);
    } catch (error) {
      console.error("Erro ao buscar invoices e produtos:", error);
    }
  };

  const fetchLostProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/invoice/lost-products");
      setLostProducts(response.data.lostProducts || []);
    } catch (error) {
      console.error("Erro ao buscar produtos perdidos:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Não foi possível carregar produtos perdidos.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get("/invoice/lost-products/summary");
      setSummary(response.data);
    } catch (error) {
      console.error("Erro ao buscar resumo:", error);
    }
  };

  // Agrupar produtos por data
  const groupProductsByDate = () => {
    const grouped: Record<string, LostProduct[]> = {};
    
    lostProducts.forEach((product) => {
      const date = new Date(product.createdAt).toLocaleDateString("pt-BR");
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(product);
    });

    // Ordenar datas (mais recente primeiro)
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      const dateA = new Date(a.split("/").reverse().join("-"));
      const dateB = new Date(b.split("/").reverse().join("-"));
      return dateB.getTime() - dateA.getTime();
    });

    return { grouped, sortedDates };
  };

  const toggleExpand = (date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const handleFreightChange = (date: string, value: string) => {
    const numValue = Number.parseFloat(value) || 0;
    setFreightPercentages((prev) => ({
      ...prev,
      [date]: numValue,
    }));
  };

  const handleComplete = async (date: string, products: LostProduct[]) => {
    const freightPercentage = freightPercentages[date] || 0;
    const subtotal = products.reduce((sum, p) => sum + p.refundValue, 0);
    const freightValue = subtotal * (freightPercentage / 100);
    const total = subtotal + freightValue;
    
    const { value: carrierId } = await Swal.fire({
      title: "Finalizar Lista de Produtos Perdidos",
      html: `
        <div style="text-align: left; padding: 0.5rem 0;">
          <div style="margin-bottom: 1rem; padding: 0.75rem; background-color: #eff6ff; border-radius: 0.5rem; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; font-size: 0.875rem; color: #1e40af; font-weight: 600;">Valor Total a Creditar:</p>
            <p style="margin: 0.25rem 0 0 0; font-size: 1.5rem; font-weight: 700; color: #1e3a8a;">${formatCurrency(total)}</p>
          </div>
          <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Selecione o transportador:</label>
          <select id="carrierSelect" style="width: 100%; padding: 0.75rem; border: 2px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem; transition: border-color 0.2s; outline: none;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
            <option value="">Selecione um transportador</option>
            ${carriers.map((carrier) => `<option value="${carrier.id}">${carrier.name}</option>`).join("")}
          </select>
        </div>
      `,
      width: "500px",
      showCancelButton: true,
      confirmButtonText: "Finalizar",
      cancelButtonText: "Cancelar",
      buttonsStyling: false,
      customClass: {
        popup: "rounded-lg",
        confirmButton: "bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold mr-2 transition-colors shadow-md",
        cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md",
      },
      didOpen: () => {
        const select = document.getElementById("carrierSelect") as HTMLSelectElement;
        if (select) {
          select.focus();
        }
      },
      preConfirm: () => {
        const select = document.getElementById("carrierSelect") as HTMLSelectElement;
        const value = select?.value;
        if (!value) {
          Swal.showValidationMessage("Você precisa selecionar um transportador");
          return false;
        }
        return value;
      },
    });

    if (!carrierId) return;

    try {
      setIsSubmitting(true);
      
      // Calcular total com frete
      const subtotal = products.reduce((sum, p) => sum + p.refundValue, 0);
      const freightValue = subtotal * (freightPercentage / 100);
      const total = subtotal + freightValue;

      // Criar transação no caixa do transportador
      await api.post("/invoice/box/transaction", {
        value: total,
        entityId: carrierId,
        direction: "IN",
        date: new Date().toISOString(),
        description: `mercadoria perdida - ${date}`,
        entityType: "CARRIER",
        userId: user?.id,
      });

      setCompletedDates((prev) => {
        const newSet = new Set(prev);
        newSet.add(date);
        return newSet;
      });

      Swal.fire({
        icon: "success",
        title: "Sucesso!",
        text: "Lista de produtos perdidos finalizada e valor creditado no caixa!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md",
        },
      });
    } catch (error: any) {
      console.error("Erro ao finalizar lista:", error);
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: error?.response?.data?.message || "Não foi possível finalizar a lista.",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const { grouped, sortedDates } = groupProductsByDate();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-red-700 flex items-center">
          <AlertTriangle className="mr-2" size={20} />
          Produtos Perdidos
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Nenhum produto perdido registrado.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const dateProducts = grouped[date];
            const isExpanded = expandedDates.has(date);
            const isCompleted = completedDates.has(date);
            const subtotal = dateProducts.reduce((sum, p) => sum + p.refundValue, 0);
            const freightPercentage = freightPercentages[date] || 0;
            const freightValue = subtotal * (freightPercentage / 100);
            const total = subtotal + freightValue;

            return (
              <div
                key={date}
                className={`border rounded-lg transition-all duration-300 ${
                  isCompleted
                    ? "bg-blue-50 border-blue-200"
                    : "bg-white border-gray-200"
                }`}
              >
                {/* Header clicável */}
                <div
                  onClick={() => toggleExpand(date)}
                  className={`p-4 cursor-pointer transition-all duration-200 ${
                    isCompleted
                      ? "bg-blue-50 hover:bg-blue-100"
                      : "bg-red-50 hover:bg-red-100"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 flex items-start gap-3">
                      <div className={`mt-1 transition-transform duration-300 ${isExpanded ? "rotate-0" : "-rotate-90"}`}>
                        <ChevronDown className="text-gray-600" size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-800">
                            Perdidos {date}
                          </h3>
                          {isCompleted && (
                            <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                              ✅ Concluída
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <p className="text-gray-600">
                            {dateProducts.length} produto{dateProducts.length !== 1 ? "s" : ""}
                          </p>
                          {!isExpanded && (
                            <>
                              <span className="text-gray-400">•</span>
                              <p className="text-gray-700 font-medium">
                                Subtotal: <span className="font-semibold">{formatCurrency(subtotal)}</span>
                              </p>
                              <span className="text-gray-400">•</span>
                              <p className="text-gray-700 font-medium">
                                Frete: <span className="font-semibold">{freightPercentage.toFixed(2)}%</span>
                              </p>
                              <span className="text-gray-400">•</span>
                              <p className="text-blue-700 font-medium">
                                Total: <span className="font-bold">{formatCurrency(total)}</span>
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conteúdo expandível */}
                {isExpanded && (
                  <div className="p-4 border-t border-gray-200">
                    <div className="overflow-x-auto mb-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Produto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Invoice
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Fornecedor
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantidade
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Valor Individual
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Valor a Receber
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {dateProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {product.invoiceProduct?.product?.name || "Produto não encontrado"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.invoiceProduct?.invoice?.number || "—"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.invoiceProduct?.invoice?.supplier?.name || "—"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                {product.quantity}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                                {formatCurrency(product.invoiceProduct?.value || 0)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600 text-right">
                                {formatCurrency(product.refundValue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Rodapé com subtotais */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                          <p className="text-sm font-medium text-blue-800 mb-1">Subtotal:</p>
                          <p className="text-lg font-bold text-blue-800">
                            {formatCurrency(subtotal)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-800 mb-1">
                            Frete (%):
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={freightPercentage}
                            onChange={(e) => handleFreightChange(date, e.target.value)}
                            disabled={isCompleted || isSubmitting}
                            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-800 mb-1">Total:</p>
                          <p className="text-lg font-bold text-blue-800">
                            {formatCurrency(total)}
                          </p>
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleComplete(date, dateProducts)}
                            disabled={isCompleted || isSubmitting}
                            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                              isCompleted
                                ? "bg-gray-400 cursor-not-allowed text-white"
                                : "bg-green-600 hover:bg-green-700 text-white"
                            }`}
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin inline" />
                            ) : (
                              "Concluir"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
