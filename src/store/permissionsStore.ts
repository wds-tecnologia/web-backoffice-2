import { create } from "zustand";
import { api } from "../services/api";
import { parseError } from "../utils/parseError";

export type PermissionType = {
  CRIAR_USUARIO: {
    enabled: boolean;
  };
  GERENCIAR_GRUPOS: {
    enabled: boolean;
  };
  GERENCIAR_USUARIOS: {
    enabled: boolean;
  };
  GERENCIAR_OPERADORES: {
    enabled: boolean;
  };
  GERENCIAR_PLANILHAS: {
    enabled: boolean;
  };
  GERENCIAR_INVOICES: {
    enabled: boolean;
    INVOICES: boolean;
    PRODUTOS: boolean;
    FORNECEDORES: boolean;
    FRETEIROS: boolean;
    OUTROS: boolean;
    MEDIA_DOLAR: boolean;
    RELATORIOS: boolean;
    CAIXAS_PERMITIDOS: string[];
    CAIXAS_BR_PERMITIDOS: string[];
  };
  GERENCIAR_TOKENS: {
    enabled: boolean;
    FORNECEDORES_PERMITIDOS: string[];
    RECOLHEDORES_PERMITIDOS: string[];
    OPERAÇÕES: boolean;
    LUCROS: boolean;
    LUCROS_RECOLHEDORES: boolean;
  };
  GERENCIAR_BOLETOS: {
    enabled: boolean;
  };
  GERENCIAR_OPERACOES: {
    enabled: boolean;
  };
};

export type PermissionKey =
  | 'CRIAR_USUARIO'
  | 'GERENCIAR_GRUPOS'
  | 'GERENCIAR_TOKENS'
  | 'GERENCIAR_BOLETOS'
  | 'GERENCIAR_INVOICES'
  | 'GERENCIAR_USUARIOS'
  | 'GERENCIAR_OPERACOES'
  | 'GERENCIAR_PLANILHAS'
  | 'GERENCIAR_OPERADORES';

export interface UserPermissions {
  CRIAR_USUARIO: {
    enabled: boolean;
  };
  GERENCIAR_GRUPOS: {
    enabled: boolean;
  };
  GERENCIAR_TOKENS: {
    enabled: boolean;
    LUCROS?: boolean;
    OPERAÇÕES?: boolean;
    LUCROS_RECOLHEDORES?: boolean;
    FORNECEDORES_PERMITIDOS?: string[];
    RECOLHEDORES_PERMITIDOS?: string[];
  };
  GERENCIAR_BOLETOS: {
    enabled: boolean;
  };
  GERENCIAR_INVOICES: {
    enabled: boolean;
    OUTROS?: boolean;
    INVOICES?: boolean;
    PRODUTOS?: boolean;
    FRETEIROS?: boolean;
    RELATORIOS?: boolean;
    MEDIA_DOLAR?: boolean;
    FORNECEDORES?: boolean;
    CAIXAS_PERMITIDOS?: string[];
    CAIXAS_BR_PERMITIDOS?: string[];
  };
  GERENCIAR_USUARIOS: {
    enabled: boolean;
  };
  GERENCIAR_OPERACOES: {
    enabled: boolean;
  };
  GERENCIAR_PLANILHAS: {
    enabled: boolean;
  };
  GERENCIAR_OPERADORES: {
    enabled: boolean;
  };
}

export interface UserData {
  id: string;
  name: string;
  document: string;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'USER' | 'OPERATOR'; // ajuste se tiver mais roles
  status: 'ACTIVE' | 'INACTIVE'; // ajuste se tiver mais status
  created_at: string;
  updated_at: string;
  access_token: string | null;
  refId: string;
  type: 'LEGAL' | 'PHYSICAL'; // ajuste conforme enum usado
  api_key: string;
  permissions: UserPermissions;
}



interface PermissionStore {
  permissions: PermissionType | null;
  user:  UserData | null;
  isLoading: boolean;
  error: string | null;

  getPermissions: () => Promise<void>;
  updatePermissions: (id: string, data: Permissions) => Promise<void>;
  refreshPermissions: (id: string) => Promise<void>;
}

export const usePermissionStore = create<PermissionStore>((set) => ({
  permissions: null,
  user: null,
  isLoading: false,
  error: null,
  

  getPermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const datauser = JSON.parse(localStorage.getItem("@backoffice:user") || "{}") || {};
      const response = await api.get(`/get_permission_by_id/${datauser.id}`);
      set({ user: datauser as UserData });
      set({ permissions: response.data, isLoading: false });
    } catch (err) {
      set({ error: parseError(err), isLoading: false });
    }
  },

  updatePermissions: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await api.patch(`/update_permission/${id}`, data);
      set({ isLoading: false });
    } catch (err) {
      set({ error: parseError(err), isLoading: false });
    }
  },

  refreshPermissions: async (id) => {
    await usePermissionStore.getState().getPermissions();
  },
}));
