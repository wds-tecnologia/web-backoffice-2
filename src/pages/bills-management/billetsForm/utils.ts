export function formatCurrency(valor: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  }
  
  export function formatDate(data: string): string {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  
  export function formatStatus(status: string) {
    const statusMap = {
      pendente: { text: "Pendente", class: "bg-yellow-100 text-yellow-800" },
      pago: { text: "Pago", class: "bg-green-100 text-green-800" },
      cancelado: { text: "Cancelado", class: "bg-red-100 text-red-800" },
    };
    return statusMap[status as keyof typeof statusMap] || { text: status, class: "bg-gray-100 text-gray-800" };
  }
  