import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Users, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  active?: boolean;
}

export function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setOpenNotification } = useNotification();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<Supplier[]>("/invoice/supplier");
      setSuppliers(response.data);
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      // Swal.fire({
      //   icon: "error",
      //   title: "Erro!",
      //   text: "Não foi possível carregar os fornecedores.",
      //   buttonsStyling: false,
      //   customClass: {
      //     confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
      //   },
      // });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (supplier: Supplier) => {
    setCurrentSupplier(supplier);
    setShowModal(true);
  };

  const handleDelete = async (supplier: Supplier) => {
    const result = await Swal.fire({
      title: "Tem certeza?",
      text: "Você não poderá reverter isso!",
      icon: "warning",
      showCancelButton: true,
      buttonsStyling: false, // desativa os estilos padrões do SweetAlert2
      customClass: {
        confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold mr-2",
        cancelButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
      },
      confirmButtonText: "Sim, excluir!",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      setIsSubmitting(true);
      try {
        await api.delete(`/invoice/supplier/${supplier.id}`);
        await api.delete(`/invoice/box/user/name/${supplier.name}`);
        await fetchData();
        // Swal.fire({
        //   icon: "success",
        //   title: "Sucesso!",
        //   text: "Fornecedor excluído permanentemente.",
        //   confirmButtonText: "Ok",
        //   buttonsStyling: false,
        //   customClass: {
        //     confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        //   },
        // });
        setOpenNotification({
          type: 'success',
          title: 'Sucesso!',
          notification: 'Fornecedor excluído permanentemente!'
        });
      } catch (error) {
        console.error("Erro ao excluir fornecedor:", error);
        Swal.fire({
          icon: "error",
          title: "Erro!",
          text: "Não foi possível excluir o fornecedor.",
          confirmButtonText: "Ok",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSave = async () => {
    if (!currentSupplier) return;

    const trimmedName = currentSupplier.name.trim();
    const trimmedPhone = currentSupplier.phone.trim();
    if (trimmedName === "" || trimmedPhone === "") {
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Nome e telefone do fornecedor são obrigatórios.",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    const supplierExists = suppliers.some(
      (supplier) =>
        supplier.name.toLowerCase() === trimmedName.toLowerCase() &&
        (!currentSupplier.id || supplier.id !== currentSupplier.id) &&
        supplier.active !== false
    );

    if (supplierExists) {
      Swal.fire("Erro", "Já existe um fornecedor cadastrado com este nome.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentSupplier.id) {
        await api.patch(`/invoice/supplier/${currentSupplier.id}`, currentSupplier);
        // Swal.fire({
        //   icon: "success",
        //   title: "Sucesso!",
        //   text: "Fornecedor atualizado com sucesso.",
        //   confirmButtonText: "Ok",
        //   buttonsStyling: false,
        //   customClass: {
        //     confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        //   },
        // });
        setOpenNotification({
          type: 'success',
          title: 'Sucesso!',
          notification: 'Fornecedor atualizado com sucesso'
        });
      } else {
        const res = await api.post("/invoice/supplier", currentSupplier);
        if (res.data)
          await api.post(`/invoice/box`, {
            name: res.data.name,
            description: `fornecedor - ${res.data.name}`,
            type: "supplier",
            tabsType: "invoice",
          });
        // Swal.fire({
        //   icon: "success",
        //   title: "Sucesso!",
        //   text: "Fornecedor criado com sucesso.",
        //   confirmButtonText: "Ok",
        //   buttonsStyling: false,
        //   customClass: {
        //     confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        //   },
        // });
        setOpenNotification({
        type: 'success',
        title: 'Sucesso!',
        notification: 'Fornecedor criado com sucesso!'
      });
      }
      await fetchData();
      setShowModal(false);
      setCurrentSupplier(null);
    } catch (error) {
      console.error("Erro ao salvar fornecedor:", error);
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: "Não foi possível salvar o fornecedor.",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowModal(false);
      }
    };
  
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-blue-700">
          <Users className="mr-2 inline" size={18} />
          Cadastro de Fornecedores
        </h2>
        <button
          onClick={() => {
            setCurrentSupplier({
              id: "",
              name: "",
              phone: "",
            });
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
          disabled={isLoading || isSubmitting}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2" size={16} />}
          Novo Fornecedor
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefone
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    {isLoading ? "Carregando..." : "Nenhum fornecedor cadastrado"}
                  </td>
                </tr>
              ) : (
                suppliers.map(
                  (supplier) =>
                    supplier.active !== false && (
                      <tr key={supplier.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {supplier.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            disabled={isSubmitting}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(supplier)}
                            className="text-red-600 hover:text-red-900"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </td>
                      </tr>
                    )
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && currentSupplier && (
        <div onClick={()=> setShowModal(false)} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div onClick={(e) => e.stopPropagation()} className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">{currentSupplier.id ? "Editar Fornecedor" : "Novo Fornecedor"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={currentSupplier.name}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, name: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={currentSupplier.phone}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
