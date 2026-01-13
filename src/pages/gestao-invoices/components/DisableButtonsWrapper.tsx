import { useEffect, useRef } from "react";
import { useActionLoading } from "../context/ActionLoadingContext";

/**
 * Componente que desabilita TODOS os botões quando qualquer ação está em execução
 * Usa MutationObserver para capturar botões dinâmicos também
 */
export function DisableButtonsWrapper({ children }: { children: React.ReactNode }) {
  const { isLoading } = useActionLoading();
  const disabledButtonsRef = useRef<Set<HTMLButtonElement>>(new Set());
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const disableAllButtons = () => {
      const buttons = document.querySelectorAll("button:not([data-allow-click])");
      buttons.forEach((btn) => {
        const htmlBtn = btn as HTMLButtonElement;
        if (!htmlBtn.disabled && !htmlBtn.hasAttribute("data-action-disabled")) {
          htmlBtn.disabled = true;
          htmlBtn.setAttribute("data-action-disabled", "true");
          disabledButtonsRef.current.add(htmlBtn);
        }
      });
    };

    const enableAllButtons = () => {
      disabledButtonsRef.current.forEach((btn) => {
        if (btn.hasAttribute("data-action-disabled")) {
          btn.disabled = false;
          btn.removeAttribute("data-action-disabled");
        }
      });
      disabledButtonsRef.current.clear();
    };

    if (isLoading) {
      document.body.setAttribute("data-action-loading", "true");
      disableAllButtons();

      // Observar mudanças no DOM para desabilitar novos botões que aparecem
      observerRef.current = new MutationObserver(() => {
        disableAllButtons();
      });

      observerRef.current.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } else {
      document.body.removeAttribute("data-action-loading");
      enableAllButtons();

      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading]);

  return <>{children}</>;
}

