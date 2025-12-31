export interface MockBillet {
    barCode: string;
    digitableLine: string;
    amount: string;
    dueDate: string;
    beneficiary: string;
    apiResponse: "success" | "validation_error" | "connection_error" | "server_error";
    errorMessage?: string;
  }
  
  export const mockBillets: MockBillet[] = [
    // Mock 1 - Sucesso normal
    {
      barCode: "34191790010104351004791020150008987820026300",
      digitableLine: "34191.79100 20104.351004 79102.015000 8 78720026300",
      amount: "150,75",
      dueDate: "10/05/2025",
      beneficiary: "Fatura do João",
      apiResponse: "success"
    },
    // Mock 2 - Sucesso com valor alto
    {
      barCode: "34191790010104351004791020150008987820026400",
      digitableLine: "34191.79100 20104.351004 79102.015000 8 78720026400",
      amount: "5.000,00",
      dueDate: "15/06/2025",
      beneficiary: "Fatura Empresarial",
      apiResponse: "success"
    },
    // Mock 3 - Erro de validação
    {
      barCode: "34191790010104351004791020150008987820026500",
      digitableLine: "34191.79100 20104.351004 79102.015000 8 78720026500",
      amount: "250,50",
      dueDate: "20/07/2025",
      beneficiary: "Fatura com erro",
      apiResponse: "validation_error",
      errorMessage: "Código de barras inválido: dígito verificador não confere"
    },
    // Mock 4 - Erro de conexão
    {
      barCode: "34191790010104351004791020150008987820026600",
      digitableLine: "34191.79100 20104.351004 79102.015000 8 78720026600",
      amount: "180,30",
      dueDate: "25/08/2025",
      beneficiary: "Fatura offline",
      apiResponse: "connection_error",
      errorMessage: "Não foi possível conectar ao servidor"
    },
    // Mock 5 - Erro genérico
    {
      barCode: "34191790010104351004791020150008987820026700",
      digitableLine: "34191.79100 20104.351004 79102.015000 8 78720026700",
      amount: "320,90",
      dueDate: "30/09/2025",
      beneficiary: "Fatura problema",
      apiResponse: "server_error",
      errorMessage: "Erro interno no servidor"
    }
  ];
  
  export const getMockBillet = (index: number): MockBillet => {
    return mockBillets[index % mockBillets.length];
  };
  
  export const simulateApiResponse = async (mock: MockBillet) => {
    // Simula delay da API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    switch (mock.apiResponse) {
      case "success":
        return { success: true };
        
      case "validation_error":
        throw { 
          response: { 
            data: { 
              message: mock.errorMessage 
            },
            status: 400
          } 
        };
        
      case "connection_error":
        throw { 
          message: "Network Error",
          isAxiosError: true 
        };
        
      case "server_error":
        throw { 
          response: { 
            data: { 
              message: mock.errorMessage 
            },
            status: 500
          } 
        };
    }
  };