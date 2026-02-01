import { InvoiceProduct } from "../sections/InvoiceProducts";

  export interface Invoice {
    id: string | null;
    number: string;
    date: string;
    supplierId: string;
    products: InvoiceProduct[];
    carrierId: string;
    carrier2Id: string;

    taxaSpEs: string | number;

    amountTaxcarrier:     number;
    amountTaxcarrier2:     number;
    amountTaxSpEs:  number;
    subAmount:      number;
    overallValue:   number;

    paid: boolean;
    paidDate: string | null;
    paidDollarRate: number | null;
    completed: boolean;
    completedDate: string | null;
    
    /** Flag para indicar que a data veio do PDF importado e deve ficar bloqueada */
    _isDateFromPdf?: boolean;
    /** Flag para indicar que o número veio do PDF e deve ficar bloqueado */
    _isNumberFromPdf?: boolean;
    /** Flag para indicar que o fornecedor veio do PDF e deve ficar bloqueado */
    _isSupplierFromPdf?: boolean;
  }