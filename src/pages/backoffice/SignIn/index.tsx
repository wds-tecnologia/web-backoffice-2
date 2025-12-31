import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthBackoffice } from "../../../hooks/authBackoffice";
import petStoreLogo from "../../../assets/icons/pet-store-logo.png";

export function SignIn() {
  const navigate = useNavigate();
  const { onSignIn } = useAuthBackoffice();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔁 Toast de atualização do Service Worker
  useEffect(() => {
    const toast = document.createElement("div");
    toast.innerHTML = `
      <div class="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg animate-fadeIn toast-shadow">
        Nova versão disponível! Atualizando...
        <div class="h-1 bg-white mt-2 rounded animate-progressBar"></div>
      </div>
    `;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "RELOAD_PAGE") {
          document.body.appendChild(toast);
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      });

      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/service-worker.js")
          .then((reg) => console.log("✅ SW registrado na tela de login:", reg))
          .catch((err) => console.error("❌ Erro ao registrar SW no login:", err));
      });
    }
  }, []);

  async function handleForm(e: FormEvent) {
    e.preventDefault();

    if (!(email.trim().length > 0 && password.trim().length > 0)) {
      setErrorMessage("Preencha todos os campos!");
      return;
    }

    const emailLower = email.trim().toLowerCase();

    try {
      setLoading(true);
      setErrorMessage(""); // limpa erro anterior se houver
      await onSignIn({ email: emailLower, password });
      localStorage.setItem("@backofficev2:token", "fakeToken");
      navigate("/backoffice");
    } catch (err) {
      setErrorMessage("Erro ao realizar login. Verifique suas credenciais.");
      console.error(err);
      // NÃO resetamos os campos!
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Exo+2:wght@400;600&display=swap"
        rel="stylesheet"
      />

      <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-gray-800 via-gray-900 to-black px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <img src={petStoreLogo} alt="Pet Store Logo" className="mx-auto h-16 w-auto" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900" style={{ fontFamily: "Orbitron, sans-serif" }}>
              Bem-vindo ao <br /> <span className="text-indigo-500">Pet Store</span>
            </h2>
            <p
              className="mt-2 text-sm text-gray-600"
              style={{
                fontFamily: "Exo 2, sans-serif",
                fontWeight: 400,
                letterSpacing: "0.05em",
              }}
            >
              Mensagens criptografadas ponta a ponta.
            </p>
            <h2 className="mt-6 text-2xl font-bold text-gray-700" style={{ fontFamily: "Orbitron, sans-serif" }}>
              Portal Administrativo
            </h2>
          </div>

          {errorMessage && <div className="text-red-500 text-sm font-medium text-center">{errorMessage}</div>}

          <form className="mt-8 space-y-6" onSubmit={handleForm}>
            <div className="-space-y-px rounded-md shadow-sm">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Email"
                  className="relative block w-full appearance-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Senha"
                  className="relative block w-full appearance-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </form>
        </div>
        <footer className="fixed bottom-0 w-full text-center py-2 bg-gray-800 text-white">
          &copy; 2025 Pet Store. Todos os direitos reservados.
        </footer>
      </div>
    </>
  );
}
