import { useState, useCallback } from "react";

/**
 * Hook para gerenciar o estado de loading de ações
 * Previne cliques duplos em botões de ação
 */
export function useActionLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  /**
   * Executa uma ação assíncrona com proteção contra cliques duplos
   * @param action - Função assíncrona a ser executada
   * @param actionName - Nome identificador da ação (opcional)
   */
  const executeAction = useCallback(
    async <T,>(action: () => Promise<T>, actionName?: string): Promise<T | null> => {
      // Se já está carregando, não executa novamente
      if (isLoading) {
        console.warn("Ação já em execução, ignorando clique duplo");
        return null;
      }

      try {
        setIsLoading(true);
        if (actionName) {
          setLoadingAction(actionName);
        }
        const result = await action();
        return result;
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
        setLoadingAction(null);
      }
    },
    [isLoading]
  );

  /**
   * Verifica se uma ação específica está em loading
   */
  const isActionLoading = useCallback(
    (actionName?: string) => {
      if (actionName) {
        return loadingAction === actionName;
      }
      return isLoading;
    },
    [isLoading, loadingAction]
  );

  return {
    isLoading,
    loadingAction,
    executeAction,
    isActionLoading,
  };
}
