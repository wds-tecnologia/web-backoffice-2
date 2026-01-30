import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Package, FileText, Building2, Truck, Calendar, DollarSign, ChevronDown } from "lucide-react";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";
import { matchSearchTerms } from "../utils/searchMatch";

interface ImeiData {
  imei: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    code: string;
    description: string;
  };
  invoice: {
    id: string;
    number: string;
    date: string;
    supplier: {
      id: string;
      name: string;
    };
    carrier: {
      id: string;
      name: string;
    } | null;
    carrier2: {
      id: string;
      name: string;
    } | null;
  };
  invoiceProduct: {
    id: string;
    quantity: number;
    value: number;
    total: number;
    received: boolean;
  };
}

interface ImeiListItem {
  imei: string;
  productName: string;
  invoiceNumber: string;
}

export function ImeiSearchTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [imeiData, setImeiData] = useState<ImeiData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [allImeis, setAllImeis] = useState<ImeiListItem[]>([]);
  const [filteredImeis, setFilteredImeis] = useState<ImeiListItem[]>([]);
  const [isLoadingImeis, setIsLoadingImeis] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allImeisData, setAllImeisData] = useState<ImeiData[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { setOpenNotification } = useNotification();

  // Carregar todos os IMEIs ao montar o componente
  useEffect(() => {
    fetchAllImeis();
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrar IMEIs conforme digita (busca por múltiplos termos: imei, produto, invoice)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredImeis(allImeis);
    } else {
      const searchableText = (item: ImeiListItem) =>
        `${item.imei} ${item.productName} ${item.invoiceNumber}`.trim();
      const filtered = allImeis.filter((item) => matchSearchTerms(searchTerm, searchableText(item)));
      setFilteredImeis(filtered);
    }
  }, [searchTerm, allImeis]);

  const fetchAllImeis = async () => {
    setIsLoadingImeis(true);
    try {
      // Endpoint alinhado com os demais: /invoice/imeis/... (plural)
      const response = await api.get("/invoice/imeis/list-all");
      const imeisData: ImeiData[] = response.data.imeis || response.data || [];
      
      setAllImeisData(Array.isArray(imeisData) ? imeisData : []);
      
      const list = Array.isArray(imeisData) ? imeisData : [];
      const imeisList: ImeiListItem[] = list.map((item: ImeiData) => ({
        imei: item.imei,
        productName: item.product?.name ?? "",
        invoiceNumber: item.invoice?.number ?? "",
      }));
      
      setAllImeis(imeisList);
      setFilteredImeis(imeisList);
    } catch (error: any) {
      console.error("Erro ao carregar lista de IMEIs:", error);
      const is404 = error?.response?.status === 404;
      setOpenNotification({
        type: "error",
        title: "Erro",
        notification: is404
          ? "Listagem de IMEIs não disponível (endpoint não encontrado). Verifique com o backend."
          : "Erro ao carregar lista de IMEIs",
      });
      setAllImeis([]);
      setFilteredImeis([]);
      setAllImeisData([]);
    } finally {
      setIsLoadingImeis(false);
    }
  };

  const handleSearch = async (imeiToSearch?: string) => {
    const trimmedImei = imeiToSearch || searchTerm.trim();

    // Se estiver vazio, listar todos os IMEIs
    if (!trimmedImei) {
      if (allImeisData.length > 0) {
        // Mostrar listagem de todos os IMEIs
        setImeiData(null);
        setNotFound(false);
        setShowDropdown(false);
        return;
      } else {
        setOpenNotification({
          type: "warning",
          title: "Atenção",
          notification: "Nenhum IMEI cadastrado no sistema",
        });
        return;
      }
    }

    setIsSearching(true);
    setNotFound(false);
    setImeiData(null);
    setShowDropdown(false);

    try {
      const response = await api.get(`/invoice/imeis/search?imei=${encodeURIComponent(trimmedImei)}`);
      setImeiData(response.data);
      setNotFound(false);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setNotFound(true);
        setImeiData(null);
      } else {
        setOpenNotification({
          type: "error",
          title: "Erro",
          notification: "Erro ao buscar IMEI. Tente novamente.",
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectImei = (imei: string) => {
    setSearchTerm(imei);
    setShowDropdown(false);
    handleSearch(imei);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-blue-700 mb-4 flex items-center">
          <Search className="mr-2" size={20} />
          Buscar IMEI
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Selecione ou digite o IMEI para encontrar informações sobre o produto, invoice e fornecedor.
        </p>

        {/* Campo de Busca com Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Digite ou selecione um IMEI"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSearching}
              />
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <ChevronDown size={20} />
              </button>
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={isSearching}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Buscando...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Buscar
                </>
              )}
            </button>
          </div>

          {/* Dropdown de IMEIs */}
          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {isLoadingImeis ? (
                <div className="p-4 text-center text-gray-500">
                  <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                  Carregando IMEIs...
                </div>
              ) : filteredImeis.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? "Nenhum IMEI encontrado" : "Nenhum IMEI cadastrado"}
                </div>
              ) : (
                <ul>
                  {filteredImeis.map((item, index) => (
                    <li
                      key={index}
                      onClick={() => handleSelectImei(item.imei)}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-mono text-sm font-semibold text-gray-900">{item.imei}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {item.productName} • Invoice #{item.invoiceNumber}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Informação de quantos IMEIs existem */}
        <div className="mt-3 text-sm text-gray-500">
          {isLoadingImeis ? (
            "Carregando..."
          ) : (
            `${allImeis.length} IMEI${allImeis.length !== 1 ? "s" : ""} cadastrado${allImeis.length !== 1 ? "s" : ""} no sistema`
          )}
        </div>
      </div>

      {/* Resultado da Busca */}
      {notFound && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-yellow-600 text-lg font-semibold mb-2">IMEI não encontrado</div>
          <p className="text-gray-600">O IMEI <strong>{searchTerm}</strong> não está cadastrado no sistema.</p>
        </div>
      )}

      {imeiData && (
        <div className="space-y-4">
          {/* IMEI Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">IMEI Encontrado</div>
            <div className="text-2xl font-bold text-blue-700">{imeiData.imei}</div>
            <div className="text-xs text-gray-500 mt-1">
              Cadastrado em: {formatDate(imeiData.createdAt)}
            </div>
          </div>

          {/* Produto */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold">
              <Package size={20} />
              Produto
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-sm text-gray-600">Nome</div>
                <div className="font-semibold text-gray-900">{imeiData.product.name}</div>
              </div>
              {imeiData.product.code && (
                <div>
                  <div className="text-sm text-gray-600">Código</div>
                  <div className="font-mono text-gray-900">{imeiData.product.code}</div>
                </div>
              )}
            </div>
          </div>

          {/* Invoice */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold">
              <FileText size={20} />
              Invoice
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-gray-600">Número</div>
                <div className="font-bold text-lg text-gray-900">#{imeiData.invoice.number}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 flex items-center gap-1">
                  <Calendar size={14} />
                  Data
                </div>
                <div className="font-semibold text-gray-900">{formatDate(imeiData.invoice.date)}</div>
              </div>
            </div>
          </div>

          {/* Fornecedor */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold">
              <Building2 size={20} />
              Fornecedor
            </div>
            <div className="font-semibold text-lg text-gray-900">{imeiData.invoice.supplier.name}</div>
          </div>

          {/* Freteiros */}
          {(imeiData.invoice.carrier || imeiData.invoice.carrier2) && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold">
                <Truck size={20} />
                Freteiro(s)
              </div>
              <div className="space-y-2">
                {imeiData.invoice.carrier && (
                  <div>
                    <div className="text-sm text-gray-600">Freteiro 1</div>
                    <div className="font-semibold text-gray-900">{imeiData.invoice.carrier.name}</div>
                  </div>
                )}
                {imeiData.invoice.carrier2 && (
                  <div>
                    <div className="text-sm text-gray-600">Freteiro 2</div>
                    <div className="font-semibold text-gray-900">{imeiData.invoice.carrier2.name}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detalhes do Produto na Invoice */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold">
              <DollarSign size={20} />
              Detalhes na Invoice
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-sm text-gray-600">Quantidade</div>
                <div className="font-semibold text-gray-900">{imeiData.invoiceProduct.quantity}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Valor Unitário</div>
                <div className="font-semibold text-gray-900">{formatCurrency(imeiData.invoiceProduct.value)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Valor Total</div>
                <div className="font-bold text-lg text-green-600">{formatCurrency(imeiData.invoiceProduct.total)}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600">Status:</div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    imeiData.invoiceProduct.received
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {imeiData.invoiceProduct.received ? "Recebido" : "Pendente"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estado Inicial */}
      {!imeiData && !notFound && !isSearching && (
        <div className="text-center py-12 text-gray-400">
          <Search size={64} className="mx-auto mb-4 opacity-20" />
          <p>Selecione ou digite um IMEI e clique em Buscar para ver as informações</p>
          {allImeis.length > 0 && (
            <p className="mt-2 text-sm">Ou clique no campo acima para ver todos os IMEIs disponíveis</p>
          )}
        </div>
      )}
    </div>
  );
}

