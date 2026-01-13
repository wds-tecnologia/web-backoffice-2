import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";

interface ActionLoadingContextType {
  isLoading: boolean;
  loadingAction: string | null;
  executeAction: <T>(action: () => Promise<T>, actionName?: string) => Promise<T | null>;
  isActionLoading: (actionName?: string) => boolean;
}

const ActionLoadingContext = createContext<ActionLoadingContextType | undefined>(undefined);

export function ActionLoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const executeAction = useCallback(async <T,>(action: () => Promise<T>, actionName?: string): Promise<T | null> => {
    // Se já está carregando, não executa novamente (usando ref para evitar race condition)
    if (isLoadingRef.current) {
      console.warn("Ação já em execução, ignorando clique duplo");
      return null;
    }

    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      if (actionName) {
        setLoadingAction(actionName);
      }
      const result = await action();
      return result;
    } catch (error) {
      throw error;
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
      setLoadingAction(null);
    }
  }, []);

  const isActionLoading = useCallback(
    (actionName?: string) => {
      if (actionName) {
        return loadingAction === actionName;
      }
      return isLoading;
    },
    [isLoading, loadingAction]
  );

  return (
    <ActionLoadingContext.Provider
      value={{
        isLoading,
        loadingAction,
        executeAction,
        isActionLoading,
      }}
    >
      {children}
    </ActionLoadingContext.Provider>
  );
}

export function useActionLoading() {
  const context = useContext(ActionLoadingContext);
  if (context === undefined) {
    throw new Error("useActionLoading deve ser usado dentro de ActionLoadingProvider");
  }
  return context;
}
