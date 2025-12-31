import { useEffect, useState } from "react";
import { Hooks } from "./hooks";
import { Router } from "./routes/authenticatedRoutes";
import "./styles/index.css";
import { Notification } from "./components/notifications";

function App() {
  const [showUpdateToast, setShowUpdateToast] = useState(false);

  useEffect(() => {
    // 🔁 Marca recarregamento antes de sair
    window.addEventListener("beforeunload", () => {
      sessionStorage.setItem("isReloading", "true");
    });

    // 🔒 Limpa localStorage se não for recarregamento
    const isReloading = sessionStorage.getItem("isReloading");
    if (!isReloading) {
      localStorage.removeItem("@stricv2:token");
      localStorage.removeItem("@stricv2:account");
      localStorage.removeItem("@stricv2:user");
      localStorage.removeItem("@backoffice:user");
      localStorage.removeItem("@backoffice:token");
    }
    sessionStorage.setItem("isReloading", "true");

    // 📩 Listener de mensagens do Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "RELOAD_PAGE") {
          console.log("🟢 Atualização detectada. Recarregando...");
          setShowUpdateToast(true);
          setTimeout(() => {
            window.location.reload(); // Reload sem argumentos (evita erro TS)
          }, 2000);
        }
      });
    }

    // 📦 Registro do Service Worker no carregamento da página
    window.addEventListener("load", () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/service-worker.js")
          .then((registration) => {
            console.log("✅ Service Worker registrado:", registration);
          })
          .catch((err) => {
            console.error("❌ Erro ao registrar o SW:", err);
          });
      }
    });
  }, []);

  return (
    <>
      <Hooks>
        <Router />
        <Notification/>
      </Hooks>

      {showUpdateToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white text-gray-800 px-5 py-4 rounded-2xl shadow-xl border border-gray-300 flex items-center gap-4 z-50 animate-fadeIn">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500"></div>
          <div className="flex flex-col">
            <span className="font-semibold">Nova versão disponível</span>
            <span className="text-sm text-gray-500">Atualizando automaticamente...</span>
            <div className="w-full h-1 bg-gray-200 rounded mt-2 overflow-hidden">
              <div className="h-full bg-green-500 animate-progressBar"></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
