import { useState, useEffect, useRef } from "react";
import { X, Save, AlertTriangle, Package, Check, ChevronDown, ChevronUp, Link2, Eye } from "lucide-react";
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
      
      // IMPORTANTE: Manter o preço da invoice (não sobrescrever com o preço do banco)
      // O preço da invoice é o atual, e deve atualizar o produto no sistema
      newProducts[index] = {
        ...current,
        name: productFromDb.name,
        // Mantém o rate original da invoice (não pega do banco)
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
    
    // Validar IMEIs: quantidade de produtos deve ser igual à quantidade de IMEIs
    const imeisInvalid = editedData.products.some((p) => {
      if (p.imeis && p.imeis.length > 0) {
        return p.imeis.length !== p.quantity;
      }
      return false;
    });
    
    if (imeisInvalid) {
      Swal.fire({
        icon: "warning",
        title: "IMEIs Inválidos",
        text: "A quantidade de IMEIs deve ser igual à quantidade de produtos. Produtos com IMEIs devem ter exatamente o mesmo número de IMEIs que a quantidade.",
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
              <div className="text-sm text-yellow-700">Produtos a Vincular</div>
              <div className="text-2xl font-bold text-yellow-700">{editedData.summary.newProducts}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-700">Com Divergências</div>
              <div className="text-2xl font-bold text-red-700">{editedData.summary.productsWithDivergences}</div>
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
                                <div className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                                  <span>Qtd: {product.quantity}</span>
                                  <span>|</span>
                                  <span>Valor: {formatCurrency(product.rate)}</span>
                                  <span>|</span>
                                  <span>Total: {formatCurrency(product.amount)}</span>
                                  {product.imeis.length > 0 && (
                                    <>
                                      <span>|</span>
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                        <Eye size={12} />
                                        {product.imeis.length} IMEI{product.imeis.length !== 1 ? 's' : ''}
                                        {product.imeis.length !== product.quantity && (
                                          <AlertTriangle size={12} className="text-red-600 ml-1" />
                                        )}
                                      </span>
                                    </>
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
                      <div className="border-t bg-white p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {/* Coluna Esquerda: Detalhes do Produto (2/3) */}
                          <div className="lg:col-span-2 space-y-4">
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
                                <div className="flex items-center justify-between mb-2">
                                  <label className="block text-sm font-medium text-gray-700">
                                    IMEIs/Seriais ({product.imeis.length})
                                    {product.imeis.length !== product.quantity && (
                                      <span className="ml-2 text-xs text-red-600 font-semibold">
                                        ⚠ Qtd diferente de {product.quantity}
                                      </span>
                                    )}
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const list = product.imeis.join("\n");
                                      navigator.clipboard.writeText(list);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    Copiar
                                  </button>
                                </div>
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

                            {/* New Product Warning */}
                            {isNew && !product.validation.productId && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                <div className="font-semibold text-yellow-900 flex items-center gap-2">
                                  <AlertTriangle size={16} />
                                  Produto a Vincular
                                </div>
                                <p className="text-sm text-yellow-700 mt-1">
                                  Este produto não foi encontrado no banco. Use a seção ao lado para vincular a um produto existente.
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Coluna Direita: Vincular Produto (1/3) */}
                          <div className="lg:col-span-1">
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 sticky top-4">
                              <div className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                                <Link2 size={18} />
                                Vincular Produto
                              </div>
                              <p className="text-sm text-blue-800 mb-3">
                                Selecione um produto do banco para vincular e atualizar nome/valor.
                              </p>
                              <ProductSearchSelect
                                products={productsFromDb}
                                value={product.validation.productId || ""}
                                onChange={(id) => handleLinkProduct(index, id)}
                                inline
                              />
                              {product.validation.productId && (
                                <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-xs text-green-800 flex items-center gap-2">
                                  <Check size={14} />
                                  Produto vinculado
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
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

