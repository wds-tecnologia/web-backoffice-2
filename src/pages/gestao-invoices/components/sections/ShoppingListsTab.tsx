import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Minus,
  Edit,
  Trash2,
  Check,
  X,
  ShoppingCart,
  Package,
  HelpCircle,
  Download,
  FileText,
  FileSpreadsheet,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Save,
  History,
  Settings,
} from "lucide-react";
import { api } from "../../../../services/api";
import Swal from "sweetalert2";
import { useNotification } from "../../../../hooks/notification";
import { ProductSearchSelect } from "./SupplierSearchSelect";

interface Product {
  id: string;
  name: string;
  code: string;
  priceweightAverage: number;
  weightAverage: number;
  description: string;
  active: boolean;
}

interface ShoppingListItem {
  id: string;
  productId: string;
  quantity: number; // Quantidade pedida
  notes?: string;
  status: string; // PENDING, PURCHASED, RECEIVED
  purchased: boolean;
  purchasedAt?: string;
  receivedAt?: string;
  receivedQuantity: number; // Quantidade recebida
  defectiveQuantity: number; // Quantidade com defeito
  returnedQuantity: number; // Quantidade devolvida
  finalQuantity: number; // Quantidade final (recebida - defeito - devolvida)
  createdAt?: string; // Data de criação do item
  updatedAt?: string; // Data de atualização do item
  product: Product;
}

interface ShoppingList {
  id: string;
  name: string;
  description?: string;
  items?: any; // JSONB field (não usado no frontend)
  shoppingListItems?: ShoppingListItem[]; // Relação real
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  completed?: boolean; // Calculado: true se todos os itens estão comprados
  completedAt?: string | null;
  status?: "pendente" | "comprando" | "concluida"; // Status calculado
}

export function ShoppingListsTab() {
  // Função auxiliar para converter string | number para number
  const toNumber = (value: string | number): number => {
    if (typeof value === "string") {
      return value === "" ? 0 : parseFloat(value) || 0;
    }
    return value;
  };

  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState<"all" | "pendente" | "comprando" | "concluida">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState(""); // Valor do input (sem debounce)
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set()); // IDs das listas expandidas
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfContent, setPdfContent] = useState<string>("");
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [showDeletedLists, setShowDeletedLists] = useState(false);
  const [deletedLists, setDeletedLists] = useState<any[]>([]);
  const [editingListName, setEditingListName] = useState<string | null>(null); // ID da lista sendo editada
  const [editingListNameValue, setEditingListNameValue] = useState<string>(""); // Valor temporário do nome
  const [openManageMenu, setOpenManageMenu] = useState<string | null>(null); // ID da lista com menu aberto
  const [manageMenuPosition, setManageMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const manageMenuButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [selectedItem, setSelectedItem] = useState<ShoppingListItem | null>(null);
  const [purchasedQuantity, setPurchasedQuantity] = useState<string | number>("");
  const [additionalQuantity, setAdditionalQuantity] = useState<string | number>("");
  const [quantityDetails, setQuantityDetails] = useState({
    ordered: 0,
    received: 0,
    defective: 0,
    returned: 0,
    final: 0,
  });
  const [selectedProductForAdd, setSelectedProductForAdd] = useState<{ productId: string; quantity: number } | null>(
    null
  );
  const [quantityInputValue, setQuantityInputValue] = useState<string>("0");
  const [transferQuantity, setTransferQuantity] = useState<string | number>("");
  const [selectedListForTransfer, setSelectedListForTransfer] = useState<string>("");
  const [updateOrderedQuantity, setUpdateOrderedQuantity] = useState<boolean>(false);
  const [addToExistingPending, setAddToExistingPending] = useState<boolean>(true);
  const [selectedItemIndexToMerge, setSelectedItemIndexToMerge] = useState<number | null>(null);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [transferAddToExisting, setTransferAddToExisting] = useState<boolean>(true);
  const [transferSelectedItemToMerge, setTransferSelectedItemToMerge] = useState<string | null>(null);
  const [existingItemsInTargetList, setExistingItemsInTargetList] = useState<ShoppingListItem[]>([]);
  const [transferMode, setTransferMode] = useState<"transfer" | "duplicate">("transfer"); // "transfer" = mover, "duplicate" = copiar
  const { setOpenNotification } = useNotification();

  const [newList, setNewList] = useState({
    name: "",
    description: "",
    items: [] as Array<{
      productId: string;
      quantity: number;
      notes?: string;
    }>,
  });

  const fetchData = async (showLoading: boolean = false) => {
    try {
      // Só mostra loading se for carregamento inicial
      if (showLoading) {
        setLoading(true);
      }
      // Para buscas, não mostra loading - atualização silenciosa

      const [listsResponse, productsResponse] = await Promise.all([
        api.get("/invoice/shopping-lists", {
          params: {
            page: currentPage,
            limit: itemsPerPage,
            status: filterStatus,
            search: searchTerm || undefined,
          },
        }),
        api.get("/invoice/product"),
      ]);

      // Backend retorna { data: [...], pagination: {...} }
      if (listsResponse.data?.data) {
        setShoppingLists(listsResponse.data.data);
        setTotalPages(listsResponse.data.pagination?.totalPages || 1);
        setTotalItems(listsResponse.data.pagination?.total || 0);
      } else {
        // Fallback para formato antigo
        setShoppingLists(listsResponse.data);
      }
      // O backend agora retorna { products: [...], totalProducts: ..., page: ..., limit: ..., totalPages: ... }
      setProducts(Array.isArray(productsResponse.data) ? productsResponse.data : productsResponse.data.products || []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao carregar listas de compras",
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregamento inicial com loading
  useEffect(() => {
    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busca e filtros sem loading (atualização silenciosa)
  // Usa useRef para evitar loop infinito
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Só busca se já carregou inicialmente (não é o primeiro render)
    fetchData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filterStatus, searchTerm]);

  // Debounce para busca: aguarda 500ms após parar de digitar antes de buscar
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1); // Reset para primeira página ao buscar
    }, 500); // Aguarda 500ms após parar de digitar

    return () => clearTimeout(timer); // Limpa o timer se o usuário continuar digitando
  }, [searchInput]);

  useEffect(() => {
    // Restaurar lista em construção do localStorage
    const savedList = localStorage.getItem("shopping-list-draft");
    if (savedList) {
      try {
        const parsed = JSON.parse(savedList);
        setNewList(parsed);
      } catch (error) {
        console.error("Erro ao restaurar lista do localStorage:", error);
      }
    }
  }, []);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".manage-menu-container") && !target.closest("[data-manage-menu]")) {
        setOpenManageMenu(null);
        setManageMenuPosition(null);
      }
    };

    if (openManageMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openManageMenu]);

  // Salvar lista em construção no localStorage sempre que mudar
  useEffect(() => {
    if (newList.name || newList.items.length > 0) {
      localStorage.setItem("shopping-list-draft", JSON.stringify(newList));
    } else {
      localStorage.removeItem("shopping-list-draft");
    }
  }, [newList]);

  const handleCreateList = async () => {
    if (!newList.name.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Nome da lista é obrigatório!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    // Validar que tenha pelo menos um produto
    if (newList.items.length === 0 || newList.items.every((item) => !item.productId)) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "A lista deve conter pelo menos um produto!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    try {
      setIsCreating(true);
      await api.post("/invoice/shopping-lists", {
        ...newList,
        createdBy: "user-id", // TODO: Pegar do contexto de usuário
      });

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "Lista de compras criada com sucesso!",
      });

      setNewList({
        name: "",
        description: "",
        items: [],
      });
      localStorage.removeItem("shopping-list-draft");

      await fetchData();
    } catch (error) {
      console.error("Erro ao criar lista:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao criar lista de compras",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleMigrateList = async (listId: string, listName: string) => {
    const result = await Swal.fire({
      title: "Migrar Lista",
      html: `
        <p class="text-sm text-gray-700 mb-4">
          Esta lista será migrada para o novo modelo mantendo todos os dados.
        </p>
        <p class="text-sm font-semibold text-blue-600 mb-2">Lista atual: ${listName}</p>
        <p class="text-sm text-gray-600 mb-4">Nova lista: ${listName} novo-modelo</p>
        <p class="text-xs text-yellow-600">
          ⚠️ A lista antiga será mantida. Uma nova lista será criada no novo formato.
        </p>
      `,
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, migrar!",
      cancelButtonText: "Cancelar",
      buttonsStyling: false,
      customClass: {
        confirmButton: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold mx-2",
        cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
      },
    });

    if (result.isConfirmed) {
      try {
        const response = await api.post("/invoice/shopping-lists/migrate", {
          oldListId: listId,
          newListName: `${listName} novo-modelo`,
        });

        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: `Lista migrada com sucesso! Nova lista: "${response.data.newList.name}"`,
        });

        await fetchData();
      } catch (error: any) {
        console.error("Erro ao migrar lista:", error);
        const errorMessage = error?.response?.data?.message || error?.message || "Erro ao migrar lista";
        setOpenNotification({
          type: "error",
          title: "Erro!",
          notification: errorMessage,
        });
      }
    }
  };

  const handleDuplicateList = async (listId: string, listName: string) => {
    const result = await Swal.fire({
      title: "Duplicar Lista",
      html: `
        <p class="text-sm text-gray-700 mb-4">
          Uma cópia desta lista será criada. Os produtos comprados serão resetados para pendente.
        </p>
        <p class="text-sm font-semibold text-blue-600 mb-2">Lista original: ${listName}</p>
        <p class="text-sm text-gray-600 mb-4">Nova lista: ${listName} (Cópia)</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, duplicar!",
      cancelButtonText: "Cancelar",
      buttonsStyling: false,
      customClass: {
        confirmButton: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold mx-2",
        cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
      },
    });

    if (result.isConfirmed) {
      try {
        const response = await api.post("/invoice/shopping-lists/duplicate", {
          listId: listId,
        });

        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: `Lista duplicada com sucesso! Nova lista: "${response.data.list.name}"`,
        });

        await fetchData();
      } catch (error: any) {
        console.error("Erro ao duplicar lista:", error);
        const errorMessage = error?.response?.data?.message || error?.message || "Erro ao duplicar lista";
        setOpenNotification({
          type: "error",
          title: "Erro!",
          notification: errorMessage,
        });
      }
    }
  };

  const handleCreateBackup = async (listId: string, listName: string) => {
    try {
      const response = await api.post("/invoice/shopping-lists/backup", {
        listId: listId,
      });

      setOpenNotification({
        type: "success",
        title: "Backup Criado!",
        notification: `Backup da lista "${listName}" criado com sucesso! Versão ${response.data.backup.version} (Total: ${response.data.backup.totalVersions} versões)`,
      });
    } catch (error: any) {
      console.error("Erro ao criar backup:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Erro ao criar backup";
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: errorMessage,
      });
    }
  };

  const handleRestoreBackup = async (listId: string, listName: string) => {
    try {
      // Buscar todas as versões disponíveis
      const backupsResponse = await api.get("/invoice/shopping-lists/backups", {
        params: { listId },
      });

      const versions = backupsResponse.data.versions || [];

      if (versions.length === 0) {
        Swal.fire({
          icon: "info",
          title: "Nenhum Backup",
          text: "Esta lista não possui backups disponíveis.",
          confirmButtonColor: "#3b82f6",
        });
        return;
      }

      // Criar HTML com lista de versões
      const versionsHtml = versions
        .map(
          (v: any) => `
        <div class="border rounded p-2 mb-2 cursor-pointer hover:bg-gray-50" onclick="window.selectedVersion = ${
          v.version
        }">
          <div class="flex justify-between items-center">
            <span class="font-semibold">Versão ${v.version}</span>
            <span class="text-xs text-gray-500">${new Date(v.createdAt).toLocaleString("pt-BR")}</span>
          </div>
          <div class="text-xs text-gray-600 mt-1">
            ${v.itemsCount} itens • ${v.name}
          </div>
        </div>
      `
        )
        .join("");

      const result = await Swal.fire({
        title: "Restaurar Backup",
        html: `
          <p class="text-sm text-gray-700 mb-4">
            Escolha qual versão da lista "${listName}" deseja restaurar:
          </p>
          <div id="versions-list" class="max-h-64 overflow-y-auto">
            ${versionsHtml}
          </div>
          <p class="text-xs text-yellow-600 mt-4">
            ⚠️ A versão atual será substituída pela versão selecionada.
          </p>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3b82f6",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Restaurar",
        cancelButtonText: "Cancelar",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold mx-2",
          cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
        },
        didOpen: () => {
          // Adicionar evento de clique nas versões
          const versionDivs = document.querySelectorAll("#versions-list > div");
          versionDivs.forEach((div) => {
            div.addEventListener("click", () => {
              // Remover seleção anterior
              versionDivs.forEach((d) => d.classList.remove("bg-blue-50", "border-blue-300"));
              // Adicionar seleção atual
              div.classList.add("bg-blue-50", "border-blue-300");
              // @ts-ignore
              window.selectedVersion = parseInt(
                div.querySelector("span.font-semibold")?.textContent?.replace("Versão ", "") || "0"
              );
            });
          });
        },
      });

      if (result.isConfirmed) {
        // @ts-ignore
        const selectedVersion = window.selectedVersion || versions[0].version;

        const confirmResult = await Swal.fire({
          title: "Confirmar Restauração",
          html: `
            <p class="text-sm text-gray-700 mb-4">
              Tem certeza que deseja restaurar a <strong>Versão ${selectedVersion}</strong> da lista "${listName}"?
            </p>
            <p class="text-xs text-red-600">
              ⚠️ Esta ação não pode ser desfeita. A versão atual será substituída.
            </p>
          `,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#dc2626",
          cancelButtonColor: "#6b7280",
          confirmButtonText: "Sim, restaurar!",
          cancelButtonText: "Cancelar",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold mx-2",
            cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
          },
        });

        if (confirmResult.isConfirmed) {
          try {
            await api.post("/invoice/shopping-lists/restore", {
              listId: listId,
              version: selectedVersion,
            });

            setOpenNotification({
              type: "success",
              title: "Backup Restaurado!",
              notification: `Lista "${listName}" restaurada da versão ${selectedVersion} com sucesso!`,
            });

            await fetchData();
          } catch (error: any) {
            console.error("Erro ao restaurar backup:", error);
            const errorMessage = error?.response?.data?.message || error?.message || "Erro ao restaurar backup";
            setOpenNotification({
              type: "error",
              title: "Erro!",
              notification: errorMessage,
            });
          }
        }
      }
    } catch (error: any) {
      console.error("Erro ao buscar backups:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Erro ao buscar backups";
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: errorMessage,
      });
    }
  };

  const fetchDeletedLists = async () => {
    try {
      console.log("🔍 [Frontend] Buscando listas deletadas...");
      const response = await api.get("/invoice/shopping-lists/deleted");
      console.log("📦 [Frontend] Resposta completa:", response);
      console.log("📦 [Frontend] response.data:", response.data);
      console.log("📦 [Frontend] response.data.deletedLists:", response.data?.deletedLists);

      const lists = response.data?.deletedLists || response.data || [];
      console.log("✅ [Frontend] Listas deletadas encontradas:", lists);
      console.log("✅ [Frontend] Quantidade:", lists.length);

      if (lists.length > 0) {
        console.log("✅ [Frontend] Primeira lista:", lists[0]);
      }

      setDeletedLists(lists);
      return lists;
    } catch (error: any) {
      console.error("❌ [Frontend] Erro ao buscar listas apagadas:", error);
      console.error("❌ [Frontend] Detalhes do erro:", error?.response?.data);
      console.error("❌ [Frontend] Status:", error?.response?.status);
      setDeletedLists([]);
      return [];
    }
  };

  const handleRestoreDeletedList = async (listId: string, listName: string) => {
    const result = await Swal.fire({
      title: "Restaurar Lista Apagada",
      html: `
        <p class="text-sm text-gray-700 mb-4">
          Deseja restaurar a lista "${listName}" que foi apagada?
        </p>
        <p class="text-xs text-blue-600">
          A lista será restaurada do backup mais recente disponível.
        </p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, restaurar!",
      cancelButtonText: "Cancelar",
      buttonsStyling: false,
      customClass: {
        confirmButton: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold mx-2",
        cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
      },
    });

    if (result.isConfirmed) {
      try {
        await api.post("/invoice/shopping-lists/restore-deleted", {
          listId: listId,
        });

        setOpenNotification({
          type: "success",
          title: "Lista Restaurada!",
          notification: `Lista "${listName}" restaurada com sucesso!`,
        });

        // Fechar modal após restaurar com sucesso
        setShowDeletedLists(false);
        setDeletedLists([]);

        // Atualizar lista de deletadas após restaurar
        await fetchDeletedLists();
        await fetchData();
      } catch (error: any) {
        console.error("Erro ao restaurar lista apagada:", error);
        const errorMessage = error?.response?.data?.message || error?.message || "Erro ao restaurar lista apagada";
        setOpenNotification({
          type: "error",
          title: "Erro!",
          notification: errorMessage,
        });
      }
    }
  };

  const handleDeleteAllDeletedHistory = async () => {
    const result = await Swal.fire({
      title: "⚠️ Atenção!",
      html: `
        <p class="text-sm text-gray-700 mb-4">
          <strong>Esta ação é irreversível!</strong>
        </p>
        <p class="text-sm text-gray-700 mb-4">
          Tem certeza que deseja deletar todo o histórico de listas deletadas?
        </p>
        <p class="text-xs text-red-600 font-semibold">
          Todos os backups de listas deletadas serão permanentemente removidos e não poderão ser restaurados.
        </p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, deletar tudo!",
      cancelButtonText: "Cancelar",
      buttonsStyling: false,
      customClass: {
        confirmButton: "bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold mx-2",
        cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
      },
    });

    if (result.isConfirmed) {
      try {
        await api.delete("/invoice/shopping-lists/deleted/all");

        setOpenNotification({
          type: "success",
          title: "Histórico Apagado!",
          notification: "Todo o histórico de listas deletadas foi removido com sucesso!",
        });

        // Atualizar lista de deletadas após apagar
        await fetchDeletedLists();
      } catch (error: any) {
        console.error("Erro ao apagar histórico de deletadas:", error);
        const errorMessage =
          error?.response?.data?.message || error?.message || "Erro ao apagar histórico de deletadas";
        setOpenNotification({
          type: "error",
          title: "Erro!",
          notification: errorMessage,
        });
      }
    }
  };

  const handleUpdateListName = async (listId: string, newName: string) => {
    if (!newName.trim()) {
      setEditingListName(null);
      setEditingListNameValue("");
      return;
    }

    try {
      await api.put(`/invoice/shopping-lists/${listId}`, {
        name: newName.trim(),
      });

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "Nome da lista atualizado com sucesso!",
      });

      await fetchData();
    } catch (error: any) {
      console.error("Erro ao atualizar nome da lista:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Erro ao atualizar nome da lista";
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: errorMessage,
      });
    } finally {
      setEditingListName(null);
      setEditingListNameValue("");
    }
  };

  const handleStartEditingListName = (listId: string, currentName: string) => {
    setEditingListName(listId);
    setEditingListNameValue(currentName);
  };

  const handleCancelEditingListName = () => {
    setEditingListName(null);
    setEditingListNameValue("");
  };

  const handleSaveListName = (listId: string) => {
    handleUpdateListName(listId, editingListNameValue);
  };

  const handleDeleteList = async (listId: string) => {
    const result = await Swal.fire({
      title: "Confirmar Exclusão",
      text: "Tem certeza que deseja deletar esta lista de compras?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, deletar!",
      cancelButtonText: "Cancelar",
      buttonsStyling: false,
      customClass: {
        confirmButton: "bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold mx-2",
        cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
      },
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/invoice/shopping-lists/${listId}`);
        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: "Lista deletada com sucesso!",
        });
        // Nota: Não precisa resetar confirmações ao deletar lista, pois a lista será removida completamente
        await fetchData();
        // Se o modal de deletadas estiver aberto, atualizar a lista
        if (showDeletedLists) {
          await fetchDeletedLists();
        }
      } catch (error) {
        console.error("Erro ao deletar lista:", error);
        setOpenNotification({
          type: "error",
          title: "Erro!",
          notification: "Erro ao deletar lista",
        });
      }
    }
  };

  const handleOpenPurchaseModal = async (item: ShoppingListItem, listId?: string) => {
    try {
      // Encontrar a lista que contém este item
      const foundListId =
        listId || shoppingLists.find((l) => l.shoppingListItems?.some((i) => i.id === item.id))?.id || editingList?.id;

      if (foundListId) {
        // Buscar o item atualizado da lista para garantir que temos o ID correto
        const listResponse = await api.get(`/invoice/shopping-lists/${foundListId}`);
        const updatedList = listResponse.data;

        // IMPORTANTE: Buscar pelo ID específico do item, não pelo productId
        // Porque pode haver múltiplos itens com o mesmo productId
        let updatedItem = updatedList.shoppingListItems?.find((i: ShoppingListItem) => i.id === item.id);

        // Se não encontrou pelo ID (pode ter sido recriado), tentar encontrar pelo productId + quantidade + status
        // Mas apenas se realmente não encontrou pelo ID
        if (!updatedItem) {
          console.warn("Item não encontrado pelo ID, tentando encontrar por productId + quantidade + status");
          updatedItem = updatedList.shoppingListItems?.find(
            (i: ShoppingListItem) =>
              i.productId === item.productId &&
              i.quantity === item.quantity &&
              i.status === item.status &&
              (i.receivedQuantity || 0) === (item.receivedQuantity || 0)
          );
        }

        if (updatedItem) {
          console.log("Item atualizado encontrado:", {
            id: updatedItem.id,
            idOriginal: item.id,
            productId: updatedItem.productId,
            quantity: updatedItem.quantity,
            receivedQuantity: updatedItem.receivedQuantity,
            status: updatedItem.status,
          });
          setSelectedItem(updatedItem);
          // Sempre iniciar com a quantidade pedida (máximo)
          const receivedQty = updatedItem.receivedQuantity || 0;
          // Se já comprou algo, manter a quantidade comprada; senão, usar a quantidade pedida
          setPurchasedQuantity(receivedQty > 0 ? receivedQty : 0);
          setAdditionalQuantity(receivedQty > 0 ? 0 : updatedItem.quantity); // Se não comprou nada, mostrar quantidade pedida
          setUpdateOrderedQuantity(false); // Reset opção de atualizar
          setShowPurchaseModal(true);
          return;
        } else {
          console.warn("Item não encontrado na lista atualizada, usando item original:", {
            itemId: item.id,
            productId: item.productId,
            quantity: item.quantity,
            status: item.status,
          });
        }
      }

      // Se não encontrou ou não tem listId, usar o item original
      console.log("Usando item original:", item.id);
      setSelectedItem(item);
      const receivedQty = item.receivedQuantity || 0;
      // Sempre iniciar com a quantidade pedida (máximo)
      setPurchasedQuantity(receivedQty > 0 ? receivedQty : 0);
      setAdditionalQuantity(receivedQty > 0 ? 0 : item.quantity); // Se não comprou nada, mostrar quantidade pedida
      setUpdateOrderedQuantity(false); // Reset opção de atualizar
      setShowPurchaseModal(true);
    } catch (error) {
      console.error("Erro ao buscar item atualizado:", error);
      // Em caso de erro, usar o item original
      setSelectedItem(item);
      const receivedQty = item.receivedQuantity || 0;
      // Sempre iniciar com a quantidade pedida (máximo)
      setPurchasedQuantity(receivedQty > 0 ? receivedQty : 0);
      setAdditionalQuantity(receivedQty > 0 ? 0 : item.quantity); // Se não comprou nada, mostrar quantidade pedida
      setUpdateOrderedQuantity(false); // Reset opção de atualizar
      setShowPurchaseModal(true);
    }
  };

  const handleSavePurchasedQuantity = async (allowLess: boolean = false) => {
    if (!selectedItem) return;

    // Calcular quantidade total (já comprada + adicional)
    const purchasedQty =
      typeof purchasedQuantity === "string"
        ? purchasedQuantity === ""
          ? 0
          : parseFloat(purchasedQuantity)
        : purchasedQuantity;
    const additionalQty =
      typeof additionalQuantity === "string"
        ? additionalQuantity === ""
          ? 0
          : parseFloat(additionalQuantity)
        : additionalQuantity;
    const totalQuantity = purchasedQty + additionalQty;

    if (totalQuantity < 0) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Quantidade total não pode ser negativa!",
      });
      return;
    }

    // Validar: se escolheu atualizar quantidade pedida, o mínimo é 1
    if (updateOrderedQuantity && totalQuantity < 1) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "A quantidade pedida não pode ser zero! O mínimo é 1 unidade.",
      });
      return;
    }

    // SEMPRE mostrar confirmação final antes de concluir a compra
    const difference = selectedItem.quantity - totalQuantity;
    const originalOrderedQty = selectedItem.quantity;
    let confirmMessage = "";
    let confirmTitle = "";

    if (totalQuantity > selectedItem.quantity) {
      // Comprou mais que pedido - sempre atualizar pedido
      confirmTitle = "Confirmar Compra - Quantidade Maior que Pedida";
      confirmMessage = `Pedido original: ${originalOrderedQty} unidades\nComprado: ${totalQuantity} unidades (${
        totalQuantity - originalOrderedQty
      } a mais)\n\nO pedido será atualizado para ${totalQuantity} unidades para acompanhar a compra.\n\nPedido original era ${originalOrderedQty} unidades.`;
    } else if (totalQuantity < selectedItem.quantity) {
      // Comprou menos que pedido - perguntar se quer atualizar pedido ou manter pendente
      if (updateOrderedQuantity) {
        confirmTitle = "Confirmar Compra - Atualizar Quantidade Pedida";
        confirmMessage = `Pedido original: ${originalOrderedQty} unidades\nComprado: ${totalQuantity} unidades\n\nO pedido será atualizado de ${originalOrderedQty} para ${totalQuantity} unidades.\n\nPedido original era ${originalOrderedQty} unidades.`;
      } else {
        confirmTitle = "Confirmar Compra - Manter Pedido Original";
        confirmMessage = `Pedido original: ${originalOrderedQty} unidades\nComprado: ${totalQuantity} unidades\n\nFicam ${difference} unidades pendentes.\n\nO pedido original de ${originalOrderedQty} unidades será mantido.`;
      }
    } else {
      confirmTitle = "Confirmar Compra";
      confirmMessage = `Confirmar que ${totalQuantity} unidades foram compradas?\n\nEsta será a quantidade final após a conclusão da compra.`;
    }

    const result = await Swal.fire({
      title: confirmTitle,
      text: confirmMessage,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sim, confirmar compra",
      cancelButtonText: "Cancelar",
      buttonsStyling: false,
      customClass: {
        confirmButton: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold mx-2",
        cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      // Garantir que totalQuantity seja um número
      const quantityToSend = Number(totalQuantity);

      if (isNaN(quantityToSend)) {
        setOpenNotification({
          type: "error",
          title: "Erro!",
          notification: "Quantidade inválida!",
        });
        return;
      }

      // SEMPRE buscar o item atualizado antes de enviar para garantir que o ID está correto
      // Isso evita 404 quando a lista foi editada e os itens foram recriados
      let currentItemId = selectedItem.id;
      let currentItem = selectedItem;
      let listId: string | undefined = undefined;

      // Tentar encontrar a lista que contém este item
      listId =
        shoppingLists.find((l) =>
          l.shoppingListItems?.some((i) => i.id === selectedItem.id || i.productId === selectedItem.productId)
        )?.id || editingList?.id;

      // Se não encontrou, buscar em todas as listas (pode ter sido atualizado)
      if (!listId) {
        try {
          const allListsResponse = await api.get("/invoice/shopping-lists", {
            params: { page: 1, limit: 100 },
          });
          const allLists = allListsResponse.data?.data || allListsResponse.data || [];
          const foundList = allLists.find((l: ShoppingList) =>
            l.shoppingListItems?.some((i) => i.productId === selectedItem.productId)
          );
          listId = foundList?.id;
        } catch (error) {
          console.warn("Erro ao buscar lista em todas as listas:", error);
        }
      }

      // Buscar item atualizado pela lista
      if (listId) {
        try {
          const listResponse = await api.get(`/invoice/shopping-lists/${listId}`);
          const updatedList = listResponse.data;

          // CRÍTICO: Buscar pelo ID específico do item, não pelo productId
          // Porque pode haver múltiplos itens com o mesmo productId
          let updatedItem = updatedList.shoppingListItems?.find((i: ShoppingListItem) => i.id === selectedItem.id);

          // Se não encontrou pelo ID (pode ter sido recriado), buscar por características únicas
          if (!updatedItem) {
            console.warn("Item não encontrado pelo ID, buscando por características únicas:", {
              itemId: selectedItem.id,
              productId: selectedItem.productId,
              quantity: selectedItem.quantity,
              status: selectedItem.status,
              receivedQuantity: selectedItem.receivedQuantity,
            });

            // Primeiro tentar por productId + quantity + status + receivedQuantity
            updatedItem = updatedList.shoppingListItems?.find(
              (i: ShoppingListItem) =>
                i.productId === selectedItem.productId &&
                i.quantity === selectedItem.quantity &&
                i.status === selectedItem.status &&
                (i.receivedQuantity || 0) === (selectedItem.receivedQuantity || 0)
            );

            // Se ainda não encontrou, tentar apenas por productId + quantity (mais flexível)
            if (!updatedItem) {
              const itemsWithSameProductAndQty =
                updatedList.shoppingListItems?.filter(
                  (i: ShoppingListItem) =>
                    i.productId === selectedItem.productId && i.quantity === selectedItem.quantity
                ) || [];

              // Se há apenas um item com esse productId + quantity, usar ele
              if (itemsWithSameProductAndQty.length === 1) {
                updatedItem = itemsWithSameProductAndQty[0];
                console.log("✅ Item encontrado por productId + quantity (único):", updatedItem.id);
              } else if (itemsWithSameProductAndQty.length > 1) {
                // Se há múltiplos, tentar encontrar pelo status mais próximo
                updatedItem =
                  itemsWithSameProductAndQty.find((i: ShoppingListItem) => i.status === selectedItem.status) ||
                  itemsWithSameProductAndQty[0]; // Usar o primeiro se não encontrar pelo status
                console.log(
                  "✅ Item encontrado por productId + quantity (múltiplos, usando primeiro com status correspondente):",
                  updatedItem.id
                );
              }
            }
          }

          if (updatedItem) {
            currentItemId = updatedItem.id;
            currentItem = updatedItem;
            console.log("✅ Item atualizado encontrado antes de salvar:", {
              oldId: selectedItem.id,
              newId: currentItemId,
              productId: selectedItem.productId,
              quantity: selectedItem.quantity,
              receivedQuantity: selectedItem.receivedQuantity,
              status: selectedItem.status,
              foundQuantity: updatedItem.quantity,
              foundReceivedQuantity: updatedItem.receivedQuantity,
              listId: listId,
            });
          } else {
            // Se não encontrou, usar o selectedItem original e continuar
            // O item pode ter sido atualizado mas ainda existe
            console.warn("⚠️ Item não encontrado na lista atualizada, usando item original:", {
              searchedItemId: selectedItem.id,
              productId: selectedItem.productId,
              quantity: selectedItem.quantity,
              status: selectedItem.status,
              receivedQuantity: selectedItem.receivedQuantity,
              listId: listId,
              availableItems: updatedList.shoppingListItems?.map((i: ShoppingListItem) => ({
                id: i.id,
                productId: i.productId,
                quantity: i.quantity,
                status: i.status,
                receivedQuantity: i.receivedQuantity,
              })),
            });
            // Continuar com o item original - pode ser que o item ainda exista mas com dados atualizados
            currentItemId = selectedItem.id;
            currentItem = selectedItem;
          }
        } catch (refreshError) {
          console.error("Erro ao buscar item atualizado antes de salvar:", refreshError);
          setOpenNotification({
            type: "error",
            title: "Erro!",
            notification: "Erro ao buscar item atualizado. Por favor, tente novamente.",
          });
          await fetchData();
          setShowPurchaseModal(false);
          setPurchasedQuantity(0);
          setAdditionalQuantity(0);
          setUpdateOrderedQuantity(false);
          return;
        }
      } else {
        // Não conseguiu encontrar a lista
        console.warn("Lista não encontrada para o item:", selectedItem.productId);
        setOpenNotification({
          type: "error",
          title: "Lista não encontrada!",
          notification: "Não foi possível encontrar a lista do item. Por favor, recarregue a página.",
        });
        await fetchData();
        setShowPurchaseModal(false);
        setPurchasedQuantity(0);
        setAdditionalQuantity(0);
        setUpdateOrderedQuantity(false);
        return;
      }

      console.log("Enviando para API:", {
        itemId: currentItemId,
        purchasedQuantity: quantityToSend,
        currentPurchased: purchasedQuantity,
        additional: additionalQuantity,
        productId: currentItem.productId,
        productName: currentItem.product?.name,
        originalOrdered: selectedItem.quantity,
      });

      const originalOrderedQty = selectedItem.quantity;
      const currentOrderedQty = currentItem.quantity;
      const currentReceivedQty = currentItem.receivedQuantity || 0;

      console.log("Verificando se precisa atualizar pedido:", {
        quantityToSend,
        currentOrderedQty,
        currentReceivedQty,
        originalOrderedQty,
        updateOrderedQuantity,
      });

      // Se comprou mais que pedido OU escolheu atualizar quantidade pedida, atualizar o pedido PRIMEIRO
      // IMPORTANTE: Cada item é único e individual - apenas este item específico será atualizado
      const shouldUpdateOrdered =
        quantityToSend > currentOrderedQty || (quantityToSend < currentOrderedQty && updateOrderedQuantity);

      console.log("Decisão de atualizar quantidade pedida:", {
        shouldUpdateOrdered,
        quantityToSend,
        currentOrderedQty,
        updateOrderedQuantity,
        itemId: currentItemId,
        productId: currentItem.productId,
      });

      if (shouldUpdateOrdered && listId) {
        try {
          // Buscar a lista atualizada novamente para garantir que temos os dados mais recentes
          const listResponse = await api.get(`/invoice/shopping-lists/${listId}`);
          const list = listResponse.data;

          // CRÍTICO: Preservar status e quantidades compradas de TODOS os itens antes de atualizar
          // Porque o backend recria todos os itens e eles perdem esses dados
          // IMPORTANTE: Cada item é único e individual - usar índice na lista para identificar após recriação
          const itemsStatusArray: Array<{
            originalId: string;
            originalIndex: number; // Índice na lista original para identificar após recriação
            productId: string;
            status: string;
            receivedQuantity: number;
            purchased: boolean;
            purchasedAt?: string;
            receivedAt?: string;
            defectiveQuantity: number;
            returnedQuantity: number;
            finalQuantity: number;
            quantity: number;
          }> = [];

          list.shoppingListItems?.forEach((i: ShoppingListItem, index: number) => {
            // IMPORTANTE: Preservar TODOS os dados de TODOS os itens individualmente
            // Cada item é único, mesmo que tenha o mesmo productId
            itemsStatusArray.push({
              originalId: i.id,
              originalIndex: index, // Guardar índice para identificar após recriação
              productId: i.productId,
              status: i.status,
              receivedQuantity: i.receivedQuantity || 0,
              purchased: i.purchased,
              purchasedAt: i.purchasedAt,
              receivedAt: i.receivedAt,
              defectiveQuantity: i.defectiveQuantity || 0,
              returnedQuantity: i.returnedQuantity || 0,
              finalQuantity: i.finalQuantity || 0,
              quantity: i.quantity,
            });
            console.log(`Preservando item ${index}:`, {
              id: i.id,
              productId: i.productId,
              quantity: i.quantity,
              status: i.status,
              receivedQuantity: i.receivedQuantity || 0,
            });
          });

          // CRÍTICO: Atualizar APENAS o item específico usando o ID (não productId!)
          // Cada item é único e individual - não pode afetar outros itens
          console.log("Preparando atualização - lista atual:", {
            totalItems: list.shoppingListItems?.length,
            items: list.shoppingListItems?.map((i: ShoppingListItem) => ({
              id: i.id,
              productId: i.productId,
              quantity: i.quantity,
              status: i.status,
              receivedQuantity: i.receivedQuantity,
            })),
            itemToUpdate: {
              id: currentItemId,
              productId: currentItem.productId,
              currentQuantity: currentItem.quantity,
              newQuantity: quantityToSend,
            },
          });

          const updatedItems =
            list.shoppingListItems?.map((i: ShoppingListItem) => {
              // IMPORTANTE: Usar apenas o ID específico, não productId (para não afetar outros itens do mesmo produto)
              if (i.id === currentItemId) {
                console.log("✅ Atualizando item específico:", {
                  id: i.id,
                  productId: i.productId,
                  oldQuantity: i.quantity,
                  newQuantity: quantityToSend,
                });
                return {
                  productId: i.productId,
                  quantity: quantityToSend, // Atualizar quantidade pedida apenas deste item INDIVIDUAL
                  notes: i.notes || "",
                };
              }
              // Manter todos os outros itens exatamente como estão (SEM MUDANÇAS)
              return {
                productId: i.productId,
                quantity: i.quantity, // Manter quantidade original
                notes: i.notes || "",
              };
            }) || [];

          console.log("Itens que serão enviados ao backend:", {
            totalItems: updatedItems.length,
            items: updatedItems.map((item: any, idx: number) => ({
              index: idx,
              productId: item.productId,
              quantity: item.quantity,
            })),
          });

          await api.put(`/invoice/shopping-lists/${listId}`, {
            name: list.name,
            description: list.description,
            items: updatedItems,
          });

          // IMPORTANTE: Após atualizar a lista, os itens são recriados, então precisamos:
          // 1. Buscar o NOVO ID do item atualizado
          // 2. Restaurar status e quantidades compradas de TODOS os itens INDIVIDUALMENTE
          const refreshedListResponse = await api.get(`/invoice/shopping-lists/${listId}`);
          const refreshedList = refreshedListResponse.data;

          // Encontrar o item atualizado usando uma combinação única de características
          // IMPORTANTE: Cada item é único e individual - usar índice + características para identificar corretamente
          const originalItemIndex =
            list.shoppingListItems?.findIndex((i: ShoppingListItem) => i.id === currentItemId) ?? -1;

          // Tentar encontrar pelo índice primeiro (mais confiável se a ordem não mudou)
          let refreshedItem = originalItemIndex >= 0 ? refreshedList.shoppingListItems?.[originalItemIndex] : undefined;

          // VALIDAÇÃO CRÍTICA: Verificar se o item encontrado pelo índice é realmente o correto
          // Comparar productId + quantidade (nova quantidade) para garantir que é o item certo
          if (refreshedItem) {
            const isCorrectItem =
              refreshedItem.productId === currentItem.productId && refreshedItem.quantity === quantityToSend; // Nova quantidade após atualização

            if (!isCorrectItem) {
              console.warn("Item encontrado pelo índice não corresponde! Buscando por características:", {
                foundItem: {
                  id: refreshedItem.id,
                  productId: refreshedItem.productId,
                  quantity: refreshedItem.quantity,
                },
                expectedItem: {
                  productId: currentItem.productId,
                  quantity: quantityToSend,
                },
              });
              refreshedItem = undefined; // Resetar para buscar novamente
            }
          }

          // Se não encontrou pelo índice ou o item não corresponde, buscar por características únicas
          if (!refreshedItem) {
            // Encontrar pela combinação: productId + quantidade (nova) + posição relativa entre itens do mesmo produto
            const itemsWithSameProduct =
              refreshedList.shoppingListItems?.filter((i: ShoppingListItem) => i.productId === currentItem.productId) ||
              [];

            const originalItemsWithSameProduct =
              list.shoppingListItems?.filter((i: ShoppingListItem) => i.productId === currentItem.productId) || [];

            const relativeIndex = originalItemsWithSameProduct.findIndex(
              (i: ShoppingListItem) => i.id === currentItemId
            );

            if (relativeIndex >= 0 && relativeIndex < itemsWithSameProduct.length) {
              // Encontrar o item na mesma posição relativa que tem a nova quantidade
              const candidateItem = itemsWithSameProduct[relativeIndex];
              if (candidateItem.quantity === quantityToSend) {
                refreshedItem = candidateItem;
              } else {
                // Se a quantidade não corresponde na posição relativa, buscar pelo productId + nova quantidade
                refreshedItem = itemsWithSameProduct.find((i: ShoppingListItem) => i.quantity === quantityToSend);
              }
            } else {
              // Fallback: buscar apenas por productId + nova quantidade
              refreshedItem = refreshedList.shoppingListItems?.find(
                (i: ShoppingListItem) => i.productId === currentItem.productId && i.quantity === quantityToSend
              );
            }
          }

          if (refreshedItem) {
            currentItemId = refreshedItem.id;
            currentItem = refreshedItem;
            console.log("✅ Item atualizado encontrado após editar lista (novo ID):", {
              oldId: selectedItem.id,
              newId: currentItemId,
              productId: currentItem.productId,
              oldQuantity: selectedItem.quantity,
              newQuantity: currentItem.quantity,
              expectedQuantity: quantityToSend,
              matches: currentItem.quantity === quantityToSend,
            });
          } else {
            console.error("❌ Item não encontrado após atualizar lista:", {
              originalItemId: currentItemId,
              productId: currentItem.productId,
              expectedQuantity: quantityToSend,
              refreshedListItems: refreshedList.shoppingListItems?.map((i: ShoppingListItem) => ({
                id: i.id,
                productId: i.productId,
                quantity: i.quantity,
                status: i.status,
              })),
            });
            throw new Error("Item não encontrado após atualizar lista");
          }

          // Restaurar status e quantidades compradas de TODOS os itens INDIVIDUALMENTE
          // EXCETO o item que está sendo atualizado (ele será atualizado depois)
          const restorePromises: Promise<any>[] = [];

          const itemBeingUpdatedId = currentItemId;

          // Criar um mapa de itens originais para facilitar busca
          const originalItemsMap = new Map<string, ShoppingListItem>();
          list.shoppingListItems?.forEach((i: ShoppingListItem) => {
            originalItemsMap.set(i.id, i);
          });

          // IMPORTANTE: Cada item é único e individual - usar índice para mapear corretamente
          // Como os itens são recriados na mesma ordem, podemos usar o índice original
          // CRÍTICO: Apenas restaurar itens que REALMENTE estavam comprados ANTES da atualização
          console.log("Iniciando restauração de itens:", {
            totalItems: refreshedList.shoppingListItems?.length,
            preservedItems: itemsStatusArray.length,
            itemBeingUpdatedId,
          });

          refreshedList.shoppingListItems?.forEach((i: ShoppingListItem, newIndex: number) => {
            // NÃO restaurar o item que está sendo atualizado - ele será atualizado depois
            if (i.id === itemBeingUpdatedId) {
              console.log("⏭️ Pulando restauração do item que está sendo atualizado:", {
                productId: i.productId,
                itemId: i.id,
                newIndex,
                quantity: i.quantity,
              });
              return;
            }

            // Buscar dados preservados pelo índice original
            // Como os itens são recriados na mesma ordem, o índice corresponde
            const preservedData = itemsStatusArray[newIndex];

            // Verificar se encontrou dados preservados e se não é o item sendo atualizado
            if (preservedData && preservedData.originalId !== currentItemId) {
              // CRÍTICO: Apenas restaurar se o item ORIGINAL tinha status comprado E quantidade comprada > 0
              // Não restaurar itens pendentes! Cada item é único e individual
              const wasPurchased =
                (preservedData.status === "PURCHASED" || preservedData.status === "RECEIVED") &&
                preservedData.receivedQuantity > 0;

              // VALIDAÇÃO EXTRA: Verificar se a quantidade preservada corresponde à quantidade atual
              // Se a quantidade mudou, pode ser que seja um item diferente
              const quantityMatches = preservedData.quantity === i.quantity;

              if (wasPurchased && quantityMatches) {
                // Restaurar quantidade comprada e status do item INDIVIDUAL
                console.log("✅ Restaurando item individual que estava comprado:", {
                  originalId: preservedData.originalId,
                  originalIndex: preservedData.originalIndex,
                  newId: i.id,
                  newIndex,
                  productId: i.productId,
                  preservedQuantity: preservedData.receivedQuantity,
                  preservedStatus: preservedData.status,
                  preservedOrderedQuantity: preservedData.quantity,
                  currentStatus: i.status,
                  currentQuantity: i.quantity,
                  quantityMatches,
                });
                restorePromises.push(
                  api
                    .patch("/invoice/shopping-lists/update-purchased-quantity", {
                      itemId: i.id,
                      purchasedQuantity: preservedData.receivedQuantity,
                    })
                    .catch((error) => {
                      console.warn(`❌ Erro ao restaurar status do item ${i.id} (índice ${newIndex}):`, error);
                    })
                );
              } else {
                // Item era pendente OU quantidade não corresponde - NÃO restaurar
                console.log("⏸️ Item NÃO será restaurado:", {
                  originalId: preservedData.originalId,
                  newId: i.id,
                  newIndex,
                  productId: i.productId,
                  preservedStatus: preservedData.status,
                  preservedQuantity: preservedData.receivedQuantity,
                  preservedOrderedQuantity: preservedData.quantity,
                  currentStatus: i.status,
                  currentQuantity: i.quantity,
                  wasPurchased,
                  quantityMatches,
                  reason: !wasPurchased ? "não estava comprado" : "quantidade não corresponde",
                });
              }
            } else if (!preservedData) {
              console.warn("⚠️ Dados preservados não encontrados para índice:", newIndex);
            } else {
              console.log("⏸️ Item é o que está sendo atualizado, pulando:", {
                originalId: preservedData.originalId,
                currentItemId,
              });
            }
          });

          // Aguardar todas as restaurações (mas não falhar se alguma der erro)
          const restoreResults = await Promise.allSettled(restorePromises);
          console.log("Resultados das restaurações:", restoreResults.length, "itens restaurados");

          // Buscar novamente para ter os dados atualizados ANTES de atualizar o item atual
          const finalListResponse = await api.get(`/invoice/shopping-lists/${listId}`);
          const finalList = finalListResponse.data;

          // IMPORTANTE: Encontrar o item atualizado usando o ID que já temos
          // Mas validar que é o item correto comparando productId + quantidade
          let finalItem = finalList.shoppingListItems?.find((i: ShoppingListItem) => i.id === itemBeingUpdatedId);

          // VALIDAÇÃO: Verificar se o item encontrado é realmente o correto
          if (finalItem) {
            const isCorrectItem =
              finalItem.productId === currentItem.productId && finalItem.quantity === quantityToSend; // Deve ter a nova quantidade

            if (!isCorrectItem) {
              console.warn("⚠️ Item encontrado pelo ID não corresponde! Buscando por características:", {
                foundItem: {
                  id: finalItem.id,
                  productId: finalItem.productId,
                  quantity: finalItem.quantity,
                },
                expectedItem: {
                  productId: currentItem.productId,
                  quantity: quantityToSend,
                },
              });

              // Buscar novamente por características
              finalItem = finalList.shoppingListItems?.find(
                (i: ShoppingListItem) => i.productId === currentItem.productId && i.quantity === quantityToSend
              );
            }
          } else {
            // Se não encontrou pelo ID, buscar por características
            console.warn("⚠️ Item não encontrado pelo ID, buscando por características");
            finalItem = finalList.shoppingListItems?.find(
              (i: ShoppingListItem) => i.productId === currentItem.productId && i.quantity === quantityToSend
            );
          }

          if (finalItem) {
            currentItemId = finalItem.id;
            currentItem = finalItem;
            console.log("✅ Item encontrado após restaurar outros itens:", {
              itemId: currentItemId,
              productId: currentItem.productId,
              quantity: currentItem.quantity,
              receivedQuantity: currentItem.receivedQuantity,
              expectedQuantity: quantityToSend,
              quantityMatches: currentItem.quantity === quantityToSend,
            });
          } else {
            console.error("❌ Item não encontrado após restaurar outros itens:", {
              itemBeingUpdatedId,
              productId: currentItem.productId,
              expectedQuantity: quantityToSend,
              finalListItems: finalList.shoppingListItems?.map((i: ShoppingListItem) => ({
                id: i.id,
                productId: i.productId,
                quantity: i.quantity,
                status: i.status,
              })),
            });
            throw new Error("Item não encontrado após restaurar outros itens");
          }
        } catch (updateError) {
          console.error("Erro ao atualizar quantidade pedida:", updateError);
          setOpenNotification({
            type: "error",
            title: "Erro!",
            notification: "Erro ao atualizar quantidade pedida. Por favor, tente novamente.",
          });
          await fetchData();
          setShowPurchaseModal(false);
          setPurchasedQuantity(0);
          setAdditionalQuantity(0);
          setUpdateOrderedQuantity(false);
          return;
        }
      }

      // Atualizar quantidade comprada usando o ID correto (pode ter sido atualizado acima)
      console.log("Atualizando quantidade comprada final:", {
        itemId: currentItemId,
        purchasedQuantity: quantityToSend,
        productId: currentItem.productId,
        productName: currentItem.product?.name,
        currentQuantity: currentItem.quantity,
        currentReceivedQuantity: currentItem.receivedQuantity,
      });

      // Atualizar quantidade comprada usando o ID correto (pode ter sido atualizado acima)
      let updateResponse;
      try {
        updateResponse = await api.patch("/invoice/shopping-lists/update-purchased-quantity", {
          itemId: currentItemId,
          purchasedQuantity: quantityToSend,
        });

        console.log("Quantidade comprada atualizada com sucesso:", updateResponse.data);

        // Verificar se a atualização foi aplicada corretamente
        if (updateResponse.data) {
          const updatedItemData = updateResponse.data;
          console.log("Item atualizado retornado pela API:", {
            itemId: updatedItemData.id,
            productId: updatedItemData.productId,
            quantity: updatedItemData.quantity,
            receivedQuantity: updatedItemData.receivedQuantity,
            status: updatedItemData.status,
          });
        }
      } catch (updateError: any) {
        console.error("Erro ao atualizar quantidade comprada:", updateError);
        // Se der erro, tentar buscar o item novamente pelo ID específico (não productId!)
        if (listId) {
          const retryListResponse = await api.get(`/invoice/shopping-lists/${listId}`);
          const retryList = retryListResponse.data;
          // IMPORTANTE: Buscar pelo ID específico, não por productId (para não afetar outros itens)
          const retryItem = retryList.shoppingListItems?.find((i: ShoppingListItem) => i.id === currentItemId);

          if (retryItem) {
            console.log("Tentando atualizar novamente com ID específico:", retryItem.id);
            updateResponse = await api.patch("/invoice/shopping-lists/update-purchased-quantity", {
              itemId: retryItem.id,
              purchasedQuantity: quantityToSend,
            });
            console.log("Atualização bem-sucedida na segunda tentativa:", updateResponse.data);
          } else {
            throw updateError;
          }
        } else {
          throw updateError;
        }
      }

      let successMessage = "";
      if (quantityToSend > originalOrderedQty) {
        successMessage = `Compra confirmada! Comprado ${quantityToSend} unidades. Pedido atualizado de ${originalOrderedQty} para ${quantityToSend} unidades.`;
      } else if (quantityToSend < originalOrderedQty && updateOrderedQuantity) {
        successMessage = `Compra confirmada! Comprado ${quantityToSend} unidades. Pedido atualizado de ${originalOrderedQty} para ${quantityToSend} unidades.`;
      } else if (quantityToSend < originalOrderedQty) {
        successMessage = `Compra confirmada! Comprado ${quantityToSend} de ${originalOrderedQty} unidades. Ficam ${
          originalOrderedQty - quantityToSend
        } unidades pendentes.`;
      } else {
        successMessage = `Compra confirmada! Total comprado: ${quantityToSend} unidades.`;
      }

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: successMessage,
      });

      setShowPurchaseModal(false);
      setPurchasedQuantity("");
      setAdditionalQuantity("");
      setUpdateOrderedQuantity(false);

      // Recarregar dados para garantir que tudo está atualizado
      console.log("Recarregando dados após atualização...");

      // Aguardar um pouco para garantir que o backend processou tudo
      await new Promise((resolve) => setTimeout(resolve, 500));

      await fetchData();
      console.log("Dados recarregados com sucesso");

      // Verificar se a atualização foi aplicada corretamente
      // IMPORTANTE: Usar o ID específico do item que foi atualizado, não productId
      if (listId && currentItemId) {
        try {
          // Aguardar mais um pouco para garantir processamento
          await new Promise((resolve) => setTimeout(resolve, 300));

          const verifyResponse = await api.get(`/invoice/shopping-lists/${listId}`);
          const verifyList = verifyResponse.data;

          // CRÍTICO: Buscar pelo ID específico do item que foi atualizado
          let verifyItem = verifyList.shoppingListItems?.find((i: ShoppingListItem) => i.id === currentItemId);

          // Se não encontrou pelo ID (pode ter sido recriado), buscar por características únicas
          if (!verifyItem) {
            console.warn("Item não encontrado pelo ID na verificação, buscando por características:", {
              itemId: currentItemId,
              productId: currentItem.productId,
              expectedQuantity: quantityToSend,
            });

            // Buscar por productId + quantidade (nova quantidade após atualização)
            // Se atualizou a quantidade pedida, buscar pela nova quantidade; senão, buscar pela quantidade original
            const expectedQuantity = currentItem.quantity; // Quantidade pedida atual do item
            verifyItem = verifyList.shoppingListItems?.find(
              (i: ShoppingListItem) =>
                i.productId === currentItem.productId &&
                i.quantity === expectedQuantity &&
                (i.receivedQuantity || 0) === quantityToSend
            );
          }

          if (verifyItem) {
            console.log("✅ Verificação final do item:", {
              itemId: verifyItem.id,
              productId: verifyItem.productId,
              quantity: verifyItem.quantity,
              receivedQuantity: verifyItem.receivedQuantity,
              expectedQuantity: quantityToSend,
              status: verifyItem.status,
              needsUpdate: Math.abs(verifyItem.receivedQuantity - quantityToSend) > 0.01,
            });

            // Se a quantidade não bate, tentar atualizar novamente usando o ID correto
            if (Math.abs(verifyItem.receivedQuantity - quantityToSend) > 0.01) {
              console.warn("⚠️ Quantidade não corresponde! Tentando atualizar novamente...", {
                itemId: verifyItem.id,
                atual: verifyItem.receivedQuantity,
                esperado: quantityToSend,
                diferenca: Math.abs(verifyItem.receivedQuantity - quantityToSend),
              });

              try {
                await api.patch("/invoice/shopping-lists/update-purchased-quantity", {
                  itemId: verifyItem.id, // Usar o ID do item encontrado
                  purchasedQuantity: quantityToSend,
                });
                console.log("✅ Atualização de correção bem-sucedida");
                // Recarregar novamente após correção
                await new Promise((resolve) => setTimeout(resolve, 300));
                await fetchData();
              } catch (retryError) {
                console.error("❌ Erro ao tentar corrigir quantidade:", retryError);
              }
            } else {
              console.log("✅ Quantidade comprada está correta!");
            }
          } else {
            console.warn("⚠️ Item não encontrado na verificação final!", {
              searchedItemId: currentItemId,
              productId: currentItem.productId,
              expectedQuantity: quantityToSend,
              availableItems: verifyList.shoppingListItems?.map((i: ShoppingListItem) => ({
                id: i.id,
                productId: i.productId,
                quantity: i.quantity,
                receivedQuantity: i.receivedQuantity,
              })),
            });
          }
        } catch (verifyError) {
          console.warn("Erro ao verificar atualização:", verifyError);
        }
      }
    } catch (error: any) {
      console.error("Erro ao atualizar quantidade comprada:", {
        error,
        response: error?.response?.data,
        status: error?.response?.status,
        itemId: selectedItem.id,
        productId: selectedItem.productId,
      });

      // Tratamento específico para 404
      if (error?.response?.status === 404) {
        setOpenNotification({
          type: "error",
          title: "Item não encontrado!",
          notification: "O item pode ter sido removido ou a lista foi editada. Recarregando dados...",
        });
        // Recarregar dados e fechar modal
        await fetchData();
        setShowPurchaseModal(false);
        return;
      }

      const errorMessage = error?.response?.data?.message || error?.message || "Erro ao atualizar quantidade comprada";
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: errorMessage,
      });
    }
  };

  const handleUndoPurchase = async (item: ShoppingListItem, listId?: string) => {
    try {
      const result = await Swal.fire({
        title: "Desfazer Compra",
        text: `Deseja desfazer a compra deste item? Ele voltará para o status "Pendente".`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sim, desfazer",
        cancelButtonText: "Cancelar",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded font-semibold mx-2",
          cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
        },
      });

      if (!result.isConfirmed) {
        return;
      }

      // Encontrar a lista que contém este item
      const foundListId =
        listId || shoppingLists.find((l) => l.shoppingListItems?.some((i) => i.id === item.id))?.id || editingList?.id;

      if (foundListId) {
        // Buscar o item atualizado da lista para garantir que temos o ID correto
        const listResponse = await api.get(`/invoice/shopping-lists/${foundListId}`);
        const updatedList = listResponse.data;

        // IMPORTANTE: Buscar pelo ID específico do item, não pelo productId
        // Porque pode haver múltiplos itens com o mesmo productId
        let updatedItem = updatedList.shoppingListItems?.find((i: ShoppingListItem) => i.id === item.id);

        // Se não encontrou pelo ID (pode ter sido recriado), tentar encontrar por productId + quantidade + status
        if (!updatedItem) {
          console.warn("Item não encontrado pelo ID, tentando encontrar por características:", {
            itemId: item.id,
            productId: item.productId,
            quantity: item.quantity,
            status: item.status,
            receivedQuantity: item.receivedQuantity,
          });
          updatedItem = updatedList.shoppingListItems?.find(
            (i: ShoppingListItem) =>
              i.productId === item.productId &&
              i.quantity === item.quantity &&
              (i.receivedQuantity || 0) === (item.receivedQuantity || 0) &&
              (i.status === item.status || (item.status === "PURCHASED" && i.status === "PURCHASED"))
          );
        }

        if (updatedItem) {
          console.log("Desfazendo compra do item:", {
            itemId: updatedItem.id,
            productId: updatedItem.productId,
            quantity: updatedItem.quantity,
            receivedQuantity: updatedItem.receivedQuantity,
            status: updatedItem.status,
          });

          await api.patch("/invoice/shopping-lists/undo-purchase", {
            itemId: updatedItem.id,
          });

          setOpenNotification({
            type: "success",
            title: "Sucesso!",
            notification: "Compra desfeita! O item voltou para pendente.",
          });

          await fetchData();
        } else {
          console.error("Item não encontrado na lista:", {
            originalItemId: item.id,
            productId: item.productId,
            quantity: item.quantity,
            status: item.status,
            listItems: updatedList.shoppingListItems?.map((i: ShoppingListItem) => ({
              id: i.id,
              productId: i.productId,
              quantity: i.quantity,
              status: i.status,
            })),
          });
          throw new Error("Item não encontrado na lista");
        }
      } else {
        throw new Error("Lista não encontrada");
      }
    } catch (error: any) {
      console.error("Erro ao desfazer compra:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Erro ao desfazer compra";
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: errorMessage,
      });
    }
  };

  const handleMarkAsPurchased = async (itemId: string, purchased: boolean) => {
    try {
      await api.patch("/invoice/shopping-lists/mark-purchased", {
        itemId,
        purchased,
      });

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: purchased ? "Item marcado como comprado!" : "Item desmarcado!",
      });

      await fetchData();
    } catch (error) {
      console.error("Erro ao marcar item:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao atualizar item",
      });
    }
  };

  const handleUpdateItemStatus = async (itemId: string, newStatus: string, receivedQuantity?: number) => {
    try {
      await api.patch("/invoice/shopping-lists/update-status", {
        itemId,
        status: newStatus,
        receivedQuantity: receivedQuantity || 0,
      });

      const statusMessages = {
        PENDING: "Item marcado como aguardando",
        PURCHASED: "Item marcado como comprado",
        RECEIVED: "Item marcado como recebido",
      };

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: statusMessages[newStatus as keyof typeof statusMessages] || "Status atualizado!",
      });

      await fetchData();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao atualizar status do item",
      });
    }
  };

  const openQuantityModal = (item: ShoppingListItem) => {
    setSelectedItem(item);
    const received = item.receivedQuantity || 0;
    const defective = item.defectiveQuantity || 0;
    const returned = item.returnedQuantity || 0;
    const final = received - returned; // CORREÇÃO: Final = Recebido - Devolvido

    setQuantityDetails({
      ordered: item.quantity,
      received,
      defective,
      returned,
      final,
    });
    setShowQuantityModal(true);
  };

  const handleSaveQuantityDetails = async () => {
    if (!selectedItem) return;

    // VALIDAÇÕES FINAIS ANTES DE SALVAR
    if (quantityDetails.received < 0) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Quantidade recebida não pode ser negativa!",
      });
      return;
    }

    if (quantityDetails.received > quantityDetails.ordered) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: `Quantidade recebida não pode ser maior que pedida (${quantityDetails.ordered})!`,
      });
      return;
    }

    if (quantityDetails.defective < 0) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Quantidade com defeito não pode ser negativa!",
      });
      return;
    }

    if (quantityDetails.defective > quantityDetails.received) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: `Quantidade com defeito não pode ser maior que recebida (${quantityDetails.received})!`,
      });
      return;
    }

    if (quantityDetails.returned < 0) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Quantidade devolvida não pode ser negativa!",
      });
      return;
    }

    if (quantityDetails.returned > quantityDetails.defective) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: `Quantidade devolvida não pode ser maior que com defeito (${quantityDetails.defective})!`,
      });
      return;
    }

    try {
      await api.patch("/invoice/shopping-lists/update-quantities", {
        itemId: selectedItem.id,
        receivedQuantity: quantityDetails.received,
        defectiveQuantity: quantityDetails.defective,
        returnedQuantity: quantityDetails.returned,
        finalQuantity: quantityDetails.final,
        status: quantityDetails.received > 0 ? "RECEIVED" : "PURCHASED",
      });

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "Quantidades atualizadas com sucesso!",
      });

      setShowQuantityModal(false);
      await fetchData();
    } catch (error) {
      console.error("Erro ao atualizar quantidades:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao atualizar quantidades",
      });
    }
  };

  const handleEditList = (list: ShoppingList) => {
    setEditingList(list);
    setIsEditing(list.id);
    // Manter pendentes na lista de edição para que possam ser modificados ou mantidos
    // Itens comprados são mantidos automaticamente pelo backend
    const pendingItems = list.shoppingListItems?.filter((item) => item.status === "PENDING") || [];
    setNewList({
      name: list.name,
      description: list.description || "",
      items: pendingItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes || "",
      })),
    });
  };

  const handleTransferItem = async () => {
    console.log("--- Início handleTransferItem ---");
    console.log("selectedItem:", selectedItem);
    console.log("selectedListForTransfer:", selectedListForTransfer);
    if (!selectedItem || !selectedListForTransfer) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Selecione uma lista destino!",
      });
      return;
    }

    // Prevenir múltiplos cliques
    if (isTransferring) {
      return;
    }

    try {
      setIsTransferring(true);

      // Calcular quantidade a transferir
      const pendingQuantity = selectedItem.quantity - (selectedItem.receivedQuantity || 0);
      const isFullyPurchased = selectedItem.receivedQuantity >= selectedItem.quantity;
      let quantityToTransfer: number;

      // Se está totalmente comprado, SEMPRE transferir/duplicar tudo (não pode ser em fração)
      if (isFullyPurchased) {
        quantityToTransfer = selectedItem.quantity; // Sempre a quantidade total
      } else {
        // Para itens parcialmente comprados, usar input de quantidade (apenas pendente)
        const qtyValue =
          typeof transferQuantity === "string"
            ? transferQuantity === ""
              ? 0
              : parseFloat(transferQuantity)
            : transferQuantity;

        if (qtyValue > 0 && qtyValue <= pendingQuantity) {
          quantityToTransfer = qtyValue;
        } else {
          quantityToTransfer = pendingQuantity;
        }

        // Validação: quantidade deve ser maior que zero
        if (quantityToTransfer <= 0) {
          setOpenNotification({
            type: "error",
            title: "Erro!",
            notification: "Quantidade a transferir deve ser maior que zero!",
          });
          setIsTransferring(false);
          return;
        }
      }

      console.log("quantityToTransfer:", quantityToTransfer);
      console.log("transferQuantity:", transferQuantity);
      console.log("pendingQuantity:", pendingQuantity);

      if (quantityToTransfer <= 0) {
        setOpenNotification({
          type: "error",
          title: "Erro!",
          notification: "Quantidade a transferir deve ser maior que zero!",
        });
        setIsTransferring(false);
        return;
      }

      // Guardar informações do item original (status e quantidade comprada)
      const wasPurchased = selectedItem.status === "PURCHASED" || selectedItem.status === "RECEIVED";
      const purchasedQuantity = selectedItem.receivedQuantity || 0;

      // Buscar lista destino
      const targetListResponse = await api.get(`/invoice/shopping-lists/${selectedListForTransfer}`);
      const targetList = targetListResponse.data;
      console.log("targetList (destino):", targetList);

      // Verificar se o produto já existe na lista destino
      const existingItems =
        targetList.shoppingListItems?.filter((i: ShoppingListItem) => i.productId === selectedItem.productId) || [];

      // Se existem itens com o mesmo produto, verificar se o usuário quer adicionar ou criar novo
      if (existingItems.length > 0 && transferAddToExisting && transferSelectedItemToMerge) {
        // Adicionar à quantidade de um item existente
        const itemToMerge = existingItems.find((i: ShoppingListItem) => i.id === transferSelectedItemToMerge);

        if (itemToMerge) {
          // Atualizar a quantidade do item existente
          const currentItems =
            targetList.shoppingListItems?.map((i: ShoppingListItem) => {
              if (i.id === transferSelectedItemToMerge) {
                return {
                  productId: i.productId,
                  quantity: i.quantity + quantityToTransfer,
                  notes: i.notes || "",
                };
              }
              return {
                productId: i.productId,
                quantity: i.quantity,
                notes: i.notes || "",
              };
            }) || [];

          await api.put(`/invoice/shopping-lists/${selectedListForTransfer}`, {
            name: targetList.name,
            description: targetList.description,
            items: currentItems,
          });

          // Se o item transferido estava comprado, atualizar o status na lista destino
          if (wasPurchased && purchasedQuantity > 0) {
            // Buscar a lista atualizada
            const updatedTargetListResponse = await api.get(`/invoice/shopping-lists/${selectedListForTransfer}`);
            const updatedTargetList = updatedTargetListResponse.data;

            // Encontrar o item atualizado
            const mergedItem = updatedTargetList.shoppingListItems?.find(
              (i: ShoppingListItem) => i.id === transferSelectedItemToMerge
            );

            if (mergedItem) {
              // Atualizar quantidade comprada (somar com a quantidade comprada do item transferido)
              const newPurchasedQuantity = (mergedItem.receivedQuantity || 0) + purchasedQuantity;
              await api.patch("/invoice/shopping-lists/update-purchased-quantity", {
                itemId: mergedItem.id,
                purchasedQuantity: newPurchasedQuantity,
              });
            }
          }
        }
      } else {
        // Criar novo item separado
        const currentItems =
          targetList.shoppingListItems?.map((i: ShoppingListItem) => ({
            productId: i.productId,
            quantity: i.quantity,
            notes: i.notes || "",
          })) || [];

        // Quando duplicar item totalmente comprado, usar quantidade total, não apenas pendente
        const quantityForNewItem =
          transferMode === "duplicate" && isFullyPurchased ? quantityToTransfer : quantityToTransfer;

        currentItems.push({
          productId: selectedItem.productId,
          quantity: quantityForNewItem,
          notes: selectedItem.notes || "",
        });

        await api.put(`/invoice/shopping-lists/${selectedListForTransfer}`, {
          name: targetList.name,
          description: targetList.description,
          items: currentItems,
        });

        // Se o item estava comprado e foi criado novo item, atualizar o status na lista destino
        if (wasPurchased && purchasedQuantity > 0 && (!transferAddToExisting || !transferSelectedItemToMerge)) {
          // Buscar a lista atualizada para encontrar o item recém-criado
          const updatedTargetListResponse = await api.get(`/invoice/shopping-lists/${selectedListForTransfer}`);
          const updatedTargetList = updatedTargetListResponse.data;

          // Encontrar o item recém-criado pelo productId (o último pendente criado)
          const transferredItem = updatedTargetList.shoppingListItems?.find(
            (i: ShoppingListItem) =>
              i.productId === selectedItem.productId && i.status === "PENDING" && i.quantity === quantityToTransfer
          );

          if (transferredItem) {
            // Atualizar o item para manter o status de comprado
            await api.patch("/invoice/shopping-lists/update-purchased-quantity", {
              itemId: transferredItem.id,
              purchasedQuantity: purchasedQuantity,
            });
          }
        }
      }

      // Remover da lista origem apenas se transferindo tudo, ou atualizar quantidade
      const allListsResponse = await api.get("/invoice/shopping-lists");
      // Garantir que allLists seja sempre um array
      const allLists = Array.isArray(allListsResponse.data?.data)
        ? allListsResponse.data.data
        : Array.isArray(allListsResponse.data)
        ? allListsResponse.data
        : [];

      const sourceList = allLists.find((l: ShoppingList) => l.shoppingListItems?.some((i) => i.id === selectedItem.id));
      console.log("sourceList (origem):", sourceList);

      if (sourceList) {
        // Se modo é duplicar, não remover nem alterar o item original
        if (transferMode === "duplicate") {
          // Não fazer nada - item original permanece intacto
          console.log("Modo duplicar: item original mantido na lista origem");
        } else {
          // Modo transferir: remover ou atualizar quantidade na origem
          if (isFullyPurchased) {
            // Item totalmente comprado - deletar completamente ao transferir tudo
            await api.delete(`/invoice/shopping-lists/item/${selectedItem.id}`);
          } else if (quantityToTransfer >= pendingQuantity) {
            // Transferindo toda quantidade pendente - remover item OU atualizar quantidade se ainda tem comprado
            if (selectedItem.receivedQuantity > 0) {
              // Item parcialmente comprado - apenas reduzir quantidade (mantém receivedQuantity)
              const newQuantity = Number(selectedItem.receivedQuantity) || 0; // Manter apenas a quantidade comprada
              if (newQuantity > 0) {
                await api.patch(`/invoice/shopping-lists/item/${selectedItem.id}/quantity`, {
                  quantity: newQuantity,
                });
              } else {
                // Se não há quantidade comprada, deletar o item
                await api.delete(`/invoice/shopping-lists/item/${selectedItem.id}`);
              }
            } else {
              // Item totalmente pendente - deletar completamente
              await api.delete(`/invoice/shopping-lists/item/${selectedItem.id}`);
            }
          } else {
            // Transferindo parte da quantidade pendente - reduzir quantidade na origem
            const newQuantity = Number(selectedItem.quantity) - Number(quantityToTransfer);
            if (newQuantity > 0) {
              await api.patch(`/invoice/shopping-lists/item/${selectedItem.id}/quantity`, {
                quantity: newQuantity,
              });
            } else {
              // Se a nova quantidade seria zero ou negativa, deletar o item
              await api.delete(`/invoice/shopping-lists/item/${selectedItem.id}`);
            }
          }
        }
      }

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification:
          transferMode === "duplicate"
            ? wasPurchased
              ? "Item duplicado com sucesso! Status de comprado mantido."
              : "Item duplicado com sucesso!"
            : wasPurchased
            ? "Item transferido com sucesso! Status de comprado mantido."
            : "Item transferido com sucesso!",
      });

      setShowTransferModal(false);
      setSelectedListForTransfer("");
      setTransferQuantity("");
      setTransferAddToExisting(true);
      setTransferSelectedItemToMerge(null);
      setExistingItemsInTargetList([]);
      setTransferMode("transfer"); // Resetar para modo padrão
      setIsTransferring(false);
      await fetchData();
    } catch (error) {
      console.error("Erro ao transferir item:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao transferir item",
      });
      setIsTransferring(false);
    }
  };

  const handleViewPDF = async (listId: string, listName: string, onlyPending: boolean = false) => {
    try {
      const response = await api.get(`/invoice/shopping-lists/${listId}`);
      const shoppingList = response.data;

      let itemsToInclude = shoppingList.shoppingListItems || [];
      if (onlyPending) {
        itemsToInclude = itemsToInclude.filter((item: any) => item.status === "PENDING");
      }

      // Gerar HTML do PDF
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      doc.setFontSize(16);
      doc.setTextColor(40, 100, 40);
      doc.text(`Lista de Compras - ${shoppingList.name}${onlyPending ? " (Pendentes)" : ""}`, 105, 15, {
        align: "center",
        maxWidth: 180,
      });

      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`Data emissão: ${new Date().toLocaleDateString("pt-BR")}`, 15, 25);
      doc.text(`Criada em: ${new Date(shoppingList.createdAt).toLocaleDateString("pt-BR")}`, 15, 30);

      const statusCounts = {
        PENDING: itemsToInclude.filter((item: any) => item.status === "PENDING").length,
        PURCHASED: itemsToInclude.filter((item: any) => item.status === "PURCHASED").length,
        RECEIVED: itemsToInclude.filter((item: any) => item.status === "RECEIVED").length,
      };

      const totalItems = itemsToInclude.length;
      const statusText = `Pendentes: ${statusCounts.PENDING} | Comprados: ${
        statusCounts.PURCHASED + statusCounts.RECEIVED
      } | Total de Itens: ${totalItems}`;
      doc.text(statusText, 195, 25, { align: "right" });

      if (shoppingList.description) {
        doc.text(`Descrição: ${shoppingList.description}`, 105, 35, { align: "center" });
      }

      const statusMap = {
        PENDING: "Pendente",
        PURCHASED: "Comprado",
        RECEIVED: "Comprado",
      };

      const truncateText = (text: string, maxLength: number) => {
        if (text.length > maxLength) {
          return text.substring(0, maxLength - 3) + "...";
        }
        return text;
      };

      const tableData = itemsToInclude.map((item: any) => [
        truncateText(`${item.product.name} (${item.product.code})`, 35),
        item.quantity.toString(),
        item.receivedQuantity.toString(),
        truncateText(statusMap[item.status as keyof typeof statusMap] || item.status, 12),
      ]);

      const { autoTable } = await import("jspdf-autotable");
      autoTable(doc, {
        head: [["PRODUTO", "PEDIDO", "COMPRADO", "STATUS"]],
        body: tableData,
        startY: 45,
        styles: {
          fontSize: 8,
          cellPadding: 3,
          halign: "center",
        },
        headStyles: {
          fillColor: [229, 231, 235],
          textColor: 0,
          fontStyle: "bold",
          fontSize: 9,
          cellPadding: 4,
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [240, 249, 255],
        },
        columnStyles: {
          0: { halign: "left", cellWidth: 60, fontStyle: "bold" },
          1: { halign: "center", cellWidth: 30 },
          2: { halign: "center", cellWidth: 30 },
          3: { halign: "center", cellWidth: 30 },
        },
        margin: { left: 10, right: 10 },
      });

      // Converter para base64 para visualizar
      const pdfBlob = doc.output("blob");
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setPdfContent(base64data);
        setShowPdfModal(true);
        setShowOnlyPending(onlyPending);
      };
      reader.readAsDataURL(pdfBlob);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao gerar PDF",
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingList || !newList.name.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Nome da lista é obrigatório!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    try {
      setIsCreating(true);

      // Buscar lista atualizada para pegar itens comprados E pendentes
      const currentListResponse = await api.get(`/invoice/shopping-lists/${editingList.id}`);
      const currentList = currentListResponse.data;

      // CRÍTICO: Preservar TODOS os itens comprados (completos e parciais) com suas características únicas
      // Usar productId + quantity + receivedQuantity para identificar cada item único
      const purchasedItems: Array<{
        productId: string;
        quantity: number;
        notes: string;
        purchasedQuantity: number;
        purchasedStatus: string;
        originalId: string; // Guardar ID original para referência
        originalIndex: number; // Guardar índice original
      }> =
        currentList.shoppingListItems
          ?.filter((item: ShoppingListItem) => item.status === "PURCHASED" || item.status === "RECEIVED")
          .map((item: ShoppingListItem, index: number) => ({
            productId: item.productId,
            quantity: Number(item.quantity) || 0,
            notes: item.notes || "",
            // Manter informações de compra para restaurar depois
            purchasedQuantity: item.receivedQuantity || 0,
            purchasedStatus: item.status,
            originalId: item.id,
            originalIndex: index,
          })) || [];

      // Garantir que todos os itens tenham quantity como número
      // NÃO MESCLAR - manter todos os itens como estão (permitir duplicados)
      const validatedNewItems = newList.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity) || 0,
        notes: item.notes || "",
      }));

      // IMPORTANTE: NÃO remover itens pendentes que têm o mesmo productId de itens comprados
      // Porque podem ser itens diferentes (duplicados permitidos)
      // Apenas incluir os itens comprados na lista final junto com os novos itens

      // Converter purchasedItems para o formato esperado pela API (sem campos extras)
      const purchasedItemsForApi = purchasedItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
      }));

      // Combinar: itens da lista de edição (pendentes mantidos + novos) + comprados mantidos
      // PERMITIR DUPLICADOS - itens com mesmo productId podem coexistir
      const allItems = [...validatedNewItems, ...purchasedItemsForApi];

      // Validar que há pelo menos um item
      if (allItems.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "Atenção",
          text: "A lista deve conter pelo menos um produto!",
          confirmButtonText: "Ok",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
          },
        });
        setIsCreating(false);
        return;
      }

      console.log("Enviando atualização da lista:", {
        id: editingList.id,
        name: newList.name,
        description: newList.description,
        itemsCount: allItems.length,
        items: allItems,
        validatedNewItems: validatedNewItems,
        purchasedItemsForApi: purchasedItemsForApi,
        purchasedItemsCount: purchasedItems.length,
      });

      await api.put(`/invoice/shopping-lists/${editingList.id}`, {
        name: newList.name,
        description: newList.description || "",
        items: allItems,
      });

      // Restaurar status de comprado para os itens que já estavam comprados
      if (purchasedItems.length > 0) {
        // Buscar lista atualizada após a edição
        const updatedListResponse = await api.get(`/invoice/shopping-lists/${editingList.id}`);
        const updatedList = updatedListResponse.data;

        console.log("Restaurando itens comprados:", {
          purchasedItemsCount: purchasedItems.length,
          updatedListItemsCount: updatedList.shoppingListItems?.length || 0,
        });

        // Para cada item que estava comprado, restaurar o status usando características únicas
        const restorePromises: Promise<any>[] = [];
        const restoredItemIds = new Set<string>(); // Evitar restaurar o mesmo item duas vezes

        for (const purchasedItem of purchasedItems) {
          // CRÍTICO: Buscar pelo productId + quantity + receivedQuantity para identificar o item correto
          // Porque pode haver múltiplos itens do mesmo produto
          let updatedItem = updatedList.shoppingListItems?.find(
            (i: ShoppingListItem) =>
              !restoredItemIds.has(i.id) && // Não restaurar o mesmo item duas vezes
              i.productId === purchasedItem.productId &&
              i.quantity === purchasedItem.quantity &&
              (i.receivedQuantity || 0) === purchasedItem.purchasedQuantity
          );

          // Se não encontrou pela combinação exata, tentar apenas por productId + quantity
          // (caso o receivedQuantity ainda não tenha sido restaurado)
          if (!updatedItem) {
            // Buscar todos os itens candidatos (mesmo productId + quantity)
            const candidateItems =
              updatedList.shoppingListItems?.filter(
                (i: ShoppingListItem) =>
                  !restoredItemIds.has(i.id) &&
                  i.productId === purchasedItem.productId &&
                  i.quantity === purchasedItem.quantity &&
                  (i.receivedQuantity || 0) === 0 // Ainda não foi restaurado
              ) || [];

            // Se há apenas um candidato, usar ele
            // Se há múltiplos candidatos, usar o primeiro (a ordem pode variar após recriação)
            if (candidateItems.length > 0) {
              updatedItem = candidateItems[0];
            }
          }

          if (updatedItem && purchasedItem.purchasedQuantity > 0) {
            // Marcar como restaurado para evitar duplicatas
            restoredItemIds.add(updatedItem.id);

            console.log("Restaurando item comprado:", {
              originalId: purchasedItem.originalId,
              originalIndex: purchasedItem.originalIndex,
              newId: updatedItem.id,
              productId: purchasedItem.productId,
              quantity: purchasedItem.quantity,
              purchasedQuantity: purchasedItem.purchasedQuantity,
              status: purchasedItem.purchasedStatus,
            });

            restorePromises.push(
              api
                .patch("/invoice/shopping-lists/update-purchased-quantity", {
                  itemId: updatedItem.id,
                  purchasedQuantity: purchasedItem.purchasedQuantity,
                })
                .then(() => {
                  console.log(`✅ Item restaurado: ${updatedItem.id} (quantidade: ${purchasedItem.purchasedQuantity})`);
                })
                .catch((error) => {
                  console.warn(`❌ Erro ao restaurar status de compra para item ${updatedItem.id}:`, error);
                  // Remover do Set em caso de erro para permitir nova tentativa
                  restoredItemIds.delete(updatedItem.id);
                })
            );
          } else {
            console.warn("Item comprado não encontrado após edição:", {
              productId: purchasedItem.productId,
              quantity: purchasedItem.quantity,
              purchasedQuantity: purchasedItem.purchasedQuantity,
              status: purchasedItem.purchasedStatus,
              originalId: purchasedItem.originalId,
              availableItems: updatedList.shoppingListItems?.map((i: ShoppingListItem) => ({
                id: i.id,
                productId: i.productId,
                quantity: i.quantity,
                receivedQuantity: i.receivedQuantity,
                status: i.status,
                alreadyRestored: restoredItemIds.has(i.id),
              })),
            });
          }
        }

        // Aguardar todas as restaurações em paralelo
        await Promise.all(restorePromises);
        console.log(`✅ Restauração concluída: ${restorePromises.length} itens processados`);
      }

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "Lista atualizada com sucesso! Itens comprados mantidos.",
      });

      setNewList({
        name: "",
        description: "",
        items: [],
      });
      setEditingList(null);
      setIsEditing(null);

      await fetchData();
    } catch (error: any) {
      console.error("Erro ao atualizar lista:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Erro ao atualizar lista de compras";
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: errorMessage,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const addProductToList = () => {
    if (!selectedProductForAdd || !selectedProductForAdd.productId) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Selecione um produto primeiro!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    const quantityToAdd = selectedProductForAdd.quantity || 0;

    if (quantityToAdd <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "A quantidade deve ser maior que zero!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    // Verificar se já existe produto na lista atual (seja editando ou criando)
    const existingInList = newList.items.find((item) => item.productId === selectedProductForAdd.productId);

    // Se estamos editando, também verificar se existe na lista original (pendente)
    let existingPendingItem: ShoppingListItem | undefined;
    if (editingList) {
      existingPendingItem = editingList.shoppingListItems?.find(
        (item) => item.productId === selectedProductForAdd.productId && item.status === "PENDING"
      );
    }

    // Se existe na lista atual OU existe pendente na lista original, perguntar ao usuário
    if (existingInList || existingPendingItem) {
      if (addToExistingPending) {
        // Adicionar ao existente (somar quantidade)
        if (existingInList) {
          // Já está na lista de edição/criação - somar no item selecionado ou primeiro se não selecionado
          let targetIndex = selectedItemIndexToMerge;

          // Se não há seleção, usar o primeiro item do produto
          if (targetIndex === null || targetIndex < 0) {
            targetIndex = newList.items.findIndex((item) => item.productId === selectedProductForAdd.productId);
          }

          if (targetIndex >= 0 && targetIndex < newList.items.length) {
            setNewList((prev) => ({
              ...prev,
              items: prev.items.map((item, index) =>
                index === targetIndex ? { ...item, quantity: item.quantity + quantityToAdd } : item
              ),
            }));
          }
        } else if (existingPendingItem) {
          // Está pendente na lista original mas não está na lista de edição ainda
          // Adicionar à lista de edição com quantidade somada
          setNewList((prev) => ({
            ...prev,
            items: [
              ...prev.items,
              {
                productId: selectedProductForAdd.productId,
                quantity: existingPendingItem!.quantity + quantityToAdd,
                notes: existingPendingItem!.notes || "",
              },
            ],
          }));
        }
      } else {
        // Criar novo item (não somar) - permitir duplicado
        // IMPORTANTE: Se o item já está na lista de edição, manter ele E criar um novo
        // Se não está na lista mas existe pendente, criar novo sem remover o pendente
        console.log("Criando novo item duplicado:", {
          productId: selectedProductForAdd.productId,
          quantity: quantityToAdd,
          existingInList: existingInList ? { quantity: existingInList.quantity } : null,
          existingPendingItem: existingPendingItem ? { quantity: existingPendingItem.quantity } : null,
          currentItemsBefore: newList.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        });
        setNewList((prev) => {
          const newItems = [
            { productId: selectedProductForAdd.productId, quantity: quantityToAdd, notes: "" },
            ...prev.items,
          ];
          console.log("Itens após criar novo:", {
            total: newItems.length,
            items: newItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          });
          return {
            ...prev,
            items: newItems,
          };
        });
      }
    } else {
      // Produto não existe - verificar se está comprado (se editando)
      if (editingList) {
        const existingPurchasedItem = editingList.shoppingListItems?.find(
          (item) =>
            item.productId === selectedProductForAdd.productId &&
            (item.status === "PURCHASED" || item.status === "RECEIVED")
        );

        if (existingPurchasedItem) {
          // Produto já está comprado - criar novo item (não somar ao comprado)
          setNewList((prev) => ({
            ...prev,
            items: [{ productId: selectedProductForAdd.productId, quantity: quantityToAdd, notes: "" }, ...prev.items],
          }));
        } else {
          // Produto novo - adicionar normalmente
          setNewList((prev) => ({
            ...prev,
            items: [{ productId: selectedProductForAdd.productId, quantity: quantityToAdd, notes: "" }, ...prev.items],
          }));
        }
      } else {
        // Criando nova lista e produto não existe - adicionar normalmente
        setNewList((prev) => ({
          ...prev,
          items: [{ productId: selectedProductForAdd.productId, quantity: quantityToAdd, notes: "" }, ...prev.items],
        }));
      }
    }

    // Limpar seleção
    setSelectedProductForAdd(null);
    setQuantityInputValue("0");
    setAddToExistingPending(true); // Reset para próximo produto
    setSelectedItemIndexToMerge(null); // Reset seleção de item
  };

  const removeProductFromList = (index: number) => {
    setNewList((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateProductInList = (index: number, field: string, value: any) => {
    setNewList((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const increaseQuantity = (index: number) => {
    setNewList((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, quantity: (item.quantity || 0) + 1 } : item)),
    }));
  };

  const decreaseQuantity = (index: number) => {
    setNewList((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const newQuantity = Math.max(0, (item.quantity || 0) - 1);
          return { ...item, quantity: newQuantity };
        }
        return item;
      }),
    }));
  };

  // NOVO: Funções de Download - USANDO JSPDF COMO OS OUTROS
  const handleDownloadPDF = async (listId: string, listName: string, selectedItems?: any[]) => {
    try {
      // Buscar dados da lista
      const response = await api.get(`/invoice/shopping-lists/${listId}`);
      const shoppingList = response.data;

      // Filtrar itens se seleção específica foi fornecida
      const itemsToInclude = selectedItems
        ? shoppingList.shoppingListItems.filter((item: any) =>
            selectedItems.some((selected) => selected.id === item.id)
          )
        : shoppingList.shoppingListItems;

      // Criar PDF usando jsPDF (igual aos outros)
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Título PRINCIPAL melhor centralizado
      doc.setFontSize(16);
      doc.setTextColor(40, 100, 40);
      doc.text(`Lista de Compras - ${shoppingList.name}`, 105, 15, {
        align: "center",
        maxWidth: 180,
      });

      // Informações organizadas
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

      // Coluna esquerda
      doc.text(`Data emissão: ${new Date().toLocaleDateString("pt-BR")}`, 15, 25);
      doc.text(`Criada em: ${new Date(shoppingList.createdAt).toLocaleDateString("pt-BR")}`, 15, 30);

      // Status à direita
      const statusCounts = {
        PENDING: itemsToInclude.filter((item: any) => item.status === "PENDING").length,
        PURCHASED: itemsToInclude.filter((item: any) => item.status === "PURCHASED").length,
        RECEIVED: itemsToInclude.filter((item: any) => item.status === "RECEIVED").length,
      };

      const totalItems = itemsToInclude.length;
      const statusText = `Pendentes: ${statusCounts.PENDING} | Comprados: ${
        statusCounts.PURCHASED + statusCounts.RECEIVED
      } | Total de Itens: ${totalItems}`;
      doc.text(statusText, 195, 25, { align: "right" });

      // Descrição centralizada
      if (shoppingList.description) {
        doc.text(`Descrição: ${shoppingList.description}`, 105, 35, { align: "center" });
      }

      // Seleção parcial centralizada
      if (selectedItems && selectedItems.length < shoppingList.shoppingListItems.length) {
        doc.text(`Itens selecionados: ${selectedItems.length} de ${shoppingList.shoppingListItems.length}`, 105, 40, {
          align: "center",
        });
      }

      // Mapear status
      const statusMap = {
        PENDING: "Pendente",
        PURCHASED: "Comprado",
        RECEIVED: "Comprado",
      };

      // Função para truncar textos
      const truncateText = (text: string, maxLength: number) => {
        if (text.length > maxLength) {
          return text.substring(0, maxLength - 3) + "...";
        }
        return text;
      };

      // Preparar dados com truncagem - apenas Pedido e Comprado
      const tableData = itemsToInclude.map((item: any) => [
        truncateText(`${item.product.name} (${item.product.code})`, 50),
        item.quantity.toString(),
        (item.receivedQuantity || 0).toString(),
        truncateText(statusMap[item.status as keyof typeof statusMap] || item.status, 12),
      ]);

      // Tabela simplificada - apenas Pedido e Comprado
      const { autoTable } = await import("jspdf-autotable");
      autoTable(doc, {
        head: [["PRODUTO", "PEDIDO", "COMPRADO", "STATUS"]],
        body: tableData,
        startY: 45,
        styles: {
          fontSize: 8,
          cellPadding: 3,
          halign: "center",
        },
        headStyles: {
          fillColor: [229, 231, 235],
          textColor: 0,
          fontStyle: "bold",
          fontSize: 9,
          cellPadding: 4,
          halign: "center",
          valign: "middle",
        },
        alternateRowStyles: {
          fillColor: [240, 249, 255],
        },
        columnStyles: {
          0: {
            halign: "left",
            cellWidth: 70,
            fontStyle: "bold",
          },
          1: { halign: "center", cellWidth: 30 },
          2: { halign: "center", cellWidth: 30 },
          3: { halign: "center", cellWidth: 30 },
        },
        margin: { left: 10, right: 10 },

        tableWidth: "auto",
        showHead: "everyPage",
      });

      // Salvar PDF
      const fileName = `${listName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "PDF baixado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao baixar PDF:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao baixar PDF",
      });
    }
  };

  const handleDownloadExcel = async (listId: string, listName: string) => {
    try {
      const response = await api.get(`/invoice/shopping-lists/${listId}/download/excel`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${listName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "CSV baixado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao baixar CSV:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao baixar CSV",
      });
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "PENDING":
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: "⏳",
          label: "Pendente",
        };
      case "PURCHASED":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: "🛒",
          label: "Comprado",
        };
      case "RECEIVED":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: "✅",
          label: "Recebido",
        };
      case "PARTIALLY_PURCHASED":
        return {
          color: "bg-orange-100 text-orange-800 border-orange-200",
          icon: "🟠",
          label: "Pendente Parcial",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: "⚪",
          label: "Desconhecido",
        };
    }
  };

  // Filtrar produtos para busca

  // Componente de Tooltip Soberano (renderizado via Portal)
  const Tooltip = ({
    children,
    content,
    position = "top",
    maxWidth = "200px",
  }: {
    children: React.ReactNode;
    content: string;
    position?: "top" | "bottom" | "left" | "right";
    maxWidth?: string;
  }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const elementRef = useRef<HTMLDivElement>(null);

    const updateTooltipPosition = () => {
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        let top = 0;
        let left = 0;

        switch (position) {
          case "top":
            top = rect.top + scrollY - 8;
            left = rect.left + scrollX + rect.width / 2;
            break;
          case "bottom":
            top = rect.bottom + scrollY + 8;
            left = rect.left + scrollX + rect.width / 2;
            break;
          case "left":
            top = rect.top + scrollY + rect.height / 2;
            left = rect.left + scrollX - 8;
            break;
          case "right":
            top = rect.top + scrollY + rect.height / 2;
            left = rect.right + scrollX + 8;
            break;
        }

        setTooltipPosition({ top, left });
      }
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
      updateTooltipPosition();
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    useEffect(() => {
      if (isVisible) {
        updateTooltipPosition();
        const handleScroll = () => updateTooltipPosition();
        const handleResize = () => updateTooltipPosition();

        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("resize", handleResize);

        return () => {
          window.removeEventListener("scroll", handleScroll, true);
          window.removeEventListener("resize", handleResize);
        };
      }
    }, [isVisible, position]);

    const getTooltipStyle = (): React.CSSProperties => {
      const baseStyle: React.CSSProperties = {
        position: "fixed",
        zIndex: 99999,
        maxWidth,
        whiteSpace: "normal",
        wordWrap: "break-word",
        pointerEvents: "none",
        transform: "translateX(-50%)",
      };

      switch (position) {
        case "top":
          return {
            ...baseStyle,
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: "translate(-50%, -100%)",
            marginTop: "-8px",
          };
        case "bottom":
          return {
            ...baseStyle,
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: "translateX(-50%)",
            marginTop: "8px",
          };
        case "left":
          return {
            ...baseStyle,
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: "translate(-100%, -50%)",
            marginLeft: "-8px",
          };
        case "right":
          return {
            ...baseStyle,
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: "translateY(-50%)",
            marginLeft: "8px",
          };
        default:
          return baseStyle;
      }
    };

    const getArrowStyle = (): React.CSSProperties => {
      const baseStyle: React.CSSProperties = {
        position: "absolute",
        width: 0,
        height: 0,
      };

      switch (position) {
        case "top":
          return {
            ...baseStyle,
            bottom: "-6px",
            left: "50%",
            transform: "translateX(-50%)",
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "6px solid #111827",
          };
        case "bottom":
          return {
            ...baseStyle,
            top: "-6px",
            left: "50%",
            transform: "translateX(-50%)",
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderBottom: "6px solid #111827",
          };
        case "left":
          return {
            ...baseStyle,
            right: "-6px",
            top: "50%",
            transform: "translateY(-50%)",
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            borderLeft: "6px solid #111827",
          };
        case "right":
          return {
            ...baseStyle,
            left: "-6px",
            top: "50%",
            transform: "translateY(-50%)",
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            borderRight: "6px solid #111827",
          };
        default:
          return baseStyle;
      }
    };

    return (
      <>
        <div ref={elementRef} className="inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          {children}
        </div>
        {isVisible &&
          typeof document !== "undefined" &&
          createPortal(
            <div className="px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-xl" style={getTooltipStyle()}>
              <div className="text-center leading-relaxed">{content}</div>
              <div style={getArrowStyle()}></div>
            </div>,
            document.body
          )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando listas de compras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-blue-700 border-b pb-2">
          <ShoppingCart className="mr-2 inline" size={18} />
          Listas de Compras
          <Tooltip content="Sistema completo com controle de status e quantidades" position="bottom" maxWidth="180px">
            <HelpCircle className="ml-2 inline cursor-help text-blue-500 hover:text-blue-700" size={16} />
          </Tooltip>
        </h2>
        <div className="flex gap-2">
          <Tooltip content="Criar nova lista de compras" position="bottom" maxWidth="150px">
            <button
              onClick={() => setIsEditing("new")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
            >
              <Plus className="mr-2" size={16} />
              Nova Lista
            </button>
          </Tooltip>
          <Tooltip content="Ver histórico de listas deletadas" position="bottom" maxWidth="200px">
            <button
              onClick={async () => {
                setShowDeletedLists(true);
                await fetchDeletedLists();
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center"
            >
              <History className="mr-2" size={16} />
              Histórico Deletadas
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Formulário de Nova Lista / Edição */}
      {(isEditing === "new" || isEditing) && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium mb-4">
            {isEditing === "new" ? "Criar Nova Lista de Compras" : "Editar Lista de Compras"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Lista *</label>
              <input
                type="text"
                value={newList.name}
                onChange={(e) => setNewList((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Ex: Compras Janeiro 2025"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input
                type="text"
                value={newList.description}
                onChange={(e) => setNewList((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Descrição opcional"
              />
            </div>
          </div>

          {/* Produtos */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Adicionar Produto</label>

            {/* Campo de seleção de produto usando ProductSearchSelect - Tudo na mesma linha */}
            <div className="mb-3 p-3 bg-white rounded border">
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <ProductSearchSelect
                      products={products}
                      value={selectedProductForAdd?.productId || ""}
                      onChange={(productId: string) => {
                        if (productId) {
                          setSelectedProductForAdd({ productId, quantity: 0 });
                          setQuantityInputValue("0");
                          // Verificar se produto já existe como pendente quando selecionar
                          if (editingList) {
                            const existingPending = editingList.shoppingListItems?.find(
                              (item) => item.productId === productId && item.status === "PENDING"
                            );
                            const existingInEditList = newList.items.filter((item) => item.productId === productId);
                            // Se já existe pendente ou na lista de edição, mostrar opção de adicionar
                            setAddToExistingPending(existingPending !== undefined || existingInEditList.length > 0);
                            // Se há múltiplos itens, selecionar o primeiro por padrão
                            if (existingInEditList.length > 0) {
                              const firstIndex = newList.items.findIndex((item) => item.productId === productId);
                              setSelectedItemIndexToMerge(firstIndex >= 0 ? firstIndex : null);
                            } else {
                              setSelectedItemIndexToMerge(null);
                            }
                          } else {
                            // Nova lista - verificar se já está na lista atual
                            const existingInList = newList.items.filter((item) => item.productId === productId);
                            setAddToExistingPending(existingInList.length > 0);
                            // Se há múltiplos itens, selecionar o primeiro por padrão
                            if (existingInList.length > 0) {
                              const firstIndex = newList.items.findIndex((item) => item.productId === productId);
                              setSelectedItemIndexToMerge(firstIndex >= 0 ? firstIndex : null);
                            } else {
                              setSelectedItemIndexToMerge(null);
                            }
                          }
                        } else {
                          setSelectedProductForAdd(null);
                          setQuantityInputValue("0");
                          setAddToExistingPending(true);
                        }
                      }}
                      inline={true}
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qtd</label>
                  <input
                    type="text"
                    value={quantityInputValue}
                    onChange={(e) => {
                      // Permite apenas números e ponto decimal
                      const value = e.target.value.replace(/[^0-9.]/g, "");
                      setQuantityInputValue(value);

                      if (selectedProductForAdd) {
                        const numValue = parseFloat(value) || 0;
                        setSelectedProductForAdd({
                          ...selectedProductForAdd,
                          quantity: numValue,
                        });
                      }
                    }}
                    onFocus={(e) => {
                      // Seleciona todo o texto ao focar para facilitar substituição
                      e.target.select();
                    }}
                    className="w-24 border border-gray-300 rounded p-2"
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1 opacity-0">A</label>
                  <button
                    onClick={addProductToList}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded flex items-center"
                  >
                    <Plus size={14} className="mr-1" />
                    Adicionar
                  </button>
                </div>
                {selectedProductForAdd && (
                  <div className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 mb-1 opacity-0">A</label>
                    <button
                      onClick={() => {
                        setSelectedProductForAdd(null);
                        setQuantityInputValue("0");
                        setAddToExistingPending(true);
                        setSelectedItemIndexToMerge(null);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded flex items-center"
                    >
                      <X size={14} className="mr-1" />
                      Limpar
                    </button>
                  </div>
                )}
              </div>

              {/* Toggle para adicionar ao existente ou criar novo (sempre que produto já existe) */}
              {selectedProductForAdd &&
                (() => {
                  const existingInList = newList.items.find(
                    (item) => item.productId === selectedProductForAdd.productId
                  );
                  const existingPending = editingList?.shoppingListItems?.find(
                    (item) => item.productId === selectedProductForAdd.productId && item.status === "PENDING"
                  );
                  const existingPurchased = editingList?.shoppingListItems?.find(
                    (item) =>
                      item.productId === selectedProductForAdd.productId &&
                      (item.status === "PURCHASED" || item.status === "RECEIVED")
                  );

                  if (existingInList || existingPending) {
                    // Produto já existe na lista atual ou como pendente - mostrar toggle
                    const existingItemsInList = newList.items.filter(
                      (item) => item.productId === selectedProductForAdd.productId
                    );
                    const hasMultipleItems = existingItemsInList.length > 1;
                    const existingQuantity = existingInList?.quantity || existingPending?.quantity || 0;

                    return (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addToExistingPending}
                            onChange={(e) => {
                              setAddToExistingPending(e.target.checked);
                              if (!e.target.checked) {
                                setSelectedItemIndexToMerge(null);
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {addToExistingPending
                              ? hasMultipleItems
                                ? `✅ Adicionar ao item selecionado`
                                : `✅ Adicionar ao existente (${existingQuantity} unidades)`
                              : "➕ Criar novo item separado"}
                          </span>
                        </label>
                        {addToExistingPending && hasMultipleItems && (
                          <div className="mt-2 ml-6">
                            <p className="text-xs text-gray-600 mb-1">Selecione qual item modificar:</p>
                            <div className="space-y-1">
                              {existingItemsInList.map((item, idx) => {
                                // Encontrar o índice real na lista completa (encontrar a idx-ésima ocorrência)
                                let realIndex = -1;
                                let count = 0;
                                for (let i = 0; i < newList.items.length; i++) {
                                  if (newList.items[i].productId === item.productId) {
                                    if (count === idx) {
                                      realIndex = i;
                                      break;
                                    }
                                    count++;
                                  }
                                }

                                return (
                                  <label
                                    key={`${item.productId}-${idx}`}
                                    className="flex items-center gap-2 cursor-pointer p-1 hover:bg-yellow-100 rounded"
                                  >
                                    <input
                                      type="radio"
                                      name="selectedItemToMerge"
                                      checked={selectedItemIndexToMerge === realIndex}
                                      onChange={() => setSelectedItemIndexToMerge(realIndex)}
                                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-xs text-gray-700">
                                      Item {idx + 1}: {item.quantity} unidades
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1 ml-6">
                          {addToExistingPending
                            ? hasMultipleItems
                              ? selectedItemIndexToMerge !== null
                                ? `A quantidade será somada ao item selecionado`
                                : "Selecione um item acima para modificar"
                              : "A quantidade será somada ao item existente"
                            : "Será criado um novo item independente (permite duplicados)"}
                        </p>
                      </div>
                    );
                  } else if (existingPurchased) {
                    // Produto já está comprado - informar que será novo item
                    return (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-700">
                          ℹ️ Este produto já está comprado. Será criado um novo item pendente.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
            </div>

            {/* Lista de produtos adicionados */}
            {newList.items.length > 0 && (
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Produtos na Lista</label>
                {newList.items.map((item, index) => {
                  const product = products.find((p) => p.id === item.productId);
                  return (
                    <div key={index} className="flex gap-2 mb-2 p-2 bg-white rounded border items-center">
                      <div className="flex-1">
                        <span className="font-medium">{product?.name || "Produto não encontrado"}</span>
                        {product && <span className="text-sm text-gray-500 ml-2">({product.code})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decreaseQuantity(index)}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded flex items-center justify-center"
                          title="Diminuir quantidade"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-semibold text-blue-600 min-w-[3rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => increaseQuantity(index)}
                          className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded flex items-center justify-center"
                          title="Aumentar quantidade"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() => removeProductFromList(index)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded flex items-center justify-center"
                          title="Remover produto"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={isEditing === "new" ? handleCreateList : handleSaveEdit}
              disabled={isCreating}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
            >
              {isCreating
                ? isEditing === "new"
                  ? "Criando..."
                  : "Salvando..."
                : isEditing === "new"
                ? "Criar Lista"
                : "Salvar Alterações"}
            </button>
            <button
              onClick={() => {
                setIsEditing(null);
                setEditingList(null);
                setNewList({ name: "", description: "", items: [] });
                setSelectedProductForAdd(null);
                setQuantityInputValue("0");
                localStorage.removeItem("shopping-list-draft");
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="mb-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">🔍 Buscar</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value); // Atualiza apenas o input, sem buscar imediatamente
              }}
              placeholder="Buscar por nome ou descrição..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">📊 Status</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as "all" | "pendente" | "comprando" | "concluida");
                setCurrentPage(1); // Reset para primeira página ao filtrar
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.75rem center",
                paddingRight: "2.5rem",
              }}
            >
              <option value="all">Todas</option>
              <option value="pendente">Pendente</option>
              <option value="comprando">Comprando</option>
              <option value="concluida">Concluída</option>
            </select>
          </div>
        </div>
      </div>

      {/* Modal de Histórico de Listas Deletadas */}
      {showDeletedLists &&
        createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-4 flex-1">
                  <h3 className="text-xl font-semibold text-gray-800">📋 Histórico de Listas Deletadas</h3>
                  <button
                    onClick={handleDeleteAllDeletedHistory}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition-colors"
                  >
                    <Trash2 size={18} />
                    Apagar Histórico de Deletadas
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  {/* Botão de atualizar comentado - não funciona */}
                  {/* <button
                    onClick={async () => {
                      await fetchDeletedLists();
                    }}
                    className="text-blue-600 hover:text-blue-700 transition-colors px-3 py-1 rounded hover:bg-blue-50"
                    title="Atualizar lista"
                  >
                    <RefreshCw size={20} />
                  </button> */}
                  <button
                    onClick={() => {
                      setShowDeletedLists(false);
                      setDeletedLists([]);
                    }}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {(() => {
                  console.log("🎨 [Render] Renderizando modal, deletedLists.length:", deletedLists.length);
                  console.log("🎨 [Render] deletedLists:", deletedLists);
                  return null;
                })()}
                {deletedLists.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="mx-auto mb-4" size={48} />
                    <p className="font-semibold mb-2">Nenhuma lista deletada encontrada.</p>
                    <p className="text-sm mt-2 mb-4">Listas deletadas aparecerão aqui se tiverem backup disponível.</p>
                    <button
                      onClick={async () => {
                        console.log("🔄 [Botão] Atualizando lista de deletadas...");
                        await fetchDeletedLists();
                      }}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
                    >
                      <RefreshCw size={16} />
                      Atualizar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deletedLists.map((deletedList) => (
                      <div
                        key={deletedList.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 text-lg">{deletedList.name}</p>
                          {deletedList.description && (
                            <p className="text-sm text-gray-600 mt-1">{deletedList.description}</p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            <span>📦 {deletedList.itemsCount} itens</span>
                            <span>💾 {deletedList.totalVersions} versões de backup</span>
                            <span>🗓️ Apagada em: {new Date(deletedList.deletedAt).toLocaleString("pt-BR")}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRestoreDeletedList(deletedList.id, deletedList.name)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition-colors ml-4"
                        >
                          <RotateCcw size={18} />
                          Restaurar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => {
                    setShowDeletedLists(false);
                    setDeletedLists([]);
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Lista de Listas */}
      <div className="space-y-4">
        {shoppingLists.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="mx-auto mb-4" size={48} />
            <p>Nenhuma lista de compras encontrada.</p>
            <p className="text-sm">
              {searchTerm || filterStatus !== "all"
                ? "Tente ajustar os filtros de busca."
                : 'Clique em "Nova Lista" para começar!'}
            </p>
          </div>
        ) : (
          shoppingLists.map((list) => {
            const isExpanded = expandedLists.has(list.id);
            const toggleExpand = () => {
              setExpandedLists((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(list.id)) {
                  newSet.delete(list.id);
                } else {
                  newSet.add(list.id);
                }
                return newSet;
              });
            };

            return (
              <div
                key={list.id}
                className={`border rounded-lg ${
                  openManageMenu === list.id ? "overflow-visible" : "overflow-hidden"
                } transition-all duration-300 ${
                  list.status === "concluida"
                    ? "bg-green-50 border-green-200"
                    : list.status === "comprando"
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-white border-gray-200"
                }`}
              >
                {/* Header clicável */}
                <div
                  onClick={toggleExpand}
                  className={`p-4 cursor-pointer transition-all duration-200 flex justify-between items-start ${
                    isExpanded ? "bg-opacity-100" : "hover:bg-opacity-90"
                  }`}
                  style={{
                    backgroundColor:
                      list.status === "concluida"
                        ? "rgba(34, 197, 94, 0.1)"
                        : list.status === "comprando"
                        ? "rgba(234, 179, 8, 0.1)"
                        : "rgba(255, 255, 255, 0.5)",
                  }}
                >
                  <div className="flex-1 flex items-start gap-3">
                    <div className={`mt-1 transition-transform duration-300 ${isExpanded ? "rotate-0" : "-rotate-90"}`}>
                      <ChevronDown className="text-gray-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {editingListName === list.id ? (
                          <input
                            type="text"
                            value={editingListNameValue}
                            onChange={(e) => setEditingListNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveListName(list.id);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                handleCancelEditingListName();
                              }
                            }}
                            onBlur={() => handleSaveListName(list.id)}
                            autoFocus
                            className="text-lg font-semibold text-gray-800 bg-white border-2 border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h3
                            className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleStartEditingListName(list.id, list.name);
                            }}
                            title="Duplo clique para editar o nome"
                          >
                            {list.name}
                          </h3>
                        )}
                        {list.status === "concluida" && (
                          <span className="px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                            ✅ Concluída
                          </span>
                        )}
                        {list.status === "comprando" && (
                          <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full">
                            🛒 Comprando
                          </span>
                        )}
                        {list.status === "pendente" && (
                          <span className="px-2 py-1 bg-gray-400 text-white text-xs font-semibold rounded-full">
                            ⏳ Pendente
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Criada em: {new Date(list.createdAt).toLocaleDateString("pt-BR")}
                        {list.description && (
                          <span className="ml-2 text-gray-600">• Descrição: {list.description}</span>
                        )}
                        {list.completedAt && (
                          <span className="ml-2 text-green-600">
                            • Concluída em: {new Date(list.completedAt).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="relative manage-menu-container" onClick={(e) => e.stopPropagation()}>
                    <Tooltip content="Gerenciar lista" position="bottom" maxWidth="120px">
                      <button
                        ref={(el) => {
                          manageMenuButtonRefs.current[list.id] = el;
                        }}
                        onClick={() => {
                          if (openManageMenu === list.id) {
                            setOpenManageMenu(null);
                            setManageMenuPosition(null);
                          } else {
                            const button = manageMenuButtonRefs.current[list.id];
                            if (button) {
                              const rect = button.getBoundingClientRect();
                              setManageMenuPosition({
                                top: rect.bottom + window.scrollY + 4,
                                left: rect.right + window.scrollX - 200, // Ajusta para alinhar à direita
                              });
                            }
                            setOpenManageMenu(list.id);
                          }
                        }}
                        className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded text-sm flex items-center gap-2 font-semibold transition-colors"
                      >
                        <Settings size={16} />
                        Gerenciar
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${
                            openManageMenu === list.id ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </Tooltip>
                  </div>

                  {/* Menu Dropdown via Portal - Ordem Alfabética */}
                  {openManageMenu === list.id &&
                    manageMenuPosition &&
                    createPortal(
                      <div
                        data-manage-menu
                        className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] min-w-[200px] py-1"
                        style={{
                          top: `${manageMenuPosition.top}px`,
                          left: `${manageMenuPosition.left}px`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Backup */}
                        <button
                          onClick={() => {
                            handleCreateBackup(list.id, list.name);
                            setOpenManageMenu(null);
                            setManageMenuPosition(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"
                        >
                          <Save size={16} />
                          Backup
                        </button>

                        {/* Baixar CSV */}
                        <button
                          onClick={() => {
                            handleDownloadExcel(list.id, list.name);
                            setOpenManageMenu(null);
                            setManageMenuPosition(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"
                        >
                          <FileSpreadsheet size={16} />
                          Baixar CSV
                        </button>

                        {/* Baixar PDF */}
                        <button
                          onClick={() => {
                            handleDownloadPDF(list.id, list.name);
                            setOpenManageMenu(null);
                            setManageMenuPosition(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-2"
                        >
                          <Download size={16} />
                          Baixar PDF
                        </button>

                        {/* Duplicar */}
                        <button
                          onClick={() => {
                            handleDuplicateList(list.id, list.name);
                            setOpenManageMenu(null);
                            setManageMenuPosition(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2"
                        >
                          <Copy size={16} />
                          Duplicar
                        </button>

                        {/* Editar */}
                        <button
                          onClick={() => {
                            handleEditList(list);
                            setOpenManageMenu(null);
                            setManageMenuPosition(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                        >
                          <Edit size={16} />
                          Editar
                        </button>

                        {/* Excluir */}
                        <button
                          onClick={() => {
                            handleDeleteList(list.id);
                            setOpenManageMenu(null);
                            setManageMenuPosition(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-2"
                        >
                          <Trash2 size={16} />
                          Excluir
                        </button>

                        {/* Migrar - apenas para listas antigas */}
                        {(!list.shoppingListItems ||
                          list.shoppingListItems.length === 0 ||
                          list.name.includes("18/11") ||
                          list.name.includes("NOVOS 18/11")) && (
                          <button
                            onClick={() => {
                              handleMigrateList(list.id, list.name);
                              setOpenManageMenu(null);
                              setManageMenuPosition(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"
                          >
                            <RefreshCw size={16} />
                            Migrar
                          </button>
                        )}

                        {/* Restaurar */}
                        <button
                          onClick={() => {
                            handleRestoreBackup(list.id, list.name);
                            setOpenManageMenu(null);
                            setManageMenuPosition(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2"
                        >
                          <History size={16} />
                          Restaurar
                        </button>

                        {/* Ver PDF */}
                        <button
                          onClick={() => {
                            handleViewPDF(list.id, list.name, false);
                            setOpenManageMenu(null);
                            setManageMenuPosition(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2"
                        >
                          <FileText size={16} />
                          Ver PDF
                        </button>

                        {/* Ver Pendentes */}
                        <button
                          onClick={() => {
                            handleViewPDF(list.id, list.name, true);
                            setOpenManageMenu(null);
                            setManageMenuPosition(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 flex items-center gap-2"
                        >
                          <FileText size={16} />
                          Ver Pendentes
                        </button>
                      </div>,
                      document.body
                    )}
                </div>

                {/* Conteúdo colapsável */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-4 pb-4 pt-0 space-y-2">
                    {/* Itens Pendentes (não parciais) - em cima */}
                    {list.shoppingListItems
                      ?.filter(
                        (item) => item.status === "PENDING" && (!item.receivedQuantity || item.receivedQuantity === 0)
                      )
                      .map((item) => {
                        const statusInfo = getStatusInfo(item.status);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 rounded border bg-gray-50 border-gray-200"
                          >
                            {/* Status Badge */}
                            <Tooltip
                              content={`Status: ${statusInfo.label}. Use os botões para alterar`}
                              position="bottom"
                              maxWidth="140px"
                            >
                              <div className={`px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                                {statusInfo.icon} {statusInfo.label}
                              </div>
                            </Tooltip>

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.product.name}</span>
                                <span className="text-sm text-gray-500">({item.product.code})</span>
                                <span className="text-sm font-semibold text-blue-600">
                                  Pedido: {item.quantity}
                                  {item.receivedQuantity > 0 && (
                                    <span className="text-green-600"> / Comprado: {item.receivedQuantity}</span>
                                  )}
                                  {item.status === "PENDING" && item.receivedQuantity > 0 && (
                                    <span className="text-yellow-600">
                                      {" "}
                                      / Pendente: {item.quantity - item.receivedQuantity}
                                    </span>
                                  )}
                                  {item.status === "PENDING" &&
                                    (!item.receivedQuantity || item.receivedQuantity === 0) && (
                                      <span className="text-yellow-600"> / Pendente: {item.quantity}</span>
                                    )}
                                </span>
                              </div>
                              {item.notes && <p className="text-sm text-gray-600 mt-1">{item.notes}</p>}
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-1">
                              {item.status === "PENDING" && (
                                <>
                                  <Tooltip
                                    content="Informar quantidade comprada (pode comprar mais que pedido)"
                                    position="left"
                                    maxWidth="180px"
                                  >
                                    <button
                                      onClick={() => handleOpenPurchaseModal(item, list.id)}
                                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center"
                                    >
                                      🛒 Comprar
                                    </button>
                                  </Tooltip>
                                  <Tooltip content="Transferir para outra lista" position="left" maxWidth="140px">
                                    <button
                                      onClick={() => {
                                        setSelectedItem(item);
                                        // Inicializar quantidade de transferência como vazio (cliente não gosta de zero)
                                        setTransferQuantity("");
                                        setSelectedListForTransfer("");
                                        // Inicializar modo de transferência: se totalmente comprado, padrão é duplicar
                                        const isFullyPurchased = (item.receivedQuantity || 0) >= item.quantity;
                                        setTransferMode(isFullyPurchased ? "duplicate" : "transfer");
                                        setShowTransferModal(true);
                                      }}
                                      className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs flex items-center"
                                    >
                                      📦 Transferir
                                    </button>
                                  </Tooltip>
                                  <Tooltip content="Excluir item da lista" position="left" maxWidth="120px">
                                    <button
                                      onClick={async () => {
                                        const result = await Swal.fire({
                                          title: "Confirmar Exclusão",
                                          text: "Tem certeza que deseja excluir este item da lista?",
                                          icon: "warning",
                                          showCancelButton: true,
                                          confirmButtonColor: "#dc2626",
                                          cancelButtonColor: "#6b7280",
                                          confirmButtonText: "Sim, excluir!",
                                          cancelButtonText: "Cancelar",
                                          buttonsStyling: false,
                                          customClass: {
                                            confirmButton:
                                              "bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold mx-2",
                                            cancelButton:
                                              "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
                                          },
                                        });

                                        if (result.isConfirmed) {
                                          try {
                                            // PRESERVAR status e quantidades compradas ANTES de deletar
                                            const itemsToPreserve =
                                              list.shoppingListItems
                                                ?.filter((i) => i.id !== item.id)
                                                .map((i: ShoppingListItem) => ({
                                                  originalId: i.id,
                                                  productId: i.productId,
                                                  quantity: i.quantity,
                                                  status: i.status,
                                                  receivedQuantity: i.receivedQuantity || 0,
                                                })) || [];

                                            // Remover item da lista editando a lista
                                            const currentItems =
                                              list.shoppingListItems?.filter((i) => i.id !== item.id) || [];
                                            await api.put(`/invoice/shopping-lists/${list.id}`, {
                                              name: list.name,
                                              description: list.description,
                                              items: currentItems.map((i) => ({
                                                productId: i.productId,
                                                quantity: i.quantity,
                                                notes: i.notes,
                                              })),
                                            });

                                            // Buscar lista atualizada após deletar
                                            const updatedListResponse = await api.get(
                                              `/invoice/shopping-lists/${list.id}`
                                            );
                                            const updatedList = updatedListResponse.data;

                                            // Restaurar status e quantidades compradas de todos os itens que estavam comprados
                                            const restorePromises: Promise<any>[] = [];
                                            const restoredItemIds = new Set<string>();

                                            for (const preservedItem of itemsToPreserve) {
                                              // Apenas restaurar se estava comprado
                                              const wasPurchased =
                                                (preservedItem.status === "PURCHASED" ||
                                                  preservedItem.status === "RECEIVED") &&
                                                preservedItem.receivedQuantity > 0;

                                              if (wasPurchased) {
                                                // Buscar o item recriado por productId + quantity
                                                const restoredItem = updatedList.shoppingListItems?.find(
                                                  (i: ShoppingListItem) =>
                                                    !restoredItemIds.has(i.id) &&
                                                    i.productId === preservedItem.productId &&
                                                    i.quantity === preservedItem.quantity &&
                                                    (i.receivedQuantity || 0) === 0 // Ainda não foi restaurado
                                                );

                                                if (restoredItem) {
                                                  restoredItemIds.add(restoredItem.id);
                                                  restorePromises.push(
                                                    api
                                                      .patch("/invoice/shopping-lists/update-purchased-quantity", {
                                                        itemId: restoredItem.id,
                                                        purchasedQuantity: preservedItem.receivedQuantity,
                                                      })
                                                      .catch((error) => {
                                                        console.warn(
                                                          `❌ Erro ao restaurar status de compra para item ${restoredItem.id}:`,
                                                          error
                                                        );
                                                      })
                                                  );
                                                }
                                              }
                                            }

                                            // Aguardar todas as restaurações
                                            await Promise.allSettled(restorePromises);

                                            setOpenNotification({
                                              type: "success",
                                              title: "Sucesso!",
                                              notification: "Item excluído da lista!",
                                            });
                                            await fetchData();
                                          } catch (error) {
                                            console.error("Erro ao excluir item:", error);
                                            setOpenNotification({
                                              type: "error",
                                              title: "Erro!",
                                              notification: "Erro ao excluir item",
                                            });
                                          }
                                        }
                                      }}
                                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </Tooltip>
                                </>
                              )}
                              {(item.status === "PURCHASED" || item.status === "RECEIVED") && (
                                <>
                                  <Tooltip
                                    content={
                                      (item.receivedQuantity || 0) >= item.quantity
                                        ? "Compra completa! Use 'Desfazer' para alterar"
                                        : "Atualizar quantidade comprada"
                                    }
                                    position="left"
                                    maxWidth="160px"
                                  >
                                    <button
                                      onClick={() => handleOpenPurchaseModal(item, list.id)}
                                      disabled={(item.receivedQuantity || 0) >= item.quantity}
                                      className={`px-3 py-1 rounded text-xs flex items-center ${
                                        (item.receivedQuantity || 0) >= item.quantity
                                          ? "bg-gray-400 cursor-not-allowed text-white opacity-60"
                                          : "bg-blue-500 hover:bg-blue-600 text-white"
                                      }`}
                                    >
                                      🛒 Comprar
                                    </button>
                                  </Tooltip>
                                  <Tooltip
                                    content="Desfazer compra e voltar para pendente"
                                    position="left"
                                    maxWidth="180px"
                                  >
                                    <button
                                      onClick={() => handleUndoPurchase(item, list.id)}
                                      className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs flex items-center"
                                    >
                                      <RotateCcw size={14} className="mr-1" />
                                      Desfazer
                                    </button>
                                  </Tooltip>
                                  <Tooltip content="Excluir item da lista" position="left" maxWidth="120px">
                                    <button
                                      onClick={async () => {
                                        const result = await Swal.fire({
                                          title: "Confirmar Exclusão",
                                          text: "Tem certeza que deseja excluir este item da lista?",
                                          icon: "warning",
                                          showCancelButton: true,
                                          confirmButtonColor: "#dc2626",
                                          cancelButtonColor: "#6b7280",
                                          confirmButtonText: "Sim, excluir!",
                                          cancelButtonText: "Cancelar",
                                          buttonsStyling: false,
                                          customClass: {
                                            confirmButton:
                                              "bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold mx-2",
                                            cancelButton:
                                              "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
                                          },
                                        });

                                        if (result.isConfirmed) {
                                          try {
                                            // PRESERVAR status e quantidades compradas ANTES de deletar
                                            const itemsToPreserve =
                                              list.shoppingListItems
                                                ?.filter((i) => i.id !== item.id)
                                                .map((i: ShoppingListItem) => ({
                                                  originalId: i.id,
                                                  productId: i.productId,
                                                  quantity: i.quantity,
                                                  status: i.status,
                                                  receivedQuantity: i.receivedQuantity || 0,
                                                })) || [];

                                            // Remover item da lista editando a lista
                                            const currentItems =
                                              list.shoppingListItems?.filter((i) => i.id !== item.id) || [];
                                            await api.put(`/invoice/shopping-lists/${list.id}`, {
                                              name: list.name,
                                              description: list.description,
                                              items: currentItems.map((i) => ({
                                                productId: i.productId,
                                                quantity: i.quantity,
                                                notes: i.notes,
                                              })),
                                            });

                                            // Buscar lista atualizada após deletar
                                            const updatedListResponse = await api.get(
                                              `/invoice/shopping-lists/${list.id}`
                                            );
                                            const updatedList = updatedListResponse.data;

                                            // Restaurar status e quantidades compradas de todos os itens que estavam comprados
                                            const restorePromises: Promise<any>[] = [];
                                            const restoredItemIds = new Set<string>();

                                            for (const preservedItem of itemsToPreserve) {
                                              // Apenas restaurar se estava comprado
                                              const wasPurchased =
                                                (preservedItem.status === "PURCHASED" ||
                                                  preservedItem.status === "RECEIVED") &&
                                                preservedItem.receivedQuantity > 0;

                                              if (wasPurchased) {
                                                // Buscar o item recriado por productId + quantity
                                                const restoredItem = updatedList.shoppingListItems?.find(
                                                  (i: ShoppingListItem) =>
                                                    !restoredItemIds.has(i.id) &&
                                                    i.productId === preservedItem.productId &&
                                                    i.quantity === preservedItem.quantity &&
                                                    (i.receivedQuantity || 0) === 0 // Ainda não foi restaurado
                                                );

                                                if (restoredItem) {
                                                  restoredItemIds.add(restoredItem.id);
                                                  restorePromises.push(
                                                    api
                                                      .patch("/invoice/shopping-lists/update-purchased-quantity", {
                                                        itemId: restoredItem.id,
                                                        purchasedQuantity: preservedItem.receivedQuantity,
                                                      })
                                                      .catch((error) => {
                                                        console.warn(
                                                          `❌ Erro ao restaurar status de compra para item ${restoredItem.id}:`,
                                                          error
                                                        );
                                                      })
                                                  );
                                                }
                                              }
                                            }

                                            // Aguardar todas as restaurações
                                            await Promise.allSettled(restorePromises);

                                            setOpenNotification({
                                              type: "success",
                                              title: "Sucesso!",
                                              notification: "Item excluído da lista!",
                                            });
                                            await fetchData();
                                          } catch (error) {
                                            console.error("Erro ao excluir item:", error);
                                            setOpenNotification({
                                              type: "error",
                                              title: "Erro!",
                                              notification: "Erro ao excluir item",
                                            });
                                          }
                                        }
                                      }}
                                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {/* Itens Pendentes Parciais (no meio) */}
                    {list.shoppingListItems
                      ?.filter((item) => {
                        // Itens parcialmente comprados: têm quantidade comprada mas ainda não completaram
                        const hasPartialPurchase = item.receivedQuantity > 0 && item.receivedQuantity < item.quantity;
                        // Incluir tanto PENDING quanto PURCHASED que ainda não completaram
                        return hasPartialPurchase && (item.status === "PENDING" || item.status === "PURCHASED");
                      })
                      .map((item) => {
                        const statusInfo = getStatusInfo("PARTIALLY_PURCHASED"); // Usar o novo status
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 rounded border bg-orange-50 border-orange-200"
                          >
                            {/* Status Badge */}
                            <Tooltip
                              content={`Status: ${statusInfo.label}. Use os botões para alterar`}
                              position="bottom"
                              maxWidth="140px"
                            >
                              <div className={`px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                                {statusInfo.icon} {statusInfo.label}
                              </div>
                            </Tooltip>

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.product.name}</span>
                                <span className="text-sm text-gray-500">({item.product.code})</span>
                                <span className="text-sm font-semibold text-orange-600">
                                  Pedido: {item.quantity} / Comprado: {item.receivedQuantity} / Pendente:{" "}
                                  {item.quantity - item.receivedQuantity}
                                </span>
                              </div>
                              {item.notes && <p className="text-sm text-gray-600 mt-1">{item.notes}</p>}
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-1">
                              <Tooltip
                                content="Atualizar quantidade comprada (pode comprar mais que pedido)"
                                position="left"
                                maxWidth="180px"
                              >
                                <button
                                  onClick={() => handleOpenPurchaseModal(item, list.id)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center"
                                >
                                  🛒 Comprar
                                </button>
                              </Tooltip>
                              <Tooltip content="Transferir para outra lista" position="left" maxWidth="140px">
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    // Inicializar quantidade de transferência como vazio (cliente não gosta de zero)
                                    setTransferQuantity("");
                                    setSelectedListForTransfer("");
                                    setShowTransferModal(true);
                                  }}
                                  className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs flex items-center"
                                >
                                  📦 Transferir
                                </button>
                              </Tooltip>
                              <Tooltip content="Excluir item da lista" position="left" maxWidth="120px">
                                <button
                                  onClick={async () => {
                                    const result = await Swal.fire({
                                      title: "Confirmar Exclusão",
                                      text: "Tem certeza que deseja excluir este item da lista?",
                                      icon: "warning",
                                      showCancelButton: true,
                                      confirmButtonColor: "#dc2626",
                                      cancelButtonColor: "#6b7280",
                                      confirmButtonText: "Sim, excluir!",
                                      cancelButtonText: "Cancelar",
                                      buttonsStyling: false,
                                      customClass: {
                                        confirmButton:
                                          "bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold mx-2",
                                        cancelButton:
                                          "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
                                      },
                                    });

                                    if (result.isConfirmed) {
                                      try {
                                        // PRESERVAR status e quantidades compradas ANTES de deletar
                                        const itemsToPreserve =
                                          list.shoppingListItems
                                            ?.filter((i) => i.id !== item.id)
                                            .map((i: ShoppingListItem) => ({
                                              originalId: i.id,
                                              productId: i.productId,
                                              quantity: i.quantity,
                                              status: i.status,
                                              receivedQuantity: i.receivedQuantity || 0,
                                            })) || [];

                                        // Remover item da lista editando a lista
                                        const currentItems =
                                          list.shoppingListItems?.filter((i) => i.id !== item.id) || [];
                                        await api.put(`/invoice/shopping-lists/${list.id}`, {
                                          name: list.name,
                                          description: list.description,
                                          items: currentItems.map((i) => ({
                                            productId: i.productId,
                                            quantity: i.quantity,
                                            notes: i.notes,
                                          })),
                                        });

                                        // Buscar lista atualizada após deletar
                                        const updatedListResponse = await api.get(`/invoice/shopping-lists/${list.id}`);
                                        const updatedList = updatedListResponse.data;

                                        // Restaurar status e quantidades compradas de todos os itens que estavam comprados
                                        const restorePromises: Promise<any>[] = [];
                                        const restoredItemIds = new Set<string>();

                                        for (const preservedItem of itemsToPreserve) {
                                          // Apenas restaurar se estava comprado
                                          const wasPurchased =
                                            (preservedItem.status === "PURCHASED" ||
                                              preservedItem.status === "RECEIVED") &&
                                            preservedItem.receivedQuantity > 0;

                                          if (wasPurchased) {
                                            // Buscar o item recriado por productId + quantity
                                            const restoredItem = updatedList.shoppingListItems?.find(
                                              (i: ShoppingListItem) =>
                                                !restoredItemIds.has(i.id) &&
                                                i.productId === preservedItem.productId &&
                                                i.quantity === preservedItem.quantity &&
                                                (i.receivedQuantity || 0) === 0 // Ainda não foi restaurado
                                            );

                                            if (restoredItem) {
                                              restoredItemIds.add(restoredItem.id);
                                              restorePromises.push(
                                                api
                                                  .patch("/invoice/shopping-lists/update-purchased-quantity", {
                                                    itemId: restoredItem.id,
                                                    purchasedQuantity: preservedItem.receivedQuantity,
                                                  })
                                                  .catch((error) => {
                                                    console.warn(
                                                      `❌ Erro ao restaurar status de compra para item ${restoredItem.id}:`,
                                                      error
                                                    );
                                                  })
                                              );
                                            }
                                          }
                                        }

                                        // Aguardar todas as restaurações
                                        await Promise.allSettled(restorePromises);

                                        setOpenNotification({
                                          type: "success",
                                          title: "Sucesso!",
                                          notification: "Item excluído da lista!",
                                        });
                                        await fetchData();
                                      } catch (error) {
                                        console.error("Erro ao excluir item:", error);
                                        setOpenNotification({
                                          type: "error",
                                          title: "Erro!",
                                          notification: "Erro ao excluir item",
                                        });
                                      }
                                    }
                                  }}
                                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </Tooltip>
                            </div>
                          </div>
                        );
                      })}

                    {/* Itens Comprados (embaixo) - apenas os completamente comprados */}
                    {list.shoppingListItems
                      ?.filter((item) => {
                        // Apenas itens completamente comprados (status PURCHASED/RECEIVED E receivedQuantity >= quantity)
                        const isPurchasedOrReceived = item.status === "PURCHASED" || item.status === "RECEIVED";
                        const isFullyPurchased = (item.receivedQuantity || 0) >= item.quantity;
                        return isPurchasedOrReceived && isFullyPurchased;
                      })
                      .sort((a, b) => {
                        const dateA = a.purchasedAt
                          ? new Date(a.purchasedAt).getTime()
                          : a.createdAt
                          ? new Date(a.createdAt).getTime()
                          : 0;
                        const dateB = b.purchasedAt
                          ? new Date(b.purchasedAt).getTime()
                          : b.createdAt
                          ? new Date(b.createdAt).getTime()
                          : 0;
                        return dateA - dateB;
                      })
                      .map((item) => {
                        const statusInfo = getStatusInfo(item.status);
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-3 rounded border ${
                              item.status === "RECEIVED"
                                ? "bg-green-50 border-green-200"
                                : item.status === "PURCHASED"
                                ? "bg-blue-50 border-blue-200"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            {/* Status Badge */}
                            <Tooltip
                              content={`Status: ${statusInfo.label}. Use os botões para alterar`}
                              position="bottom"
                              maxWidth="140px"
                            >
                              <div className={`px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                                {statusInfo.icon} {statusInfo.label}
                              </div>
                            </Tooltip>

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.product.name}</span>
                                <span className="text-sm text-gray-500">({item.product.code})</span>
                                <span className="text-sm font-semibold text-blue-600">
                                  Pedido: {item.quantity}
                                  {item.receivedQuantity > 0 && (
                                    <span className="text-green-600"> / Comprado: {item.receivedQuantity}</span>
                                  )}
                                  {item.receivedQuantity > 0 && item.receivedQuantity < item.quantity && (
                                    <span className="text-yellow-600">
                                      {" "}
                                      / Pendente: {item.quantity - item.receivedQuantity}
                                    </span>
                                  )}
                                  {item.receivedQuantity > item.quantity && (
                                    <span className="text-purple-600"> ⚠️ (maior que pedido)</span>
                                  )}
                                </span>
                              </div>
                              {item.notes && <p className="text-sm text-gray-600 mt-1">{item.notes}</p>}
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-1">
                              <Tooltip
                                content={
                                  (item.receivedQuantity || 0) >= item.quantity
                                    ? "Compra completa! Use 'Desfazer' para alterar"
                                    : "Atualizar quantidade comprada"
                                }
                                position="left"
                                maxWidth="160px"
                              >
                                <button
                                  onClick={() => handleOpenPurchaseModal(item, list.id)}
                                  disabled={(item.receivedQuantity || 0) >= item.quantity}
                                  className={`px-3 py-1 rounded text-xs flex items-center ${
                                    (item.receivedQuantity || 0) >= item.quantity
                                      ? "bg-gray-400 cursor-not-allowed text-white opacity-60"
                                      : "bg-blue-500 hover:bg-blue-600 text-white"
                                  }`}
                                >
                                  🛒 Comprar
                                </button>
                              </Tooltip>
                              <Tooltip
                                content="Desfazer compra e voltar para pendente"
                                position="left"
                                maxWidth="180px"
                              >
                                <button
                                  onClick={() => handleUndoPurchase(item, list.id)}
                                  className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs flex items-center"
                                >
                                  <RotateCcw size={14} className="mr-1" />
                                  Desfazer
                                </button>
                              </Tooltip>
                              <Tooltip content="Transferir para outra lista" position="left" maxWidth="140px">
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    // Inicializar quantidade de transferência
                                    if (item.status === "PENDING") {
                                      const pendingQty = item.quantity - (item.receivedQuantity || 0);
                                      setTransferQuantity(pendingQty);
                                    } else {
                                      setTransferQuantity(item.quantity);
                                    }
                                    setSelectedListForTransfer("");
                                    setShowTransferModal(true);
                                  }}
                                  className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs flex items-center"
                                >
                                  📦 Transferir
                                </button>
                              </Tooltip>
                              <Tooltip content="Excluir item da lista" position="left" maxWidth="120px">
                                <button
                                  onClick={async () => {
                                    const result = await Swal.fire({
                                      title: "Confirmar Exclusão",
                                      text: "Tem certeza que deseja excluir este item da lista?",
                                      icon: "warning",
                                      showCancelButton: true,
                                      confirmButtonColor: "#dc2626",
                                      cancelButtonColor: "#6b7280",
                                      confirmButtonText: "Sim, excluir!",
                                      cancelButtonText: "Cancelar",
                                      buttonsStyling: false,
                                      customClass: {
                                        confirmButton:
                                          "bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold mx-2",
                                        cancelButton:
                                          "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
                                      },
                                    });

                                    if (result.isConfirmed) {
                                      try {
                                        // PRESERVAR status e quantidades compradas ANTES de deletar
                                        const itemsToPreserve =
                                          list.shoppingListItems
                                            ?.filter((i) => i.id !== item.id)
                                            .map((i: ShoppingListItem) => ({
                                              originalId: i.id,
                                              productId: i.productId,
                                              quantity: i.quantity,
                                              status: i.status,
                                              receivedQuantity: i.receivedQuantity || 0,
                                            })) || [];

                                        const currentItems =
                                          list.shoppingListItems?.filter((i) => i.id !== item.id) || [];
                                        await api.put(`/invoice/shopping-lists/${list.id}`, {
                                          name: list.name,
                                          description: list.description,
                                          items: currentItems.map((i) => ({
                                            productId: i.productId,
                                            quantity: i.quantity,
                                            notes: i.notes,
                                          })),
                                        });

                                        // Buscar lista atualizada após deletar
                                        const updatedListResponse = await api.get(`/invoice/shopping-lists/${list.id}`);
                                        const updatedList = updatedListResponse.data;

                                        // Restaurar status e quantidades compradas de todos os itens que estavam comprados
                                        const restorePromises: Promise<any>[] = [];
                                        const restoredItemIds = new Set<string>();

                                        for (const preservedItem of itemsToPreserve) {
                                          // Apenas restaurar se estava comprado
                                          const wasPurchased =
                                            (preservedItem.status === "PURCHASED" ||
                                              preservedItem.status === "RECEIVED") &&
                                            preservedItem.receivedQuantity > 0;

                                          if (wasPurchased) {
                                            // Buscar o item recriado por productId + quantity
                                            const restoredItem = updatedList.shoppingListItems?.find(
                                              (i: ShoppingListItem) =>
                                                !restoredItemIds.has(i.id) &&
                                                i.productId === preservedItem.productId &&
                                                i.quantity === preservedItem.quantity &&
                                                (i.receivedQuantity || 0) === 0 // Ainda não foi restaurado
                                            );

                                            if (restoredItem) {
                                              restoredItemIds.add(restoredItem.id);
                                              restorePromises.push(
                                                api
                                                  .patch("/invoice/shopping-lists/update-purchased-quantity", {
                                                    itemId: restoredItem.id,
                                                    purchasedQuantity: preservedItem.receivedQuantity,
                                                  })
                                                  .catch((error) => {
                                                    console.warn(
                                                      `❌ Erro ao restaurar status de compra para item ${restoredItem.id}:`,
                                                      error
                                                    );
                                                  })
                                              );
                                            }
                                          }
                                        }

                                        // Aguardar todas as restaurações
                                        await Promise.allSettled(restorePromises);

                                        setOpenNotification({
                                          type: "success",
                                          title: "Sucesso!",
                                          notification: "Item excluído da lista!",
                                        });
                                        await fetchData();
                                      } catch (error) {
                                        console.error("Erro ao excluir item:", error);
                                        setOpenNotification({
                                          type: "error",
                                          title: "Erro!",
                                          notification: "Erro ao excluir item",
                                        });
                                      }
                                    }
                                  }}
                                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </Tooltip>
                            </div>
                          </div>
                        );
                      })}

                    {/* Resumo */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>
                          Total de produtos:{" "}
                          {list.shoppingListItems?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                        </span>
                        <div className="flex gap-4">
                          <span className="text-yellow-600">
                            ⏳ Pendentes:{" "}
                            {list.shoppingListItems
                              ?.filter((item) => item.status === "PENDING")
                              .reduce((sum, item) => sum + item.quantity, 0) || 0}
                          </span>
                          <span className="text-blue-600">
                            🛒 Comprados:{" "}
                            {list.shoppingListItems
                              ?.filter((item) => item.status === "PURCHASED" || item.status === "RECEIVED")
                              .reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-700">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, totalItems)} de{" "}
              {totalItems} listas
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded ${
                  currentPage === 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                Anterior
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded ${
                  currentPage === totalPages
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Simplificado de Quantidade Comprada */}
      {showPurchaseModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              🛒 Informar Quantidade Comprada - {selectedItem.product.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📦 Quantidade Pedida (Original)</label>
                <input
                  type="number"
                  value={selectedItem.quantity}
                  disabled
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Pedido original: {selectedItem.quantity} unidades</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ✅ Quantidade que Conseguimos Comprar
                </label>
                <input
                  type="number"
                  value={
                    (typeof purchasedQuantity === "string"
                      ? purchasedQuantity === ""
                        ? 0
                        : parseFloat(purchasedQuantity)
                      : purchasedQuantity) +
                      (typeof additionalQuantity === "string"
                        ? additionalQuantity === ""
                          ? 0
                          : parseFloat(additionalQuantity)
                        : additionalQuantity) || ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    // Permitir campo vazio
                    if (value === "") {
                      const purchasedQty =
                        typeof purchasedQuantity === "string"
                          ? purchasedQuantity === ""
                            ? 0
                            : parseFloat(purchasedQuantity)
                          : purchasedQuantity;
                      setAdditionalQuantity(-purchasedQty); // Zerar o adicional quando campo está vazio
                      setUpdateOrderedQuantity(false);
                      return;
                    }
                    // Remover caracteres não numéricos
                    const cleanValue = value.replace(/[^0-9.]/g, "");
                    if (cleanValue === "") {
                      const purchasedQty =
                        typeof purchasedQuantity === "string"
                          ? purchasedQuantity === ""
                            ? 0
                            : parseFloat(purchasedQuantity)
                          : purchasedQuantity;
                      setAdditionalQuantity(-purchasedQty);
                      setUpdateOrderedQuantity(false);
                      return;
                    }
                    const totalQty = parseFloat(cleanValue) || 0;
                    const purchasedQty =
                      typeof purchasedQuantity === "string"
                        ? purchasedQuantity === ""
                          ? 0
                          : parseFloat(purchasedQuantity)
                        : purchasedQuantity;
                    // Calcular quantidade adicional (pode ser negativa se o usuário quiser corrigir)
                    const newAdditional = totalQty - purchasedQty;
                    setAdditionalQuantity(newAdditional);
                    // Resetar opção de atualizar quando mudar quantidade
                    setUpdateOrderedQuantity(false);
                  }}
                  onFocus={(e) => {
                    // Selecionar todo o texto ao focar para facilitar substituição
                    e.target.select();
                  }}
                  className="w-full border border-gray-300 rounded-md p-2"
                  min="0"
                  placeholder="Digite a quantidade total comprada"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Você pode colocar uma quantidade maior ou menor que a pedida. Digite o valor total que foi comprado.
                </p>
              </div>

              {/* Opção para atualizar quantidade pedida quando comprar menos */}
              {toNumber(purchasedQuantity) + toNumber(additionalQuantity) < selectedItem.quantity && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <label
                    className={`flex items-start gap-2 ${
                      toNumber(purchasedQuantity) + toNumber(additionalQuantity) < 1
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={updateOrderedQuantity}
                      disabled={toNumber(purchasedQuantity) + toNumber(additionalQuantity) < 1}
                      onChange={(e) => {
                        if (toNumber(purchasedQuantity) + toNumber(additionalQuantity) >= 1) {
                          setUpdateOrderedQuantity(e.target.checked);
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700 block">
                        Atualizar quantidade pedida de {selectedItem.quantity} para{" "}
                        {toNumber(purchasedQuantity) + toNumber(additionalQuantity)}
                      </span>
                      {toNumber(purchasedQuantity) + toNumber(additionalQuantity) < 1 ? (
                        <p className="text-xs text-red-600 mt-1 font-semibold">
                          ⚠️ Não é possível atualizar a quantidade pedida para zero! O mínimo é 1 unidade.
                        </p>
                      ) : (
                        <p className="text-xs text-gray-600 mt-1">
                          Se marcado: O pedido será atualizado para{" "}
                          {toNumber(purchasedQuantity) + toNumber(additionalQuantity)} unidades e não ficará nada
                          pendente.
                          <br />
                          Se desmarcado: O pedido original de {selectedItem.quantity} será mantido e ficarão{" "}
                          {selectedItem.quantity - (toNumber(purchasedQuantity) + toNumber(additionalQuantity))}{" "}
                          unidades pendentes.
                        </p>
                      )}
                    </div>
                  </label>
                </div>
              )}

              {/* Informação quando comprar mais que pedido */}
              {toNumber(purchasedQuantity) + toNumber(additionalQuantity) > selectedItem.quantity && (
                <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 text-lg">ℹ️</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-800 mb-1">Quantidade maior que pedido</p>
                      <p className="text-xs text-purple-700">
                        O pedido será automaticamente atualizado de <strong>{selectedItem.quantity}</strong> para{" "}
                        <strong>{toNumber(purchasedQuantity) + toNumber(additionalQuantity)}</strong> unidades para
                        acompanhar a compra.
                        <br />
                        <span className="text-purple-600 mt-1 block">
                          📝 Pedido original era {selectedItem.quantity} unidades.
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">📊 Resumo:</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pedido original:</span>
                    <span className="font-semibold">{selectedItem.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Será comprado:</span>
                    <span className="font-semibold text-blue-600">
                      {toNumber(purchasedQuantity) + toNumber(additionalQuantity)}
                    </span>
                  </div>
                  {toNumber(purchasedQuantity) + toNumber(additionalQuantity) < selectedItem.quantity && (
                    <div className="flex justify-between">
                      <span className="text-yellow-600">Ficará pendente:</span>
                      <span className="font-semibold text-yellow-600">
                        {selectedItem.quantity - (toNumber(purchasedQuantity) + toNumber(additionalQuantity))}
                      </span>
                    </div>
                  )}
                  {toNumber(purchasedQuantity) + toNumber(additionalQuantity) > selectedItem.quantity && (
                    <div className="flex justify-between">
                      <span className="text-purple-600">Diferença (+):</span>
                      <span className="font-semibold text-purple-600">
                        +{toNumber(purchasedQuantity) + toNumber(additionalQuantity) - selectedItem.quantity}
                      </span>
                    </div>
                  )}
                  {updateOrderedQuantity &&
                    toNumber(purchasedQuantity) + toNumber(additionalQuantity) < selectedItem.quantity && (
                      <div className="mt-2 pt-2 border-t border-blue-300">
                        <div className="flex justify-between">
                          <span className="text-green-600 font-medium">Novo pedido será:</span>
                          <span className="font-bold text-green-600">
                            {toNumber(purchasedQuantity) + toNumber(additionalQuantity)}
                          </span>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => handleSavePurchasedQuantity(false)}
                disabled={toNumber(purchasedQuantity) + toNumber(additionalQuantity) === 0}
                className={`px-4 py-2 rounded flex-1 ${
                  toNumber(purchasedQuantity) + toNumber(additionalQuantity) === 0
                    ? "bg-gray-400 cursor-not-allowed text-white opacity-60"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                💾 Confirmar Compra
              </button>
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  setPurchasedQuantity(0);
                  setAdditionalQuantity(0);
                  setUpdateOrderedQuantity(false);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transferência */}
      {showTransferModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">📦 Transferir Item - {selectedItem.product.name}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecione a lista destino</label>
                <select
                  value={selectedListForTransfer}
                  onChange={async (e) => {
                    const listId = e.target.value;
                    setSelectedListForTransfer(listId);
                    // Resetar opções de merge
                    setTransferAddToExisting(true);
                    setTransferSelectedItemToMerge(null);
                    setExistingItemsInTargetList([]);

                    // Resetar quantidade ao trocar de lista (deixar vazio)
                    setTransferQuantity("");

                    // Resetar modo de transferência ao trocar de lista
                    const isFullyPurchased = selectedItem.receivedQuantity >= selectedItem.quantity;
                    setTransferMode(isFullyPurchased ? "duplicate" : "transfer");

                    // Verificar se há itens com o mesmo produto na lista destino
                    if (listId) {
                      try {
                        const targetListResponse = await api.get(`/invoice/shopping-lists/${listId}`);
                        const targetList = targetListResponse.data;
                        const existingItems =
                          targetList.shoppingListItems?.filter(
                            (i: ShoppingListItem) => i.productId === selectedItem.productId
                          ) || [];

                        setExistingItemsInTargetList(existingItems);

                        // Se há apenas um item existente, selecionar automaticamente
                        if (existingItems.length === 1) {
                          setTransferSelectedItemToMerge(existingItems[0].id);
                        }
                      } catch (error) {
                        console.error("Erro ao verificar itens existentes:", error);
                      }
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  <option value="">Selecione uma lista...</option>
                  {shoppingLists
                    .filter((list) => {
                      // Não mostrar a lista de origem (onde o item está atualmente)
                      const isSourceList = list.shoppingListItems?.some((i) => i.id === selectedItem.id);
                      return !isSourceList && list.id !== editingList?.id && !list.completed;
                    })
                    .map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Mostrar opção de quantidade apenas para itens pendentes */}
              {selectedItem.status === "PENDING" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade a Transferir (dos que faltam)
                  </label>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-2">
                    <div className="text-sm text-gray-700">
                      <div>Pedido: {selectedItem.quantity}</div>
                      <div>Comprado: {selectedItem.receivedQuantity || 0}</div>
                      <div className="font-semibold text-yellow-700">
                        Pendente: {selectedItem.quantity - (selectedItem.receivedQuantity || 0)}
                      </div>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={transferQuantity === "" ? "" : transferQuantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Permitir campo vazio
                      if (value === "") {
                        setTransferQuantity("");
                        return;
                      }
                      // Remover caracteres não numéricos
                      const cleanValue = value.replace(/[^0-9.]/g, "");
                      if (cleanValue === "") {
                        setTransferQuantity("");
                        return;
                      }
                      const qty = parseFloat(cleanValue);
                      if (!isNaN(qty) && qty > 0) {
                        const maxQty = selectedItem.quantity - (selectedItem.receivedQuantity || 0);
                        setTransferQuantity(Math.min(qty, maxQty));
                      }
                    }}
                    min="1"
                    max={selectedItem.quantity - (selectedItem.receivedQuantity || 0)}
                    className="w-full border border-gray-300 rounded-md p-2"
                    placeholder="Digite a quantidade"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo: {selectedItem.quantity - (selectedItem.receivedQuantity || 0)} unidades pendentes
                  </p>
                </div>
              )}

              {selectedItem.status !== "PENDING" && (
                <div>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-2">
                    <div className="text-sm text-gray-700">
                      <div>Quantidade total: {selectedItem.quantity}</div>
                      {selectedItem.receivedQuantity > 0 && (
                        <div className="text-green-600">Comprado: {selectedItem.receivedQuantity}</div>
                      )}
                      <p className="text-xs text-blue-600 mt-1 font-semibold">
                        O item será transferido mantendo o status de comprado.
                      </p>
                    </div>
                  </div>

                  {/* Opção de Transferir ou Duplicar quando totalmente comprado */}
                  {selectedItem.receivedQuantity >= selectedItem.quantity && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-2">
                      <p className="text-sm font-medium text-yellow-800 mb-2">Escolha o modo de transferência:</p>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="transferMode"
                            value="transfer"
                            checked={transferMode === "transfer"}
                            onChange={() => setTransferMode("transfer")}
                            className="text-blue-600"
                          />
                          <span className="text-sm text-gray-700">
                            <strong>Transferir</strong> - Remove da lista atual e adiciona na lista destino
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="transferMode"
                            value="duplicate"
                            checked={transferMode === "duplicate"}
                            onChange={() => setTransferMode("duplicate")}
                            className="text-blue-600"
                          />
                          <span className="text-sm text-gray-700">
                            <strong>Duplicar</strong> - Mantém na lista atual e cria uma cópia na lista destino
                          </span>
                        </label>
                      </div>
                      <p className="text-xs text-yellow-700 mt-2 font-semibold">
                        ⚠️ Item totalmente comprado será transferido/duplicado completamente ({selectedItem.quantity}{" "}
                        unidades).
                      </p>
                    </div>
                  )}

                  {/* Input de quantidade apenas para itens parcialmente comprados */}
                  {selectedItem.receivedQuantity < selectedItem.quantity && (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade a Transferir</label>
                      <input
                        type="number"
                        value={transferQuantity === "" ? "" : transferQuantity}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Permitir campo vazio
                          if (value === "") {
                            setTransferQuantity("");
                            return;
                          }
                          // Remover caracteres não numéricos
                          const cleanValue = value.replace(/[^0-9.]/g, "");
                          if (cleanValue === "") {
                            setTransferQuantity("");
                            return;
                          }
                          const qty = parseFloat(cleanValue);
                          if (!isNaN(qty) && qty > 0) {
                            const pendingQty = selectedItem.quantity - (selectedItem.receivedQuantity || 0);
                            setTransferQuantity(Math.min(qty, pendingQty));
                          }
                        }}
                        min="1"
                        max={selectedItem.quantity - (selectedItem.receivedQuantity || 0)}
                        className="w-full border border-gray-300 rounded-md p-2"
                        placeholder="Digite a quantidade"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Máximo: {selectedItem.quantity - (selectedItem.receivedQuantity || 0)} unidades pendentes
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Opções quando há itens existentes com o mesmo produto */}
              {selectedListForTransfer && existingItemsInTargetList.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                  <p className="text-sm font-medium text-purple-800 mb-3">
                    ⚠️ Este produto já existe na lista destino!
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-start">
                      <input
                        type="radio"
                        id="transfer-add-existing"
                        checked={transferAddToExisting}
                        onChange={() => {
                          setTransferAddToExisting(true);
                          // Selecionar automaticamente se há apenas um item
                          if (existingItemsInTargetList.length === 1) {
                            setTransferSelectedItemToMerge(existingItemsInTargetList[0].id);
                          }
                        }}
                        className="mt-1 h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      <label htmlFor="transfer-add-existing" className="ml-2 text-sm text-gray-700 flex-1">
                        <span className="font-medium">Adicionar à quantidade de um item existente</span>
                        <p className="text-xs text-gray-500 mt-1">A quantidade será somada a um dos itens existentes</p>
                      </label>
                    </div>

                    {transferAddToExisting && (
                      <div className="ml-6 space-y-2">
                        {existingItemsInTargetList.map((item: ShoppingListItem) => (
                          <div key={item.id} className="flex items-center">
                            <input
                              type="radio"
                              id={`transfer-item-${item.id}`}
                              name="transfer-item-select"
                              checked={transferSelectedItemToMerge === item.id}
                              onChange={() => setTransferSelectedItemToMerge(item.id)}
                              className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                            />
                            <label htmlFor={`transfer-item-${item.id}`} className="ml-2 text-sm text-gray-700">
                              <span className="font-medium">
                                Item: Pedido {item.quantity} /
                                {item.status === "PURCHASED" || item.status === "RECEIVED" ? (
                                  <span className="text-green-600"> Comprado {item.receivedQuantity || 0}</span>
                                ) : (
                                  <span className="text-yellow-600">
                                    {" "}
                                    Pendente {item.quantity - (item.receivedQuantity || 0)}
                                  </span>
                                )}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-start">
                      <input
                        type="radio"
                        id="transfer-create-new"
                        checked={!transferAddToExisting}
                        onChange={() => {
                          setTransferAddToExisting(false);
                          setTransferSelectedItemToMerge(null);
                        }}
                        className="mt-1 h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      <label htmlFor="transfer-create-new" className="ml-2 text-sm text-gray-700 flex-1">
                        <span className="font-medium">Criar um novo item separado</span>
                        <p className="text-xs text-gray-500 mt-1">
                          Será criado um novo item na lista, mesmo com produto duplicado
                        </p>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleTransferItem}
                disabled={
                  !selectedListForTransfer ||
                  isTransferring ||
                  (existingItemsInTargetList.length > 0 && transferAddToExisting && !transferSelectedItemToMerge)
                }
                className={`px-4 py-2 rounded flex-1 ${
                  selectedListForTransfer &&
                  !isTransferring &&
                  (existingItemsInTargetList.length === 0 || !transferAddToExisting || transferSelectedItemToMerge)
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isTransferring ? "⏳ Transferindo..." : "✅ Confirmar Transferência"}
              </button>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedItem(null);
                  setSelectedListForTransfer("");
                  setTransferQuantity("");
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de PDF */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                📄 Visualização de PDF {showOnlyPending && "(Apenas Pendentes)"}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = pdfContent;
                    link.download = `lista_${Date.now()}.pdf`;
                    link.click();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                >
                  <Download size={14} className="inline mr-1" />
                  Baixar
                </button>
                <button
                  onClick={() => {
                    setShowPdfModal(false);
                    setPdfContent("");
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
                >
                  ❌ Fechar
                </button>
              </div>
            </div>
            <iframe src={pdfContent} className="w-full h-[70vh] border border-gray-300 rounded" title="PDF Viewer" />
          </div>
        </div>
      )}

      {/* Modal de Quantidades */}
      {showQuantityModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">📊 Gerenciar Quantidades - {selectedItem.product.name}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📦 Quantidade Pedida</label>
                <input
                  type="number"
                  value={quantityDetails.ordered}
                  disabled
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">✅ Quantidade Recebida</label>
                <input
                  type="number"
                  value={quantityDetails.received}
                  onChange={(e) => {
                    // CORREÇÃO: Aceitar apenas números válidos
                    const value = e.target.value.replace(/[^0-9.]/g, ""); // Remove caracteres não numéricos
                    const received = parseFloat(value) || 0;
                    const final = received - quantityDetails.returned;

                    setQuantityDetails((prev) => ({
                      ...prev,
                      received,
                      final,
                    }));
                  }}
                  className="w-full border border-gray-300 rounded-md p-2"
                  min="0"
                  max={quantityDetails.ordered}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">❌ Quantidade com Defeito</label>
                <input
                  type="number"
                  value={quantityDetails.defective}
                  onChange={(e) => {
                    // CORREÇÃO: Aceitar apenas números válidos
                    const value = e.target.value.replace(/[^0-9.]/g, "");
                    const defective = parseFloat(value) || 0;

                    // VALIDAÇÃO: Defeito não pode ser maior que recebido
                    const maxDefective = quantityDetails.received;
                    const validDefective = defective > maxDefective ? maxDefective : defective;
                    const final = quantityDetails.received - quantityDetails.returned;

                    setQuantityDetails((prev) => ({
                      ...prev,
                      defective: validDefective,
                      final,
                    }));
                  }}
                  className={`w-full border rounded-md p-2 ${
                    quantityDetails.defective > quantityDetails.received
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  min="0"
                  max={quantityDetails.received}
                />
                <p
                  className={`text-xs mt-1 ${
                    quantityDetails.defective > quantityDetails.received
                      ? "text-red-500 font-semibold"
                      : "text-gray-500"
                  }`}
                >
                  {quantityDetails.defective > quantityDetails.received
                    ? `❌ ERRO: Máximo permitido é ${quantityDetails.received}!`
                    : `Máximo: ${quantityDetails.received} (igual à quantidade recebida)`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🔄 Quantidade Devolvida</label>
                <input
                  type="number"
                  value={quantityDetails.returned}
                  onChange={(e) => {
                    // CORREÇÃO: Aceitar apenas números válidos
                    const value = e.target.value.replace(/[^0-9.]/g, "");
                    const returned = parseFloat(value) || 0;

                    // VALIDAÇÃO: Não permitir mais que o defeito
                    const maxReturned = quantityDetails.defective;
                    const validReturned = returned > maxReturned ? maxReturned : returned;
                    const final = quantityDetails.received - validReturned;

                    setQuantityDetails((prev) => ({
                      ...prev,
                      returned: validReturned,
                      final,
                    }));
                  }}
                  className={`w-full border rounded-md p-2 ${
                    quantityDetails.returned > quantityDetails.defective
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  min="0"
                  max={quantityDetails.defective} // CORREÇÃO: Máximo = quantidade com defeito
                />
                <p
                  className={`text-xs mt-1 ${
                    quantityDetails.returned > quantityDetails.defective
                      ? "text-red-500 font-semibold"
                      : "text-gray-500"
                  }`}
                >
                  {quantityDetails.returned > quantityDetails.defective
                    ? `❌ ERRO: Máximo permitido é ${quantityDetails.defective}!`
                    : `Máximo: ${quantityDetails.defective} (igual à quantidade com defeito)`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🎯 Quantidade Final</label>
                <input
                  type="number"
                  value={quantityDetails.final}
                  disabled
                  className="w-full border border-gray-300 rounded-md p-2 bg-green-100 font-semibold"
                />
                <p className="text-xs text-gray-500 mt-1">Calculado automaticamente: Recebido - Devolvido</p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveQuantityDetails}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex-1"
              >
                💾 Salvar Quantidades
              </button>
              <button
                onClick={() => setShowQuantityModal(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
