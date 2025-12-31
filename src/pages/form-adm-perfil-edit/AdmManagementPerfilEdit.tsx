import React, { useState } from "react";
import { useAuthBackoffice } from "../../hooks/authBackoffice";
import { useTheme } from "@mui/material";
import { api } from "../../services/api";

// Mock do usuário logado (tipo OPERATOR)
const mockLoggedUser = {
  id: "1",
  name: "Ed Admin",
  email: "ED.adm@empresa.com",
  password: "",
  accessPassword: "",
  status: "active",
  lastAccess: new Date().toISOString(),
};

const AdmManagementPerfilEdit: React.FC = () => {
  const { user } = useAuthBackoffice();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Hooks SEMPRE no topo
  const [formData, setFormData] = useState({
    userId: user?.id || "",
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    confirmPassword: "",
    accessPassword: "",
    status: user?.status || "ACTIVE",
  });
  const [passwordVisible, setPasswordVisible] = useState({
    password: false,
    confirmPassword: false,
    accessPassword: false,
  });
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [loading, setLoading] = useState(false);

  // Função para alternar visibilidade das senhas
  const togglePasswordVisibility = (field: "password" | "confirmPassword" | "accessPassword") => {
    setPasswordVisible((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // Função para mostrar toast
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  // Função para salvar alterações (mock)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

     const updatedOperator2 = {
          id: user?.id,
          name: formData.name,
          email: formData.email,
          status: formData.status,
          lastAccess: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(formData.password ? { password: formData.password } : {}),
          ...(formData.accessPassword ? { accessPassword: formData.accessPassword } : {}),
        };

    try{
      const response = await api.patch(`/users_operators/${updatedOperator2.id}`, updatedOperator2);

      const newUser = {...user, name: updatedOperator2.name, email: updatedOperator2.email};

      localStorage.setItem("@backoffice:user", JSON.stringify(newUser));

    setTimeout(() => {
      setLoading(false);
      showToast("Perfil atualizado com sucesso!", "success");
      // Aqui você pode atualizar o mockLoggedUser se quiser persistir na tela
    }, 500);


    }catch (error) {
      console.error("Erro ao salvar perfil:", error);
      showToast("Erro ao atualizar perfil. Tente novamente.", "error");
      setLoading(false);
      return;
    }

  };

  // Função para lidar com mudanças nos campos
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Verificar se as senhas coincidem
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;

  // Checagem correta: user.role
  // if (!user || user.role !== "MASTER") {
  //   return null;
  // }

  return (
    <div
      className={
        isDark
          ? "min-h-screen bg-gray-900 flex items-center justify-center py-8 px-2"
          : "min-h-screen bg-gray-50 flex items-center justify-center py-8 px-2"
      }
    >
      <div
        className={
          isDark
            ? "w-full max-w-md bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700"
            : "w-full max-w-md bg-white rounded-xl shadow-lg p-6 border border-gray-200"
        }
      >
        <h2
          className={
            isDark
              ? "text-2xl font-bold text-gray-100 mb-2 flex items-center"
              : "text-2xl font-bold text-gray-900 mb-2 flex items-center"
          }
        >
          <i className="fas fa-user-circle text-indigo-600 mr-2"></i> Meu Perfil
        </h2>
        <p className={isDark ? "text-gray-300 mb-6" : "text-gray-500 mb-6"}>
          Gerencie seus dados pessoais e senhas de acesso ao sistema.
        </p>
        <form className="space-y-5" onSubmit={handleSave}>
          <div>
            <label
              htmlFor="name"
              className={
                isDark ? "block text-sm font-medium text-gray-200 mb-1" : "block text-sm font-medium text-gray-700 mb-1"
              }
            >
              Nome Completo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className={isDark ? "fas fa-user text-gray-300" : "fas fa-user text-gray-400"}></i>
              </div>
              <input
                type="text"
                id="name"
                name="name"
                required
                className={
                  isDark
                    ? "pl-10 block w-full border border-gray-600 rounded-lg shadow-sm py-2.5 px-4 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-900 text-gray-100 placeholder-gray-400"
                    : "pl-10 block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-4 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-400"
                }
                placeholder="Digite seu nome completo"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="email"
              className={
                isDark ? "block text-sm font-medium text-gray-200 mb-1" : "block text-sm font-medium text-gray-700 mb-1"
              }
            >
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className={isDark ? "fas fa-envelope text-gray-300" : "fas fa-envelope text-gray-400"}></i>
              </div>
              <input
                type="email"
                id="email"
                name="email"
                required
                className={
                  isDark
                    ? "pl-10 block w-full border border-gray-600 rounded-lg shadow-sm py-2.5 px-4 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-900 text-gray-100 placeholder-gray-400"
                    : "pl-10 block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-4 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-400"
                }
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="password"
              className={
                isDark ? "block text-sm font-medium text-gray-200 mb-1" : "block text-sm font-medium text-gray-700 mb-1"
              }
            >
              Nova Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className={isDark ? "fas fa-lock text-gray-300" : "fas fa-lock text-gray-400"}></i>
              </div>
              <input
                type={passwordVisible.password ? "text" : "password"}
                id="password"
                name="password"
                className={
                  isDark
                    ? "pl-10 block w-full border border-gray-600 rounded-lg shadow-sm py-2.5 px-4 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-900 text-gray-100 placeholder-gray-400"
                    : "pl-10 block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-4 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-400"
                }
                placeholder={mockLoggedUser.password ? "Deixe em branco para manter atual" : "Crie uma nova senha"}
                value={formData.password}
                onChange={handleInputChange}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <i
                  className={`fas ${
                    passwordVisible.password ? "fa-eye" : "fa-eye-slash"
                  } toggle-password cursor-pointer ${isDark ? "text-gray-300" : ""}`}
                  onClick={() => togglePasswordVisibility("password")}
                ></i>
              </div>
            </div>
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className={
                isDark ? "block text-sm font-medium text-gray-200 mb-1" : "block text-sm font-medium text-gray-700 mb-1"
              }
            >
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className={isDark ? "fas fa-lock text-gray-300" : "fas fa-lock text-gray-400"}></i>
              </div>
              <input
                type={passwordVisible.confirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                className={
                  isDark
                    ? "pl-10 block w-full border border-gray-600 rounded-lg shadow-sm py-2.5 px-4 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-900 text-gray-100 placeholder-gray-400"
                    : "pl-10 block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-4 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-400"
                }
                placeholder="Confirme a nova senha"
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <i
                  className={`fas ${
                    passwordVisible.confirmPassword ? "fa-eye" : "fa-eye-slash"
                  } toggle-password cursor-pointer ${isDark ? "text-gray-300" : ""}`}
                  onClick={() => togglePasswordVisibility("confirmPassword")}
                ></i>
              </div>
            </div>
            {formData.password && formData.confirmPassword && (
              <span className={passwordsMatch ? "text-green-500 text-xs" : "text-red-500 text-xs"}>
                <i className={`fas ${passwordsMatch ? "fa-check-circle" : "fa-times-circle"} mr-1`}></i>
                {passwordsMatch ? "As senhas coincidem" : "As senhas não coincidem"}
              </span>
            )}
          </div>
          <div>
            <label
              htmlFor="accessPassword"
              className={
                isDark ? "block text-sm font-medium text-gray-200 mb-1" : "block text-sm font-medium text-gray-700 mb-1"
              }
            >
              Senha de Acesso
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className={isDark ? "fas fa-lock text-gray-300" : "fas fa-lock text-gray-400"}></i>
              </div>
              <input
                type={passwordVisible.accessPassword ? "text" : "password"}
                id="accessPassword"
                name="accessPassword"
                className={
                  isDark
                    ? "pl-10 block w-full border border-gray-600 rounded-lg shadow-sm py-2.5 px-4 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-900 text-gray-100 placeholder-gray-400"
                    : "pl-10 block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-4 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-400"
                }
                placeholder={
                  mockLoggedUser.accessPassword ? "Deixe em branco para manter atual" : "Digite a senha de acesso"
                }
                value={formData.accessPassword}
                onChange={handleInputChange}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <i
                  className={`fas ${
                    passwordVisible.accessPassword ? "fa-eye" : "fa-eye-slash"
                  } toggle-password cursor-pointer ${isDark ? "text-gray-300" : ""}`}
                  onClick={() => togglePasswordVisibility("accessPassword")}
                ></i>
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center px-4 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mt-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i> Salvando...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i> Salvar Alterações
              </>
            )}
          </button>
        </form>
        {/* Toast notification */}
        <div
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-lg shadow-lg transform transition-all duration-300 z-50 flex items-center ${
            toast.show ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
          } ${
            toast.type === "success" ? "bg-green-600" : toast.type === "error" ? "bg-red-600" : "bg-blue-500"
          } text-white`}
        >
          <i
            className={`fas ${
              toast.type === "success"
                ? "fa-check-circle"
                : toast.type === "error"
                ? "fa-times-circle"
                : "fa-info-circle"
            } mr-2`}
          ></i>
          <span>{toast.message}</span>
        </div>
      </div>
    </div>
  );
};

export default AdmManagementPerfilEdit;
