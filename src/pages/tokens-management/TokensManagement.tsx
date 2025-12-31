import React, { useEffect, useState } from 'react';
import OperacoesTab from './components/OperacoesTab';
import RecolhedoresTab from './components/RecolhedoresTab';
import FornecedoresTab from './components/FornecedoresTab';
import LucrosTab from './components/LucrosTab';
import LucrosRecolhedoresTab from './components/LucrosRecolhedoresTab';
import { usePermissionStore } from '../../store/permissionsStore';

export type TabType = 'operacoes' | 'recolhedores' | 'fornecedores' | 'lucros' | 'lucros-recolhedores' | "";

export const permissionTabMapToken: Record<string, TabType> = {
  OPERAÇÕES: "operacoes",
  RECOLHEDORES_PERMITIDOS: "recolhedores",
  FORNECEDORES_PERMITIDOS: "fornecedores",
  LUCROS: "lucros",
  LUCROS_RECOLHEDORES: "lucros-recolhedores",
};

const tabItems = [
  {
    key: 'operacoes',
    label: 'OPERAÇÕES',
    icon: 'fa-exchange-alt',
    permissionKey: 'OPERAÇÕES',
  },
  {
    key: 'recolhedores',
    label: 'RECOLHEDORES',
    icon: 'fa-users',
    permissionKey: 'RECOLHEDORES_PERMITIDOS',
  },
  {
    key: 'fornecedores',
    label: 'FORNECEDORES',
    icon: 'fa-truck',
    permissionKey: 'FORNECEDORES_PERMITIDOS',
  },
  {
    key: 'lucros',
    label: 'LUCROS',
    icon: 'fa-chart-line',
    permissionKey: 'LUCROS',
  },
  {
    key: 'lucros-recolhedores',
    label: 'LUCROS RECOLHEDORES',
    icon: 'fa-chart-line',
    permissionKey: 'LUCROS_RECOLHEDORES',
  },
] as const;


const TokensManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'operacoes' | 'recolhedores' | 'fornecedores' | 'lucros' | 'lucros-recolhedores' | "">("");
  const {getPermissions, permissions, user} = usePermissionStore()

      useEffect(() => {
        getPermissions();
      }, []);

      useEffect(() => {
      if (!permissions?.GERENCIAR_TOKENS) return;
  
      for (const [permKey, tab] of Object.entries(permissionTabMapToken)) {
        const value = permissions.GERENCIAR_TOKENS[permKey as keyof typeof permissions.GERENCIAR_TOKENS];
  
        if (Array.isArray(value) ? value.length > 0 : value === true) {
          setActiveTab(tab);
          break;
        }
      }
    }, []);

    const canShowTab = (key: string): boolean => {

    if(user?.role === "MASTER") return true;
    
    const perms = permissions?.GERENCIAR_TOKENS;
    if (!perms) return false;

    if (key === "FORNECEDORES_PERMITIDOS") {
      return Array.isArray(perms.FORNECEDORES_PERMITIDOS) && perms.FORNECEDORES_PERMITIDOS.length > 0;
    }
    if (key === "RECOLHEDORES_PERMITIDOS") {
      return Array.isArray(perms.RECOLHEDORES_PERMITIDOS) && perms.RECOLHEDORES_PERMITIDOS.length > 0;
    }

    return perms[key as keyof typeof perms] === true;
  };
  

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-blue-800">GESTÃO DE CAIXAS INDIVIDUAIS</h1>
        <p className="text-gray-600">CONTROLE COMPLETO POR RECOLHEDOR E FORNECEDOR</p>
      </header>

      {/* Abas */}
      <div className="mb-6 border-b border-gray-200">
  <ul className="flex flex-wrap -mb-px">
    {tabItems.filter((key)=>canShowTab(key.permissionKey)).map((tab) => (
      <li key={tab.key} className="mr-2">
        <button
          className={`inline-block p-4 rounded-t-lg border-b-2 ${
            activeTab === tab.key
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent hover:text-gray-600 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab(tab.key)}
        >
          <i className={`fas ${tab.icon} mr-2`}></i> {tab.label}
        </button>
      </li>
    ))}
  </ul>
</div>

      {/* Conteúdo das Abas */}
      <div className="fade-in">
        {activeTab === 'operacoes' && canShowTab('OPERAÇÕES') && <OperacoesTab />}
        {activeTab === 'recolhedores' && canShowTab('RECOLHEDORES_PERMITIDOS') && <RecolhedoresTab />}
        {activeTab === 'fornecedores' && canShowTab('FORNECEDORES_PERMITIDOS') && <FornecedoresTab />}
        {activeTab === 'lucros' && canShowTab('LUCROS') && <LucrosTab />}
        {activeTab === 'lucros-recolhedores' && canShowTab('LUCROS_RECOLHEDORES') && <LucrosRecolhedoresTab />}
      </div>
    </div>
  );
};

export default TokensManagement;
