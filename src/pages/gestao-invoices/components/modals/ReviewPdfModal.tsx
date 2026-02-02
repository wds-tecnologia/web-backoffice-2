import { useState, useEffect, useRef } from "react";
import { X, LayoutGrid, AlertTriangle, Package, Check, Link2, Eye, Building2, FileText } from "lucide-react";
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
  /** Nome original do PDF (antes de vincular) - usado para salvar alias */
  originalPdfName?: string;
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
    /** true se foi reconhecido automaticamente por alias salvo */
    matchedByAlias?: boolean;
    /** ID do alias que fez o match */
    aliasId?: string;
  };
}

export interface PdfData {
  invoiceData: {
    number: string;
    date: string;
    emails: string[];
    /** Preenchido pelo backend quando há alias de fornecedor correspondente */
    supplierId?: string;
    /** Nome do fornecedor extraído do PDF (para salvar alias ao vincular). Backend deve retornar quando supplierId é null. */
    pdfSupplierName?: string;
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
  const [linkPopupIndex, setLinkPopupIndex] = useState<number | null>(null);
  const [imeiPopupIndex, setImeiPopupIndex] = useState<number | null>(null);
  const [pendingLinkProductId, setPendingLinkProductId] = useState<string>("");
  const [productsFromDb, setProductsFromDb] = useState<ProductFromDb[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [numberExistsInDb, setNumberExistsInDb] = useState(false);
  const [numberCheckLoading, setNumberCheckLoading] = useState(false);
  const numberCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showRawDataModal, setShowRawDataModal] = useState(false);
  const [showSupplierLinkPopup, setShowSupplierLinkPopup] = useState(false);
  const [pendingSupplierId, setPendingSupplierId] = useState<string>("");

  // Sincronizar quando abrir com outro PDF (ex.: próximo da fila em massa)
  useEffect(() => {
    if (isOpen && pdfData) {
      setEditedData(pdfData);
      setNumberExistsInDb(false);
    }
  }, [isOpen, pdfData]);

  // Buscar produtos e fornecedores do banco para vincular
  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      api.get("/invoice/product").then((res) => {
        const raw = res.data;
        return Array.isArray(raw) ? raw : raw?.products ?? [];
      }),
      api.get("/invoice/supplier").then((res) => res.data).catch(() => []),
    ]).then(([products, suppliersData]) => {
      setProductsFromDb(products);
      setSuppliers(
        Array.isArray(suppliersData)
          ? suppliersData.filter((s: any) => s.active !== false).map((s: any) => ({ id: s.id, name: s.name }))
          : []
      );
    }).catch(() => {
      setProductsFromDb([]);
      setSuppliers([]);
    });
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

  // Salvar alias no backend para reconhecimento automático futuro
  const saveProductAlias = async (pdfProductName: string, productId: string) => {
    try {
      await api.post("/invoice/product/alias", {
        pdfProductName,
        productId,
      });
    } catch (err) {
      // Silencioso - não bloqueia o fluxo se falhar
      console.warn("Falha ao salvar alias de produto:", err);
    }
  };

  const saveSupplierAlias = async (pdfSupplierName: string, supplierId: string) => {
    try {
      await api.post("/invoice/supplier/alias", {
        pdfSupplierName: pdfSupplierName.trim().toLowerCase(),
        supplierId,
      });
    } catch (err) {
      console.warn("Falha ao salvar alias de fornecedor:", err);
    }
  };

  const handleUpdateSupplierLink = async () => {
    if (!pendingSupplierId || !editedData) return;
    
    const pdfName = (editedData.invoiceData.pdfSupplierName ?? "").trim();
    if (!pdfName) {
      Swal.fire({
        icon: "warning",
        title: "Nome na nota necessário",
        text: "Preencha o nome na nota antes de vincular o fornecedor.",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    setEditedData({
      ...editedData,
      invoiceData: {
        ...editedData.invoiceData,
        supplierId: pendingSupplierId,
      },
    });

    await saveSupplierAlias(pdfName, pendingSupplierId);
    setShowSupplierLinkPopup(false);
    setPendingSupplierId("");
  };

  const handleLinkProduct = async (index: number, productId: string) => {
    const productFromDb = productsFromDb.find((p) => p.id === productId);
    if (!productFromDb || !editedData) return;
    
    // Pegar o nome original do PDF antes de modificar (usa o salvo ou o atual)
    const current = editedData.products[index];
    const originalPdfName = current.originalPdfName || current.name;
    
    setEditedData((prev) => {
      if (!prev) return prev;
      const newProducts = [...prev.products];
      const currentProduct = newProducts[index];
      
      // IMPORTANTE: Manter o preço da invoice (não sobrescrever com o preço do banco)
      // O preço da invoice é o atual, e deve atualizar o produto no sistema
      newProducts[index] = {
        ...currentProduct,
        name: productFromDb.name,
        originalPdfName: originalPdfName, // Guarda o nome original do PDF
        // Mantém o rate original da invoice (não pega do banco)
        validation: {
          ...currentProduct.validation,
          productId,
          exists: true,
          divergences: [],
        },
      };
      return { ...prev, products: newProducts };
    });
    
    // Salvar alias para reconhecimento automático nas próximas importações
    await saveProductAlias(originalPdfName, productId);
  };

  const handleConfirm = async () => {
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
    // MUDANÇA: Apenas avisar, mas permitir continuar
    const imeisInvalid = editedData.products.filter((p) => {
      if (p.imeis && p.imeis.length > 0) {
        return p.imeis.length !== p.quantity;
      }
      return false;
    });
    
    if (imeisInvalid.length > 0) {
      const productsWithIssues = imeisInvalid.map(p => 
        `${p.name}: ${p.imeis?.length || 0} IMEIs para ${p.quantity} unidades`
      ).join('\n');
      
      const result = await Swal.fire({
        icon: "warning",
        title: "⚠️ Aviso: IMEIs Inconsistentes",
        html: `
          <div class="text-left">
            <p class="mb-3">Alguns produtos têm quantidade de IMEIs diferente da quantidade de unidades (esperado: 1 IMEI por unidade):</p>
            <pre class="bg-yellow-50 p-3 rounded text-xs border border-yellow-200 max-h-40 overflow-y-auto">${productsWithIssues}</pre>
            <p class="mt-3 text-sm text-gray-600">
              <strong>Deseja continuar mesmo assim?</strong><br/>
              Os IMEIs serão salvos como estão. Você pode ajustá-los depois.
            </p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Sim, continuar",
        cancelButtonText: "Cancelar",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold mr-2",
          cancelButton: "bg-gray-300 text-gray-700 hover:bg-gray-400 px-4 py-2 rounded font-semibold",
        },
      });
      
      if (!result.isConfirmed) {
        return;
      }
    }
    
    onConfirm(editedData);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  // Formatar dados em Markdown para exibição
  const formatDataAsMarkdown = (data: PdfData): string => {
    const invoiceNumber = data.invoiceData.number || "N/A";
    const invoiceDate = data.invoiceData.date 
      ? new Date(data.invoiceData.date).toLocaleDateString("pt-BR")
      : "N/A";
    const supplierName = data.invoiceData.pdfSupplierName || "N/A";
    
    let markdown = `# Lista de Produtos - Invoice #${invoiceNumber}\n\n`;
    markdown += `**Data:** ${invoiceDate}\n`;
    markdown += `**Fornecedor:** ${supplierName}\n\n`;
    markdown += `---\n\n`;
    markdown += `## Produtos (em ordem do PDF)\n\n`;

    data.products.forEach((product, index) => {
      const productName = product.name;
      const rate = formatCurrency(product.rate);
      const totalQty = product.quantity;
      const amount = formatCurrency(product.amount);
      
      // Extrair cor do nome (última palavra que seja uma cor conhecida)
      const colors = ['BLACK', 'WHITE', 'PINK', 'NATURAL', 'BLUE', 'GREEN', 'ORANGE', 'SILVER', 'GOLD', 'PURPLE', 'TEAL', 'STARLIGHT', 'ULTRAMARINE', 'DESERT', 'RED', 'YELLOW', 'PINK NEW', 'BLACK NEW', 'GREEN NEW', 'ORANGE NEW', 'BLUE NEW'];
      let extractedColor = null;
      for (const color of colors) {
        const regex = new RegExp(`\\b${color.replace(/\s+/g, '\\s+')}\\b`, 'i');
        if (regex.test(productName)) {
          extractedColor = color.toUpperCase();
          break;
        }
      }
      
      // Nome base sem a cor (para produtos P2/P3 que têm cor separada)
      const baseName = extractedColor ? productName.replace(new RegExp(`\\s*${extractedColor.replace(/\s+/g, '\\s+')}\\s*$`, 'i'), '').trim() : productName;
      
      markdown += `### ${index + 1}. ${baseName}${extractedColor ? ` ${extractedColor}` : ''}\n`;
      markdown += `**Rate:** ${rate} | **Total:** ${totalQty} unidade${totalQty !== 1 ? 's' : ''} | **Amount:** ${amount}\n`;
      
      if (extractedColor) {
        markdown += `- **${extractedColor}:** ${product.quantity} unidade${product.quantity !== 1 ? 's' : ''}\n`;
      } else {
        markdown += `- **Quantidade:** ${product.quantity} unidade${product.quantity !== 1 ? 's' : ''}\n`;
      }
      
      // Adicionar IMEIs se houver
      if (product.imeis && product.imeis.length > 0) {
        markdown += `\n**IMEIs (${product.imeis.length}):**\n`;
        product.imeis.forEach((imei) => {
          markdown += `- ${imei}\n`;
        });
      }
      
      markdown += `\n`;
    });

    // Resumo
    markdown += `---\n\n`;
    markdown += `## Resumo\n\n`;
    markdown += `- **Total de linhas de produto no PDF:** ${data.products.length}\n`;
    
    const p2p3Products = data.products.filter(p => 
      p.name.match(/P2|P3/i) && !p.name.match(/NEW/i)
    ).length;
    const newProducts = data.products.filter(p => 
      p.name.match(/NEW/i)
    ).length;
    
    markdown += `- **Produtos P2/P3 (expandidos por cor):** ${p2p3Products} produtos base\n`;
    markdown += `- **Produtos NEW (cor no nome):** ${newProducts} produtos\n`;
    markdown += `- **Total de itens únicos:** ${data.products.length} itens\n\n`;
    
    markdown += `---\n\n`;
    markdown += `## Observações\n\n`;
    markdown += `- **Produtos P2/P3:** Quantidades são fracionadas por cor\n`;
    markdown += `- **Produtos NEW:** Cor já está no nome, quantidade é total daquela cor\n`;
    
    const totalImeis = data.products.reduce((sum, p) => sum + (p.imeis?.length || 0), 0);
    markdown += `- **Total de IMEIs extraídos:** ${totalImeis}\n`;

    return markdown;
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
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowRawDataModal(true)} 
              className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded hover:bg-blue-50"
              title="Ver dados brutos em Markdown"
            >
              <FileText size={20} />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={24} />
            </button>
          </div>
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
                  onChange={(e) => {
                    let value = e.target.value;
                    // Garantir formato YYYY-MM-DD
                    if (value && !value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                      // Se não está no formato correto, tentar converter
                      const testDate = new Date(value);
                      if (!isNaN(testDate.getTime())) {
                        value = testDate.toLocaleDateString("en-CA");
                      }
                    }
                    setEditedData({
                      ...editedData,
                      invoiceData: { ...editedData.invoiceData, date: value },
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emails</label>
                <div className="text-sm text-gray-600">
                  {editedData.invoiceData.emails.join(", ") || "Nenhum email encontrado"}
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                  <Building2 size={14} />
                  Fornecedor
                </label>
                {editedData.invoiceData.supplierId ? (
                  <div className="flex items-center gap-3 relative">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">Nome na nota (extraído do PDF)</div>
                      <input
                        type="text"
                        value={editedData.invoiceData.pdfSupplierName ?? ""}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-xl text-sm cursor-not-allowed"
                      />
                    </div>
                    <div className="flex-1 relative">
                      <div className="text-xs text-gray-500 mb-1">Fornecedor vinculado (clique para editar)</div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingSupplierId(editedData.invoiceData.supplierId || "");
                          setShowSupplierLinkPopup(true);
                        }}
                        className="w-full text-left text-sm font-medium text-green-700 bg-green-50 border-2 border-green-300 rounded-xl px-3 py-2 flex items-center gap-2 hover:bg-green-100 hover:border-green-400 transition-colors cursor-pointer shadow-sm"
                        title="Clique para editar o vínculo do fornecedor"
                      >
                        <Check size={16} className="text-green-600 flex-shrink-0" />
                        <span className="flex-1">
                          {suppliers.find((s) => s.id === editedData.invoiceData.supplierId)?.name || "Fornecedor identificado automaticamente"}
                        </span>
                        <Link2 size={16} className="text-green-600 flex-shrink-0" />
                      </button>
                      
                      {/* Popup flutuante para atualizar vínculo do fornecedor */}
                      {showSupplierLinkPopup && (
                        <>
                          <div 
                            className="fixed inset-0 z-40"
                            onClick={() => {
                              setShowSupplierLinkPopup(false);
                              setPendingSupplierId("");
                            }}
                          />
                          <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white border border-blue-200 rounded-lg shadow-xl p-4">
                            <div className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                              <Building2 size={18} />
                              Atualizar Vínculo de Fornecedor
                            </div>
                            
                            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 flex items-center gap-2">
                              <Check size={14} />
                              Vínculo atual será atualizado
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-3">
                              Selecione um fornecedor do banco:
                            </p>
                            <select
                              value={pendingSupplierId}
                              onChange={(e) => setPendingSupplierId(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-300 mb-3"
                            >
                              <option value="">Selecione o fornecedor...</option>
                              {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={handleUpdateSupplierLink}
                              disabled={!pendingSupplierId}
                              className={`w-full px-3 py-1.5 rounded-md text-sm ${
                                pendingSupplierId
                                  ? "bg-blue-600 text-white hover:bg-blue-700"
                                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                              }`}
                            >
                              OK
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 max-w-[200px] pt-6">
                      ✅ Já tinha vínculo; nas próximas importações continua reconhecendo automaticamente.
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[180px]">
                      <span className="text-xs text-gray-500 block mb-1">Nome na nota (pode vir preenchido pelo PDF; se não, digite para salvar vínculo)</span>
                      <input
                        type="text"
                        placeholder="Ex: DISTRIBUIDORA XYZ (ou deixe em branco)"
                        value={editedData.invoiceData.pdfSupplierName ?? ""}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            invoiceData: {
                              ...editedData.invoiceData,
                              pdfSupplierName: e.target.value || undefined,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
                      />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <span className="text-xs text-gray-500 block mb-1">Vincular a (fornecedor do sistema)</span>
                      <select
                        value={editedData.invoiceData.supplierId ?? ""}
                        onChange={(e) => {
                          const supplierId = e.target.value;
                          setEditedData({
                            ...editedData,
                            invoiceData: { ...editedData.invoiceData, supplierId: supplierId || undefined },
                          });
                          const pdfName = (editedData.invoiceData.pdfSupplierName ?? "").trim();
                          if (supplierId && pdfName) {
                            saveSupplierAlias(pdfName, supplierId);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
                      >
                        <option value="">Selecione o fornecedor...</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 w-full">
                      Vincule uma vez aqui; nas próximas importações o sistema identifica o fornecedor automaticamente.
                    </p>
                  </div>
                )}
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
                const hasDivergences = product.validation.divergences.length > 0;
                const isNew = !product.validation.exists;
                const isLinkPopupOpen = linkPopupIndex === index;

                return (
                  <div
                    key={index}
                    className={`border rounded-lg overflow-visible relative ${
                      hasDivergences
                        ? "border-red-300 bg-red-50"
                        : isNew
                        ? "border-yellow-300 bg-yellow-50"
                        : "border-green-300 bg-green-50"
                    }`}
                  >
                    {/* Product Row */}
                    <div className="p-4">
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
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setImeiPopupIndex(imeiPopupIndex === index ? null : index);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors cursor-pointer"
                                    >
                                      <Eye size={12} />
                                      {product.imeis.length} IMEI{product.imeis.length !== 1 ? 's' : ''}
                                      {product.imeis.length !== product.quantity && (
                                        <AlertTriangle size={12} className="text-red-600 ml-1" />
                                      )}
                                    </button>
                                    
                                    {/* Popup flutuante para IMEIs */}
                                    {imeiPopupIndex === index && (
                                      <>
                                        <div 
                                          className="fixed inset-0 z-40"
                                          onClick={() => setImeiPopupIndex(null)}
                                        />
                                        <div className="absolute left-0 top-full mt-2 z-50 w-80 bg-white border border-blue-200 rounded-lg shadow-xl p-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="font-semibold text-blue-900 flex items-center gap-2">
                                              <Eye size={18} />
                                              IMEIs/Seriais ({product.imeis.length})
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(product.imeis.join("\n"));
                                              }}
                                              className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                                            >
                                              Copiar
                                            </button>
                                          </div>
                                          
                                          {product.imeis.length !== product.quantity && (
                                            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex items-center gap-2">
                                              <AlertTriangle size={14} />
                                              Quantidade diferente: {product.imeis.length} IMEIs para {product.quantity} unidades (esperado: 1 IMEI por unidade)
                                            </div>
                                          )}
                                          
                                          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 max-h-48 overflow-y-auto">
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
                                          
                                          <button
                                            type="button"
                                            onClick={() => setImeiPopupIndex(null)}
                                            className="mt-3 w-full px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                                          >
                                            OK
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                            {/* Nome do produto vinculado (Auto ou Vinculado) — para conferir/trocar se estiver errado */}
                            {product.validation.productId && (() => {
                              const linkedProduct = productsFromDb.find((p) => p.id === product.validation.productId);
                              const linkedName = linkedProduct?.name ?? "—";
                              return (
                                <div className="mt-1.5 text-xs text-gray-600 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-gray-500">
                                    {product.validation.matchedByAlias ? "Auto →" : "Vinculado a:"}
                                  </span>
                                  <span className="font-medium text-gray-800 bg-green-50 border border-green-200 rounded px-2 py-0.5">
                                    {linkedName}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        
                        {/* Botão Vincular Produto - abre popup */}
                        <div className="flex items-center gap-2 flex-shrink-0 relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingLinkProductId(product.validation.productId || "");
                              setLinkPopupIndex(isLinkPopupOpen ? null : index);
                            }}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                              product.validation.productId
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            }`}
                          >
                            <Link2 size={14} />
                            {product.validation.matchedByAlias 
                              ? "Auto" 
                              : product.validation.productId 
                                ? "Vinculado" 
                                : "Vincular"}
                          </button>
                          
                          {/* Popup flutuante para vincular produto */}
                          {isLinkPopupOpen && (
                            <>
                              {/* Overlay para fechar o popup */}
                              <div 
                                className="fixed inset-0 z-40"
                                onClick={() => {
                                  setLinkPopupIndex(null);
                                  setPendingLinkProductId("");
                                }}
                              />
                              <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white border border-blue-200 rounded-lg shadow-xl p-4">
                                <div className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                                  <Link2 size={18} />
                                  Vincular Produto
                                </div>
                                
                                {product.validation.matchedByAlias && (
                                  <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 flex items-center gap-2">
                                    <Check size={14} />
                                    Reconhecido automaticamente
                                  </div>
                                )}
                                
                                <p className="text-sm text-gray-600 mb-3">
                                  Selecione um produto do banco:
                                </p>
                                <ProductSearchSelect
                                  products={productsFromDb}
                                  value={pendingLinkProductId}
                                  onChange={(id) => setPendingLinkProductId(id)}
                                  inline
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (pendingLinkProductId) {
                                      handleLinkProduct(index, pendingLinkProductId);
                                    }
                                    setLinkPopupIndex(null);
                                    setPendingLinkProductId("");
                                  }}
                                  disabled={!pendingLinkProductId}
                                  className={`mt-3 w-full px-3 py-1.5 rounded-md text-sm ${
                                    pendingLinkProductId
                                      ? "bg-blue-600 text-white hover:bg-blue-700"
                                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  }`}
                                >
                                  OK
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
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
            <LayoutGrid size={18} />
            Enviar para Tela Principal
          </button>
        </div>
      </div>

      {/* Modal de Dados Brutos (Markdown) */}
      {showRawDataModal && editedData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal de Dados Brutos */}
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Dados Brutos Extraídos do PDF</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Dados formatados em Markdown conforme extraídos do PDF
                </p>
              </div>
              <button 
                onClick={() => setShowRawDataModal(false)} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Conteúdo Markdown */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(formatDataAsMarkdown(editedData));
                      Swal.fire({
                        icon: "success",
                        title: "Copiado!",
                        text: "Dados copiados para a área de transferência",
                        timer: 1500,
                        showConfirmButton: false,
                      });
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded hover:bg-blue-50 flex items-center gap-1"
                  >
                    Copiar Markdown
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 max-h-[60vh] overflow-y-auto">
                  {formatDataAsMarkdown(editedData)}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowRawDataModal(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

