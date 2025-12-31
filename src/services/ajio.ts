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


export function serviceError(err: any): ResponseError {
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

export const service = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3333"
});



