export function formatCurrency(value: number, decimals: number = 2, currency: string = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
    }).format(value);
  }
  
  // export function formatDate(dateString: string | Date) {
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString('pt-BR', {
  //     timeZone: 'UTC',
  //     day: '2-digit',
  //     month: '2-digit',
  //     year: 'numeric',
  //   });
  // }
  
  export function formatDate(dateString: string | Date) {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
     timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

    export function formatDateIn(dateString: string | Date) {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
 
    });
  }
  