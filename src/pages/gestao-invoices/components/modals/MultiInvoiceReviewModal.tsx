import { useState, useEffect, useRef } from "react";
import { X, Save, AlertTriangle, Package, Check, ChevronDown, ChevronUp, Link2, Plus } from "lucide-react";
import Swal from "sweetalert2";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";
import { useActionLoading } from "../../context/ActionLoadingContext";
import { ProductSearchSelect } from "../sections/SupplierSearchSelect";
import type { PdfData, PdfProduct } from "./ReviewPdfModal";

type ProductFromDb = { id: string; name: string; code?: string; priceweightAverage?: number };

interface MultiInvoiceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Lista de PDFs (cada um = uma invoice em uma aba) */
  pdfDataList: PdfData[];
  /** Campos da invoice atual para usar ao criar (fornecedor, carrier, etc.) */
  defaultInvoice: {
    supplierId: string;
    carrierId: string;
    carrier2Id: string;
    taxaSpEs: string | number;
    [key: string]: any;
  };
  /** Chamado quando todas as invoices das abas forem salvas e o usuário fechar */
  onAllSaved?: () => void;
}

export function MultiInvoiceReviewModal({
  isOpen,
  onClose,
  pdfDataList,
  defaultInvoice,
  onAllSaved,
}: MultiInvoiceReviewModalProps) {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [editedDataList, setEditedDataList] = useState<PdfData[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [productsFromDb, setProductsFromDb] = useState<ProductFromDb[]>([]);
  const [numberExistsInDb, setNumberExistsInDb] = useState(false);
  const [numberCheckLoading, setNumberCheckLoading] = useState(false);
  const numberCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState("");
  const [quantityToAdd, setQuantityToAdd] = useState("");
  const { setOpenNotification } = useNotification();
  const { executeAction } = useActionLoading();

  const currentData = editedDataList[activeTabIndex];
  const allSaved = pdfDataList.length > 0 && savedIndices.size === pdfDataList.length;

  useEffect(() => {
    if (!isOpen) return;
    api
      .get("/invoice/product")
      .then((res) => {
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : raw?.products ?? [];
        setProductsFromDb(list);
      })
      .catch(() => setProductsFromDb([]));
  }, [isOpen]);

  // Verificar se número da invoice já existe no BD (debounced)
  useEffect(() => {
    const number = String(currentData?.invoiceData?.number ?? "").trim();
    if (!number) {
      setNumberExistsInDb(false);
      setNumberCheckLoading(false);
      return;
    }
    if (numberCheckTimerRef.current) clearTimeout(numberCheckTimerRef.current);
    setNumberCheckLoading(true);
    numberCheckTimerRef.current = setTimeout(() => {
      numberCheckTimerRef.current = null;
      api
        .get("/invoice/exists-by-number", { params: { number } })
        .then((res) => {
          setNumberExistsInDb(Boolean(res.data?.exists));
          setNumberCheckLoading(false);
        })
        .catch(() => {
          // Fallback se o endpoint ainda não existir: usar lista completa
          api
            .get("/invoice/get")
            .then((fallbackRes) => {
              const list = Array.isArray(fallbackRes.data) ? fallbackRes.data : fallbackRes.data?.data ?? [];
              const exists = list.some(
                (inv: any) => String(inv?.number ?? "").trim().toLowerCase() === number.toLowerCase()
              );
              setNumberExistsInDb(exists);
            })
            .catch(() => setNumberExistsInDb(false))
            .finally(() => setNumberCheckLoading(false));
        });
    }, 400);
    return () => {
      if (numberCheckTimerRef.current) clearTimeout(numberCheckTimerRef.current);
    };
  }, [currentData?.invoiceData?.number]);

  useEffect(() => {
    if (isOpen && pdfDataList.length > 0) {
      setEditedDataList(pdfDataList.map((p) => ({ ...p })));
      setSavedIndices(new Set());
      setActiveTabIndex(0);
      setExpandedProducts(new Set());
      setNumberExistsInDb(false);
    }
  }, [isOpen, pdfDataList]);

  const setEditedDataAt = (index: number, data: PdfData) => {
    setEditedDataList((prev) => {
      const next = [...prev];
      next[index] = data;
      return next;
    });
  };

  const toggleProductExpand = (productIndex: number) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productIndex)) next.delete(productIndex);
      else next.add(productIndex);
      return next;
    });
  };

  const handleProductEdit = (productIndex: number, field: keyof PdfProduct, value: any) => {
    if (!currentData) return;
    const newProducts = [...currentData.products];
    newProducts[productIndex] = { ...newProducts[productIndex], [field]: value };
    setEditedDataAt(activeTabIndex, { ...currentData, products: newProducts });
  };

  const handleLinkProduct = (productIndex: number, productId: string) => {
    const productFromDb = productsFromDb.find((p) => p.id === productId);
    if (!productFromDb || !currentData) return;
    const newProducts = [...currentData.products];
    const current = newProducts[productIndex];
    newProducts[productIndex] = {
      ...current,
      name: productFromDb.name,
      rate: productFromDb.priceweightAverage ?? current.rate,
      validation: {
        ...current.validation,
        productId,
        exists: true,
        divergences: [],
      },
    };
    setEditedDataAt(activeTabIndex, { ...currentData, products: newProducts });
  };

  const handleAddProductFromDb = () => {
    const productFromDb = productsFromDb.find((p) => p.id === selectedProductIdToAdd);
    const qty = Number(quantityToAdd);
    if (!productFromDb || !currentData || !qty || qty <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Campos obrigatórios",
        text: "Selecione um produto e informe uma quantidade maior que zero.",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }
    const rate = productFromDb.priceweightAverage ?? 0;
    const amount = qty * rate;
    const newProduct: PdfProduct = {
      sku: productFromDb.id,
      name: productFromDb.name,
      description: "",
      quantity: qty,
      rate,
      amount,
      imeis: [],
      validation: {
        exists: true,
        productId: productFromDb.id,
        divergences: [],
      },
    };
    const newProducts = [...currentData.products, newProduct];
    const existingCount = newProducts.filter((p) => p.validation.exists).length;
    const newCount = newProducts.filter((p) => !p.validation.exists).length;
    const divCount = newProducts.filter((p) => p.validation.divergences.length > 0).length;
    setEditedDataAt(activeTabIndex, {
      ...currentData,
      products: newProducts,
      summary: {
        totalProducts: newProducts.length,
        existingProducts: existingCount,
        newProducts: newCount,
        productsWithDivergences: divCount,
      },
    });
    setSelectedProductIdToAdd("");
    setQuantityToAdd("");
  };

  const handleSaveThisInvoice = async () => {
    if (!currentData) return;
    if (numberExistsInDb) {
      Swal.fire({
        icon: "error",
        title: "Número já existe",
        text: "Já existe uma invoice com este número no banco. Altere o número para continuar.",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }
    const hasEmpty = currentData.products.some((p) => !p.name || p.quantity <= 0 || p.rate <= 0);
    if (hasEmpty) {
      Swal.fire({
        icon: "warning",
        title: "Dados Incompletos",
        text: "Todos os produtos devem ter nome, quantidade e valor preenchidos.",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    if (!defaultInvoice.supplierId) {
      setOpenNotification({
        type: "warning",
        title: "Atenção",
        notification: "Selecione um fornecedor na tela principal antes de salvar.",
      });
      return;
    }

    await executeAction(async () => {
      const now = new Date();
      const time = now.toTimeString().split(" ")[0];
      const dateWithTime = new Date(`${currentData.invoiceData.date}T${time}`);

      const products = currentData.products.map((p) => ({
        id: p.validation.productId || p.sku,
        name: p.name,
        quantity: p.quantity,
        value: p.rate,
        weight: 0,
        total: p.amount,
        received: false,
        receivedQuantity: 0,
        _imeis: p.imeis || [],
      }));

      const payload = {
        id: null,
        number: currentData.invoiceData.number,
        date: dateWithTime,
        supplierId: defaultInvoice.supplierId,
        carrierId: defaultInvoice.carrierId || "",
        carrier2Id: defaultInvoice.carrier2Id || "",
        taxaSpEs:
          defaultInvoice.taxaSpEs == null || defaultInvoice.taxaSpEs === ""
            ? "0"
            : String(defaultInvoice.taxaSpEs).trim(),
        products,
        paid: false,
        paidDate: null,
        paidDollarRate: null,
        completed: false,
        completedDate: null,
        amountTaxcarrier: 0,
        amountTaxcarrier2: 0,
        amountTaxSpEs: 0,
        overallValue: 0,
        subAmount: 0,
      };

      const response = await api.post("/invoice/create", payload);
      const createdInvoice = response.data;

      if (createdInvoice?.products && Array.isArray(createdInvoice.products)) {
        let savedImeisCount = 0;
        let totalImeisCount = 0;
        for (let i = 0; i < products.length; i++) {
          const localProduct = products[i];
          const createdProduct = createdInvoice.products[i];
          if (
            localProduct._imeis &&
            Array.isArray(localProduct._imeis) &&
            localProduct._imeis.length > 0
          ) {
            totalImeisCount += localProduct._imeis.length;
            try {
              await api.post("/invoice/imeis/save", {
                invoiceProductId: createdProduct.id,
                imeis: localProduct._imeis,
              });
              savedImeisCount += localProduct._imeis.length;
            } catch (err: any) {
              if (err.response?.status !== 409) console.error("Erro ao salvar IMEIs:", err);
            }
          }
        }
        if (totalImeisCount > 0) {
          setOpenNotification({
            type: "success",
            title: "IMEIs salvos",
            notification: `${savedImeisCount} de ${totalImeisCount} IMEIs salvos para esta invoice.`,
          });
        }
      }

      setOpenNotification({
        type: "success",
        title: "Invoice salva",
        notification: `Invoice ${currentData.invoiceData.number} salva com sucesso!`,
      });

      setSavedIndices((prev) => new Set(prev).add(activeTabIndex));
    }, "saveTabInvoice").catch((err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Erro ao salvar a invoice.";
      setOpenNotification({ type: "error", title: "Erro", notification: msg });
    });
  };

  const handleClose = () => {
    if (!allSaved) return;
    onAllSaved?.();
    onClose();
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }).format(value);

  if (!isOpen || pdfDataList.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => allSaved && handleClose()}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Revisar Dados Extraídos</h2>
            <p className="text-sm text-gray-600 mt-1">
              Cada aba é uma invoice. Revise, salve uma por uma. Só pode fechar quando todas estiverem salvas.
            </p>
          </div>
          <button
            onClick={() => allSaved && handleClose()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs (estilo Excel) */}
        <div className="border-b bg-gray-50 px-4 pt-2 flex flex-wrap gap-1">
          {editedDataList.map((data, index) => {
            const isSaved = savedIndices.has(index);
            const num = data?.invoiceData?.number ?? `#${index + 1}`;
            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setActiveTabIndex(index);
                  setExpandedProducts(new Set());
                }}
                className={`px-4 py-2 rounded-t-lg border-b-2 font-medium transition-colors ${
                  activeTabIndex === index
                    ? "border-blue-600 bg-white text-blue-700 -mb-px"
                    : isSaved
                    ? "border-green-500 bg-green-50 text-green-800 hover:bg-green-100"
                    : "border-transparent bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {isSaved && <Check size={14} className="inline mr-1" />}
                Invoice {num}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!currentData ? null : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Informações da Invoice</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        numberExistsInDb ? "text-red-700" : "text-gray-700"
                      }`}
                    >
                      Número
                      {numberExistsInDb && " — Já existe no banco"}
                      {numberCheckLoading && !numberExistsInDb && " (verificando...)"}
                    </label>
                    <input
                      type="text"
                      value={currentData.invoiceData.number}
                      onChange={(e) =>
                        setEditedDataAt(activeTabIndex, {
                          ...currentData,
                          invoiceData: { ...currentData.invoiceData, number: e.target.value },
                        })
                      }
                      className={`w-full px-3 py-2 border rounded-md ${
                        numberExistsInDb
                          ? "border-red-500 bg-red-50 text-red-900 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input
                      type="date"
                      value={currentData.invoiceData.date}
                      onChange={(e) =>
                        setEditedDataAt(activeTabIndex, {
                          ...currentData,
                          invoiceData: { ...currentData.invoiceData, date: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emails</label>
                    <div className="text-sm text-gray-600">
                      {currentData.invoiceData.emails?.join(", ") || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Total de Produtos</div>
                  <div className="text-2xl font-bold text-gray-900">{currentData.summary.totalProducts}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm text-green-700">Existentes no Banco</div>
                  <div className="text-2xl font-bold text-green-700">{currentData.summary.existingProducts}</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-sm text-yellow-700">Produtos Novos</div>
                  <div className="text-2xl font-bold text-yellow-700">{currentData.summary.newProducts}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm text-red-700">Com Divergências</div>
                  <div className="text-2xl font-bold text-red-700">{currentData.summary.productsWithDivergences}</div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Plus size={20} />
                  Adicionar produto do banco de dados
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Selecione um produto cadastrado e a quantidade para incluir na invoice.
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[200px] flex-1">
                    <ProductSearchSelect
                      products={productsFromDb}
                      value={selectedProductIdToAdd}
                      onChange={setSelectedProductIdToAdd}
                      inline
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qtd</label>
                    <input
                      type="number"
                      min={1}
                      value={quantityToAdd}
                      onChange={(e) => setQuantityToAdd(e.target.value)}
                      placeholder="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddProductFromDb}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Adicionar
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package size={20} />
                  Produtos ({currentData.products.length})
                </h3>
                <div className="space-y-3">
                  {currentData.products.map((product, productIndex) => {
                    const isExpanded = expandedProducts.has(productIndex);
                    const hasDivergences = product.validation.divergences.length > 0;
                    const isNew = !product.validation.exists;
                    return (
                      <div
                        key={productIndex}
                        className={`border rounded-lg overflow-hidden ${
                          hasDivergences ? "border-red-300 bg-red-50" : isNew ? "border-yellow-300 bg-yellow-50" : "border-green-300 bg-green-50"
                        }`}
                      >
                        <div
                          className="p-4 cursor-pointer hover:bg-opacity-80"
                          onClick={() => toggleProductExpand(productIndex)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex-shrink-0">
                                {product.validation.exists ? (
                                  <Check size={20} className="text-green-600" />
                                ) : (
                                  <AlertTriangle size={20} className="text-yellow-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-600">
                                  Qtd: {product.quantity} | Valor: {formatCurrency(product.rate)} | Total:{" "}
                                  {formatCurrency(product.amount)}
                                  {product.imeis.length > 0 && (
                                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                      {product.imeis.length} IMEIs
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t bg-white p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                <input
                                  type="text"
                                  value={product.name}
                                  onChange={(e) => handleProductEdit(productIndex, "name", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                                <input
                                  type="number"
                                  value={product.quantity}
                                  onChange={(e) => handleProductEdit(productIndex, "quantity", Number(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Unitário</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={product.rate}
                                  onChange={(e) => handleProductEdit(productIndex, "rate", Number(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                              <div className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
                                <Link2 size={16} />
                                Vincular produto já existente
                              </div>
                              <p className="text-sm text-blue-800 mb-2">
                                A invoice nem sempre vem completa. Selecione um produto do banco para vincular e
                                completar nome/valor a partir do cadastro.
                              </p>
                              <ProductSearchSelect
                                products={productsFromDb}
                                value={product.validation.productId || ""}
                                onChange={(id) => handleLinkProduct(productIndex, id)}
                                inline
                              />
                            </div>
                            {product.imeis.length > 0 && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  IMEIs/Seriais ({product.imeis.length})
                                </label>
                                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 max-h-32 overflow-y-auto">
                                  <div className="flex flex-wrap gap-2">
                                    {product.imeis.map((imei, imeiIndex) => (
                                      <span
                                        key={imeiIndex}
                                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono"
                                      >
                                        {imei}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-4 p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {allSaved ? (
              <span className="text-green-700 font-medium">Todas as invoices foram salvas. Você pode fechar.</span>
            ) : (
              <span>Salve todas as invoices para poder fechar o modal.</span>
            )}
          </div>
          <div className="flex gap-3">
            {!savedIndices.has(activeTabIndex) && (
              <button
                type="button"
                onClick={handleSaveThisInvoice}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save size={18} />
                Salvar esta Invoice
              </button>
            )}
            {savedIndices.has(activeTabIndex) && (
              <span className="px-4 py-2 rounded-lg bg-green-100 text-green-800 flex items-center gap-2">
                <Check size={18} />
                Salva
              </span>
            )}
            <button
              type="button"
              onClick={handleClose}
              disabled={!allSaved}
              className={`px-6 py-2 rounded-lg border transition-colors ${
                allSaved
                  ? "border-gray-300 hover:bg-white bg-white"
                  : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
