import { useState, useEffect, useRef } from "react";
import { X, Save, AlertTriangle, Package, Check, Link2, LayoutGrid, Eye, Building2, FileText } from "lucide-react";
import Swal from "sweetalert2";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";
import { useActionLoading } from "../../context/ActionLoadingContext";
import { ProductSearchSelect } from "../sections/SupplierSearchSelect";
import type { PdfData, PdfProduct } from "./ReviewPdfModal";
import type { Invoice } from "../types/invoice";

type ProductFromDb = { id: string; name: string; code?: string; priceweightAverage?: number };

/** Converte PdfData[] (editedDataList) para Invoice[] para enviar como drafts à tela */
function pdfDataListToInvoices(
  editedDataList: PdfData[],
  defaultInvoice: MultiInvoiceReviewModalProps["defaultInvoice"]
): Invoice[] {
  return editedDataList.map((data) => {
    const products = (data.products || []).map((p) => ({
      id: p.validation?.productId ?? "",
      invoiceId: "",
      productId: p.validation?.productId ?? "",
      quantity: p.quantity,
      value: p.rate,
      price: p.rate,
      weight: 0,
      total: p.amount,
      received: false,
      receivedQuantity: 0,
      name: p.name,
      _imeis: p.imeis || [],
    }));
    const taxaSpEs =
      defaultInvoice.taxaSpEs == null || defaultInvoice.taxaSpEs === ""
        ? "0"
        : String(defaultInvoice.taxaSpEs).trim();
    
    // Converter data para o formato correto (YYYY-MM-DD)
    let formattedDate = data.invoiceData?.date;
    let dateFromPdf = false;
    
    // Debug: verificar o que o backend retornou
    console.log(`[Import PDF] Invoice ${data.invoiceData?.number} - Data do backend:`, data.invoiceData?.date);
    
    if (formattedDate && formattedDate.trim() !== "") {
      dateFromPdf = true;
      // Se a data estiver em formato DD/MM/YYYY ou MM/DD/YYYY, converter para YYYY-MM-DD
      if (formattedDate.includes('/')) {
        const parts = formattedDate.split('/');
        if (parts[2]?.length === 4) {
          if (parseInt(parts[0]) > 12) {
            // É DD/MM/YYYY
            formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          } else if (parseInt(parts[1]) > 12) {
            // É MM/DD/YYYY
            formattedDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          } else {
            // Assumir MM/DD/YYYY (formato americano)
            formattedDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
        }
      } else if (formattedDate.includes('-')) {
        const parts = formattedDate.split('-');
        if (parts[0]?.length !== 4 && parts[2]?.length === 4) {
          // DD-MM-YYYY, converter
          formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      
      // Validar se a data é válida
      const testDate = new Date(formattedDate);
      if (isNaN(testDate.getTime())) {
        console.warn(`[Import PDF] Data inválida após conversão: ${formattedDate}, usando data atual`);
        formattedDate = new Date().toLocaleDateString("en-CA");
        dateFromPdf = false;
      } else {
        console.log(`[Import PDF] Data convertida com sucesso: ${formattedDate}`);
      }
    } else {
      console.warn(`[Import PDF] Backend não retornou data para invoice ${data.invoiceData?.number}, usando data atual`);
      formattedDate = new Date().toLocaleDateString("en-CA");
      dateFromPdf = false;
    }
    
    const supplierFromPdf = data.invoiceData?.supplierId;
    // Quando vem do modal de importação em massa, sempre bloquear os 3 campos (número, data, fornecedor)
    // mesmo que não tenha vínculo de fornecedor ainda, pois os dados vieram do PDF
    const hasPdfSupplierName = !!(data.invoiceData?.pdfSupplierName?.trim());
    const hasPdfNumber = !!(data.invoiceData?.number?.trim());
    return {
      id: null,
      number: data.invoiceData?.number ?? "",
      date: formattedDate,
      supplierId: supplierFromPdf ?? defaultInvoice.supplierId ?? "",
      products,
      carrierId: defaultInvoice.carrierId ?? "",
      carrier2Id: defaultInvoice.carrier2Id ?? "",
      taxaSpEs,
      amountTaxcarrier: 0,
      amountTaxcarrier2: 0,
      amountTaxSpEs: 0,
      subAmount: 0,
      overallValue: 0,
      paid: false,
      paidDate: null,
      paidDollarRate: null,
      completed: false,
      completedDate: null,
      _isDateFromPdf: dateFromPdf, // true quando data veio do PDF
      _isNumberFromPdf: hasPdfNumber, // true quando número veio do PDF (sempre vem quando é importação em massa)
      _isSupplierFromPdf: !!supplierFromPdf || hasPdfSupplierName, // Bloquear se tem supplierId OU se tem pdfSupplierName (veio do PDF)
    };
  });
}

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
  /** Enviar todas as invoices (revisadas) para a tela como drafts em abas, sem salvar no backend */
  onSendToScreen?: (invoices: Invoice[]) => void;
}

export function MultiInvoiceReviewModal({
  isOpen,
  onClose,
  pdfDataList,
  defaultInvoice,
  onAllSaved,
  onSendToScreen,
}: MultiInvoiceReviewModalProps) {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [editedDataList, setEditedDataList] = useState<PdfData[]>([]);
  const [imeiPopupIndex, setImeiPopupIndex] = useState<number | null>(null);
  const [linkPopupIndex, setLinkPopupIndex] = useState<number | null>(null);
  const [pendingLinkProductId, setPendingLinkProductId] = useState<string>("");
  const [productsFromDb, setProductsFromDb] = useState<ProductFromDb[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [numberExistsInDb, setNumberExistsInDb] = useState(false);
  const [numberExistsByIndex, setNumberExistsByIndex] = useState<Record<number, boolean>>({});
  const [numberCheckLoading, setNumberCheckLoading] = useState(false);
  const numberCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allNumbersCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setOpenNotification } = useNotification();
  const { executeAction } = useActionLoading();
  const [showRawDataModal, setShowRawDataModal] = useState(false);
  const [showSupplierLinkPopup, setShowSupplierLinkPopup] = useState(false);
  const [pendingSupplierId, setPendingSupplierId] = useState<string>("");

  const currentData = editedDataList[activeTabIndex];
  const allSaved = pdfDataList.length > 0 && savedIndices.size === pdfDataList.length;

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
          const exists = Boolean(res.data?.exists);
          setNumberExistsInDb(exists);
          setNumberExistsByIndex((prev) => ({ ...prev, [activeTabIndex]: exists }));
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
              setNumberExistsByIndex((prev) => ({ ...prev, [activeTabIndex]: exists }));
            })
            .catch(() => {
              setNumberExistsInDb(false);
              setNumberExistsByIndex((prev) => ({ ...prev, [activeTabIndex]: false }));
            })
            .finally(() => setNumberCheckLoading(false));
        });
    }, 400);
    return () => {
      if (numberCheckTimerRef.current) clearTimeout(numberCheckTimerRef.current);
    };
  }, [currentData?.invoiceData?.number, activeTabIndex]);

  useEffect(() => {
    if (isOpen && pdfDataList.length > 0) {
      setEditedDataList(pdfDataList.map((p) => ({ ...p })));
      setSavedIndices(new Set());
      setActiveTabIndex(0);
      setNumberExistsInDb(false);
      setNumberExistsByIndex({});
    }
  }, [isOpen, pdfDataList]);

  // Verificar em tempo real, para todas as abas, se o número já existe no banco (cabeçalho vermelho)
  useEffect(() => {
    if (!isOpen || editedDataList.length === 0) return;
    if (allNumbersCheckRef.current) clearTimeout(allNumbersCheckRef.current);
    allNumbersCheckRef.current = setTimeout(() => {
      allNumbersCheckRef.current = null;
      const check = async (data: PdfData, i: number) => {
        const number = String(data?.invoiceData?.number ?? "").trim();
        if (!number) return { i, exists: false };
        try {
          const res = await api.get("/invoice/exists-by-number", { params: { number } });
          return { i, exists: Boolean(res.data?.exists) };
        } catch {
          try {
            const fallbackRes = await api.get("/invoice/get");
            const list = Array.isArray(fallbackRes.data) ? fallbackRes.data : fallbackRes.data?.data ?? [];
            const exists = list.some(
              (inv: any) => String(inv?.number ?? "").trim().toLowerCase() === number.toLowerCase()
            );
            return { i, exists };
          } catch {
            return { i, exists: false };
          }
        }
      };
      Promise.all(editedDataList.map((data, i) => check(data, i))).then((results) => {
        setNumberExistsByIndex((prev) => {
          const next = { ...prev };
          results.forEach(({ i, exists }) => {
            next[i] = exists;
          });
          return next;
        });
      });
    }, 400);
    return () => {
      if (allNumbersCheckRef.current) clearTimeout(allNumbersCheckRef.current);
    };
  }, [isOpen, editedDataList]);

  const setEditedDataAt = (index: number, data: PdfData) => {
    setEditedDataList((prev) => {
      const next = [...prev];
      next[index] = data;
      return next;
    });
  };

  // Salvar alias no backend para reconhecimento automático futuro
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
    if (!pendingSupplierId || !currentData) return;
    
    const pdfName = (currentData.invoiceData.pdfSupplierName ?? "").trim();
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

    setEditedDataAt(activeTabIndex, {
      ...currentData,
      invoiceData: {
        ...currentData.invoiceData,
        supplierId: pendingSupplierId,
      },
    });

    await saveSupplierAlias(pdfName, pendingSupplierId);
    setShowSupplierLinkPopup(false);
    setPendingSupplierId("");
  };

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

  const handleLinkProduct = async (productIndex: number, productId: string) => {
    const productFromDb = productsFromDb.find((p) => p.id === productId);
    if (!productFromDb || !currentData) return;
    
    // Pegar o nome original do PDF antes de modificar (usa o salvo ou o atual)
    const current = currentData.products[productIndex];
    const originalPdfName = current.originalPdfName || current.name;
    
    const newProducts = [...currentData.products];
    
    // IMPORTANTE: Manter o preço da invoice (não sobrescrever com o preço do banco)
    // O preço da invoice é o atual, e deve atualizar o produto no sistema
    newProducts[productIndex] = {
      ...current,
      name: productFromDb.name,
      originalPdfName: originalPdfName, // Guarda o nome original do PDF
      // Mantém o rate original da invoice (não pega do banco)
      validation: {
        ...current.validation,
        productId,
        exists: true,
        divergences: [],
      },
    };
    setEditedDataAt(activeTabIndex, { ...currentData, products: newProducts });
    
    // Salvar alias para reconhecimento automático nas próximas importações
    await saveProductAlias(originalPdfName, productId);
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

    // Validação de produtos sem vínculo removida - backend cria produtos automaticamente quando necessário
    
    // Validar IMEIs: quantidade de produtos deve ser igual à quantidade de IMEIs
    // MUDANÇA: Apenas avisar, mas permitir continuar
    const imeisInvalid = currentData.products.filter((p) => {
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

    await executeAction(async () => {
      const now = new Date();
      const time = now.toTimeString().split(" ")[0];
      const dateStr = currentData.invoiceData?.date || now.toLocaleDateString("en-CA");
      const dateWithTime = new Date(`${dateStr}T${time}`);
      const dateForApi = Number.isNaN(dateWithTime.getTime()) ? now.toISOString() : dateWithTime.toISOString();

      const products = currentData.products.map((p) => ({
        id: p.validation.productId,
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
        date: dateForApi,
        supplierId: currentData.invoiceData?.supplierId ?? defaultInvoice.supplierId,
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
      const data = err?.response?.data;
      let msg = data?.message || err?.message || "Erro ao salvar a invoice.";
      // Enriquecer com detalhes do backend (productId inválido, supplierId não encontrado)
      if (data?.invalidProductIds && Array.isArray(data.invalidProductIds) && data.invalidProductIds.length > 0) {
        msg += ` IDs inválidos: ${data.invalidProductIds.join(", ")}.`;
      }
      if (data?.supplierId) {
        msg += ` Fornecedor: ${data.supplierId}.`;
      }
      setOpenNotification({ type: "error", title: "Erro", notification: msg });
    });
  };

  const handleClose = () => {
    if (!allSaved) return;
    onAllSaved?.();
    onClose();
  };

  const handleSendToScreen = () => {
    const invoices = pdfDataListToInvoices(editedDataList, defaultInvoice);
    onSendToScreen?.(invoices);
    onClose();
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }).format(value);

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

  if (!isOpen || pdfDataList.length === 0) return null;

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

        {/* Tabs (estilo Excel) — cabeçalho fica vermelho se número já existe no banco */}
        <div className="border-b bg-gray-50 px-4 pt-2 flex flex-wrap gap-1">
          {editedDataList.map((data, index) => {
            const isSaved = savedIndices.has(index);
            const numberExists = numberExistsByIndex[index] === true;
            const num = data?.invoiceData?.number ?? `#${index + 1}`;
            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setActiveTabIndex(index);
                }}
                className={`px-4 py-2 rounded-t-lg border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  numberExists
                    ? "border-red-500 bg-red-50 text-red-700 hover:bg-red-100"
                    : activeTabIndex === index
                    ? "border-blue-600 bg-white text-blue-700 -mb-px"
                    : isSaved
                    ? "border-green-500 bg-green-50 text-green-800 hover:bg-green-100"
                    : "border-transparent bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {numberExists && <AlertTriangle size={14} className="flex-shrink-0" />}
                {isSaved && !numberExists && <Check size={14} className="inline mr-0" />}
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
                      onChange={(e) => {
                        let value = e.target.value;
                        // Garantir formato YYYY-MM-DD
                        if (value && !value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                          const testDate = new Date(value);
                          if (!isNaN(testDate.getTime())) {
                            value = testDate.toLocaleDateString("en-CA");
                          }
                        }
                        setEditedDataAt(activeTabIndex, {
                          ...currentData,
                          invoiceData: { ...currentData.invoiceData, date: value },
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emails</label>
                    <div className="text-sm text-gray-600">
                      {currentData.invoiceData.emails?.join(", ") || "—"}
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                      <Building2 size={14} />
                      Fornecedor
                    </label>
                    {currentData.invoiceData.supplierId ? (
                      <div className="flex items-center gap-3 relative">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 mb-1">Nome na nota (extraído do PDF)</div>
                          <input
                            type="text"
                            value={currentData.invoiceData.pdfSupplierName ?? ""}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-xl text-sm cursor-not-allowed"
                          />
                        </div>
                        <div className="flex-1 relative">
                          <div className="text-xs text-gray-500 mb-1">Fornecedor vinculado</div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingSupplierId(currentData.invoiceData.supplierId || "");
                              setShowSupplierLinkPopup(true);
                            }}
                            className="w-full text-left text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2 hover:bg-green-100 transition-colors"
                          >
                            <Check size={16} className="text-green-600" />
                            <span className="flex-1">
                              {suppliers.find((s) => s.id === currentData.invoiceData.supplierId)?.name || "Fornecedor identificado automaticamente"}
                            </span>
                            <Link2 size={14} className="text-green-600" />
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
                        <div className="flex-1 min-w-[160px]">
                          <span className="text-xs text-gray-500 block mb-1">Nome na nota (pode vir do PDF; digite para salvar vínculo)</span>
                          <input
                            type="text"
                            placeholder="Ex: DISTRIBUIDORA XYZ"
                            value={currentData.invoiceData.pdfSupplierName ?? ""}
                            onChange={(e) =>
                              setEditedDataAt(activeTabIndex, {
                                ...currentData,
                                invoiceData: {
                                  ...currentData.invoiceData,
                                  pdfSupplierName: e.target.value || undefined,
                                },
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
                          />
                        </div>
                        <div className="flex-1 min-w-[180px]">
                          <span className="text-xs text-gray-500 block mb-1">Vincular a</span>
                          <select
                            value={currentData.invoiceData.supplierId ?? ""}
                            onChange={(e) => {
                              const supplierId = e.target.value;
                              setEditedDataAt(activeTabIndex, {
                                ...currentData,
                                invoiceData: {
                                  ...currentData.invoiceData,
                                  supplierId: supplierId || undefined,
                                },
                              });
                              const pdfName = (currentData.invoiceData.pdfSupplierName ?? "").trim();
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
                        <p className="text-xs text-gray-500">Vincule uma vez; nas próximas importações o sistema identifica o fornecedor automaticamente.</p>
                      </div>
                    )}
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
                  <div className="text-sm text-yellow-700">Produtos a Vincular</div>
                  <div className="text-2xl font-bold text-yellow-700">{currentData.summary.newProducts}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm text-red-700">Com Divergências</div>
                  <div className="text-2xl font-bold text-red-700">{currentData.summary.productsWithDivergences}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package size={20} />
                  Produtos ({currentData.products.length})
                </h3>
                <div className="space-y-3">
                  {currentData.products.map((product, productIndex) => {
                    const hasDivergences = product.validation.divergences.length > 0;
                    const isNew = !product.validation.exists;
                    const isLinkPopupOpen = linkPopupIndex === productIndex;
                    
                    return (
                      <div
                        key={productIndex}
                        className={`border rounded-lg overflow-visible relative ${
                          hasDivergences ? "border-red-300 bg-red-50" : isNew ? "border-yellow-300 bg-yellow-50" : "border-green-300 bg-green-50"
                        }`}
                      >
                        {/* Product Header */}
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
                                            setImeiPopupIndex(imeiPopupIndex === productIndex ? null : productIndex);
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
                                        {imeiPopupIndex === productIndex && (
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
                                                  {product.imeis.map((imei, imeiIdx) => (
                                                    <span
                                                      key={imeiIdx}
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
                                  setLinkPopupIndex(isLinkPopupOpen ? null : productIndex);
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
                                          handleLinkProduct(productIndex, pendingLinkProductId);
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-4 p-6 border-t bg-gray-50 flex-wrap">
          <div className="text-sm text-gray-600 max-w-md">
            {allSaved ? (
              <span className="text-green-700 font-medium">Todas as invoices foram salvas. Você pode fechar.</span>
            ) : (
              <>
                <span className="block font-medium text-gray-700 mb-1">Dois caminhos:</span>
                <span className="block">
                  <strong>Enviar para a tela</strong> — manda todas as invoices para abas na tela principal (rascunho; nada vai pro banco ainda). Depois você salva uma a uma.
                </span>
                <span className="block mt-0.5">
                  <strong>Salvar esta Invoice</strong> — grava só a aba atual no banco agora. Repita para cada aba.
                </span>
              </>
            )}
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            {onSendToScreen && (
              <button
                type="button"
                onClick={handleSendToScreen}
                title="Envia todas as invoices para abas na tela principal, sem salvar no banco. Você salva uma a uma depois."
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <LayoutGrid size={18} />
                Enviar para a tela
              </button>
            )}
            {!savedIndices.has(activeTabIndex) && (
              <button
                type="button"
                onClick={handleSaveThisInvoice}
                title="Salva a invoice da aba atual no banco de dados (e IMEIs). A aba fica verde."
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

      {/* Modal de Dados Brutos (Markdown) */}
      {showRawDataModal && currentData && (
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
                  Dados formatados em Markdown conforme extraídos do PDF (Invoice #{currentData.invoiceData.number})
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
                      navigator.clipboard.writeText(formatDataAsMarkdown(currentData));
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
                  {formatDataAsMarkdown(currentData)}
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
