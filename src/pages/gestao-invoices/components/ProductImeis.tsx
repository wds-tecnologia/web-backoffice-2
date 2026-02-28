import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Copy, Smartphone } from "lucide-react";
import { api } from "../../../services/api";
import { useNotification } from "../../../hooks/notification";

interface ProductImeisProps {
  invoiceProductId: string;
  productName: string;
}

export function ProductImeis({ invoiceProductId, productName }: ProductImeisProps) {
  const [imeis, setImeis] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setOpenNotification } = useNotification();

  useEffect(() => {
    if (isExpanded && imeis.length === 0) {
      fetchImeis();
    }
  }, [isExpanded]);

  const fetchImeis = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/invoice/imeis/invoice-product/${invoiceProductId}`);
      setImeis(response.data.imeis || []);
    } catch (error) {
      console.error("Erro ao buscar IMEIs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isWatch = /WATCH|SMART\s*WATCH/i.test(productName || "");
  const hasNonImei = imeis.some((i) => !/^\d{15}$/.test(String(i?.imei ?? "")));
  const labelType = isWatch || hasNonImei ? "Seriais" : "IMEIs";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    const label = labelType === "Seriais" ? "Serial" : "IMEI";
    setOpenNotification({
      type: "success",
      title: "Copiado!",
      notification: `${label} copiado para a área de transferência`,
    });
  };

  const copyAllImeis = () => {
    const allImeis = imeis.map((i) => i.imei).join("\n");
    navigator.clipboard.writeText(allImeis);
    const label = labelType.toLowerCase();
    setOpenNotification({
      type: "success",
      title: "Copiado!",
      notification: `${imeis.length} ${label} copiados para a área de transferência`,
    });
  };

  if (imeis.length === 0 && !isExpanded) {
    return null; // Não mostra nada se não há IMEIs e não está expandido
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        <Smartphone size={14} />
        {imeis.length > 0 ? (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
            {imeis.length} {labelType}
          </span>
        ) : (
          <span>Ver {labelType}</span>
        )}
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isExpanded && (
        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
          {isLoading ? (
            <div className="text-sm text-gray-500 text-center py-2">Carregando {labelType}...</div>
          ) : imeis.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-2">Nenhum {labelType === "Seriais" ? "serial" : "IMEI"} cadastrado para este produto</div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-semibold text-gray-700">
                  {productName} ({imeis.length} {labelType})
                </div>
                <button
                  onClick={copyAllImeis}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Copy size={12} />
                  Copiar Todos
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {imeis.map((imei, index) => (
                  <div
                    key={imei.id || index}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded px-2 py-1.5 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-xs font-mono text-gray-800">{imei.imei}</span>
                    <button
                      onClick={() => copyToClipboard(imei.imei)}
                      className="text-blue-600 hover:text-blue-700 p-1"
                      title={`Copiar ${labelType === "Seriais" ? "serial" : "IMEI"}`}
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

