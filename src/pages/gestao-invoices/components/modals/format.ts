export function formatCurrency(value: number, decimals: number = 2, currency: string = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
    }).format(value);
  }
  
  export function formatDate(dateString: string | Date) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  