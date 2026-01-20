import { useState, useEffect } from "react";
import { AlertTriangle, Edit, Trash2, Plus, Loader2, Eye, CheckCircle, ChevronDown } from "lucide-react";
import Swal from "sweetalert2";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";
import { formatCurrency } from "../../../cambiobackoffice/formatCurrencyUtil";
import { usePermissionStore } from "../../../../store/permissionsStore";

interface LostProduct {
  id: string;
  invoiceProductId: string | null;
  productId?: string; // ID do produto quando invoiceProduct é null
  invoiceId?: string; // ID da invoice quando invoiceProduct é null
  quantity: number;
  freightPercentage: number;
  freightValue: number;
  refundValue: number;
  notes?: string;
  completedDate?: string | null; // Data "DD/MM/YYYY" quando lista foi concluída
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    code: string;
  };
  invoice?: {
    id: string;
    number: string;
    supplier?: {
      name: string;
    };
  };
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
  } | null;
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
  const [confirmedFreightPercentages, setConfirmedFreightPercentages] = useState<Record<string, number>>({});
  const { setOpenNotification } = useNotification();
  const { user } = usePermissionStore();

  // Helper para converter data UTC para timezone do Brasil (UTC-3) e retornar como "DD/MM/YYYY"
  const getBrazilDate = (dateString: string): string => {
    const date = new Date(dateString);
    // Converter para timezone do Brasil (America/Sao_Paulo = UTC-3)
    const brazilDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const day = String(brazilDate.getDate()).padStart(2, "0");
    const month = String(brazilDate.getMonth() + 1).padStart(2, "0");
    const year = brazilDate.getFullYear();
    return `${day}/${month}/${year}`;
  };

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
      const invoicesData = Array.isArray(invoiceResponse.data) ? invoiceResponse.data : [];
      setInvoices(invoicesData);
      console.log("📋 Invoices carregadas:", invoicesData.length);
      
      const productsData = Array.isArray(productsResponse.data)
        ? productsResponse.data
        : productsResponse.data?.products || [];
      const activeProducts = productsData.filter((p: any) => p.active !== false);
      setProducts(activeProducts);
      console.log("📦 Produtos carregados:", activeProducts.length);
      if (activeProducts.length > 0) {
        console.log("📦 Primeiro produto exemplo:", {
          id: activeProducts[0].id,
          name: activeProducts[0].name,
          code: activeProducts[0].code,
        });
      }
      
      setCarriers(carriersResponse.data || []);
    } catch (error) {
      console.error("Erro ao buscar invoices e produtos:", error);
    }
  };

  const fetchLostProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/invoice/lost-products");
      const products = response.data.lostProducts || response.data || [];
      
      // Log para debug
      console.log("📦 Produtos perdidos recebidos:", products.length);
      if (products.length > 0) {
        const firstProduct = products[0];
        console.log("📦 Primeiro produto perdido (completo):", JSON.stringify(firstProduct, null, 2));
        console.log("📦 Tem invoiceProduct?", !!firstProduct.invoiceProduct);
        if (firstProduct.invoiceProduct) {
          console.log("📦 invoiceProduct tem product?", !!firstProduct.invoiceProduct.product);
          console.log("📦 invoiceProduct tem invoice?", !!firstProduct.invoiceProduct.invoice);
        } else {
          console.warn("⚠️ Primeiro produto NÃO tem invoiceProduct!");
        }
      }
      
      setLostProducts(products);
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
  // Produtos concluídos são agrupados por completedDate
  // Produtos não concluídos são agrupados por createdAt (timezone Brasil)
  // IMPORTANTE: Cada lista concluída e ativa deve ter uma chave única, mesmo que sejam da mesma data
  const groupProductsByDate = () => {
    const grouped: Record<string, LostProduct[]> = {};

    // Primeiro, separar produtos concluídos e não concluídos
    const concludedProducts: LostProduct[] = [];
    const activeProducts: LostProduct[] = [];

    lostProducts.forEach((product) => {
      if (product.completedDate) {
        concludedProducts.push(product);
      } else {
        activeProducts.push(product);
      }
    });

    // Agrupar produtos concluídos: usar completedDate + updatedAt para diferenciar listas
    // Produtos concluídos juntos (mesma lista) terão updatedAt muito próximo (mesmo timestamp de conclusão)
    // Vamos agrupar por completedDate + intervalo de tempo do updatedAt
    const concludedGrouped: Record<string, LostProduct[]> = {};

    // Agrupar produtos por completedDate primeiro
    const byCompletedDate: Record<string, LostProduct[]> = {};
    concludedProducts.forEach((product) => {
      const date = product.completedDate!;
      if (!byCompletedDate[date]) {
        byCompletedDate[date] = [];
      }
      byCompletedDate[date].push(product);
    });

    // Para cada completedDate, separar em grupos baseados no updatedAt (timestamp de conclusão)
    Object.keys(byCompletedDate).forEach((date) => {
      const products = byCompletedDate[date];
      // Ordenar por updatedAt
      const sorted = [...products].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

      // Agrupar produtos com updatedAt próximo (mesmos 10 segundos = mesma conclusão)
      const groups: LostProduct[][] = [];
      let currentGroup: LostProduct[] = [];
      let lastUpdatedAt: number | null = null;

      sorted.forEach((product) => {
        const updatedAt = new Date(product.updatedAt).getTime();
        if (lastUpdatedAt === null || Math.abs(updatedAt - lastUpdatedAt) < 10000) {
          // Mesmo grupo (diferença < 10 segundos)
          currentGroup.push(product);
        } else {
          // Novo grupo
          if (currentGroup.length > 0) {
            groups.push(currentGroup);
          }
          currentGroup = [product];
        }
        lastUpdatedAt = updatedAt;
      });
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }

      // Criar chaves únicas para cada grupo
      groups.forEach((group, index) => {
        const key = `CONCLUIDA_${date}_${index}`;
        concludedGrouped[key] = group;
      });
    });

    // Agrupar produtos ativos por data de criação (timezone Brasil)
    const activeGrouped: Record<string, LostProduct[]> = {};
    activeProducts.forEach((product) => {
      const date = getBrazilDate(product.createdAt);
      const key = `ATIVA_${date}`;
      if (!activeGrouped[key]) {
        activeGrouped[key] = [];
      }
      activeGrouped[key].push(product);
    });

    // Combinar grupos (produtos concluídos e ativos nunca devem ser mesclados)
    Object.assign(grouped, concludedGrouped);
    Object.assign(grouped, activeGrouped);

    // Criar labels para exibição
    const displayGrouped: Record<string, LostProduct[]> = {};
    const dateLabels: Record<string, string> = {};

    Object.keys(grouped).forEach((key) => {
      const products = grouped[key];
      if (key.startsWith("CONCLUIDA_")) {
        // Remover prefixo CONCLUIDA_ e hash, deixando apenas a data
        const parts = key.replace("CONCLUIDA_", "").split("_");
        const date = parts[0]; // A data é a primeira parte
        displayGrouped[key] = products;
        dateLabels[key] = date;
      } else if (key.startsWith("ATIVA_")) {
        const date = key.replace("ATIVA_", "");
        displayGrouped[key] = products;
        dateLabels[key] = date;
      }
    });

    // Ordenar datas (mais recente primeiro)
    const sortedDates = Object.keys(displayGrouped).sort((a, b) => {
      const dateA = dateLabels[a];
      const dateB = dateLabels[b];
      const dateAObj = new Date(dateA.split("/").reverse().join("-"));
      const dateBObj = new Date(dateB.split("/").reverse().join("-"));
      // Listas ativas primeiro, depois concluídas (na mesma data)
      if (a.startsWith("ATIVA_") && b.startsWith("CONCLUIDA_")) return -1;
      if (a.startsWith("CONCLUIDA_") && b.startsWith("ATIVA_")) return 1;
      return dateBObj.getTime() - dateAObj.getTime();
    });

    return { grouped: displayGrouped, sortedDates, dateLabels };
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

  const handleFreightChange = (dateKey: string, value: string) => {
    // Permitir apenas números, vírgulas e pontos
    const cleanValue = value.replace(/[^0-9,]/g, "").replace(/,/g, ".");

    // Se estiver vazio, definir como 0
    if (cleanValue === "" || cleanValue === ".") {
      setFreightPercentages((prev) => ({
        ...prev,
        [dateKey]: 0,
      }));
      return;
    }

    // Permitir apenas um ponto decimal
    const parts = cleanValue.split(".");
    if (parts.length > 2) {
      return; // Bloqueia se tiver mais de um ponto
    }

    const numValue = Number.parseFloat(cleanValue);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setFreightPercentages((prev) => ({
        ...prev,
        [dateKey]: numValue,
      }));
    }
  };

  const handleConfirmFreight = (dateKey: string) => {
    const freightPercentage = freightPercentages[dateKey] || 0;
    setConfirmedFreightPercentages((prev) => ({
      ...prev,
      [dateKey]: freightPercentage,
    }));
    setOpenNotification({
      type: "success",
      title: "Sucesso!",
      notification: "Frete confirmado!",
    });
  };

  const handleComplete = async (dateKey: string, displayDate: string, products: LostProduct[]) => {
    // Verificar se já está concluída (todos os produtos têm completedDate igual a displayDate)
    const isAlreadyCompleted = products.every((p) => p.completedDate === displayDate);
    if (isAlreadyCompleted) {
      Swal.fire({
        icon: "warning",
        title: "Aviso!",
        text: "Esta lista já foi concluída anteriormente.",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton:
            "bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md",
        },
      });
      return;
    }

    const freightPercentage = confirmedFreightPercentages[dateKey] || 0;
    // Removida validação de frete - permite concluir com frete zerado
    const subtotal = products.reduce((sum, p) => sum + p.refundValue, 0);
    const freightValue = subtotal * (freightPercentage / 100);
    const total = subtotal + freightValue;

    const { value: carrierId } = await Swal.fire({
      title: "Finalizar Lista de Produtos Perdidos",
      html: `
        <div style="text-align: left; padding: 0.5rem 0;">
          <div style="margin-bottom: 1rem; padding: 0.75rem; background-color: #eff6ff; border-radius: 0.5rem; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; font-size: 0.875rem; color: #1e40af; font-weight: 600;">Valor Total a Creditar:</p>
            <p style="margin: 0.25rem 0 0 0; font-size: 1.5rem; font-weight: 700; color: #1e3a8a;">${formatCurrency(
              total
            )}</p>
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
        confirmButton:
          "bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold mr-2 transition-colors shadow-md",
        cancelButton:
          "bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md",
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

      // Chamar endpoint do backend para finalizar lista por data
      await api.post("/invoice/lost-products/finalize-by-date", {
        date: displayDate,
        carrierId,
        freightPercentage,
      });

      // Recarregar lista de produtos perdidos para atualizar com completedDate
      await fetchLostProducts();

      Swal.fire({
        icon: "success",
        title: "Sucesso!",
        text: "Lista de produtos perdidos finalizada e valor creditado no caixa!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton:
            "bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md",
        },
      });
    } catch (error: any) {
      console.error("Erro ao finalizar lista:", error);
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: error?.response?.data?.message || error?.response?.data?.error || "Não foi possível finalizar a lista.",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton:
            "bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const { grouped, sortedDates, dateLabels } = groupProductsByDate();

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
        <div className="text-center py-8 text-gray-500">Nenhum produto perdido registrado.</div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateKey) => {
            const dateProducts = grouped[dateKey];
            const displayDate = dateLabels[dateKey] || dateKey.replace(/^(CONCLUIDA_|ATIVA_)/, "");
            const isExpanded = expandedDates.has(dateKey);
            // Lista está concluída se a chave começa com "CONCLUIDA_"
            const isCompleted = dateKey.startsWith("CONCLUIDA_");
            // Usar freightPercentage do primeiro produto se concluído, senão usar confirmedFreightPercentages
            const freightPercentage = isCompleted
              ? dateProducts[0]?.freightPercentage || 0
              : confirmedFreightPercentages[dateKey] || 0;
            const subtotal = dateProducts.reduce((sum, p) => sum + p.refundValue, 0);
            const freightValue = subtotal * (freightPercentage / 100);
            const total = subtotal + freightValue;
            // Para edição (input), usar freightPercentages (ainda não confirmado)
            const editingFreightPercentage = freightPercentages[dateKey] || 0;
            // Calcular total de itens (soma das quantidades)
            const totalItems = dateProducts.reduce((sum, p) => sum + p.quantity, 0);

            return (
              <div
                key={dateKey}
                className={`border rounded-lg transition-all duration-300 ${
                  isCompleted ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
                }`}
              >
                {/* Header clicável */}
                <div
                  onClick={() => toggleExpand(dateKey)}
                  className={`p-4 cursor-pointer transition-all duration-200 ${
                    isCompleted ? "bg-blue-50 hover:bg-blue-100" : "bg-red-50 hover:bg-red-100"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 flex items-start gap-3">
                      <div
                        className={`mt-1 transition-transform duration-300 ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                      >
                        <ChevronDown className="text-gray-600" size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-800">Perdidos {displayDate}</h3>
                          {isCompleted && (
                            <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                              ✅ Concluída
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <p className="text-gray-600">
                            {totalItems} item{totalItems !== 1 ? "s" : ""}
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
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Produto
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Invoice
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantidade
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Valor Individual
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Valor a Receber
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {dateProducts.map((product, index) => {
                            // Debug: log COMPLETO do produto
                            if (index === 0) {
                              console.log("🔍 PRODUTO PERDIDO COMPLETO:", product);
                              console.log("🔍 Tem product direto?", !!product.product);
                              console.log("🔍 Tem invoice direto?", !!product.invoice);
                              console.log("🔍 Nome do produto:", product.product?.name || "NÃO TEM");
                              console.log("🔍 Número da invoice:", product.invoice?.number || "NÃO TEM");
                              console.log("🔍 ARRAYS DISPONÍVEIS:", {
                                totalProducts: products.length,
                                totalInvoices: invoices.length,
                                primeiroProduct: products[0],
                                primeiraInvoice: invoices[0],
                              });
                            }
                            
                            // Debug: log do produto completo
                            if (!product.invoiceProduct) {
                              console.warn("⚠️ Produto perdido sem invoiceProduct:", {
                                lostProductId: product.id,
                                invoiceProductId: product.invoiceProductId,
                                totalProducts: products.length,
                                totalInvoices: invoices.length,
                              });
                            }
                            
                            // Calcular valor individual baseado no refundValue e quantidade como fallback
                            const individualValue = product.quantity > 0 ? product.refundValue / product.quantity : 0;
                            // Usar o valor do invoiceProduct se disponível, senão usar o calculado
                            const displayIndividualValue = product.invoiceProduct?.value && product.invoiceProduct.value > 0 
                              ? product.invoiceProduct.value 
                              : individualValue;
                            
                            // Tentar obter nome do produto de várias formas
                            // PRIORIDADE:
                            // 1. product.product.name (quando invoiceProduct é null mas tem product direto)
                            // 2. invoiceProduct.product.name (quando tem invoiceProduct)
                            // 3. Buscar no array products
                            let productName = "Produto não encontrado";
                            
                            if (product.product?.name) {
                              // Caso 1: produto vem direto (quando invoiceProduct é null)
                              productName = product.product.name;
                            } else if (product.invoiceProduct?.product?.name) {
                              // Caso 2: produto vem via invoiceProduct
                              productName = product.invoiceProduct.product.name;
                            } else if (product.productId) {
                              // Caso 3: buscar pelo productId no array
                              const foundProduct = products.find(p => p.id === product.productId);
                              if (foundProduct?.name) {
                                productName = foundProduct.name;
                              }
                            }
                            
                            // Tentar obter número da invoice de várias formas
                            // PRIORIDADE:
                            // 1. product.invoice.number (quando invoiceProduct é null mas tem invoice direto)
                            // 2. invoiceProduct.invoice.number (quando tem invoiceProduct)
                            // 3. Buscar no array invoices
                            let invoiceNumber = "Sem invoice vinculada";
                            
                            if (product.invoice?.number) {
                              // Caso 1: invoice vem direto (quando invoiceProduct é null)
                              invoiceNumber = product.invoice.number;
                            } else if (product.invoiceProduct?.invoice?.number) {
                              // Caso 2: invoice vem via invoiceProduct
                              invoiceNumber = product.invoiceProduct.invoice.number;
                            } else if (product.invoiceId) {
                              // Caso 3: buscar pelo invoiceId no array
                              const foundInvoice = invoices.find(inv => inv.id === product.invoiceId);
                              if (foundInvoice?.number) {
                                invoiceNumber = foundInvoice.number;
                              }
                            }
                            
                            return (
                              <tr key={product.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                  {productName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                  {invoiceNumber}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                  {product.quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                                  {formatCurrency(displayIndividualValue)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600 text-center">
                                  {formatCurrency(product.refundValue)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-blue-100 font-semibold">
                            <td className="px-6 py-3 text-sm text-gray-800 text-center">Subtotal</td>
                            <td className="px-6 py-3 text-sm text-gray-800 text-center">—</td>
                            <td className="px-6 py-3 text-sm text-gray-800 text-center">
                              {dateProducts.reduce((sum, p) => sum + p.quantity, 0)}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-800 text-center">—</td>
                            <td className="px-6 py-3 text-sm text-gray-800 text-center">{formatCurrency(subtotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Cards de Frete e Concluir Lista */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* Card Frete */}
                      <div className="bg-gray-50 p-4 rounded-2xl border shadow-sm">
                        <label className="block text-sm text-gray-600 mb-2">Frete (%):</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editingFreightPercentage > 0 ? editingFreightPercentage.toString().replace(".", ",") : ""}
                          onChange={(e) => handleFreightChange(dateKey, e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={isCompleted || isSubmitting}
                          placeholder="0,00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-semibold mb-3"
                        />
                        <button
                          onClick={() => handleConfirmFreight(dateKey)}
                          disabled={
                            isCompleted ||
                            isSubmitting ||
                            editingFreightPercentage === (confirmedFreightPercentages[dateKey] || 0)
                          }
                          className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${
                            isCompleted || editingFreightPercentage === (confirmedFreightPercentages[dateKey] || 0)
                              ? "bg-gray-400 cursor-not-allowed text-white"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          Confirmar
                        </button>
                      </div>

                      {/* Card Concluir Lista */}
                      <div className="bg-gray-50 p-4 rounded-2xl border shadow-sm flex items-end">
                        <button
                          onClick={() => handleComplete(dateKey, displayDate, dateProducts)}
                          disabled={isCompleted || isSubmitting}
                          className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${
                            isCompleted
                              ? "bg-gray-400 cursor-not-allowed text-white"
                              : "bg-green-600 hover:bg-green-700 text-white"
                          }`}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                              Processando...
                            </>
                          ) : (
                            "Concluir Lista"
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Card azul final com totais */}
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 shadow-sm mt-4">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-800">Subtotal:</p>
                          <p className="text-lg font-bold text-blue-800 mt-1">{formatCurrency(subtotal)}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-800">Total do Frete:</p>
                          <p className="text-lg font-bold text-blue-800 mt-1">{formatCurrency(freightValue)}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-800">Total da Invoice dos Perdidos:</p>
                          <p className="text-xl font-bold text-blue-800 mt-1">{formatCurrency(total)}</p>
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
