import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Copy, Loader2, Smartphone, Trash2 } from "lucide-react";
import { api } from "../../../services/api";
import { useNotification } from "../../../hooks/notification";

interface ProductImeisProps {
  invoiceProductId: string;
  productName: string;
}

export function ProductImeis({ invoiceProductId, productName }: ProductImeisProps) {
  const [imeis, setImeis] = useState<{ id?: string; imei: string }[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftInput, setDraftInput] = useState("");
  const { setOpenNotification } = useNotification();

  const fetchImeis = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/invoice/imeis/invoice-product/${invoiceProductId}`);
      setImeis(response.data.imeis || []);
    } catch (error) {
      console.error("Erro ao buscar IMEIs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [invoiceProductId]);

  useEffect(() => {
    if (isExpanded) {
      fetchImeis();
    }
  }, [isExpanded, fetchImeis]);

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

  const parseInput = (input: string) => {
    const rawTokens = input
      .split(/[,\n;:]+/g)
      .flatMap((chunk) => chunk.split(/\s+/g))
      .map((item) => item.trim())
      .filter(Boolean);

    const valid: string[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();

    for (const token of rawTokens) {
      const normalized = token.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      const isImei = /^\d{15}$/.test(normalized);
      const isSerial = /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{10,15}$/.test(normalized);
      if (!normalized || (!isImei && !isSerial)) {
        invalid.push(token);
        continue;
      }
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      valid.push(normalized);
    }

    return { valid, invalid };
  };

  const preview = useMemo(() => {
    const { valid, invalid } = parseInput(draftInput);
    const existing = new Set(imeis.map((item) => String(item.imei || "").toUpperCase()));
    const duplicateCount = valid.filter((item) => existing.has(item)).length;
    const addCount = valid.length - duplicateCount;
    return { addCount, duplicateCount, invalidCount: invalid.length, invalidSamples: invalid.slice(0, 4) };
  }, [draftInput, imeis]);

  const updateImeis = async (mode: "merge" | "replace" | "clear") => {
    if (mode !== "clear") {
      const { valid } = parseInput(draftInput);
      if (valid.length === 0) {
        setOpenNotification({
          type: "warning",
          title: "Atenção",
          notification: "Informe ao menos 1 IMEI/serial válido para continuar.",
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload =
        mode === "clear"
          ? { mode, imeis: [] as string[] }
          : { mode, imeis: parseInput(draftInput).valid };
      const response = await api.patch(`/invoice/imeis/invoice-product/${invoiceProductId}`, payload);
      const finalImeis: string[] = response.data?.finalImeis || [];
      setImeis(finalImeis.map((item, idx) => ({ id: `local-${idx}`, imei: item })));
      if (mode !== "clear") setDraftInput("");

      const summary = response.data?.summary;
      const defaultMsg = `${finalImeis.length} ${labelType.toLowerCase()} no produto após atualização.`;
      setOpenNotification({
        type: "success",
        title: "Atualizado",
        notification: summary
          ? `${summary.added} adicionados, ${summary.duplicatesIgnored} duplicados ignorados, ${summary.invalidIgnored} inválidos ignorados.`
          : defaultMsg,
      });
    } catch (error: any) {
      const message =
        error?.response?.status === 409
          ? "Conflito: um ou mais IMEIs já pertencem a outro produto."
          : "Não foi possível atualizar os IMEIs/seriais deste produto.";
      setOpenNotification({
        type: "error",
        title: "Erro",
        notification: message,
      });
    } finally {
      setIsSaving(false);
    }
  };

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
          <span>Gerenciar {labelType}</span>
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
              <div className="mt-3 border-t pt-3 space-y-2">
                <textarea
                  value={draftInput}
                  onChange={(e) => setDraftInput(e.target.value)}
                  rows={3}
                  placeholder="Cole IMEIs/seriais separados por vírgula, ponto e vírgula, dois pontos, espaço ou quebra de linha"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                />
                <div className="text-[11px] text-gray-500">
                  Formato aceito: IMEI (15 dígitos) ou serial alfanumérico (10–15, com letra e número).
                </div>
                {draftInput.trim() && (
                  <div className="text-[11px] text-gray-600">
                    Prévia: {preview.addCount} novo(s), {preview.duplicateCount} duplicado(s), {preview.invalidCount} inválido(s).
                    {preview.invalidSamples.length > 0 ? ` Inválidos: ${preview.invalidSamples.join(", ")}.` : ""}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => updateImeis("merge")}
                    className="flex-1 px-2 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {isSaving ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
                    Somar
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => updateImeis("replace")}
                    className="flex-1 px-2 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:bg-gray-400"
                  >
                    Substituir
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => updateImeis("clear")}
                    className="px-2 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:bg-gray-400"
                    title="Limpar todos"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

