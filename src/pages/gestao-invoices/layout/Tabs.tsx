import { JSX } from "react";
import { TabType } from "../InvocesManagement";
import { FileText, Boxes, Building, Truck, DollarSign, ChartBar, Users, Package, ShoppingCart } from "lucide-react";
import { usePermissionStore } from "../../../store/permissionsStore";

interface TabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const allTabs = [
  { id: "invoices", icon: <FileText className="mr-2" size={16} />, label: "Invoices", permissionKey: "INVOICES" },
  { id: "products", icon: <Boxes className="mr-2" size={16} />, label: "Produtos", permissionKey: "PRODUTOS" },
  {
    id: "suppliers",
    icon: <Package className="mr-2" size={16} />,
    label: "Fornecedores",
    permissionKey: "FORNECEDORES",
  },
  { id: "carriers", icon: <Truck className="mr-2" size={16} />, label: "Freteiros", permissionKey: "FRETEIROS" },
  { id: "others", icon: <Users className="mr-2" size={16} />, label: "Outros", permissionKey: "OUTROS" },
  {
    id: "media-dolar",
    icon: <DollarSign className="mr-2" size={16} />,
    label: "Média Dólar",
    permissionKey: "MEDIA_DOLAR",
  },
  { id: "relatorios", icon: <ChartBar className="mr-2" size={16} />, label: "Relatórios", permissionKey: "RELATORIOS" },
  { id: "caixas", icon: <Boxes className="mr-2" size={16} />, label: "Caixas", permissionKey: "CAIXAS_PERMITIDOS" },
  {
    id: "caixas-brl",
    icon: <Boxes className="mr-2" size={16} />,
    label: "Caixas BR",
    permissionKey: "CAIXAS_BR_PERMITIDOS",
  },
  {
    id: "shopping-lists",
    icon: <ShoppingCart className="mr-2" size={16} />,
    label: "Listas de Compras",
    permissionKey: null,
  },
];

export function Tabs({ activeTab, setActiveTab }: TabsProps) {
  const { permissions, user } = usePermissionStore();

  const canShowTab = (key: string | null): boolean => {
    if (user?.role === "MASTER") return true;

    // Shopping Lists sempre visível para todos os usuários autenticados
    if (key === null) return true;

    const perms = permissions?.GERENCIAR_INVOICES;
    if (!perms) return false;

    if (key === "CAIXAS_PERMITIDOS") {
      return Array.isArray(perms.CAIXAS_PERMITIDOS) && perms.CAIXAS_PERMITIDOS.length > 0;
    }
    if (key === "CAIXAS_BR_PERMITIDOS") {
      return Array.isArray(perms.CAIXAS_BR_PERMITIDOS) && perms.CAIXAS_BR_PERMITIDOS.length > 0;
    }

    return perms[key as keyof typeof perms] === true;
  };

  return (
    <div className="mb-6 border-b border-gray-200">
      <ul className="flex flex-wrap -mb-px">
        {allTabs
          .filter((tab) => canShowTab(tab.permissionKey))
          .map((tab) => (
            <li key={tab.id} className="mr-2">
              <button
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                }}
                className={`inline-flex items-center p-4 border-b-2 rounded-t-lg ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent hover:text-gray-600 hover:border-gray-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
