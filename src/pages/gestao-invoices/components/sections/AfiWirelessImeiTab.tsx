import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronUp, Loader2, RefreshCcw, Save, Search, Smartphone } from "lucide-react";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";
import { formatDateToBR } from "../utils/format";

interface SupplierData {
  id: string;
  name: string;
}

interface ProductData {
  id: string;
  name: string;
}

interface InvoiceProductData {
  id: string;
  productId: string;
  quantity: number;
}

interface InvoiceData {
  id: string;
  number: string;
  date: string;
  supplierId: string;
  supplier?: {
    id: string;
    name: string;
  };
  products: InvoiceProductData[];
}

interface ImeiData {
  imei: string;
  invoice: {
    number: string;
    supplier: {
      name: string;
    };
  };
  invoiceProduct: {
    id: string;
  };
  product: {
    name: string;
  };
}

interface ImeiListResponse {
  imeis: ImeiData[];
}

const AFI_SUPPLIER_REGEX = /AFI\s+WIRELESS\s+INC/i;

function parseBulkIdentifiers(input: string): string[] {
  const tokens = input
    .split(/[\s,.;:\n\r\t]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(tokens));
}

export function AfiWirelessImeiTab() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingImeis, setIsRefreshingImeis] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyAfiInvoices, setOnlyAfiInvoices] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [afiImeis, setAfiImeis] = useState<ImeiData[]>([]);
  const [openInputs, setOpenInputs] = useState<Record<string, boolean>>({});
  const [bulkInputs, setBulkInputs] = useState<Record<string, string>>({});
  const [savingByInvoiceProduct, setSavingByInvoiceProduct] = useState<Record<string, boolean>>({});
  const { setOpenNotification } = useNotification();

  const suppliersMap = useMemo(() => {
    return new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));
  }, [suppliers]);

  const productNameMap = useMemo(() => {
    return new Map(products.map((product) => [product.id, product.name]));
  }, [products]);

  const imeisByInvoiceProduct = useMemo(() => {
    const grouped = new Map<string, ImeiData[]>();
    for (const imei of afiImeis) {
      const key = imei.invoiceProduct?.id;
      if (!key) continue;
      const current = grouped.get(key) || [];
      current.push(imei);
      grouped.set(key, current);
    }
    return grouped;
  }, [afiImeis]);

  const afiInvoiceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const imei of afiImeis) {
      const invoiceNumber = String(imei.invoice?.number ?? "");
      for (const invoice of invoices) {
        if (String(invoice.number) === invoiceNumber) {
          ids.add(invoice.id);
        }
      }
    }
    return ids;
  }, [afiImeis, invoices]);

  const invoicesSource = useMemo(() => {
    if (!onlyAfiInvoices) return invoices;
    return invoices.filter((invoice) => {
      const supplierName = (invoice.supplier?.name || suppliersMap.get(invoice.supplierId) || "").trim();
      if (AFI_SUPPLIER_REGEX.test(supplierName)) return true;
      return afiInvoiceIds.has(invoice.id);
    });
  }, [onlyAfiInvoices, invoices, suppliersMap, afiInvoiceIds]);

  const filteredInvoices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return invoicesSource;

    return invoicesSource.filter((invoice) => {
      const supplierName = (invoice.supplier?.name || suppliersMap.get(invoice.supplierId) || "").toLowerCase();
      const invoiceNumber = String(invoice.number || "").toLowerCase();
      const productNames = (invoice.products || [])
        .map((product) => productNameMap.get(product.productId) || "")
        .join(" ")
        .toLowerCase();
      const persistedImeis = (invoice.products || [])
        .flatMap((product) => (imeisByInvoiceProduct.get(product.id) || []).map((item) => item.imei))
        .join(" ")
        .toLowerCase();

      return (
        supplierName.includes(term) ||
        invoiceNumber.includes(term) ||
        productNames.includes(term) ||
        persistedImeis.includes(term)
      );
    });
  }, [searchTerm, invoicesSource, suppliersMap, productNameMap, imeisByInvoiceProduct]);

  const fetchAfiImeis = async () => {
    setIsRefreshingImeis(true);
    try {
      const response = await api.get<ImeiListResponse>("/invoice/imeis/list-all", {
        params: { page: 1, limit: 5000 },
      });
      const allImeis = response.data?.imeis || [];
      const onlyAfi = allImeis.filter((item) => AFI_SUPPLIER_REGEX.test(item.invoice?.supplier?.name || ""));
      setAfiImeis(onlyAfi);
    } catch (error) {
      console.error("Erro ao carregar IMEIs AFI:", error);
      setOpenNotification({
        type: "error",
        title: "Erro",
        notification: "Não foi possível carregar os IMEIs AFI.",
      });
    } finally {
      setIsRefreshingImeis(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [invoiceResponse, supplierResponse, productsResponse] = await Promise.all([
        api.get("/invoice/get"),
        api.get("/invoice/supplier"),
        api.get("/invoice/product"),
      ]);

      const invoiceList = Array.isArray(invoiceResponse.data) ? invoiceResponse.data : [];
      const supplierList = Array.isArray(supplierResponse.data) ? supplierResponse.data : [];
      const productsRaw = productsResponse.data;
      const productsList = Array.isArray(productsRaw) ? productsRaw : productsRaw?.products || [];

      setInvoices(invoiceList);
      setSuppliers(supplierList);
      setProducts(productsList);

      await fetchAfiImeis();
    } catch (error) {
      console.error("Erro ao carregar dados AFI:", error);
      setOpenNotification({
        type: "error",
        title: "Erro",
        notification: "Falha ao carregar dados da aba AFI.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleInput = (invoiceProductId: string) => {
    setOpenInputs((prev) => ({
      ...prev,
      [invoiceProductId]: !prev[invoiceProductId],
    }));
  };

  const saveBulkImeis = async (invoiceProduct: InvoiceProductData) => {
    const raw = bulkInputs[invoiceProduct.id] || "";
    const imeis = parseBulkIdentifiers(raw);

    if (imeis.length === 0) {
      setOpenNotification({
        type: "warning",
        title: "Atenção",
        notification: "Informe ao menos 1 IMEI/serial para salvar.",
      });
      return;
    }

    setSavingByInvoiceProduct((prev) => ({ ...prev, [invoiceProduct.id]: true }));
    try {
      await api.post("/invoice/imeis/save", {
        invoiceProductId: invoiceProduct.id,
        imeis,
      });

      setOpenNotification({
        type: "success",
        title: "Sucesso",
        notification: `${imeis.length} IMEI(s)/serial(is) salvos para o produto.`,
      });

      setBulkInputs((prev) => ({ ...prev, [invoiceProduct.id]: "" }));
      await fetchAfiImeis();
    } catch (error) {
      console.error("Erro ao salvar IMEIs AFI:", error);
      setOpenNotification({
        type: "error",
        title: "Erro",
        notification: "Não foi possível salvar os IMEIs/seriais para este produto.",
      });
    } finally {
      setSavingByInvoiceProduct((prev) => ({ ...prev, [invoiceProduct.id]: false }));
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-purple-700 flex items-center gap-2">
            <Smartphone size={20} />
            IMEIs AFI Wireless
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Separação aplicada apenas nos IMEIs/seriais da <strong>AFI WIRELESS INC</strong>. Invoices e produtos continuam mistos.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          disabled={isLoading || isRefreshingImeis}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading || isRefreshingImeis ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="text-sm text-purple-700">Invoices (misto)</div>
          <div className="text-2xl font-bold text-purple-900">{invoices.length}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-sm text-blue-700">Produtos (misto)</div>
          <div className="text-2xl font-bold text-blue-900">
            {invoices.reduce((sum, invoice) => sum + (invoice.products?.length || 0), 0)}
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-sm text-green-700">IMEIs/Seriais AFI Persistidos</div>
          <div className="text-2xl font-bold text-green-900">{afiImeis.length}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOnlyAfiInvoices((prev) => !prev)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            onlyAfiInvoices
              ? "bg-purple-600 text-white border-purple-600 hover:bg-purple-700"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
          }`}
        >
          {onlyAfiInvoices ? "Mostrando: Somente invoices AFI" : "Mostrando: Todas as invoices"}
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Filtrar por invoice, produto, fornecedor ou IMEI AFI..."
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">
          <Loader2 className="animate-spin mx-auto mb-2" size={24} />
          Carregando dados AFI...
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800">
          Nenhuma invoice encontrada para o filtro informado.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 border-b px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                <div className="font-semibold text-gray-900">Invoice #{invoice.number}</div>
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Building2 size={14} />
                  {(invoice.supplier?.name || suppliersMap.get(invoice.supplierId) || "AFI WIRELESS INC").toUpperCase()}
                  <span className="mx-1">|</span>
                  {invoice.date ? formatDateToBR(invoice.date) : "Sem data"}
                </div>
              </div>

              <div className="p-4 space-y-3">
                {(invoice.products || []).map((invoiceProduct) => {
                  const persisted = imeisByInvoiceProduct.get(invoiceProduct.id) || [];
                  const isOpen = Boolean(openInputs[invoiceProduct.id]);
                  const isSaving = Boolean(savingByInvoiceProduct[invoiceProduct.id]);
                  return (
                    <div key={invoiceProduct.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            {productNameMap.get(invoiceProduct.productId) || `Produto ${invoiceProduct.productId}`}
                          </div>
                          <div className="text-xs text-gray-600">
                            Qtd da invoice: {invoiceProduct.quantity} | Persistidos: {persisted.length}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleInput(invoiceProduct.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm"
                        >
                          Cadastrar em massa
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>

                      {isOpen && (
                        <div className="mt-3 space-y-3">
                          <textarea
                            value={bulkInputs[invoiceProduct.id] || ""}
                            onChange={(event) =>
                              setBulkInputs((prev) => ({
                                ...prev,
                                [invoiceProduct.id]: event.target.value,
                              }))
                            }
                            rows={4}
                            placeholder="Cole IMEIs/seriais separados por vírgula, ponto, ponto e vírgula ou dois pontos."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              Separadores aceitos: <strong>, . ; :</strong> e quebra de linha.
                            </div>
                            <button
                              type="button"
                              onClick={() => saveBulkImeis(invoiceProduct)}
                              disabled={isSaving}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                              Salvar
                            </button>
                          </div>
                        </div>
                      )}

                      {persisted.length > 0 && (
                        <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded">
                          <div className="text-xs font-semibold text-gray-700 mb-1">IMEIs/Seriais persistidos</div>
                          <div className="text-xs text-gray-700 break-all">
                            {persisted.map((item) => item.imei).join(", ")}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
