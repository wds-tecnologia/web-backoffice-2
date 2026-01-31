import { useEffect, useState } from "react";
import { Tabs } from "./layout/Tabs";
import { InvoicesTab } from "./components/sections/InvoicesTab";
import { ProductsTab } from "./components/sections/ProductsTab";
import { SuppliersTab } from "./components/sections/SuppliersTab";
import { CarriersTab } from "./components/sections/CarriersTab";
import { ExchangeTab } from "./components/sections/ExchangeTab";
import { ReportsTab } from "./components/sections/ReportsTab";
import CaixasTab from "./components/sections/Caixas";
import { OtherPartnersTab } from "./components/sections/OtherPartners";
import { Invoice } from "./components/types/invoice";
import CaixasTabBrl from "./components/sections/CaixasBrl";
import { ShoppingListsTab } from "./components/sections/ShoppingListsTab";
import { LostProductsTab } from "./components/sections/LostProductsTab";
import { ImeiSearchTab } from "./components/sections/ImeiSearchTab";
import { usePermissionStore } from "../../store/permissionsStore";
import { api } from "../../services/api";
import { ActionLoadingProvider } from "./context/ActionLoadingContext";
import { DisableButtonsWrapper } from "./components/DisableButtonsWrapper";

export type TabType =
  | "invoices"
  | "products"
  | "suppliers"
  | "carriers"
  | "media-dolar"
  | "relatorios"
  | "caixas"
  | "others"
  | "caixas-brl"
  | "shopping-lists"
  | "lost-products"
  | "imei-search"
  | "";

export const permissionTabMap: Record<string, TabType> = {
  INVOICES: "invoices",
  PRODUTOS: "products",
  FORNECEDORES: "suppliers",
  FRETEIROS: "carriers",
  MEDIA_DOLAR: "media-dolar",
  RELATORIOS: "relatorios",
  CAIXAS_PERMITIDOS: "caixas",
  OUTROS: "others",
  CAIXAS_BR_PERMITIDOS: "caixas-brl",
};

export default function InvocesManagement() {
  const [activeTab, setActiveTab] = useState<TabType>("");
  const { getPermissions, permissions, user } = usePermissionStore();
  const defaultEmptyInvoice = (): Invoice => ({
    id: null,
    number: "",
    date: new Date().toLocaleDateString("en-CA"),
    supplierId: "",
    products: [],
    amountTaxcarrier: 0,
    amountTaxcarrier2: 0,
    taxaSpEs: "",
    carrierId: "",
    carrier2Id: "",
    paid: false,
    paidDate: null,
    paidDollarRate: null,
    completed: false,
    completedDate: null,
    amountTaxSpEs: 0,
    overallValue: 0,
    subAmount: 0,
  });
  const [draftInvoices, setDraftInvoices] = useState<Invoice[]>([defaultEmptyInvoice()]);
  const [activeDraftIndex, setActiveDraftIndex] = useState(0);
  const currentInvoice = draftInvoices[activeDraftIndex] ?? defaultEmptyInvoice();
  const setCurrentInvoice = (inv: Invoice | ((prev: Invoice) => Invoice)) => {
    setDraftInvoices((prev) => {
      const next = [...prev];
      const current = next[activeDraftIndex];
      next[activeDraftIndex] = typeof inv === "function" ? inv(current) : inv;
      return next;
    });
  };
  const handleAddDraftInvoices = (invoices: Invoice[]) => {
    setDraftInvoices(invoices.length > 0 ? invoices : [defaultEmptyInvoice()]);
    setActiveDraftIndex(0);
  };
  const handleDraftSaved = () => {
    setDraftInvoices((prev) => {
      const next = prev.filter((_, i) => i !== activeDraftIndex);
      if (next.length === 0) return [defaultEmptyInvoice()];
      return next;
    });
    setActiveDraftIndex((prev) => {
      const newLen = draftInvoices.length - 1;
      if (newLen <= 0) return 0;
      return Math.min(prev, newLen - 1);
    });
  };

  // Função para buscar o próximo número de invoice
  const fetchNextInvoiceNumber = async () => {
    try {
      const response = await api.get("/invoice/next-number");
      if (response.data?.nextNumber) {
        setCurrentInvoice((prev) => ({
          ...prev,
          number: response.data.nextNumber,
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar próximo número de invoice:", error);
      // Em caso de erro, usar um número baseado em timestamp como fallback
      setCurrentInvoice((prev) => ({
        ...prev,
        number: `INV-${Date.now()}`,
      }));
    }
  };

  useEffect(() => {
    getPermissions();
    // Buscar o próximo número quando o componente for montado
    fetchNextInvoiceNumber();
  }, []);

  useEffect(() => {
    if (!permissions?.GERENCIAR_INVOICES) return;

    for (const [permKey, tab] of Object.entries(permissionTabMap)) {
      const value = permissions.GERENCIAR_INVOICES[permKey as keyof typeof permissions.GERENCIAR_INVOICES];

      if (Array.isArray(value) ? value.length > 0 : value === true) {
        setActiveTab(tab);
        break;
      }
    }
  }, []);

  const canShowTab = (key: string): boolean => {
    if (user?.role === "MASTER") return true;

    const perms = permissions?.GERENCIAR_INVOICES;
    if (!perms) return false;

    if (key === "CAIXAS_PERMITIDOS" || key === "CAIXAS_BR_PERMITIDOS") {
      return Array.isArray(perms[key]) && perms[key].length > 0;
    }

    return perms[key as keyof typeof perms] === true;
  };

  return (
    <ActionLoadingProvider>
      <DisableButtonsWrapper>
        <div className="bg-gray-50 min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-blue-800">Sistema de Gestão de Invoices</h1>
              <p className="text-gray-600">Controle completo de produtos, invoices e fornecedores</p>
            </header>

            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="mt-6">
              {activeTab === "invoices" && canShowTab("INVOICES") && (
                <InvoicesTab
                  currentInvoice={currentInvoice}
                  setCurrentInvoice={setCurrentInvoice}
                  draftInvoices={draftInvoices}
                  activeDraftIndex={activeDraftIndex}
                  setActiveDraftIndex={setActiveDraftIndex}
                  onAddDraftInvoices={handleAddDraftInvoices}
                  onDraftSaved={handleDraftSaved}
                />
              )}
              {activeTab === "products" && canShowTab("PRODUTOS") && <ProductsTab />}
              {activeTab === "suppliers" && canShowTab("FORNECEDORES") && <SuppliersTab />}
              {activeTab === "carriers" && canShowTab("FRETEIROS") && <CarriersTab />}
              {activeTab === "others" && canShowTab("OUTROS") && <OtherPartnersTab />}
              {activeTab === "media-dolar" && canShowTab("MEDIA_DOLAR") && <ExchangeTab />}
              {activeTab === "relatorios" && canShowTab("RELATORIOS") && <ReportsTab />}
              {activeTab === "caixas" && canShowTab("CAIXAS_PERMITIDOS") && <CaixasTab />}
              {activeTab === "caixas-brl" && canShowTab("CAIXAS_BR_PERMITIDOS") && <CaixasTabBrl />}
              {activeTab === "shopping-lists" && <ShoppingListsTab />}
              {activeTab === "lost-products" && canShowTab("RELATORIOS") && <LostProductsTab />}
              {activeTab === "imei-search" && <ImeiSearchTab />}
            </div>
          </div>
        </div>
      </DisableButtonsWrapper>
    </ActionLoadingProvider>
  );
}
