

import { useEffect, useState } from "react"
import { api } from "../../../../services/api"
import Swal from "sweetalert2"
import { GenericSearchSelect } from "./SearchSelect"
import { Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { formatCurrency } from "../modals/format"
import { Truck, HandCoins, Handshake, CircleDollarSign } from "lucide-react"
import { useBalanceStore } from "../../../../store/useBalanceStore"
import { useNotification } from "../../../../hooks/notification"
import { formatDateIn } from "../../../tokens-management/components/format"
import { usePermissionStore } from "../../../../store/permissionsStore"

interface Transaction {
  id: string
  value: number
  userId: string
  date: string
  direction: "IN" | "OUT"
  description: string
  createdAt: string
  updatedAt: string
  supplierId?: string
  carrierId?: string
}

export interface Caixa {
  id: string
  name: string
  type: "freteiro" | "fornecedor" | "parceiro"

  description: string
  createdAt: string
  updatedAt: string
  input: number
  output: number
  balance?: number
  transactions: Transaction[]
}

interface TransactionHistory {
  id: string
  date: string
  description: string
  value: number
  isInvoice: boolean
  direction: "IN" | "OUT"
}

export const CaixasTab = () => {
  const [combinedItems, setCombinedItems] = useState<any[]>([])
  const [caixaUser, setCaixaUser] = useState<Caixa>()
  // const [showModal, setShowModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<"all" | "suppliers" | "carriers" | "partners" | null>(null)
  const [totalBalance, setTotalBalance] = useState<number>(0)
  const [filterStartDate, setFilterStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0])
  const [filterEndDate, setFilterEndDate] = useState<string>(new Date().toLocaleDateString("en-CA"))
  const [transactionHistoryList, setTransactionHistoryList] = useState<TransactionHistory[]>([])

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [loadingFetch, setLoadingFetch] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingFetch2, setLoadingFetch2] = useState(false)
  const [loadingFetch3, setLoadingFetch3] = useState(false)
  const [loadingClearId, setLoadingClearId] = useState<string | null>(null)
  const [valorRaw, setValorRaw] = useState("")
  const { setOpenNotification } = useNotification();

  const [formData, setFormData] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    value: "",
    description: "",
  })

  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 6 // ou o número que preferir
  const { getBalances, balanceCarrier, balanceGeneralUSD, balancePartnerUSD, balanceSupplier } = useBalanceStore()

  const [activeFilterStartDate, setActiveFilterStartDate] = useState<string>("")
  const [activeFilterEndDate, setActiveFilterEndDate] = useState<string>("")
  const {getPermissions, permissions, user} = usePermissionStore()

  const [filteredBalances, setFilteredBalances] = useState({
    suppliers: 0,
    carriers: 0,
    partners: 0,
    general: 0
  });

  // Calcular totais baseado apenas nos itens permitidos
  const getFilteredItems = () => {
    // MASTER e ADMIN veem todos os itens
    if (user?.role === "MASTER" || user?.role === "ADMIN") {
      return combinedItems;
    }
    // Outros usuários veem apenas os permitidos
    if (!permissions?.GERENCIAR_INVOICES?.CAIXAS_PERMITIDOS || permissions.GERENCIAR_INVOICES.CAIXAS_PERMITIDOS.length === 0) {
      return [];
    }
    return combinedItems.filter((item) => 
      permissions.GERENCIAR_INVOICES.CAIXAS_PERMITIDOS.includes(item.name)
    );
  };

  const calculateFilteredBalances = async () => {
    // Se tiver um filtro de categoria selecionado (Todos, Fornecedores, Freteiros, Parceiros)
    if (selectedFilter && !selectedEntity) {
      const filteredItems = getFilteredItems();
      
      let totalSuppliers = 0;
      let totalCarriers = 0;
      let totalPartners = 0;

      // Filtrar por categoria se necessário
      const itemsToProcess = selectedFilter === "all" 
        ? filteredItems 
        : filteredItems.filter((item) => {
            if (selectedFilter === "suppliers") return item.typeInvoice === "fornecedor";
            if (selectedFilter === "carriers") return item.typeInvoice === "freteiro";
            if (selectedFilter === "partners") return item.typeInvoice === "parceiro";
            return true;
          });

      await Promise.all(
        itemsToProcess.map(async (item) => {
          try {
            const balanceRes = await api.get(`/invoice/box/transaction/${item.id}`);
            const transactions = balanceRes.data.TransactionBoxUserInvoice || [];
            
            let invoices: any[] = [];
            if (item.typeInvoice === "fornecedor") {
              try {
                const { data: listInvoicesBySupplier } = await api.get(`/invoice/list/supplier/${item.id}`);
                invoices = listInvoicesBySupplier.map((invoice: any) => ({
                  value: invoice.subAmount,
                  direction: "OUT",
                }));
              } catch (error) {
                console.error("Erro ao buscar invoices do fornecedor:", error);
              }
            } else if (item.typeInvoice === "freteiro") {
              try {
                const { data: listInvoicesByCarrier } = await api.get(`/invoice/list/carrier/${item.id}`);
                invoices = listInvoicesByCarrier.map((invoice: any) => ({
                  value: invoice.subAmount,
                  direction: "OUT",
                }));
              } catch (error) {
                console.error("Erro ao buscar invoices do freteiro:", error);
              }
            }

            const transactionBalance = transactions.reduce((acc: number, t: any) => {
              return acc + (t.direction === "IN" ? t.value : -t.value);
            }, 0);
            
            const invoiceBalance = invoices.reduce((acc: number, invoice: any) => {
              return acc - invoice.value;
            }, 0);
            
            const totalBalance = transactionBalance + invoiceBalance;

            if (item.typeInvoice === "fornecedor") {
              totalSuppliers += totalBalance;
            } else if (item.typeInvoice === "freteiro") {
              totalCarriers += totalBalance;
            } else if (item.typeInvoice === "parceiro") {
              totalPartners += totalBalance;
            }
          } catch (error) {
            console.error(`Erro ao buscar saldo de ${item.name}:`, error);
          }
        })
      );

      setFilteredBalances({
        suppliers: totalSuppliers,
        carriers: totalCarriers,
        partners: totalPartners,
        general: totalSuppliers + totalCarriers + totalPartners
      });
      return;
    }

    // Se tiver um item selecionado, calcular apenas daquele item
    if (selectedEntity) {
      try {
        const balanceRes = await api.get(`/invoice/box/transaction/${selectedEntity.id}`);
        const transactions = balanceRes.data.TransactionBoxUserInvoice || [];
        
        // Buscar invoices baseado no tipo
        let invoices: any[] = [];
        if (selectedEntity.typeInvoice === "fornecedor") {
          try {
            const { data: listInvoicesBySupplier } = await api.get(`/invoice/list/supplier/${selectedEntity.id}`);
            invoices = listInvoicesBySupplier.map((invoice: any) => ({
              value: invoice.subAmount,
              direction: "OUT",
            }));
          } catch (error) {
            console.error("Erro ao buscar invoices do fornecedor:", error);
          }
        } else if (selectedEntity.typeInvoice === "freteiro") {
          try {
            const { data: listInvoicesByCarrier } = await api.get(`/invoice/list/carrier/${selectedEntity.id}`);
            invoices = listInvoicesByCarrier.map((invoice: any) => ({
              value: invoice.subAmount,
              direction: "OUT",
            }));
          } catch (error) {
            console.error("Erro ao buscar invoices do freteiro:", error);
          }
        }

        // Calcular saldo considerando transações e invoices
        const transactionBalance = transactions.reduce((acc: number, t: any) => {
          return acc + (t.direction === "IN" ? t.value : -t.value);
        }, 0);
        
        const invoiceBalance = invoices.reduce((acc: number, invoice: any) => {
          return acc - invoice.value;
        }, 0);
        
        const totalBalance = transactionBalance + invoiceBalance;

        // Mostrar apenas o valor do item selecionado na categoria correspondente
        if (selectedEntity.typeInvoice === "fornecedor") {
          setFilteredBalances({
            suppliers: totalBalance,
            carriers: 0,
            partners: 0,
            general: totalBalance
          });
        } else if (selectedEntity.typeInvoice === "freteiro") {
          setFilteredBalances({
            suppliers: 0,
            carriers: totalBalance,
            partners: 0,
            general: totalBalance
          });
        } else if (selectedEntity.typeInvoice === "parceiro") {
          setFilteredBalances({
            suppliers: 0,
            carriers: 0,
            partners: totalBalance,
            general: totalBalance
          });
        }
        return;
      } catch (error) {
        console.error(`Erro ao buscar saldo de ${selectedEntity.name}:`, error);
      }
    }

    // Se não tiver item selecionado, calcular de todos os itens permitidos
    const filteredItems = getFilteredItems();
    
    let totalSuppliers = 0;
    let totalCarriers = 0;
    let totalPartners = 0;

    // Buscar saldos de cada item permitido
    await Promise.all(
      filteredItems.map(async (item) => {
        try {
          const balanceRes = await api.get(`/invoice/box/transaction/${item.id}`);
          const transactions = balanceRes.data.TransactionBoxUserInvoice || [];
          
          // Buscar invoices baseado no tipo
          let invoices: any[] = [];
          if (item.typeInvoice === "fornecedor") {
            try {
              const { data: listInvoicesBySupplier } = await api.get(`/invoice/list/supplier/${item.id}`);
              invoices = listInvoicesBySupplier.map((invoice: any) => ({
                value: invoice.subAmount,
                direction: "OUT",
              }));
            } catch (error) {
              console.error("Erro ao buscar invoices do fornecedor:", error);
            }
          } else if (item.typeInvoice === "freteiro") {
            try {
              const { data: listInvoicesByCarrier } = await api.get(`/invoice/list/carrier/${item.id}`);
              invoices = listInvoicesByCarrier.map((invoice: any) => ({
                value: invoice.subAmount,
                direction: "OUT",
              }));
            } catch (error) {
              console.error("Erro ao buscar invoices do freteiro:", error);
            }
          }

          // Calcular saldo considerando transações e invoices
          const transactionBalance = transactions.reduce((acc: number, t: any) => {
            return acc + (t.direction === "IN" ? t.value : -t.value);
          }, 0);
          
          const invoiceBalance = invoices.reduce((acc: number, invoice: any) => {
            return acc - invoice.value;
          }, 0);
          
          const totalBalance = transactionBalance + invoiceBalance;

          if (item.typeInvoice === "fornecedor") {
            totalSuppliers += totalBalance;
          } else if (item.typeInvoice === "freteiro") {
            totalCarriers += totalBalance;
          } else if (item.typeInvoice === "parceiro") {
            totalPartners += totalBalance;
          }
        } catch (error) {
          console.error(`Erro ao buscar saldo de ${item.name}:`, error);
        }
      })
    );

    setFilteredBalances({
      suppliers: totalSuppliers,
      carriers: totalCarriers,
      partners: totalPartners,
      general: totalSuppliers + totalCarriers + totalPartners
    });
  };

  const filterTransactionsByDate = () => {
    if (!activeFilterStartDate || !activeFilterEndDate) return transactionHistoryList

  const start =  new Date(`${activeFilterStartDate}T00:00:00`) 
  const end =  new Date(`${activeFilterEndDate}T23:59:59`) 
    // end.setDate(end.getDate() + 1) 

    return transactionHistoryList.filter((transaction) => {
      const transactionDate = new Date(transaction.date)
      return transactionDate >= start && transactionDate < end
    })
  }
  const filteredTransactions = filterTransactionsByDate()

  const paginatedTransactions = filteredTransactions.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)

  useEffect(() => {
    console.log("foi?")
    fetchAllData()
    getBalances()
    getPermissions()
  }, [])

  useEffect(() => {
    if (combinedItems.length > 0 && permissions && user && (user?.role === "MASTER" || user?.role === "ADMIN" || (permissions?.GERENCIAR_INVOICES?.CAIXAS_PERMITIDOS && permissions.GERENCIAR_INVOICES.CAIXAS_PERMITIDOS.length > 0))) {
      calculateFilteredBalances()
    }
  }, [combinedItems, permissions, user, selectedEntity, selectedFilter])

  console.log(selectedUserId)

  const fetchAllData = async () => {
    setLoadingFetch(true)
    setIsLoading(true)
    try {
      // Fetch only carriers and suppliers in parallel
      const [carriersRes, suppliersRes, partnerRes] = await Promise.all([
        api.get("/invoice/carriers"),
        api.get("/invoice/supplier"),
        api.get("/invoice/partner"),
      ])

      // Combine carriers and suppliers with type labels
      const carrierItems = carriersRes.data.map((item: any) => ({
        ...item,
        typeInvoice: "freteiro",
      }))

      const supplierItems = suppliersRes.data.map((item: any) => ({
        ...item,
        typeInvoice: "fornecedor",
      }))

      console.log("partners", partnerRes)

      const partnerItems = partnerRes.data.usd.map((item: any) => ({
        ...item,
        typeInvoice: "parceiro",
      }))

      // Combine all items
      const combined = [...carrierItems, ...supplierItems, ...partnerItems]
      setCombinedItems(combined)

      console.log("combined", combined)

      console.log("All data fetched:", combined)
    } catch (error) {
      console.error("Erro ao buscar dados:", error)
      // Swal.fire({
      //   icon: "error",
      //   title: "Erro!",
      //   text: "Erro ao carregar dados.",
      //   buttonsStyling: false,
      //   customClass: {
      //     confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
      //   },
      // })
      setOpenNotification({
        type: 'error',
        title: 'Erro!',
        notification: 'Erro ao carregar dados!'
      });
    } finally {
      setLoadingFetch(false)
      setIsLoading(false)
    }
  }

  const fetchEntityData = async (entityId: string) => {
    console.log("foi?")
    try {
      setTransactionHistoryList([])
      setLoadingFetch2(true)

      const res = await api.get(`/invoice/box/transaction/${entityId}`)
      console.log("res", res.data)
      const entity = combinedItems.find((item) => item.id === entityId)
      setSelectedEntity({
        ...entity,
        ...res.data,
      })

      // Adiciona as transações normais
      const transactions = res.data.TransactionBoxUserInvoice.map((transactionBox: any) => ({
        id: transactionBox.id,
        date: transactionBox.date,
        description: transactionBox.description,
        value: transactionBox.value,
        isInvoice: false,
        direction: transactionBox.direction,
      }))

      // Busca invoices baseado no tipo da entidade
      let invoices = []
      if (entity?.typeInvoice === "fornecedor") {
        const { data: listInvoicesBySupplier } = await api.get(`/invoice/list/supplier/${entityId}`)
        console.log("istInvoicesBySupplier", listInvoicesBySupplier)

        invoices = listInvoicesBySupplier.map((invoice: any) => ({
          id: invoice.id,
          date: invoice.date,
          description: invoice.number,
          value: invoice.subAmount,
          isInvoice: true,
          direction: "OUT", // Invoices são sempre saídas
        }))
      } else if (entity?.typeInvoice === "freteiro") {
        const { data: listInvoicesByCarrier } = await api.get(`/invoice/list/carrier/${entityId}`)
        console.log("istInvoicesByCarrier", listInvoicesByCarrier)

        invoices = listInvoicesByCarrier.map((invoice: any) => ({
          id: invoice.id,
          date: invoice.date,
          description: invoice.number,
          value: invoice.subAmount,
          isInvoice: true,
          direction: "OUT", // Invoices são sempre saídas
        }))
      } else if (entity?.typeInvoice === "parceiro") {
        // Se necessário, adicione lógica similar para parceiros
      }

      // Combina transações e invoices, ordenando por data
      setTransactionHistoryList(
        [...transactions, ...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      )
    } catch (error) {
      console.error("Erro ao buscar dados:", error)
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: "Erro ao carregar caixas.",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      })
    } finally {
      setLoadingFetch2(false)
    }
  }
  const getTotalBalance = () => {
    // Calcula o saldo baseado nas transações e invoices
    return transactionHistoryList.reduce((acc, transaction) => {
      // Para transações normais (não invoices)
      if (!transaction.isInvoice) {
        return acc + (transaction.direction === "IN" ? transaction.value : -transaction.value)
      }
      // Para invoices (sempre subtrai o valor)
      else {
        return acc - transaction.value
      }
    }, 0)
  }

  const salvarCaixa = async (nome: string, description: string) => {
    // Implemente lógica de criação de caixa com POST
  }

  const limparHistorico = async (recolhedorId: string) => {
    // const confirm = window.confirm("Deseja realmente excluir TODO o histórico de transações deste recolhedor?");
    // if (!confirm) return;

    setLoadingClearId(recolhedorId)
    try {
      setLoadingFetch3(true)

      await api.delete(`/invoice/box/trasnsaction/user/${recolhedorId}`)

      await fetchEntityData(selectedEntity.id)
      fetchDatUser()
      // Swal.fire({
      //   icon: "success",
      //   title: "Sucesso",
      //   text: "Transação deletada com sucesso",
      //   confirmButtonText: "Ok",
      //   buttonsStyling: false,
      //   customClass: {
      //     confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
      //   },
      // })
      setOpenNotification({
        type: 'success',
        title: 'Sucesso!',
        notification: 'Transação deletada com sucesso!'
      });
    } catch (e: any) {
      // Swal.fire({
      //   icon: "error",
      //   title: "Erro!",
      //   text: "Erro ao apagar registo de pagamento",
      //   buttonsStyling: false,
      //   customClass: {
      //     confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
      //   },
      // })
      setOpenNotification({
        type: 'error',
        title: 'Erro!',
        notification: 'Erro ao apagar registo de pagamento!'
      });
    } finally {
      setLoadingClearId(null)
      setLoadingFetch3(false)
    }
  }

  const caixaAtual = combinedItems.find((c) => c.id === selectedUserId)
  console.log(caixaAtual)

  console.log()
  const fetchDatUser = async () => {
    try {
      if (!selectedUserId) return
      setLoadingFetch2(true)

      // Find the selected item to determine its type
      const selectedItem = combinedItems.find((item) => item.id === selectedUserId)

      if (!selectedItem) {
        console.error("Item selecionado não encontrado")
        return
      }

      // Use the appropriate endpoint based on the item type
      let endpoint = `/invoice/box/transaction/${selectedUserId}`
      if (
        selectedItem.typeInvoice === "freteiro" ||
        selectedItem.typeInvoice === "fornecedor" ||
        selectedItem.typeInvoice === "parceiro"
      ) {
        // Assuming the endpoint is the same for both types
        endpoint = `/invoice/box/transaction/${selectedUserId}`
      }

      const res = await api.get(endpoint)
      console.log(res.data)
      setCaixaUser(res.data)
    } catch (error) {
      console.error("Erro ao buscar dados:", error)
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: "Erro ao carregar caixas.",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      })
    } finally {
      setActiveFilterStartDate(filterStartDate)
      setActiveFilterEndDate(filterEndDate)
      setCurrentPage(0)
      setLoadingFetch2(false)
    }
  }

  function isValidNumber(value: string): boolean {
    const number = Number(value)
    return !isNaN(number) && isFinite(number)
  }

  console.log(caixaUser)

  useEffect(() => {
    fetchDatUser()
    // getPermissions()
  }, [selectedUserId])

  console.log("selectedEntity", selectedEntity)

  const submitPayment = async () => {
    try {
      if (!formData.date) {
        Swal.fire({
          icon: "error",
          title: "Erro!",
          text: "selecione um data",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        })
        return
      }
      if (!isValidNumber(formData.value)) {
        Swal.fire({
          icon: "error",
          title: "Erro!",
          text: "selecione um valor válido",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        })
        return
      }
      if (!formData.description) {
        Swal.fire({
          icon: "error",
          title: "Erro!",
          text: "Informe uma descrição para o pagamento",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        })
        return
      }
      if (!selectedEntity) {
        Swal.fire({
          icon: "error",
          title: "Erro!",
          text: "Nenhum usuário selecionado",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        })
        return
      }

      console.log("selectedEntity", selectedEntity)
      const now = new Date()
      const currentTime = now.toTimeString().split(" ")[0] // HH:MM:SS
      const fullDate = new Date(`${formData.date}T${currentTime}`)

      console.log(Math.abs(Number(formData.value)))

      setLoadingFetch3(true)
      await api.post(`/invoice/box/transaction`, {
        value: Math.abs(Number(formData.value)),
        entityId: selectedEntity.id,
        direction: Number(formData.value) > 0 ? "IN" : "OUT",
        date: fullDate.toISOString(),
        description: formData.description,
        entityType:
          selectedEntity.typeInvoice === "freteiro"
            ? "CARRIER"
            : selectedEntity.typeInvoice === "parceiro"
              ? "PARTNER"
              : selectedEntity.typeInvoice === "fornecedor"
                ? "SUPPLIER"
                : "",
        userId: caixaUser?.id,
      })

      await fetchEntityData(selectedEntity.id)

      getBalances()

      setFormData({ date: new Date().toLocaleDateString('en-CA'), value: "", description: "" })
      fetchDatUser()
      // Swal.fire({
      //   icon: "success",
      //   title: "Sucesso",
      //   text: "Transação registrada com sucesso",
      //   confirmButtonText: "Ok",
      //   buttonsStyling: false,
      //   customClass: {
      //     confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
      //   },
      // })
      setOpenNotification({
        type: 'success',
        title: 'Sucesso!',
        notification: 'Transação registrada com sucesso!'
      });
    } catch (error) {
      console.error("Erro ao buscar caixas:", error)
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Erro ao resgistrar pagamento",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      })
    } finally {
      setLoadingFetch3(false)
      setValorRaw("")
    }
  }

  return (
    <div className="fade-in">
      {/* Seletor de usuário total acumulado de fornecedores, outros, fretes e total geral */}
      <h2 className="text-xl font-semibold mb-4 text-blue-700 border-b pb-2">
        <i className="fas fa-chart-line mr-2"></i> CONTROLE CENTRAL DE CAIXAS
      </h2>
      {/* Resumo */}
      {(user?.role === "MASTER" || user?.role === "ADMIN" || (permissions?.GERENCIAR_INVOICES?.CAIXAS_PERMITIDOS && permissions?.GERENCIAR_INVOICES?.CAIXAS_PERMITIDOS.length > 0)) && (
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        {selectedEntity ? (
          // Quando tem item selecionado, mostrar apenas o card relevante
          <>
            {selectedEntity.typeInvoice === "fornecedor" && (
              <motion.div whileHover={{ scale: 1.02 }} className="bg-yellow-50 p-4 rounded-lg shadow relative group">
                <div className="flex items-center gap-2 mb-2">
                  <HandCoins className="text-yellow-600 w-5 h-5" />
                  <h3 className="font-medium truncate max-w-[180px]">
                    {selectedEntity.name.toUpperCase()} - FORNECEDOR
                  </h3>
                </div>
                <p className="text-2xl font-bold text-yellow-600 truncate" title={formatCurrency(filteredBalances.suppliers || 0)}>
                  {formatCurrency(filteredBalances.suppliers || 0)}
                </p>
                {formatCurrency(filteredBalances.suppliers || 0).length > 12 && (
                  <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
                    {formatCurrency(filteredBalances.suppliers || 0)}
                  </div>
                )}
              </motion.div>
            )}
            {selectedEntity.typeInvoice === "freteiro" && (
              <motion.div whileHover={{ scale: 1.02 }} className="bg-blue-50 p-4 rounded-lg shadow relative group">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="text-blue-600 w-5 h-5" />
                  <h3 className="font-medium truncate max-w-[180px]">
                    {selectedEntity.name.toUpperCase()} - TRANSPORTADORA
                  </h3>
                </div>
                <p className="text-2xl font-bold text-blue-600 truncate" title={formatCurrency(filteredBalances.carriers || 0)}>
                  {formatCurrency(filteredBalances.carriers || 0)}
                </p>
                {formatCurrency(filteredBalances.carriers || 0).length > 5 && (
                  <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
                    {formatCurrency(filteredBalances.carriers || 0)}
                  </div>
                )}
              </motion.div>
            )}
            {selectedEntity.typeInvoice === "parceiro" && (
              <motion.div whileHover={{ scale: 1.02 }} className="bg-teal-50 p-4 rounded-lg shadow relative group">
                <div className="flex items-center gap-2 mb-2">
                  <Handshake className="text-teal-600 w-5 h-5" />
                  <h3 className="font-medium truncate max-w-[180px]">
                    {selectedEntity.name.toUpperCase()} - PARCEIRO
                  </h3>
                </div>
                <p className="text-2xl font-bold text-teal-600 truncate" title={formatCurrency(filteredBalances.partners || 0)}>
                  {formatCurrency(filteredBalances.partners || 0)}
                </p>
                <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
                  {formatCurrency(filteredBalances.partners || 0)}
                </div>
              </motion.div>
            )}
            <motion.div whileHover={{ scale: 1.02 }} className="bg-purple-50 p-4 rounded-lg shadow relative group">
              <div className="flex items-center gap-2 mb-2">
                <CircleDollarSign className="text-purple-600 w-5 h-5" />
                <h3 className="font-medium truncate max-w-[180px]">
                  TOTAL GERAL: {selectedEntity.name.toUpperCase()}
                </h3>
              </div>
              <p className="text-2xl font-bold text-purple-600 truncate" title={formatCurrency(filteredBalances.general || 0)}>
                {formatCurrency(filteredBalances.general || 0)}
              </p>
              {formatCurrency(filteredBalances.general || 0).length > 12 && (
                <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
                  {formatCurrency(filteredBalances.general || 0)}
                </div>
              )}
            </motion.div>
          </>
        ) : selectedFilter ? (
          // Quando tem filtro de grupo selecionado, mostrar apenas o card do grupo
          <>
            {selectedFilter === "suppliers" && (
              <motion.div whileHover={{ scale: 1.02 }} className="bg-yellow-50 p-4 rounded-lg shadow relative group">
                <div className="flex items-center gap-2 mb-2">
                  <HandCoins className="text-yellow-600 w-5 h-5" />
                  <h3 className="font-medium truncate max-w-[180px]">TOTAL FORNECEDORES</h3>
                </div>
                <p className="text-2xl font-bold text-yellow-600 truncate" title={formatCurrency(filteredBalances.suppliers || 0)}>
                  {formatCurrency(filteredBalances.suppliers || 0)}
                </p>
                {formatCurrency(filteredBalances.suppliers || 0).length > 12 && (
                  <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
                    {formatCurrency(filteredBalances.suppliers || 0)}
                  </div>
                )}
              </motion.div>
            )}
            {selectedFilter === "carriers" && (
              <motion.div whileHover={{ scale: 1.02 }} className="bg-blue-50 p-4 rounded-lg shadow relative group">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="text-blue-600 w-5 h-5" />
                  <h3 className="font-medium truncate max-w-[180px]">TOTAL FRETES</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600 truncate" title={formatCurrency(filteredBalances.carriers || 0)}>
                  {formatCurrency(filteredBalances.carriers || 0)}
                </p>
                {formatCurrency(filteredBalances.carriers || 0).length > 5 && (
                  <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
                    {formatCurrency(filteredBalances.carriers || 0)}
                  </div>
                )}
              </motion.div>
            )}
            {selectedFilter === "partners" && (
              <motion.div whileHover={{ scale: 1.02 }} className="bg-teal-50 p-4 rounded-lg shadow relative group">
                <div className="flex items-center gap-2 mb-2">
                  <Handshake className="text-teal-600 w-5 h-5" />
                  <h3 className="font-medium truncate max-w-[180px]">TOTAL PARCEIROS</h3>
                </div>
                <p className="text-2xl font-bold text-teal-600 truncate" title={formatCurrency(filteredBalances.partners || 0)}>
                  {formatCurrency(filteredBalances.partners || 0)}
                </p>
                <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
                  {formatCurrency(filteredBalances.partners || 0)}
                </div>
              </motion.div>
            )}
            {selectedFilter === "all" && (
              <>
                <motion.div whileHover={{ scale: 1.02 }} className="bg-yellow-50 p-4 rounded-lg shadow relative group">
                  <div className="flex items-center gap-2 mb-2">
                    <HandCoins className="text-yellow-600 w-5 h-5" />
                    <h3 className="font-medium truncate max-w-[180px]">TOTAL FORNECEDORES</h3>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600 truncate" title={formatCurrency(filteredBalances.suppliers || 0)}>
                    {formatCurrency(filteredBalances.suppliers || 0)}
                  </p>
                  {formatCurrency(filteredBalances.suppliers || 0).length > 12 && (
                    <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
                      {formatCurrency(filteredBalances.suppliers || 0)}
                    </div>
                  )}
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="bg-blue-50 p-4 rounded-lg shadow relative group">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="text-blue-600 w-5 h-5" />
                    <h3 className="font-medium truncate max-w-[180px]">TOTAL FRETES</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 truncate" title={formatCurrency(filteredBalances.carriers || 0)}>
                    {formatCurrency(filteredBalances.carriers || 0)}
                  </p>
                  {formatCurrency(filteredBalances.carriers || 0).length > 5 && (
                    <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
                      {formatCurrency(filteredBalances.carriers || 0)}
                    </div>
                  )}
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="bg-teal-50 p-4 rounded-lg shadow relative group">
                  <div className="flex items-center gap-2 mb-2">
                    <Handshake className="text-teal-600 w-5 h-5" />
                    <h3 className="font-medium truncate max-w-[180px]">TOTAL PARCEIROS</h3>
                  </div>
                  <p className="text-2xl font-bold text-teal-600 truncate" title={formatCurrency(filteredBalances.partners || 0)}>
                    {formatCurrency(filteredBalances.partners || 0)}
                  </p>
                  <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
                    {formatCurrency(filteredBalances.partners || 0)}
                  </div>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="bg-purple-50 p-4 rounded-lg shadow relative group">
                  <div className="flex items-center gap-2 mb-2">
                    <CircleDollarSign className="text-purple-600 w-5 h-5" />
                    <h3 className="font-medium truncate max-w-[180px]">TOTAL GERAL</h3>
                  </div>
                  <p className="text-2xl font-bold text-purple-600 truncate" title={formatCurrency(filteredBalances.general || 0)}>
                    {formatCurrency(filteredBalances.general || 0)}
                  </p>
                  {formatCurrency(filteredBalances.general || 0).length > 12 && (
                    <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
                      {formatCurrency(filteredBalances.general || 0)}
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </>
        ) : (
          // Quando não tem item selecionado, mostrar todos os totais apenas para MASTER e ADMIN
          (user?.role === "MASTER" || user?.role === "ADMIN") ? (
            <>
              <motion.div whileHover={{ scale: 1.02 }} className="bg-yellow-50 p-4 rounded-lg shadow relative group">
                <div className="flex items-center gap-2 mb-2">
                  <HandCoins className="text-yellow-600 w-5 h-5" />
                  <h3 className="font-medium truncate max-w-[180px]">TOTAL FORNECEDORES</h3>
                </div>
                <p className="text-2xl font-bold text-yellow-600 truncate" title={formatCurrency(filteredBalances.suppliers || 0)}>
                  {formatCurrency(filteredBalances.suppliers || 0)}
                </p>
                {formatCurrency(filteredBalances.suppliers || 0).length > 12 && (
                  <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
                    {formatCurrency(filteredBalances.suppliers || 0)}
                  </div>
                )}
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} className="bg-blue-50 p-4 rounded-lg shadow relative group">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="text-blue-600 w-5 h-5" />
                  <h3 className="font-medium truncate max-w-[180px]">TOTAL FRETES</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600 truncate" title={formatCurrency(filteredBalances.carriers || 0)}>
                  {formatCurrency(filteredBalances.carriers || 0)}
                </p>
                {formatCurrency(filteredBalances.carriers || 0).length > 5 && (
                  <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
                    {formatCurrency(filteredBalances.carriers || 0)}
                  </div>
                )}
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} className="bg-teal-50 p-4 rounded-lg shadow relative group">
                <div className="flex items-center gap-2 mb-2">
                  <Handshake className="text-teal-600 w-5 h-5" />
                  <h3 className="font-medium truncate max-w-[180px]">TOTAL PARCEIROS</h3>
                </div>
                <p className="text-2xl font-bold text-teal-600 truncate" title={formatCurrency(filteredBalances.partners || 0)}>
                  {formatCurrency(filteredBalances.partners || 0)}
                </p>
                <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
                  {formatCurrency(filteredBalances.partners || 0)}
                </div>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} className="bg-purple-50 p-4 rounded-lg shadow relative group">
                <div className="flex items-center gap-2 mb-2">
                  <CircleDollarSign className="text-purple-600 w-5 h-5" />
                  <h3 className="font-medium truncate max-w-[180px]">TOTAL GERAL</h3>
                </div>
                <p className="text-2xl font-bold text-purple-600 truncate" title={formatCurrency(filteredBalances.general || 0)}>
                  {formatCurrency(filteredBalances.general || 0)}
                </p>
                {formatCurrency(filteredBalances.general || 0).length > 12 && (
                  <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded z-10 bottom-full mb-2 whitespace-nowrap">
                    {formatCurrency(filteredBalances.general || 0)}
                  </div>
                )}
              </motion.div>
            </>
          ) : null
        )}
      </div>
      )}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-center mb-4">
          <i className="fas fa-search text-blue-600 mr-2"></i>
          <h2 className="text-lg font-semibold text-blue-700">Selecionar Entidade</h2>
        </div>

        {loadingFetch ? (
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-500">Carregando caixas...</p>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <GenericSearchSelect
              items={[
                // Entidades reais - baseado nas permissões
                ...getFilteredItems()
              ]}
              value={selectedFilter ? `filter_${selectedFilter}` : selectedEntity?.id || ""}
              getLabel={(p: any) => {
                if (p.isFilter) {
                  return (
                    <span className="flex items-center font-semibold">
                      {p.typeInvoice === "freteiro" && <i className="fas fa-truck mr-2 text-blue-600"></i>}
                      {p.typeInvoice === "fornecedor" && <i className="fas fa-hand-holding-usd mr-2 text-green-600"></i>}
                      {p.typeInvoice === "parceiro" && <i className="fas fa-handshake mr-2 text-red-600"></i>}
                      {p.typeInvoice === "all" && <i className="fas fa-list mr-2 text-purple-600"></i>}
                      {p.name}
                    </span>
                  )
                }
                return (
                  <span className="flex items-center">
                    {p.typeInvoice === "freteiro" && <i className="fas fa-truck mr-2 text-blue-600"></i>}
                    {p.typeInvoice === "fornecedor" && <i className="fas fa-hand-holding-usd mr-2 text-green-600"></i>}
                    {p.typeInvoice === "parceiro" && <i className="fas fa-handshake mr-2 text-red-600"></i>}
                    {p.name} (
                    {
                      (
                        {
                          freteiro: "Transportadora",
                          fornecedor: "Fornecedor",
                          parceiro: "Parceiro",
                        } as const
                      )[p.typeInvoice as "freteiro" | "fornecedor" | "parceiro"]
                    }
                    )
                  </span>
                )
              }}
              getSearchString={(p: any) => p.name}
              getId={(p: any) => p.id}
              onChange={(id) => {
                // É uma entidade real
                setSelectedFilter(null)
                const entity = combinedItems.find((item) => item.id === id)
                if (entity) {
                  setSelectedEntity(entity)
                  fetchEntityData(id)
                } else {
                  setSelectedEntity(null)
                }
              }}
              label="Selecione uma entidade"
            />
          </div>
        )}
      </div>
      {/* Dados do caixa selecionado */}
      {selectedEntity && (user?.role === "MASTER" || user?.role === "ADMIN" || permissions?.GERENCIAR_INVOICES?.CAIXAS_PERMITIDOS?.includes(selectedEntity.name)) && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-blue-600 font-semibold text-lg flex items-center space-x-2">
              {selectedEntity.typeInvoice === "freteiro" && <i className="fas fa-truck text-blue-600"></i>}
              {selectedEntity.typeInvoice === "fornecedor" && (
                <i className="fas fa-hand-holding-usd text-green-600"></i>
              )}
              {selectedEntity.typeInvoice === "parceiro" && <i className="fas fa-handshake text-red-600"></i>}
              <span>
                {selectedEntity.typeInvoice === "freteiro"
                  ? "TRANSPORTADORA"
                  : selectedEntity.typeInvoice === "fornecedor"
                    ? "FORNECEDOR"
                    : selectedEntity.typeInvoice === "parceiro"
                      ? "PARCEIRO"
                      : ""}{" "}
                : {selectedEntity.name}
              </span>
            </h2>
            <div className="text-sm text-right">
              {/* Entradas:{" "}
              <span className="mr-4 font-bold text-green-600">
                {loadingFetch2 ? (
                  <Loader2 className="inline w-4 h-4 animate-spin" />
                ) : (
                  `$ ${(selectedEntity.input || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                )}
              </span> */}
              {/* Saídas:{" "}
              <span className="mr-4 font-bold text-red-600">
                {loadingFetch2 ? (
                  <Loader2 className="inline w-4 h-4 animate-spin" />
                ) : (
                  `$ ${(selectedEntity.output || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                )}
              </span> */}
              Saldo:{" "}
              <span className={`font-bold ${(getTotalBalance() || 0) < 0 ? "text-red-600" : "text-green-600"}`}>
                {loadingFetch2 ? (
                  <Loader2 className="inline w-4 h-4 animate-spin" />
                ) : (
                  `$ ${(getTotalBalance() || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="font-medium mb-3 text-blue-700 border-b pb-2">
                {" "}
                <i className="fas fa-hand-holding-usd mr-2"></i> REGISTRAR TRANSAÇÃO
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">DATA</label>
                  <input
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">VALOR</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2"
                    value={valorRaw}
                    onChange={(e) => {
                      // Permite números, vírgula, ponto decimal e sinal negativo
                      let cleanedValue = e.target.value.replace(/[^0-9.,-]/g, "")

                      // Converte vírgula para ponto (padrão internacional)
                      cleanedValue = cleanedValue.replace(/,/g, ".")

                      // Garante que há apenas um sinal negativo no início
                      let newValue = cleanedValue
                      if ((cleanedValue.match(/-/g) || []).length > 1) {
                        newValue = cleanedValue.replace(/-/g, "")
                      }

                      // Garante que há apenas um ponto decimal
                      if ((cleanedValue.match(/\./g) || []).length > 1) {
                        const parts = cleanedValue.split(".")
                        newValue = parts[0] + "." + parts.slice(1).join("")
                      }

                      setValorRaw(newValue)

                      setFormData({ ...formData, value: newValue })
                    }}
                    onBlur={(e) => {
                      if (valorRaw) {
                        const numericValue = Number.parseFloat(valorRaw)
                        if (!isNaN(numericValue)) {
                          // Formata mantendo o sinal negativo se existir
                          const formattedValue = numericValue.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                          setValorRaw(formattedValue)
                          setFormData({ ...formData, value: numericValue.toString() })
                        }
                      }
                    }}
                    onFocus={(e) => {
                      // Remove formatação quando o input recebe foco
                      if (valorRaw) {
                        const numericValue = Number.parseFloat(valorRaw.replace(/[^0-9.-]/g, ""))
                        if (!isNaN(numericValue)) {
                          setValorRaw(numericValue.toString())
                        }
                      }
                    }}
                    // onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="Use negativo para saída"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">DESCRIÇÃO</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value.toUpperCase() })}
                  />
                </div>
                <button
                  onClick={submitPayment}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full flex items-center justify-center"
                  disabled={loadingFetch3}
                >
                  {loadingFetch3 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Registrando...
                    </>
                  ) : (
                    "REGISTRAR TRANSAÇÃO"
                  )}
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 border-b pb-2 w-full flex flex-row items-center justify-between max-w-[100%]">
                <div className="w-full flex justify-between items-start">
                  <div className="flex flex-col whitespace-nowrap">
                    <span className="text-xs font-medium text-gray-700 mb-1">
                      {activeFilterStartDate || activeFilterEndDate
                        ? `(Filtrado: ${formatDateIn(activeFilterStartDate) || "início"} a ${formatDateIn(activeFilterEndDate) || "fim"})`
                        : "(ÚLTIMOS 6)"}
                    </span>
                    <h3 className="font-medium">HISTÓRICO DE TRANSAÇÕES</h3>
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-gray-700 mb-1">Data Inicial</label>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="w-24 h-6 border border-gray-300 rounded-md text-sm text-center leading-6 py-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>

                    <span className="text-sm font-medium">até</span>

                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-gray-700 mb-1">Data Final</label>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="w-24 h-6 border border-gray-300 rounded-md text-sm text-center leading-6 py-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>

                    <button
                      onClick={() => {
                        setActiveFilterStartDate(filterStartDate)
                        setActiveFilterEndDate(filterEndDate)
                        setCurrentPage(0)
                      }}
                      className="bg-white text-blue-600 border border-blue-600 hover:bg-blue-600 hover:text-white rounded-md text-sm font-medium h-6 px-4 mr-2 flex items-center justify-center transition-colors"
                    >
                      Filtrar
                    </button>

                    <button
                      onClick={() => {
                        setFilterStartDate("")
                        setFilterEndDate("")
                        setActiveFilterStartDate("")
                        setActiveFilterEndDate("")
                        setCurrentPage(0)
                      }}
                      className="bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md text-sm font-medium h-6 px-4 flex items-center justify-center transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="py-2 px-4 border">DATA</th>
                      <th className="py-2 px-4 border">DESCRIÇÃO</th>
                      <th className="py-2 px-4 border">VALOR</th>
                      <th className="py-2 px-4 border">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingFetch2 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4">
                          <Loader2 className="inline animate-spin w-4 h-4 mr-2" />
                          Carregando...
                        </td>
                      </tr>
                    ) : paginatedTransactions.length ? (
                      paginatedTransactions.map((t: TransactionHistory) => (
                        <motion.tr
                          key={t.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className="odd:bg-blue-50 even:bg-green-50"
                        >
                          <td className="py-2 px-4 border text-center">
                            <i className="fas fa-clock text-green-500 mr-2"></i>
                            {new Date(t.date).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2 px-4 border">{t.description}</td>
                          <td
                            className={`py-2 px-4 border text-right ${
                              t.direction === "OUT" ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {t.direction === "OUT" ? "-" : "+"}
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              minimumFractionDigits: 2,
                            }).format(t.value)}{" "}
                          </td>
                          <td className="py-2 px-4 border text-center">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => limparHistorico(t.id)}
                              disabled={loadingClearId === t.id}
                              className="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded"
                            >
                              {loadingClearId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
                            </motion.button>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-gray-500">
                          {filterStartDate || filterEndDate
                            ? "Nenhuma transação encontrada no período"
                            : "Nenhuma transação registrada"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {filteredTransactions.length > itemsPerPage && (
                  <div className="flex justify-between items-center mt-4">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {currentPage + 1} de {Math.ceil(filteredTransactions.length / itemsPerPage)} • Mostrando{" "}
                      {filteredTransactions.length} de {transactionHistoryList.length} transações
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, Math.ceil(filteredTransactions.length / itemsPerPage) - 1),
                        )
                      }
                      disabled={(currentPage + 1) * itemsPerPage >= filteredTransactions.length}
                      className="px-3 py-1 bg-gray-200 text-sm rounded disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de adicionar caixa */}
      {/* <ModalCaixa
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={salvarCaixa}
        fetchDataUser={fetchAllData}
      /> */}
    </div>
  )
}

export default CaixasTab
