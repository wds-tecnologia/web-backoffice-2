export function parseError(error: any): string {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocorreu um erro desconhecido.";
}
