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

// Interceptor de resposta: 401 ou SESSION_EXPIRED → limpar e redirecionar para sessão expirada
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = (error.response?.data as any)?.code;
    const isSessionExpired = status === 401 || code === "SESSION_EXPIRED";
    if (isSessionExpired) {
      const path = window.location.pathname || "";
      if (!path.startsWith("/session-expired")) {
        localStorage.removeItem("@backoffice:token");
        localStorage.removeItem("@backoffice:user");
        localStorage.removeItem("@backoffice:account");
        sessionStorage.clear();
        window.location.href = "/session-expired/backoffice";
      }
    }
    return Promise.reject(error);
  }
);

