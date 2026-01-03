import { useState, useEffect } from "react";
import { AlertTriangle, Edit, Trash2, Plus, Loader2, Eye } from "lucide-react";
import Swal from "sweetalert2";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";
import { formatCurrency } from "../../../cambiobackoffice/formatCurrencyUtil";

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
  const [formData, setFormData] = useState({
    invoiceId: "",
    productId: "",
    quantity: "",
    freightPercentage: "",
    notes: "",
  });
  const { setOpenNotification } = useNotification();

  useEffect(() => {
    fetchLostProducts();
    fetchSummary();
    fetchInvoicesAndProducts();
  }, []);

  const fetchInvoicesAndProducts = async () => {
    try {
      const [invoiceResponse, productsResponse] = await Promise.all([
        api.get("/invoice/get"),
        api.get("/invoice/product", { params: { limit: 1000 } }),
      ]);
      setInvoices(invoiceResponse.data || []);
      const productsData = Array.isArray(productsResponse.data) 
        ? productsResponse.data 
        : productsResponse.data.products || [];
      setProducts(productsData.filter((p: any) => p.active !== false));
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

  const handleCreate = async () => {
    if (!formData.invoiceId || !formData.productId || !formData.quantity) {
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: "Preencha todos os campos obrigatórios (Invoice, Produto e Quantidade).",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/invoice/lost-products", {
        invoiceId: formData.invoiceId,
        productId: formData.productId,
        quantity: Number.parseInt(formData.quantity, 10),
        freightPercentage: formData.freightPercentage ? Number.parseFloat(formData.freightPercentage) : undefined,
        notes: formData.notes || undefined,
      });

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "Produto perdido registrado com sucesso!",
      });

      setShowModal(false);
      setFormData({ invoiceId: "", productId: "", quantity: "", freightPercentage: "", notes: "" });
      await fetchLostProducts();
      await fetchSummary();
    } catch (error: any) {
      console.error("Erro ao criar produto perdido:", error);
      const errorMessage = error?.response?.data?.message || "Não foi possível registrar o produto perdido.";
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: errorMessage,
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    const product = lostProducts.find((p) => p.id === id);
    if (!product) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/invoice/lost-products/${id}`, {
        freightPercentage: formData.freightPercentage ? Number.parseFloat(formData.freightPercentage) : undefined,
        notes: formData.notes || undefined,
      });

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "Produto perdido atualizado com sucesso!",
      });

      setShowModal(false);
      setEditingProduct(null);
      setFormData({ invoiceId: "", productId: "", quantity: "", freightPercentage: "", notes: "" });
      await fetchLostProducts();
      await fetchSummary();
    } catch (error: any) {
      console.error("Erro ao atualizar produto perdido:", error);
      const errorMessage = error?.response?.data?.message || "Não foi possível atualizar o produto perdido.";
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: errorMessage,
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Tem certeza?",
      text: "Você não poderá reverter esta ação!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, deletar!",
      cancelButtonText: "Cancelar",
      buttonsStyling: false,
      customClass: {
        confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold mr-2",
        cancelButton: "bg-gray-500 text-white hover:bg-gray-600 px-4 py-2 rounded font-semibold",
      },
    });

    if (result.isConfirmed) {
      setIsSubmitting(true);
      try {
        await api.delete(`/invoice/lost-products/${id}`);
        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: "Produto perdido removido com sucesso!",
        });
        await fetchLostProducts();
        await fetchSummary();
      } catch (error: any) {
        console.error("Erro ao deletar produto perdido:", error);
        Swal.fire({
          icon: "error",
          title: "Erro!",
          text: "Não foi possível deletar o produto perdido.",
          confirmButtonText: "Ok",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const openEditModal = (product: LostProduct) => {
    setEditingProduct(product);
    setFormData({
      invoiceId: product.invoiceProduct?.invoice?.id || "",
      productId: product.invoiceProduct?.productId || "",
      quantity: product.quantity.toString(),
      freightPercentage: product.freightPercentage.toString(),
      notes: product.notes || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({ invoiceId: "", productId: "", quantity: "", freightPercentage: "", notes: "" });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-red-700 flex items-center">
          <AlertTriangle className="mr-2" size={20} />
          Produtos Perdidos
        </h2>
        {/* Botão comentado temporariamente - não será usado no momento */}
        {/* <button
          onClick={() => setShowModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center"
          disabled={isSubmitting}
        >
          <Plus className="mr-2" size={16} />
          Registrar Produto Perdido
        </button> */}
      </div>

      {/* Resumo */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-sm text-gray-600">Total de Produtos Perdidos</p>
            <p className="text-2xl font-bold text-red-700">{summary.summary.totalLostProducts}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-gray-600">Valor Total a Receber</p>
            <p className="text-2xl font-bold text-yellow-700">
              {formatCurrency(summary.summary.totalRefund)}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600">Valor Total de Frete</p>
            <p className="text-2xl font-bold text-blue-700">
              {formatCurrency(summary.summary.totalFreightValue)}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
        </div>
      ) : lostProducts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Nenhum produto perdido registrado.
        </div>
      ) : (
        <div className="overflow-x-auto">
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
                  % Frete
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Frete
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor a Receber
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lostProducts.map((product) => (
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {product.freightPercentage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {formatCurrency(product.freightValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                    {formatCurrency((product.invoiceProduct?.value || 0) * product.quantity)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600 text-right">
                    {formatCurrency(product.refundValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => openEditModal(product)}
                        className="text-blue-600 hover:text-blue-900"
                        disabled={isSubmitting}
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={isSubmitting}
                        title="Deletar"
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rodapé com totais */}
      {lostProducts.length > 0 && (
        <div className="mt-6 bg-blue-50 p-4 rounded-2xl border border-blue-200 shadow">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
            <div>
              <p className="text-sm font-medium text-blue-800">Total de Produtos Perdidos:</p>
              <p className="text-xl font-bold text-blue-800">
                {formatCurrency(
                  lostProducts.reduce((sum, product) => sum + product.refundValue, 0)
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-green-600">
                Frete Total: {formatCurrency(lostProducts.reduce((sum, product) => sum + product.freightValue, 0))}
              </p>
              <p className="text-xs text-blue-700">
                % Frete Média:{" "}
                {lostProducts.length > 0
                  ? (
                      lostProducts.reduce((sum, product) => sum + product.freightPercentage, 0) /
                      lostProducts.length
                    ).toFixed(2)
                  : "0.00"}
                %
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Criar/Editar */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">
              {editingProduct ? "Editar Produto Perdido" : "Registrar Produto Perdido"}
            </h3>
            
            {!editingProduct && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded-r">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Eye className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">📋 Como usar este formulário:</h4>
                    <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
                      <li>
                        <strong>1. Selecione a Invoice:</strong> Escolha a nota fiscal onde o produto estava. 
                        Você pode ver o número da invoice, fornecedor e data.
                      </li>
                      <li>
                        <strong>2. Selecione o Produto:</strong> Após escolher a invoice, aparecerão os produtos dessa nota. 
                        Escolha o produto que foi perdido. A lista mostra a quantidade pendente disponível.
                      </li>
                      <li>
                        <strong>3. Informe a Quantidade:</strong> Digite quantas unidades desse produto foram perdidas. 
                        O campo mostra automaticamente o máximo disponível.
                      </li>
                      <li>
                        <strong>4. % de Frete (opcional):</strong> Se quiser aplicar uma porcentagem de frete no cálculo, 
                        informe aqui (0-100). Deixe em branco se não quiser aplicar.
                      </li>
                      <li>
                        <strong>5. Observações (opcional):</strong> Adicione qualquer informação adicional sobre o produto perdido.
                      </li>
                    </ol>
                    <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
                      <strong>💡 Dica:</strong> Você também pode marcar produtos como perdidos diretamente na lista de produtos pendentes 
                      na aba "Relatórios", clicando no botão "Perdido" ao lado de cada produto.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {!editingProduct && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.invoiceId}
                      onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value, productId: "" })}
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-red-500 focus:border-red-500"
                      disabled={isSubmitting}
                    >
                      <option value="">Selecione uma invoice</option>
                      {invoices
                        .filter((inv) => !inv.completed)
                        .map((invoice) => (
                          <option key={invoice.id} value={invoice.id}>
                            {invoice.number} - {invoice.supplier?.name || "Sem fornecedor"} -{" "}
                            {new Date(invoice.date).toLocaleDateString("pt-BR")}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Produto <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.productId}
                      onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-red-500 focus:border-red-500"
                      disabled={isSubmitting || !formData.invoiceId}
                    >
                      <option value="">{formData.invoiceId ? "Selecione um produto" : "Selecione primeiro uma invoice"}</option>
                      {formData.invoiceId &&
                        invoices
                          .find((inv) => inv.id === formData.invoiceId)
                          ?.products?.map((prod: any) => {
                            const productInfo = products.find((p) => p.id === prod.productId);
                            return (
                              <option key={prod.id} value={prod.productId}>
                                {productInfo?.name || `Produto ${prod.productId}`} - Qtd: {prod.quantity} - Pendente:{" "}
                                {prod.quantity - (prod.receivedQuantity || 0) - (prod.quantityAnalizer || 0)}
                              </option>
                            );
                          })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade Perdida <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Aceitar apenas números inteiros
                        if (value === "" || /^\d+$/.test(value)) {
                          setFormData({ ...formData, quantity: value });
                        }
                      }}
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-red-500 focus:border-red-500"
                      disabled={isSubmitting || !formData.productId}
                      placeholder={
                        formData.productId
                          ? invoices
                              .find((inv) => inv.id === formData.invoiceId)
                              ?.products?.find((p: any) => p.productId === formData.productId)
                              ? `Máx: ${Math.floor(
                                  (invoices
                                    .find((inv) => inv.id === formData.invoiceId)
                                    ?.products?.find((p: any) => p.productId === formData.productId)?.quantity || 0) -
                                  ((invoices
                                    .find((inv) => inv.id === formData.invoiceId)
                                    ?.products?.find((p: any) => p.productId === formData.productId)
                                    ?.receivedQuantity || 0) +
                                    (invoices
                                      .find((inv) => inv.id === formData.invoiceId)
                                      ?.products?.find((p: any) => p.productId === formData.productId)
                                      ?.quantityAnalizer || 0))
                                )}`
                          : "Quantidade perdida"
                          : "Selecione produto primeiro"
                      }
                    />
                  </div>
                </>
              )}
              {editingProduct && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">
                    <strong>Invoice:</strong> {editingProduct.invoiceProduct?.invoice?.number || "—"}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Produto:</strong> {editingProduct.invoiceProduct?.product?.name || "—"}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Quantidade:</strong> {editingProduct.quantity}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  % de Frete (0-100)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.freightPercentage}
                  onChange={(e) => setFormData({ ...formData, freightPercentage: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-red-500 focus:border-red-500"
                  disabled={isSubmitting}
                  placeholder="Ex: 50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-red-500 focus:border-red-500"
                  disabled={isSubmitting}
                  rows={3}
                  placeholder="Observações sobre o produto perdido"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={closeModal}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => (editingProduct ? handleUpdate(editingProduct.id) : handleCreate())}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2" size={16} />
                  )}
                  {editingProduct ? "Atualizar" : "Registrar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

