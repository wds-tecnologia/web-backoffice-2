import { useState } from "react";
import { Search, Loader2, Package, FileText, Building2, Truck, Calendar, DollarSign } from "lucide-react";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";

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

export function ImeiSearchTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [imeiData, setImeiData] = useState<ImeiData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const { setOpenNotification } = useNotification();

  const handleSearch = async () => {
    const trimmedImei = searchTerm.trim();

    if (!trimmedImei) {
      setOpenNotification({
        type: "warning",
        title: "Atenção",
        notification: "Digite um IMEI para buscar",
      });
      return;
    }

    // Validação básica: IMEI deve ter entre 10-15 dígitos
    if (!/^\d{10,15}$/.test(trimmedImei)) {
      setOpenNotification({
        type: "warning",
        title: "IMEI Inválido",
        notification: "O IMEI deve conter apenas números (10-15 dígitos)",
      });
      return;
    }

    setIsSearching(true);
    setNotFound(false);
    setImeiData(null);

    try {
      const response = await api.get(`/invoice/imei/search?imei=${encodeURIComponent(trimmedImei)}`);
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
          Digite o IMEI para encontrar informações sobre o produto, invoice e fornecedor.
        </p>

        {/* Campo de Busca */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Digite o IMEI (ex: 354780907895774)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isSearching}
          />
          <button
            onClick={handleSearch}
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
          <p>Digite um IMEI e clique em Buscar para ver as informações</p>
        </div>
      )}
    </div>
  );
}

