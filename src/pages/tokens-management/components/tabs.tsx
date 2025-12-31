import React from "react";

interface TabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const tabs = [
  { id: "operacoes", label: "OPERAÇÕES", icon: "fas fa-exchange-alt" },
  { id: "recolhedores", label: "RECOLHEDORES", icon: "fas fa-users" },
  { id: "fornecedores", label: "FORNECEDORES", icon: "fas fa-truck" },
  { id: "lucros", label: "LUCROS", icon: "fas fa-chart-line" },
  { id: "lucros-recolhedores", label: "LUCROS RECOLHEDORES", icon: "fas fa-chart-line" },
];

const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="mb-6 border-b border-gray-200">
      <ul className="flex flex-wrap -mb-px">
        {tabs.map((tab) => (
          <li key={tab.id} className="mr-2">
            <button
              onClick={() => setActiveTab(tab.id)}
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent hover:text-gray-600 hover:border-gray-300"
              }`}
            >
              <i className={`${tab.icon} mr-2`}></i>
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Tabs;
