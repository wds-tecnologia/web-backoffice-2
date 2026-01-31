import { useState } from "react";
import { NewInvoiceForm } from "./NewInvoiceForm";
import { InvoiceProducts } from "./InvoiceProducts";
import { InvoiceHistory } from "./InvoiceHistory";
import { Invoice } from "../types/invoice";
import { FileText } from "lucide-react";

interface NewInvoiceFormProps {
  currentInvoice: Invoice;
  setCurrentInvoice: (invoice: Invoice | ((prev: Invoice) => Invoice)) => void;
  draftInvoices?: Invoice[];
  activeDraftIndex?: number;
  setActiveDraftIndex?: (index: number) => void;
  onAddDraftInvoices?: (invoices: Invoice[]) => void;
  onDraftSaved?: () => void;
}

export function InvoicesTab({
  currentInvoice,
  setCurrentInvoice,
  draftInvoices = [],
  activeDraftIndex = 0,
  setActiveDraftIndex,
  onAddDraftInvoices,
  onDraftSaved,
}: NewInvoiceFormProps) {
  const [reloadInvoices, setReloadInvoices] = useState(false);
  const showDraftTabs = draftInvoices.length > 1;

  return (
    <div className="space-y-6">
      {/* Abas de invoices pré-salvas em cache (quando há mais de uma) */}
      {showDraftTabs && (
        <div className="border-b border-blue-200 bg-blue-50/50 px-3 pt-2 rounded-t-lg">
          <div className="flex flex-wrap gap-1">
            {draftInvoices.map((draft, index) => {
              const isActive = index === activeDraftIndex;
              const num = draft.number || `#${index + 1}`;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveDraftIndex?.(index)}
                  className={`px-4 py-2.5 rounded-t-lg border-b-2 font-medium transition-colors flex items-center gap-2 ${
                    isActive
                      ? "border-blue-600 bg-white text-blue-700 shadow-sm -mb-px"
                      : "border-transparent bg-white/70 text-gray-600 hover:bg-white hover:text-blue-600"
                  }`}
                >
                  <FileText size={16} />
                  Invoice {num}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <NewInvoiceForm 
          currentInvoice={currentInvoice} 
          setCurrentInvoice={setCurrentInvoice}
          isDateFromPdf={currentInvoice._isDateFromPdf}
        />
        <InvoiceProducts
          currentInvoice={currentInvoice}
          setCurrentInvoice={setCurrentInvoice}
          onInvoiceSaved={() => setReloadInvoices((prev) => !prev)}
          onAddDraftInvoices={onAddDraftInvoices}
          onDraftSaved={onDraftSaved}
        />
      </div>
      <InvoiceHistory reloadTrigger={reloadInvoices} />
    </div>
  );
}
