import { useActionLoading } from "../context/ActionLoadingContext";

/**
 * Hook que retorna se os botões devem estar desabilitados
 * Usa o contexto global de loading para bloquear TODOS os botões quando qualquer ação está em execução
 */
export function useDisableButtons() {
  const { isLoading } = useActionLoading();
  return isLoading;
}

