import { useState, useEffect, useRef } from "react";
import { X, Save, AlertTriangle, Package, Check, ChevronDown, ChevronUp, Link2, Plus } from "lucide-react";
import Swal from "sweetalert2";
import { api } from "../../../../services/api";
import { ProductSearchSelect } from "../sections/SupplierSearchSelect";

export interface PdfProduct {
  sku: string;
  name: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  imeis: string[];
  validation: {
    exists: boolean;
    productId: string | null;
    divergences: Array<{
      field: string;
      pdfValue: any;
      dbValue: any;
      severity: string;
    }>;
    needsReview?: boolean;
  };
}

export interface PdfData {
  invoiceData: {
    number: string;
    date: string;
    emails: string[];
  };
  products: PdfProduct[];
  summary: {
    totalProducts: number;
    existingProducts: number;
    newProducts: number;
    productsWithDivergences: number;
  };
}

interface ReviewPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfData: PdfData | null;
  onConfirm: (data: PdfData) => void;
}

type ProductFromDb = { id: string; name: string; code?: string; priceweightAverage?: number };

export function ReviewPdfModal({ isOpen, onClose, pdfData, onConfirm }: ReviewPdfModalProps) {
  const [editedData, setEditedData] = useState<PdfData | null>(pdfData);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [productsFromDb, setProductsFromDb] = useState<ProductFromDb[]>([]);
  const [numberExistsInDb, setNumberExistsInDb] = useState(false);
  const [numberCheckLoading, setNumberCheckLoading] = useState(false);
  const numberCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState("");
  const [quantityToAdd, setQuantityToAdd] = useState("");

  // Sincronizar quando abrir com outro PDF (ex.: próximo da fila em massa)
  useEffect(() => {
    if (isOpen && pdfData) {
      setEditedData(pdfData);
      setExpandedProducts(new Set());
      setNumberExistsInDb(false);
    }
  }, [isOpen, pdfData]);

  // Buscar produtos do banco para vincular
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
    const number = String(editedData?.invoiceData?.number ?? "").trim();
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
  }, [editedData?.invoiceData?.number]);

  if (!isOpen || !pdfData || !editedData) return null;

  const toggleProductExpand = (index: number) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleProductEdit = (index: number, field: keyof PdfProduct, value: any) => {
    setEditedData((prev) => {
      if (!prev) return prev;
      const newProducts = [...prev.products];
      newProducts[index] = { ...newProducts[index], [field]: value };
      return { ...prev, products: newProducts };
    });
  };

  const handleLinkProduct = (index: number, productId: string) => {
    const productFromDb = productsFromDb.find((p) => p.id === productId);
    if (!productFromDb) return;
    setEditedData((prev) => {
      if (!prev) return prev;
      const newProducts = [...prev.products];
      const current = newProducts[index];
      newProducts[index] = {
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
      return { ...prev, products: newProducts };
    });
  };

  const handleAddProductFromDb = () => {
    const productFromDb = productsFromDb.find((p) => p.id === selectedProductIdToAdd);
    const qty = Number(quantityToAdd);
    if (!productFromDb || !qty || qty <= 0) {
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
    setEditedData((prev) => {
      if (!prev) return prev;
      const newProducts = [...prev.products, newProduct];
      const existingCount = newProducts.filter((p) => p.validation.exists).length;
      const newCount = newProducts.filter((p) => !p.validation.exists).length;
      const divCount = newProducts.filter((p) => p.validation.divergences.length > 0).length;
      return {
        ...prev,
        products: newProducts,
        summary: {
          totalProducts: newProducts.length,
          existingProducts: existingCount,
          newProducts: newCount,
          productsWithDivergences: divCount,
        },
      };
    });
    setSelectedProductIdToAdd("");
    setQuantityToAdd("");
  };

  const handleConfirm = () => {
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
    const hasEmptyProducts = editedData.products.some((p) => !p.name || p.quantity <= 0 || p.rate <= 0);
    if (hasEmptyProducts) {
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
    onConfirm(editedData);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Revisar Dados Extraídos</h2>
            <p className="text-sm text-gray-600 mt-1">
              Confira os dados extraídos do PDF e faça ajustes se necessário
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invoice Info */}
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
                  value={editedData.invoiceData.number}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      invoiceData: { ...editedData.invoiceData, number: e.target.value },
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
                  value={editedData.invoiceData.date}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      invoiceData: { ...editedData.invoiceData, date: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emails</label>
                <div className="text-sm text-gray-600">
                  {editedData.invoiceData.emails.join(", ") || "Nenhum email encontrado"}
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600">Total de Produtos</div>
              <div className="text-2xl font-bold text-gray-900">{editedData.summary.totalProducts}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-700">Existentes no Banco</div>
              <div className="text-2xl font-bold text-green-700">{editedData.summary.existingProducts}</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm text-yellow-700">Produtos Novos</div>
              <div className="text-2xl font-bold text-yellow-700">{editedData.summary.newProducts}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-700">Com Divergências</div>
              <div className="text-2xl font-bold text-red-700">{editedData.summary.productsWithDivergences}</div>
            </div>
          </div>

          {/* Adicionar produto do banco */}
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

          {/* Products List */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package size={20} />
              Produtos ({editedData.products.length})
            </h3>
            <div className="space-y-3">
              {editedData.products.map((product, index) => {
                const isExpanded = expandedProducts.has(index);
                const hasDivergences = product.validation.divergences.length > 0;
                const isNew = !product.validation.exists;

                return (
                  <div
                    key={index}
                    className={`border rounded-lg overflow-hidden ${
                      hasDivergences
                        ? "border-red-300 bg-red-50"
                        : isNew
                        ? "border-yellow-300 bg-yellow-50"
                        : "border-green-300 bg-green-50"
                    }`}
                  >
                    {/* Product Header */}
                    <div
                      className="p-4 cursor-pointer hover:bg-opacity-80"
                      onClick={() => toggleProductExpand(index)}
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

                    {/* Product Details (Expanded) */}
                    {isExpanded && (
                      <div className="border-t bg-white p-4 space-y-4">
                        {/* Editable Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                            <input
                              type="text"
                              value={product.name}
                              onChange={(e) => handleProductEdit(index, "name", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                            <input
                              type="number"
                              value={product.quantity}
                              onChange={(e) => handleProductEdit(index, "quantity", Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor Unitário</label>
                            <input
                              type="number"
                              step="0.01"
                              value={product.rate}
                              onChange={(e) => handleProductEdit(index, "rate", Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                        </div>

                        {/* IMEIs */}
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

                        {/* Divergences */}
                        {hasDivergences && (
                          <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <div className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                              <AlertTriangle size={16} />
                              Divergências Encontradas
                            </div>
                            <ul className="space-y-1 text-sm">
                              {product.validation.divergences.map((div, divIndex) => (
                                <li key={divIndex} className="text-red-700">
                                  <strong>{div.field}:</strong> PDF: "{String(div.pdfValue)}" | Banco: "
                                  {String(div.dbValue)}"
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Vincular produto existente - completar dados do banco */}
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <div className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
                            <Link2 size={16} />
                            Vincular produto já existente
                          </div>
                          <p className="text-sm text-blue-800 mb-2">
                            A invoice nem sempre vem completa. Selecione um produto do banco para vincular e completar
                            nome/valor a partir do cadastro.
                          </p>
                          <ProductSearchSelect
                            products={productsFromDb}
                            value={product.validation.productId || ""}
                            onChange={(id) => handleLinkProduct(index, id)}
                            inline
                          />
                        </div>

                        {/* New Product Warning */}
                        {isNew && !product.validation.productId && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                            <div className="font-semibold text-yellow-900 flex items-center gap-2">
                              <AlertTriangle size={16} />
                              Produto Novo
                            </div>
                            <p className="text-sm text-yellow-700 mt-1">
                              Este produto não foi encontrado no banco. Vincule acima a um produto existente ou deixe
                              para cadastrar novo ao confirmar.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save size={18} />
            Confirmar e Criar Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

