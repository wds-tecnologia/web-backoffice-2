import axios, { AxiosError, HeadersDefaults } from 'axios';

export interface CommonHeaderProperties extends HeadersDefaults {
  Authorization: string;
  account: string;
  client: string;
}

export type ErrorType = {
  code: string;
  friend: string;
}

interface ResponseError {
  code: string;
  message: string;
  friend: string;
};


export function parseError(err: any): ResponseError {
  const error = err as AxiosError;

  if (error.response?.data) {
    const dataError = error.response.data as any;
    if (dataError?.message === 'Validation failed') {
      const message = dataError?.validation?.body?.message ||
      dataError?.validation?.params?.message ||
      dataError?.validation?.query?.message;

      return {
        code: 'validation',
        friend: message || "Erro na validação dos campos",
        message: ""
      }
    }

    if (dataError?.message) {
      return {
        code: dataError.code || "",
        message: dataError.message || "",
        friend: dataError.friend || "",
      }
    }

    const errorData = error.response?.data as ResponseError;
    return errorData;
  }

  return {
    code: "",
    message: "",
    friend: ""
  }
}

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3333"
});

// Interceptor global para adicionar token de autenticação automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("@backoffice:token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de resposta: 401 ou SESSION_EXPIRED
// Session-expired só para quem tinha sessão e ela expirou; sem token (anônimo) → não redirecionar para session-expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = (error.response?.data as any)?.code;
    const is401 = status === 401 || code === "SESSION_EXPIRED";

    const requestUrl = (error.config?.url || "").toLowerCase();
    const hadAuthHeader = !!(error.config?.headers?.Authorization ?? error.config?.headers?.authorization);
    const isLoginRequest = requestUrl.includes("/auth/backoffice") && error.config?.method?.toLowerCase() === "post";
    const isAuthMeRequest = requestUrl.includes("/auth/me/backoffice");
    const currentPath = window.location.pathname || "";
    const isOnSignInPage = currentPath.startsWith("/signin/backoffice") || currentPath === "/signin";
    const isOnSessionExpiredPage = currentPath.startsWith("/session-expired");

    // Redirecionar para session-expired só quando: 401 + requisição foi COM token (sessão expirou/rejeitada)
    const shouldRedirectToSessionExpired =
      is401 &&
      hadAuthHeader &&
      !isLoginRequest &&
      !isAuthMeRequest &&
      !isOnSignInPage &&
      !isOnSessionExpiredPage;

    if (shouldRedirectToSessionExpired) {
      localStorage.removeItem("@backoffice:token");
      localStorage.removeItem("@backoffice:user");
      localStorage.removeItem("@backoffice:account");
      sessionStorage.clear();
      delete api.defaults.headers.common["Authorization"];
      window.location.href = "/session-expired/backoffice";
    }
    return Promise.reject(error);
  }
);

