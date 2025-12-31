import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../services/api";

export type User = {
  id: string;
  refId: string;
  name: string;
  email: string;
  document: string;
  role: "MASTER" | "ADMIN" | "OPERATOR" | string; // ajuste conforme seus enums
  type: "LEGAL" | "NATURAL" | string;
  status: "ACTIVE" | "INACTIVE" | string;
  api_key: string;
  accessPassword: string;
  access_token: string | null;
  permissions: {
    [key: string]: {
      enabled: boolean;
      [subPermission: string]: any; // se houver subpermissões, você pode refinar
    };
  };
  created_at: string; // pode usar Date se fizer parsing
  updated_at: string;
};

interface AuthBackofficeContextProps {
  isAuthenticated: boolean;
  onSignIn: (params: { email: string; password: string }) => Promise<void>;
  onLogout: () => void;
  // TODO colocar tipagem certa no user
  user: User | undefined;
}

interface AuthBackofficeProviderProps {
  children: React.ReactNode;
}

const AuthBackofficeContext = createContext({} as AuthBackofficeContextProps);

const AuthBackofficeProvider = ({ children }: AuthBackofficeProviderProps) => {
  const [isAuthenticated, setIsAuthenticate] = useState(false);
  const [user, setUser] = useState<User | undefined>(() => {
    try {
      const userString = localStorage.getItem("@backoffice:user");

      if (userString) {
        const userData = JSON.parse(userString);
        return userData as User;
      }

      return undefined;
    } catch (error) {
      console.log(error);

      return undefined;
    }
  });

  const onSignIn = async (params: { email: string; password: string }) => {
    try {
      const response = await api.post("/auth/backoffice", params);
      setUser(response.data.user);
      try {
        localStorage.setItem("@backoffice:token", response.data.token);
        localStorage.setItem("@backoffice:user", JSON.stringify(response.data.user));

        const savedToken = localStorage.getItem("@backoffice:token");
        const savedUser = localStorage.getItem("@backoffice:user");

        if (!savedToken || !savedUser) {
          throw new Error("Falha ao persistir os dados tente novamente.");
        }
      } catch (storageError) {
        console.error("Erro ao salvar/verificar localStorage:", storageError);
        throw new Error("Erro ao salvar dados de autenticação localmente.");
      }
      setIsAuthenticate(true);
      return response.data;
    } catch (err) {
      console.error(err);
      localStorage.removeItem("@backoffice:token");
      // ✅ SOLUÇÃO: lançar o erro para que SignIn.tsx possa tratar corretamente
      throw new Error("Credenciais inválidas");
    }
  };

  const onLogout = () => {
    localStorage.removeItem("@backoffice:token");
    localStorage.removeItem("@backoffice:account");
    localStorage.removeItem("@backoffice:user");
    setIsAuthenticate(false);
  };

  let isFetchingAccount = false;

  const initialize = async () => {
    const token = localStorage.getItem("@backoffice:token");
    if (!token) {
      return;
    }

    try {
      const { data } = await api.get("/auth/me/backoffice", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      localStorage.setItem("@backoffice:token", data.user.access_token);

      if (token) {
        setIsAuthenticate(true);
      }
    } catch (err) {
      console.error(err);
      onLogout();
    }
  };

  useEffect(() => {
    const interceptor = api.interceptors.request.use(
      async function (config: any) {
        // Sempre adicionar o token atual aos headers se não estiver presente
        const token = localStorage.getItem("@backoffice:token");
        if (token && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Se não há token e não está fazendo fetch de account, tentar inicializar
        if (!token && !isFetchingAccount && !config.url?.includes("/auth/")) {
          isFetchingAccount = true;
          await initialize();
          isFetchingAccount = false;
          
          // Após inicializar, adicionar o novo token se disponível
          const newToken = localStorage.getItem("@backoffice:token");
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
          }
        }
        
        return config;
      },
      function (error: any) {
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(interceptor);
    };
  }, []);

  useEffect(() => {
    initialize();
  }, []);

  let lastActivityTime = 0;
  let inactivityTimer: string | number | NodeJS.Timeout | undefined;

  const handleMouseActivity = useCallback(() => {
    lastActivityTime = new Date().getTime();
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      onLogout();
    }, 10 * 60 * 1000);
  }, []);

  useEffect(() => {
    if (process.env.REACT_APP_NODE_ENV !== "develop") {
      console.log(process.env);
      window.addEventListener("mousemove", handleMouseActivity);
    }

    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener("mousemove", handleMouseActivity);
    };
  }, [handleMouseActivity]);

  return (
    <AuthBackofficeContext.Provider
      value={{
        isAuthenticated,
        onLogout,
        onSignIn,
        user,
      }}
    >
      {children}
    </AuthBackofficeContext.Provider>
  );
};

const useAuthBackoffice = () => {
  const context = useContext(AuthBackofficeContext);

  if (!context) {
    throw new Error("useAuth must be used within a AuthProvider");
  }

  return context;
};

export { AuthBackofficeProvider, useAuthBackoffice };
