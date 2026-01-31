import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { api } from "../services/api";
import IdleTimeoutModal from "./handleSignoutInactivy";

export type User = {
  id: string;
  refId: string;
  name: string;
  email: string;
  document: string;
  role: "MASTER" | "ADMIN" | "OPERATOR" | string;
  type: "LEGAL" | "NATURAL" | string;
  status: "ACTIVE" | "INACTIVE" | string;
  api_key: string;
  accessPassword: string;
  access_token: string | null;
  permissions: {
    [key: string]: {
      enabled: boolean;
      [subPermission: string]: any;
    };
  };
  created_at: string;
  updated_at: string;
};

interface AuthBackofficeContextProps {
  isAuthenticated: boolean;
  onSignIn: (params: { email: string; password: string }) => Promise<void>;
  /** Se true, limpa storage e redireciona para /session-expired/backoffice */
  onLogout: (redirectToSessionExpired?: boolean) => void;
  user: User | undefined;
}

interface AuthBackofficeProviderProps {
  children: React.ReactNode;
}

const AuthBackofficeContext = createContext({} as AuthBackofficeContextProps);

const INACTIVITY_LIMIT = 300000; // 5 minutos

const AuthBackofficeProvider = ({ children }: AuthBackofficeProviderProps) => {
  const [isAuthenticated, setIsAuthenticate] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const lastActivityTimeRef = useRef<number>(Date.now());

  const [user, setUser] = useState<User | undefined>(() => {
    try {
      const userString = localStorage.getItem("@backoffice:user");
      const token = localStorage.getItem("@backoffice:token");

      if (userString && token) {
        const userData = JSON.parse(userString);
        return userData as User;
      }
      return undefined;
    } catch (error) {
      console.error("Erro ao carregar usuário do storage:", error);
      return undefined;
    }
  });

  const onSignIn = async (params: { email: string; password: string }) => {
    try {
      const response = await api.post("/auth/backoffice", params);
      setUser(response.data.user);
      localStorage.setItem("@backoffice:token", response.data.token);
      localStorage.setItem("@backoffice:user", JSON.stringify(response.data.user));
      const savedToken = localStorage.getItem("@backoffice:token");
      const savedUser = localStorage.getItem("@backoffice:user");
      if (!savedToken || !savedUser) {
        throw new Error("Falha ao persistir os dados tente novamente.");
      }
      setIsAuthenticate(true);
      return response.data;
    } catch (err) {
      console.error(err);
      localStorage.removeItem("@backoffice:token");
      throw new Error("Credenciais inválidas");
    }
  };

  const closeModal = useCallback(() => {
    lastActivityTimeRef.current = Date.now();
    setIsModalOpen(false);
  }, []);

  const onLogout = useCallback((redirectToSessionExpired = false) => {
    try {
      localStorage.removeItem("@backoffice:token");
      localStorage.removeItem("@backoffice:account");
      localStorage.removeItem("@backoffice:user");
      localStorage.removeItem("@stricv2:token");
      localStorage.removeItem("@stricv2:account");
      localStorage.removeItem("@stricv2:user");
      sessionStorage.clear();
      setIsAuthenticate(false);
      if (redirectToSessionExpired) {
        const path = window.location.pathname || "";
        if (path.startsWith("/session-expired")) return;
        window.location.href = "/session-expired/backoffice";
      }
    } catch (error) {
      console.error("Erro durante logout:", error);
      localStorage.clear();
      sessionStorage.clear();
      setIsAuthenticate(false);
      if (redirectToSessionExpired) {
        window.location.href = "/session-expired/backoffice";
      }
    }
  }, []);

  let isFetchingAccount = false;

  const initialize = useCallback(async () => {
    const currentPath = window.location.pathname || "";

    if (
      currentPath === "/session-expired" ||
      currentPath === "/session-expired/backoffice"
    ) {
      setIsAuthenticate(false);
      return;
    }
    if (currentPath === "/signin/backoffice") {
      setIsAuthenticate(false);
      return;
    }
    if (!currentPath.startsWith("/backoffice")) {
      setIsAuthenticate(false);
      return;
    }

    const token = localStorage.getItem("@backoffice:token");
    const userString = localStorage.getItem("@backoffice:user");

    if (!token || !userString) {
      onLogout(true);
      return;
    }

    try {
      const { data } = await api.get("/auth/me/backoffice", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data?.user?.access_token) {
        localStorage.setItem("@backoffice:token", data.user.access_token);
        setIsAuthenticate(true);
      } else {
        setIsAuthenticate(false);
      }
    } catch (err: any) {
      const status = err.response?.status;
      const code = err.response?.data?.code;
      if (status === 401 && code === "SESSION_EXPIRED") {
        onLogout(true);
      } else {
        setIsAuthenticate(false);
      }
    }
  }, [onLogout]);

  useEffect(() => {
    const interceptor = api.interceptors.request.use(
      async function (config: any) {
        const token = localStorage.getItem("@backoffice:token");
        if (token && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        if (!token && !isFetchingAccount && !config.url?.includes("/auth/")) {
          isFetchingAccount = true;
          await initialize();
          isFetchingAccount = false;
          const newToken = localStorage.getItem("@backoffice:token");
          if (newToken && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${newToken}`;
          }
        }
        return config;
      },
      function (error: any) {
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.request.eject(interceptor);
  }, [initialize]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Inatividade: 5 min, modal, redirecionamento para session-expired
  useEffect(() => {
    const currentPath = window.location.pathname || "";
    const isBackofficeRoute = currentPath.startsWith("/backoffice");
    const isPublicRoute =
      currentPath.startsWith("/signin") ||
      currentPath.startsWith("/session-expired") ||
      currentPath.startsWith("/forgot") ||
      currentPath.startsWith("/new-password") ||
      currentPath.startsWith("/privacy") ||
      currentPath.startsWith("/recoveryPassword") ||
      currentPath.startsWith("/create-account") ||
      currentPath.startsWith("/home");

    const CAN_ACTIVATE =
      isAuthenticated &&
      isBackofficeRoute &&
      !isPublicRoute;

    if (!CAN_ACTIVATE) {
      setIsModalOpen(false);
      return;
    }

    lastActivityTimeRef.current = Date.now();

    const handleUserActivity = () => {
      lastActivityTimeRef.current = Date.now();
    };

    const checkForInactivity = () => {
      const timeElapsed = Date.now() - lastActivityTimeRef.current;
      const pathCheck = window.location.pathname || "";
      const stillBackoffice = pathCheck.startsWith("/backoffice");
      const stillPublic =
        pathCheck.startsWith("/signin") ||
        pathCheck.startsWith("/session-expired") ||
        pathCheck.startsWith("/forgot") ||
        pathCheck.startsWith("/new-password") ||
        pathCheck.startsWith("/privacy") ||
        pathCheck.startsWith("/recoveryPassword") ||
        pathCheck.startsWith("/create-account") ||
        pathCheck.startsWith("/home");

      if (!stillBackoffice || stillPublic || !isAuthenticated) {
        setIsModalOpen(false);
        return;
      }
      if (timeElapsed >= INACTIVITY_LIMIT) {
        setIsModalOpen(true);
      }
    };

    window.addEventListener("mousemove", handleUserActivity, { passive: true });
    window.addEventListener("click", handleUserActivity, { passive: true });
    window.addEventListener("keydown", handleUserActivity, { passive: true });
    window.addEventListener("scroll", handleUserActivity, { passive: true });
    const inactivityInterval = setInterval(checkForInactivity, 1000);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("scroll", handleUserActivity);
      clearInterval(inactivityInterval);
    };
  }, [isAuthenticated]);

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
      {isModalOpen && (
        <IdleTimeoutModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSignOut={() => onLogout(true)}
        />
      )}
    </AuthBackofficeContext.Provider>
  );
};

const useAuthBackoffice = () => {
  const context = useContext(AuthBackofficeContext);
  if (!context) {
    throw new Error("useAuthBackoffice must be used within AuthBackofficeProvider");
  }
  return context;
};

export { AuthBackofficeProvider, useAuthBackoffice };
