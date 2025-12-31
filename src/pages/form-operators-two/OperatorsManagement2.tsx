import { AnimatePresence, motion } from "framer-motion";
import React, { useState, useEffect, useRef } from "react";
import { api } from "../../services/api";

interface Operator {
  id: string ;
  name: string;
  email: string;
  password: string;
  role: "OPERATOR" | "ADMIN" | "MASTER" ;
  status: "active" | "inactive" | "pending";
  lastAccess: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: Record<string, any>;
}

interface Permission {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  subPermissions?: SubPermission[];
}

interface SubPermission {
  id: string;
  label: string;
  type?: "boolean";
  options?: string[];
}

const OperatorManager2: React.FC = () => {
  // Dados mockados
  const mockGuias = [
    "Guia Comercial",
    "Guia de Importação",
    "Guia de Exportação",
    "Guia de Trânsito",
    "Guia de Remessa",
  ];
  const mockFornecedores = ["Fornecedor A", "Fornecedor B", "Fornecedor C", "Fornecedor D", "Fornecedor E"];
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [recolhedores, setRecolhedores] = useState<string[]>([]);
  const mockRecolhedores = ["Recolhedor X", "Recolhedor Y", "Recolhedor Z", "Recolhedor W", "Recolhedor V"];
  const mockCaixas = ["Caixa 01", "Caixa 02", "Caixa 03", "Caixa 04", "Caixa 05"];
  const [caixa, setCaixa] = useState<string[]>([]);
  const [caixaBR, setCaixaBR] = useState<string[]>([]);
  const mockCaixasBR = ["Caixa BR 01", "Caixa BR 02", "Caixa BR 03", "Caixa BR 04", "Caixa BR 05"];

  // Permissões disponíveis
  const availablePermissions: Permission[] = [
    {
      id: "CRIAR_USUARIO",
      name: "Criar Usuário",
      icon: "user-plus",
      description: "Permite criar novos usuários no sistema",
      category: "Usuários",
    },
    {
      id: "GERENCIAR_GRUPOS",
      name: "Gerenciar Grupos",
      icon: "layer-group",
      description: "Permite criar, editar e excluir grupos de usuários",
      category: "Usuários",
    },
    {
      id: "GERENCIAR_TOKENS",
      name: "Gerenciar Tokens",
      icon: "key",
      description: "Permite gerenciar tokens de acesso e configurações relacionadas",
      category: "Segurança",
      subPermissions: [
        { id: "FORNECEDORES_PERMITIDOS", label: "Fornecedores", options: fornecedores },
        { id: "RECOLHEDORES_PERMITIDOS", label: "Recolhedores", options: recolhedores },
        { id: "OPERAÇÕES", label: "Operações", type: "boolean" },
        { id: "LUCROS", label: "Lucros", type: "boolean" },
        { id: "LUCROS_RECOLHEDORES", label: "Lucros Recolhedores", type: "boolean" },
      ],
    },
    {
      id: "GERENCIAR_BOLETOS",
      name: "Gerenciar Boletos",
      icon: "file-invoice-dollar",
      description: "Permite emitir, cancelar e gerenciar boletos bancários",
      category: "Financeiro",
    },
    {
      id: "GERENCIAR_INVOICES",
      name: "Gerenciar Invoices",
      icon: "file-alt",
      description: "Permite criar, editar e gerenciar invoices do sistema",
      category: "Financeiro",
      subPermissions: [
        { id: "PRODUTOS", label: "Produtos", type: "boolean" },
        { id: "INVOICES", label: "Invoices", type: "boolean" },
        { id: "FORNECEDORES", label: "Fornecedores", type: "boolean" },
        { id: "FRETEIROS", label: "Freteiros", type: "boolean" },
        { id: "OUTROS", label: "Outros", type: "boolean" },
        { id: "MEDIA_DOLAR", label: "Média Dólar", type: "boolean" },
        { id: "RELATORIOS", label: "Relatórios", type: "boolean" },
        { id: "CAIXAS_PERMITIDOS", label: "Caixas", options: caixa },
        { id: "CAIXAS_BR_PERMITIDOS", label: "Caixas BR", options: caixaBR },
      ],
    },
    {
      id: "GERENCIAR_USUARIOS",
      name: "Gerenciar Usuários",
      icon: "users",
      description: "Permite editar, desativar e gerenciar usuários do sistema",
      category: "Usuários",
    },
    {
      id: "GERENCIAR_OPERACOES",
      name: "Gerenciar Operações",
      icon: "exchange-alt",
      description: "Acesso completo à gestão de operações do sistema",
      category: "Operações",
    },
    {
      id: "GERENCIAR_PLANILHAS",
      name: "Gerenciar Planilhas",
      icon: "file-excel",
      description: "Permite criar, editar e importar planilhas do sistema",
      category: "Documentos",
    },
    {
      id: "GERENCIAR_OPERADORES",
      name: "Gerenciar Operadores",
      icon: "user-shield",
      description: "Permite gerenciar operadores e suas permissões",
      category: "Segurança",
    },
  ];

  // Agrupar permissões por categoria
  const groupedPermissions = availablePermissions.reduce((acc: Record<string, Permission[]>, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {});

  // Estado
  const [operators, setOperators] = useState<Operator[]>([]);

  const defaultPermissions = {
  CRIAR_USUARIO: {
    enabled: false,
  },
  GERENCIAR_GRUPOS: {
    enabled: false,
  },
  GERENCIAR_USUARIOS: {
    enabled: false,
  },
  GERENCIAR_OPERADORES: {
    enabled: false,
  },
  GERENCIAR_PLANILHAS: {
    enabled: false,
  },
  GERENCIAR_INVOICES: {
    enabled: false,
    INVOICES: false,
    PRODUTOS: false,
    FORNECEDORES: false,
    FRETEIROS: false,
    OUTROS: false,
    MEDIA_DOLAR: false,
    RELATORIOS: false,
    CAIXAS: [],
    CAIXAS_BR: [],
  },
  GERENCIAR_TOKENS: {
    enabled: false,
    FORNECEDORES: [],
    RECOLHEDORES: [],
    OPERAÇÕES: false,
    LUCROS: false,
    LUCROS_RECOLHEDORES: false,
  },
  GERENCIAR_BOLETOS: {
    enabled: false,
  },
  GERENCIAR_OPERACOES: {
    enabled: false,
  },
};


  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, any>>(defaultPermissions);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    status: "active" as "active" | "inactive" | "pending",
  });
  const [passwordVisible, setPasswordVisible] = useState({
    password: false,
    confirmPassword: false,
  });

  // Refs
  const operatorFormRef = useRef<HTMLFormElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);

  const loadOperatorsFromDB = async () => {
  try {
        // const response = await api.get("/users_operators");
        // const fornecedores = await api.get("/suppliers/list_suppliers");

        const [response, fornecedores, colletors, caixa1, caixa2, caixaBR ] = await Promise.all([
          api.get("/users_operators"),
          api.get("/suppliers/list_suppliers"),
          api.get("/collectors/list_collectors"),
          api.get("/invoice/carriers"),
          api.get("/invoice/supplier"),
          api.get("/invoice/partner")
        ]);
        const fornecedoresData = fornecedores.data.map((f: any) => f.name);
        const recolhedoresData = colletors.data.map((c: any) => c.name);
        const caixaData = caixa1.data.map((c: any) => c.name);
        const caixaData2 = caixa2.data.map((c: any) => c.name);
        const caixaUnion = [...caixaData, ...caixaData2];
        const caixaBRData = caixaBR.data.brl.map((c: any) => c.name);
        setFornecedores(fornecedoresData);
        setRecolhedores(recolhedoresData);
        setCaixa(caixaUnion);
        setCaixaBR(caixaBRData);
        setOperators(response.data);
      } 
      catch (e) {
        console.error("Erro ao carregar operadores:", e);
        setOperators([]);
      } finally {
        setLoading(false);
      }
  }
  

  // Carregar primeiro operador ao montar o componente
  useEffect(() => {
    loadOperatorsFromDB();
  }, []);

  // Carregar operador
  const loadOperator = (operator: Operator) => {
    setCurrentOperator(operator);
    setFormData({
      id: operator.id,
      name: operator.name,
      email: operator.email,
      password: "",
      confirmPassword: "",
      status: operator.status.toLocaleLowerCase() as "active" | "inactive" | "pending",
    });
    setSelectedPermissions(JSON.parse(JSON.stringify(operator.permissions || {})));
  };

  // Novo operador
  const newOperator = () => {
    setCurrentOperator(null);
    setFormData({
      id: "",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      status: "active",
    });
    setSelectedPermissions(defaultPermissions);
  };

  // Salvar operador
  const saveOperator = async () => {
    const { name, email, password, confirmPassword, status } = formData;
    const isNew = !formData.id;

    // Validações
    if (!name || !email) {
      showToast("Preencha todos os campos obrigatórios", "error");
      return;
    }

    if (isNew && !password) {
      showToast("Por favor, informe uma senha", "error");
      return;
    }

    if (password && password !== confirmPassword) {
      showToast("As senhas não coincidem", "error");
      return;
    }

    setLoading(true);

    try {
      // Simular chamada à API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      let updatedOperators: Operator[];
      let newOperatorData: Operator;

      if (isNew) {
        // Criar novo operador
        const newOperatorData2 = {
          id: "",
          name,
          email,
          status,
          lastAccess: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          permissions: JSON.parse(JSON.stringify(selectedPermissions)),
           ...(password ? { password } : {}),
        };

        const response = await api.post("/users_operators", newOperatorData2);

        newOperatorData = {
          id: "",
          name,
          email,
          password,
          status,
          role: "OPERATOR", // Definir role como OPERATOR por padrão
          lastAccess: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          permissions: JSON.parse(JSON.stringify(selectedPermissions)),
          
        };

        // updatedOperators = [...operators, newOperatorData];
        setCurrentOperator(newOperatorData);
      } else {
        // Atualizar operador existente
        const operatorIndex = operators.findIndex((op) => op.id.toString() === formData.id);
        if (operatorIndex === -1) {
          throw new Error("Operador não encontrado");
        }

        // const updatedOperator = {
        //   ...operators[operatorIndex],
        //   name,
        //   email,
        //   status,
        //   updatedAt: new Date().toISOString(),
        //   permissions: JSON.parse(JSON.stringify(selectedPermissions)),
        // };

        const updatedOperator2 = {
          id: operators[operatorIndex].id,
          name,
          email,
          status,
          lastAccess: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          permissions: JSON.parse(JSON.stringify(selectedPermissions)),
           ...(password ? { password } : {}),
        };
        const updatedOperator = {
          id: operators[operatorIndex].id,
          name,
          email,
          password,
          status,
          lastAccess: null,
          role: operators[operatorIndex].role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          permissions: JSON.parse(JSON.stringify(selectedPermissions)),
          
        };

        // Atualizar senha apenas se foi fornecida
        if (password) {
          updatedOperator.password = password;
        }

        const response = await api.patch(`/users_operators/${updatedOperator.id}`, updatedOperator2);

        // updatedOperators = [...operators];
        // updatedOperators[operatorIndex] = updatedOperator;
        setCurrentOperator(updatedOperator);
      }
      
      showToast(isNew ? "Operador criado com sucesso!" : "Operador atualizado com sucesso!");
    } catch (error) {
      console.error("Error saving operator:", error);
      showToast(error instanceof Error ? error.message : "Erro ao salvar operador", "error");
    } finally {
      loadOperatorsFromDB();
      setLoading(false);
    }
  };

  // Excluir operador
  const deleteOperator = async () => {
    if (!currentOperator) return;

    setLoading(true);

    try {
      // Simular chamada à API
      await new Promise((resolve) => setTimeout(resolve, 800));

      const updatedOperators = operators.filter((op) => op.id !== currentOperator.id);
      setOperators(updatedOperators);

      showToast("Operador excluído com sucesso!");

      // Carregar o primeiro operador se houver
      if (updatedOperators.length > 0) {
        loadOperator(updatedOperators[0]);
      } else {
        newOperator();
      }
    } catch (error) {
      console.error("Error deleting operator:", error);
      showToast(error instanceof Error ? error.message : "Erro ao excluir operador", "error");
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  // Confirmar ação
  const confirmAction = (message: string, callback: () => void) => {
    setConfirmMessage(message);
    setShowConfirmModal(true);

    // Armazenar callback para quando confirmar
    const handleConfirm = () => {
      callback();
      setShowConfirmModal(false);
    };

    return handleConfirm;
  };

  // Mostrar toast
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ show: true, message, type });

    setTimeout(() => {
      setToast({ ...toast, show: false });
    }, 3000);
  };

  // Alternar permissão
  const togglePermission = (permissionId: string, enabled: boolean) => {
    setSelectedPermissions((prev) => {
      const newPermissions = { ...prev };

      if (enabled) {
        newPermissions[permissionId] = { enabled: true };

        // Inicializar sub-permissões
        const permission = availablePermissions.find((p) => p.id === permissionId);
        if (permission?.subPermissions) {
          permission.subPermissions.forEach((sub) => {
            if (!newPermissions[permissionId][sub.id]) {
              if (sub.type === "boolean") {
                newPermissions[permissionId][sub.id] = false;
              } else if (sub.options) {
                newPermissions[permissionId][sub.id] = [];
              }
            }
          });
        }
      } else {
        newPermissions[permissionId] = { enabled: false };
      }

      return newPermissions;
    });
  };

  // Atualizar sub-permissão
  const updateSubPermission = (permissionId: string, subPermissionId: string, value: any) => {
    setSelectedPermissions((prev) => {
      const newPermissions = { ...prev };

      if (!newPermissions[permissionId]) {
        newPermissions[permissionId] = { enabled: true };
      }

      newPermissions[permissionId][subPermissionId] = value;
      return newPermissions;
    });
  };

  // Gerar senha aleatória
  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let password = "";

    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    setFormData((prev) => ({
      ...prev,
      password,
      confirmPassword: password,
    }));
  };

  // Verificar força da senha
  const checkPasswordStrength = (password: string) => {
    let strength = 0;

    if (password.length > 10) strength += 2;
    else if (password.length > 6) strength += 1;

    if (/\d/.test(password)) strength += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;

    return strength;
  };

  // Obter contagem de sub-permissões selecionadas
  const getSelectedSubPermissionsCount = (permissionId: string) => {
    if (!selectedPermissions[permissionId]) return 0;

    let count = 0;
    const permission = availablePermissions.find((p) => p.id === permissionId);

    if (!permission?.subPermissions) return 0;

    permission.subPermissions.forEach((sub) => {
      if (selectedPermissions[permissionId][sub.id]) {
        if (sub.type === "boolean" && selectedPermissions[permissionId][sub.id] === true) {
          count++;
        } else if (Array.isArray(selectedPermissions[permissionId][sub.id])) {
          count++;
        }
      }
    });

    return count;
  };

  // Contar permissões selecionadas
  const countSelectedPermissions = () => {
    return Object.keys(selectedPermissions).length;
  };

  // Alternar visibilidade da senha
  const togglePasswordVisibility = (field: "password" | "confirmPassword") => {
    setPasswordVisible((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Manipulador de envio do formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveOperator();
  };

  // Manipulador de mudança de campo
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Renderizar lista de operadores
  const renderOperatorList = () => {
    if (operators.length === 0) {
      return (
        <div id="empty-state" className="text-center py-12">
          <i className="fas fa-user-slash text-4xl text-gray-300 mb-4"></i>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum operador cadastrado</h3>
          <p className="text-gray-500 mb-4">Comece cadastrando seu primeiro operador.</p>
          <button
            onClick={newOperator}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            <i className="fas fa-plus mr-2"></i> Criar Operador
          </button>
        </div>
      );
    }

    return operators
      .filter((operator) => operator.role !== "MASTER") // Excluir operadores MASTER da lista
      .filter((operator) => {
        if (!searchTerm) return true;
        return (
          operator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          operator.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
      .map((operator) => {
        const permissionNames = Object.entries(operator.permissions || {})
          .filter(([_, perm]) => perm.enabled)
          .map(([id]) => {
            const perm = availablePermissions.find((p) => p.id === id);
            return perm ? perm.name : id;
          });

        return (
          <div
            key={operator.id}
            className={`p-4 hover:bg-gray-50 transition cursor-pointer operator-item ${
              currentOperator?.id === operator.id ? "active" : ""
            }`}
            onClick={() => loadOperator(operator)}
          >
            <div className="flex items-center">
              <div
                className={`flex-shrink-0 h-10 w-10 rounded-full ${
                  operator.status === "active"
                    ? "bg-indigo-100"
                    : operator.status === "inactive"
                    ? "bg-gray-100"
                    : "bg-yellow-100"
                } flex items-center justify-center`}
              >
                <i
                  className={`fas fa-user ${
                    operator.status === "active"
                      ? "text-indigo-600"
                      : operator.status === "inactive"
                      ? "text-gray-600"
                      : "text-yellow-600"
                  }`}
                ></i>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">{operator.name}</div>
                <div className="text-sm text-gray-500">{operator.email}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {permissionNames.slice(0, 2).map((name) => (
                    <span key={name} className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                      {name}
                    </span>
                  ))}
                  {permissionNames.length > 2 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                      +{permissionNames.length - 2} mais
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      operator.status === "active"
                        ? "bg-green-100 text-green-800"
                        : operator.status === "inactive"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {operator.status === "active" ? "Ativo" : operator.status === "inactive" ? "Inativo" : "Pendente"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      });
  };

  // Renderizar permissões
  const renderPermissions = () => {
    return Object.entries(groupedPermissions).map(([category, permissions]) => (
      <div key={category} className="mb-8">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 group">
          <h4 className="text-md font-semibold text-gray-900 flex items-center">
            <i className={`fas fa-${getCategoryIcon(category)} text-indigo-500 mr-2`} />
            {category}
          </h4>
          {/* <button
            onClick={() => handleExpandCategory(category, permissions)}
            className="text-xs text-indigo-600 hover:text-indigo-800 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Expandir/recolher ${category}`}
          >
            {expandedCategories[category] ? "Recolher" : "Expandir todos"}
          </button> */}
        </div>

        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {permissions.map((permission) => {
              const isSelected = selectedPermissions[permission.id]?.enabled || false;

              return (
                <React.Fragment key={permission.id}>
                  <motion.div
                    layout
                    className={`permission-card border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                      isSelected ? "border-indigo-300 bg-indigo-50 shadow-xs" : "border-gray-200 hover:border-gray-300"
                    }`}
                    whileHover={{ scale: 1.01 }}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("input, label, .selected-count")) return;
                      togglePermission(permission.id, !isSelected);
                    }}
                  >
                    <div className="flex items-start">
                      <div className="flex items-center h-5 mt-0.5">
                        <input
                          type="checkbox"
                          id={`perm-${permission.id}`}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition"
                          checked={isSelected}
                          onChange={(e) => togglePermission(permission.id, e.target.checked)}
                        />
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                isSelected ? "bg-indigo-100" : "bg-gray-100"
                              }`}
                            >
                              <i
                                className={`fas fa-${permission.icon} ${
                                  isSelected ? "text-indigo-600" : "text-gray-500"
                                }`}
                              />
                            </div>
                            <label
                              htmlFor={`perm-${permission.id}`}
                              className="font-medium text-gray-800 cursor-pointer"
                            >
                              {permission.name}
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* {permission.subPermissions && (
                              <span className="selected-count text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                {getSelectedSubPermissionsCount(permission.id)}/{permission.subPermissions.length}
                              </span>
                            )} */}
                            <span
                              className={`badge px-2 py-1 rounded-full text-xs ${
                                isSelected ? "bg-indigo-100 text-indigo-800" : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {isSelected ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 ml-11">{permission.description}</p>
                      </div>
                    </div>
                  </motion.div>

                  {permission.subPermissions && isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="sub-permissions ml-11 mt-2 pl-3 border-l-2 border-indigo-100"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {permission.subPermissions.map((sub) => (
                          <div
                            key={sub.id}
                            className="sub-permission-item bg-white p-3 rounded-lg border border-gray-100"
                          >
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`sub-${permission.id}-${sub.id}`}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
                                checked={
                                  selectedPermissions[permission.id]?.[sub.id] === true ||
                                  (Array.isArray(selectedPermissions[permission.id]?.[sub.id]) &&
                                    selectedPermissions[permission.id][sub.id].length > 0)
                                }
                                onChange={(e) => {
                                  if (sub.options) {
                                    // updateSubPermission(permission.id, sub.id, e.target.checked ? [] : undefined);

                                        const newValues = sub.options
                                        updateSubPermission(permission.id, sub.id, !e.target.checked?[]:newValues);
                                  } else {
                                    updateSubPermission(permission.id, sub.id, e.target.checked);
                                  }
                                }}
                              />
                              <label
                                htmlFor={`sub-${permission.id}-${sub.id}`}
                                className="text-sm font-medium text-gray-700"
                              >
                                {sub.label}
                              </label>
                            </div>

                            {sub.options && selectedPermissions[permission.id]?.[sub.id] !== undefined && (
                              <div className="user-list-container mt-2 ml-6 space-y-2">
                                {sub.options.map((opt) => (
                                  <div key={opt} className="user-list-item flex items-center">
                                    <input
                                      type="checkbox"
                                      id={`user-${permission.id}-${sub.id}-${opt}`}
                                      className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
                                      value={opt}
                                      checked={selectedPermissions[permission.id]?.[sub.id]?.includes(opt) || false}
                                      onChange={(e) => {
                                        const currentValues = selectedPermissions[permission.id]?.[sub.id] || [];
                                        const newValues = e.target.checked
                                          ? [...currentValues, opt]
                                          : currentValues.filter((v: string) => v !== opt);
                                        updateSubPermission(permission.id, sub.id, newValues);
                                      }}
                                    />
                                    <label
                                      htmlFor={`user-${permission.id}-${sub.id}-${opt}`}
                                      className="text-xs text-gray-600"
                                    >
                                      {opt}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </React.Fragment>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    ));
  };

  // Funções auxiliares para melhorar a UX
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      Usuários: "users-cog",
      Segurança: "shield-alt",
      Financeiro: "money-bill-wave",
      Documentos: "file-contract",
      Operações: "exchange-alt",
    };
    return icons[category] || "cog";
  };

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const handleExpandCategory = (category: string, permissions: Permission[]) => {
    setExpandedCategories((prev) => {
      const willExpand = !prev[category];
      const newState = { ...prev, [category]: willExpand };

      // Atualizar permissões se estiver expandindo
      if (willExpand) {
        permissions.forEach((perm) => {
          if (!selectedPermissions[perm.id]) {
            togglePermission(perm.id, true);
          }
        });
      }

      return newState;
    });
  };

  // Verificar correspondência de senhas
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;
  const passwordStrength = checkPasswordStrength(formData.password);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho com breadcrumbs */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                <i className="fas fa-user-shield text-indigo-600 mr-3"></i> Gerenciar Operadores
              </h1>
              <p className="text-gray-600">Gerencie operadores e suas permissões no sistema</p>
            </div>
            <button
              id="help-button"
              className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
              onClick={() =>
                showToast("Selecione um operador para editar ou clique em 'Novo Operador' para criar um novo.", "info")
              }
            >
              <i className="fas fa-question-circle"></i>
              <span className="sr-only">Ajuda</span>
            </button>
          </div>
        </div>

        {/* Grid de conteúdo principal */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Coluna esquerda - Lista de operadores */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    <i className="fas fa-users text-indigo-600 mr-2"></i> Operadores
                  </h3>
                  <div className="relative">
                    <input
                      type="text"
                      id="search-input"
                      placeholder="Buscar operador..."
                      className="pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-200" id="operator-list">
                {renderOperatorList()}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  id="new-operator-btn"
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={newOperator}
                >
                  <i className="fas fa-plus mr-2"></i> Novo Operador
                </button>
              </div>
            </div>
          </div>

          {/* Coluna direita - Formulário e permissões */}
          <div className="md:col-span-2 space-y-6">
            {/* Card de informações do operador */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <i className="fas fa-user-edit text-indigo-600 mr-2"></i> Informações do Operador
                </h3>
              </div>
              <div className="p-6">
                <form id="operator-form" className="space-y-5" onSubmit={handleSubmit} ref={operatorFormRef}>
                  <input type="hidden" id="operator-id" name="id" value={formData.id} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Nome Completo <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <i className="fas fa-user text-gray-400"></i>
                        </div>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          className="pl-10 block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-4 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Digite o nome completo"
                          value={formData.name}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <i className="fas fa-envelope text-gray-400"></i>
                        </div>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          className="pl-10 block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-4 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="exemplo@dominio.com"
                          value={formData.email}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Senha{" "}
                        <span className="text-red-500" style={{ display: formData.id ? "none" : "inline" }}>
                          *
                        </span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <i className="fas fa-lock text-gray-400"></i>
                        </div>
                        <input
                          type={passwordVisible.password ? "text" : "password"}
                          id="password"
                          name="password"
                          className="pl-10 block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-4 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder={formData.id ? "Deixe em branco para manter atual" : "Crie uma senha segura"}
                          value={formData.password}
                          onChange={handleInputChange}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <i
                            className={`fas ${
                              passwordVisible.password ? "fa-eye" : "fa-eye-slash"
                            } toggle-password cursor-pointer`}
                            onClick={() => togglePasswordVisibility("password")}
                          ></i>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        <div className="password-strength flex items-center space-x-2">
                          <div className="strength-bar flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full strength-level transition-all duration-300 ${
                                passwordStrength >= 5
                                  ? "bg-green-500"
                                  : passwordStrength >= 3
                                  ? "bg-yellow-500"
                                  : passwordStrength > 0
                                  ? "bg-red-500"
                                  : "bg-gray-400"
                              }`}
                              style={{
                                width:
                                  passwordStrength >= 5
                                    ? "100%"
                                    : passwordStrength >= 3
                                    ? "66%"
                                    : passwordStrength > 0
                                    ? "33%"
                                    : "0%",
                              }}
                            ></div>
                          </div>
                          <span className="strength-text text-gray-500">
                            {passwordStrength >= 5
                              ? "Forte"
                              : passwordStrength >= 3
                              ? "Média"
                              : passwordStrength > 0
                              ? "Fraca"
                              : "Força da senha"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirmar Senha{" "}
                        <span className="text-red-500" style={{ display: formData.id ? "none" : "inline" }}>
                          *
                        </span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <i className="fas fa-lock text-gray-400"></i>
                        </div>
                        <input
                          type={passwordVisible.confirmPassword ? "text" : "password"}
                          id="confirm-password"
                          name="confirmPassword"
                          className="pl-10 block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-4 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Confirme a senha"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <i
                            className={`fas ${
                              passwordVisible.confirmPassword ? "fa-eye" : "fa-eye-slash"
                            } toggle-password cursor-pointer`}
                            onClick={() => togglePasswordVisibility("confirmPassword")}
                          ></i>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {formData.password && formData.confirmPassword && (
                          <span className={passwordsMatch ? "text-green-500" : "text-red-500"}>
                            <i className={`fas ${passwordsMatch ? "fa-check-circle" : "fa-times-circle"} mr-1`}></i>
                            {passwordsMatch ? "As senhas coincidem" : "As senhas não coincidem"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        id="status"
                        name="status"
                        className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-4 focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.status}
                        onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLSelectElement>)}
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                        <option value="pending">Pendente</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Último Acesso</label>
                      <div className="flex items-center text-gray-500">
                        <i className="fas fa-clock mr-2"></i>
                        <span id="last-access">
                          {currentOperator?.lastAccess
                            ? new Date(currentOperator.lastAccess).toLocaleString()
                            : "Nunca acessou"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      id="generate-password"
                      className="inline-flex items-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      onClick={generatePassword}
                    >
                      <i className="fas fa-key mr-2"></i> Gerar Senha
                    </button>

                    <button
                      type="button"
                      id="reset-form"
                      className="inline-flex items-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      onClick={newOperator}
                    >
                      <i className="fas fa-undo mr-2"></i> Limpar
                    </button>

                    <button
                      type="submit"
                      id="save-operator"
                      className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ml-auto"
                    >
                      <i className="fas fa-save mr-2"></i> Salvar Operador
                    </button>

                    {formData.id && (
                      <button
                        type="button"
                        id="delete-operator"
                        className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        onClick={() =>
                          confirmAction(
                            "Tem certeza que deseja excluir este operador? Esta ação não pode ser desfeita.",
                            deleteOperator
                          )
                        }
                      >
                        <i className="fas fa-trash-alt mr-2"></i> Excluir
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* Card de permissões */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <i className="fas fa-user-shield text-indigo-600 mr-2"></i> Permissões de Acesso
                  </h3>
                  <div className="flex items-center">
                    {/* <span className="text-sm text-gray-500 mr-2">
                      Selecionadas: <span id="selected-count">{countSelectedPermissions()}</span>/
                      <span id="total-count">{availablePermissions.length}</span>
                    </span> */}
                    <button
                      id="expand-all"
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                      onClick={() => {
                        availablePermissions.forEach((permission) => {
                          if (!selectedPermissions[permission.id]) {
                            togglePermission(permission.id, true);
                          }
                        });
                      }}
                    >
                      Expandir todas
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div
                  className="select-all-container p-3 rounded-lg border mb-3 border-gray-200 cursor-pointer"
                  onClick={() => {
                    const allSelected = countSelectedPermissions() === availablePermissions.length;
                    availablePermissions.forEach((permission) => {
                      togglePermission(permission.id, !allSelected);
                    });
                  }}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="select-all-permissions"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      checked={countSelectedPermissions() === availablePermissions.length}
                      onChange={(e) => {
                        availablePermissions.forEach((permission) => {
                          togglePermission(permission.id, e.target.checked);
                        });
                      }}
                    />
                    <label htmlFor="select-all-permissions" className="ml-3 block text-sm font-medium text-gray-700">
                      Selecionar todas as permissões
                    </label>
                  </div>
                </div>

                <div id="permissions-container" className="space-y-3">
                  {renderPermissions()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de sucesso */}
      {showSuccessModal && (
        <div id="success-modal" className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50"></div>
          <div className="bg-white rounded-xl shadow-xl transform transition-all max-w-md w-full mx-4 relative">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <i className="fas fa-check text-green-600"></i>
              </div>
              <h3 className="mt-3 text-lg font-medium text-gray-900">Sucesso!</h3>
              <div className="mt-2 text-sm text-gray-500">Operador salvo com sucesso.</div>
              <div className="mt-5">
                <button
                  type="button"
                  id="modal-close"
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                  onClick={() => setShowSuccessModal(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
      {showConfirmModal && (
        <div id="confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50"></div>
          <div className="bg-white rounded-xl shadow-xl transform transition-all max-w-md w-full mx-4 relative">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <i className="fas fa-exclamation-triangle text-red-600"></i>
              </div>
              <h3 className="mt-3 text-lg font-medium text-gray-900">Confirmar ação</h3>
              <div className="mt-2 text-sm text-gray-500">{confirmMessage}</div>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  id="modal-cancel"
                  className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="modal-confirm"
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
                  onClick={() => {
                    deleteOperator();
                    setShowConfirmModal(false);
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div
          id="loading-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30"
        >
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
            <i className="fas fa-circle-notch fa-spin text-indigo-600 text-3xl mb-4"></i>
            <p className="text-gray-700">Processando...</p>
          </div>
        </div>
      )}

      {/* Toast notification */}
      <div
        id="toast"
        ref={toastRef}
        className={`fixed bottom-6 right-6 px-5 py-3 rounded-lg shadow-lg transform transition-all duration-300 z-50 flex items-center ${
          toast.show ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        } ${
          toast.type === "success" ? "bg-green-600" : toast.type === "error" ? "bg-red-600" : "bg-blue-500"
        } text-white`}
      >
        <i
          className={`fas ${
            toast.type === "success" ? "fa-check-circle" : toast.type === "error" ? "fa-times-circle" : "fa-info-circle"
          } mr-2`}
        ></i>
        <span>{toast.message}</span>
      </div>
    </div>
  );
};

export default OperatorManager2;
