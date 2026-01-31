import React, { useEffect } from "react";

export function SessionExpiredBackoffice() {
  useEffect(() => {
    // Impede scroll na página
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleManualRedirect = () => {
    console.log(
      "🚪 Logout manual solicitado - redirecionando para login backoffice"
    );

    // Limpa dados específicos do backoffice
    const keysToRemove = [
      "@backoffice:token",
      "@backoffice:user",
      "@backoffice:account",
    ];

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
        console.log(`🗑️ Removido: ${key}`);
      } catch (error) {
        console.warn(`⚠️ Erro ao remover ${key}:`, error);
      }
    });

    // Limpa sessionStorage também
    sessionStorage.clear();

    // Força reload da página para limpar completamente o estado
    console.log("✅ Logout realizado com sucesso - recarregando página");
    window.location.href = "/signin/backoffice";
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)",
      }}
    >
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border-4 border-purple-500">
        {/* Header com alerta */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce border-4 border-purple-200">
            <svg
              className="w-12 h-12 text-purple-600 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-purple-600 mb-2">
            🚨 Sessão Backoffice Expirada
          </h1>

          <p className="text-gray-600 text-lg">
            Sua sessão do painel administrativo expirou por segurança
          </p>

          <p className="text-gray-500 text-sm mt-2">
            Clique no botão abaixo para fazer login novamente
          </p>
        </div>

        {/* Conteúdo principal */}
        <div className="space-y-6">
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">
              🔒 Problema de Segurança Detectado
            </h3>
            <p className="text-purple-700 text-sm">
              O sistema detectou que seu token de autenticação do backoffice
              está inválido ou expirou. Por questões de segurança, você precisa
              fazer login novamente no painel administrativo.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleManualRedirect}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-3"
            >
              <span>🔐</span>
              <span>Fazer Login no Backoffice</span>
            </button>

            <p className="text-xs text-gray-500">
              Faça login novamente para continuar administrando o sistema
            </p>
          </div>
        </div>
      </div>

      <style>{`
        /* Remove qualquer margem/padding do body/html para tela cheia */
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          height: 100% !important;
        }
      `}</style>
    </div>
  );
}
