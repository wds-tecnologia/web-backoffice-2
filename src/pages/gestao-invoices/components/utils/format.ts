export function formatCurrency2(value: number, decimals = 2, currency = 'USD') {
    if (isNaN(value)) value = 0;
    if (currency === 'USD') {
      return `$ ${value.toFixed(decimals)}`;
    } else {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    }
  }

  export function formatCurrency(value: number, decimals = 2, currency = 'BRL') {
    if (isNaN(value)) return '0.00';
    
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value);
    } else {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value);
    }
  }