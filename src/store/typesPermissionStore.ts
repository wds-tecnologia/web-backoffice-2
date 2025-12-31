export type BasePermission = {
  enabled: boolean;
};

export type TokensPermission = BasePermission & {
  GUIAS_PERMITIDAS: string[];
  FORNECEDORES_PERMITIDOS: string[];
  RECOLHEDORES_PERMITIDOS: string[];
};

export type InvoicesPermission = BasePermission & {
  GUIAS_PERMITIDAS: string[];
  CAIXAS_PERMITIDOS: string[];
  CAIXAS_BR_PERMITIDOS: string[];
};

export type Permissions = {
  CRIAR_USUARIO: BasePermission;
  GERENCIAR_GRUPOS: BasePermission;
  GERENCIAR_TOKENS: TokensPermission;
  GERENCIAR_BOLETOS: BasePermission;
  GERENCIAR_INVOICES: InvoicesPermission;
  GERENCIAR_USUARIOS: BasePermission;
  GERENCIAR_OPERACOES: BasePermission;
  GERENCIAR_PLANILHAS: BasePermission;
  GERENCIAR_OPERADORES: BasePermission;
};
