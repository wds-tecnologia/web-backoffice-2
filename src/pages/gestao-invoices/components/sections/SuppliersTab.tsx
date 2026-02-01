import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Users, Loader2, Link2 } from "lucide-react";
import Swal from "sweetalert2";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";
import { useActionLoading } from "../../context/ActionLoadingContext";

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  active?: boolean;
}

export interface SupplierAlias {
  id: string;
  pdfSupplierName: string;
  supplierId: string;
  supplierName?: string;
  createdAt?: string;
}

export function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [aliases, setAliases] = useState<SupplierAlias[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAliasForm, setShowAliasForm] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [newAliasPdfName, setNewAliasPdfName] = useState("");
  const [newAliasSupplierId, setNewAliasSupplierId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setOpenNotification } = useNotification();
  const { isLoading: isActionLoading, executeAction } = useActionLoading();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [suppliersRes, aliasesRes] = await Promise.all([
        api.get<Supplier[]>("/invoice/supplier"),
        api.get<{ aliases?: SupplierAlias[] } | SupplierAlias[]>("/invoice/supplier/aliases").catch(() => ({ data: { aliases: [] } })),
      ]);
      setSuppliers(suppliersRes.data);
      const aliasesData = aliasesRes.data;
      setAliases(
        Array.isArray(aliasesData)
          ? aliasesData
          : (aliasesData as { aliases?: SupplierAlias[] })?.aliases ?? []
      );
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
    if (isActionLoading) return;
    
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
      await executeAction(async () => {
        await api.delete(`/invoice/supplier/${supplier.id}`);
        await api.delete(`/invoice/box/user/name/${supplier.name}`);
        await fetchData();
        setOpenNotification({
          type: 'success',
          title: 'Sucesso!',
          notification: 'Fornecedor excluído permanentemente!'
        });
      }, `deleteSupplier-${supplier.id}`).catch((error) => {
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
      });
    }
  };

  const handleSave = async () => {
    if (isActionLoading) return;
    if (!currentSupplier) return;

    await executeAction(async () => {
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
      }
    }, "saveSupplier").catch((error) => {
      console.error("Erro no executeAction:", error);
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowModal(false);
        setShowAliasForm(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleAddAlias = async () => {
    const pdfName = newAliasPdfName.trim();
    if (!pdfName || !newAliasSupplierId) {
      setOpenNotification({
        type: "error",
        title: "Campos obrigatórios",
        notification: "Informe o nome no PDF e selecione o fornecedor.",
      });
      return;
    }
    try {
      await api.post("/invoice/supplier/alias", {
        pdfSupplierName: pdfName,
        supplierId: newAliasSupplierId,
      });
      setNewAliasPdfName("");
      setNewAliasSupplierId("");
      setShowAliasForm(false);
      await fetchData();
      setOpenNotification({
        type: "success",
        title: "Vínculo salvo",
        notification: "Alias de fornecedor criado com sucesso!",
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erro ao salvar vínculo.";
      setOpenNotification({ type: "error", title: "Erro", notification: msg });
    }
  };

  const handleDeleteAlias = async (alias: SupplierAlias) => {
    if (isActionLoading) return;
    const result = await Swal.fire({
      title: "Remover vínculo?",
      text: `"${alias.pdfSupplierName}" deixará de ser vinculado automaticamente.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, remover",
      cancelButtonText: "Cancelar",
      buttonsStyling: false,
      customClass: {
        confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-xl",
        cancelButton: "bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-xl",
      },
    });
    if (result.isConfirmed) {
      try {
        await api.delete(`/invoice/supplier/alias/${alias.id}`);
        await fetchData();
        setOpenNotification({
          type: "success",
          title: "Removido",
          notification: "Vínculo removido com sucesso.",
        });
      } catch (err) {
        setOpenNotification({
          type: "error",
          title: "Erro",
          notification: "Não foi possível remover o vínculo.",
        });
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center shadow-sm"
          disabled={isLoading || isActionLoading}
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
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
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
            <tbody className="bg-white divide-y divide-gray-100">
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
                            disabled={isActionLoading}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(supplier)}
                            className="text-red-600 hover:text-red-900"
                            disabled={isActionLoading}
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

      {/* Seção de Aliases (Vínculos PDF → Fornecedor) */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Link2 size={18} />
            Vínculos (Aliases)
          </h3>
          {!showAliasForm ? (
            <button
              type="button"
              onClick={() => setShowAliasForm(true)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <Plus size={16} />
              Novo vínculo
            </button>
          ) : null}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Vincule o nome do fornecedor como aparece no PDF ao fornecedor do sistema. Nas próximas importações, o fornecedor será reconhecido automaticamente.
        </p>
        {showAliasForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome no PDF</label>
              <input
                type="text"
                value={newAliasPdfName}
                onChange={(e) => setNewAliasPdfName(e.target.value)}
                placeholder="Ex: DISTRIBUIDORA XYZ LTDA"
                className="w-full border border-gray-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
              <select
                value={newAliasSupplierId}
                onChange={(e) => setNewAliasSupplierId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
              >
                <option value="">Selecione...</option>
                {suppliers.filter((s) => s.active !== false).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddAlias}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 shadow-sm"
            >
              Salvar
            </button>
            <button
              onClick={() => {
                setShowAliasForm(false);
                setNewAliasPdfName("");
                setNewAliasSupplierId("");
              }}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        )}
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome no PDF
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vinculado a
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {aliases.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500 text-sm">
                    Nenhum vínculo cadastrado. Ao importar PDF, vincule o nome do fornecedor manualmente na primeira vez; o vínculo será salvo para próximas importações.
                  </td>
                </tr>
              ) : (
                aliases.map((alias) => (
                  <tr key={alias.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-700 font-mono">
                      {alias.pdfSupplierName}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {alias.supplierName ?? suppliers.find((s) => s.id === alias.supplierId)?.name ?? alias.supplierId}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleDeleteAlias(alias)}
                        className="text-red-600 hover:text-red-700 text-sm"
                        disabled={isActionLoading}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && currentSupplier && (
        <div onClick={()=> setShowModal(false)} className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl border border-gray-100">
            <h3 className="text-lg font-medium mb-4">{currentSupplier.id ? "Editar Fornecedor" : "Novo Fornecedor"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={currentSupplier.name}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, name: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={currentSupplier.phone}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-600"
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
