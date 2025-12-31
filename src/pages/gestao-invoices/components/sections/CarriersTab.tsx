import { useState, useEffect } from "react";
import { Truck, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { formatCurrency } from "../../../cambiobackoffice/formatCurrencyUtil";
import Swal from "sweetalert2";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";

interface Carrier {
  id: string;
  name: string;
  type: "percentage" | "perKg" | "perUnit";
  value: number;
  active?: boolean;
}

export function CarriersTab() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentCarrier, setCurrentCarrier] = useState<Carrier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setOpenNotification } = useNotification();

  async function fetchCarriers() {
    setIsLoading(true);
    try {
      const response = await api.get("/invoice/carriers");
      setCarriers(response.data);
    } catch (error) {
      console.error("Erro ao carregar freteiros:", error);
      // Swal.fire('Erro!', 'Não foi possível carregar os freteiros.', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchCarriers();
  }, []);

  const getShippingTypeText = (type: string) => {
    switch (type) {
      case "percentage":
        return "%";
      case "perKg":
        return "$/kg";
      case "perUnit":
        return "$/un";
      default:
        return type;
    }
  };

  const handleEdit = (carrier: Carrier) => {
    setCurrentCarrier(carrier);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
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
      try {
        setIsSubmitting(true);
        await api.delete(`/invoice/carriers/${id}`);
        await fetchCarriers();
        // Swal.fire({
        //   icon: "success",
        //   title: "Excluído!",
        //   text: "O freteiro foi removido com sucesso.",
        //   buttonsStyling: false,
        //   customClass: {
        //     confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        //   },
        // });
        setOpenNotification({
          type: 'success',
          title: 'Excluído!',
          notification: 'O freteiro foi removido com sucesso!'
        });
      } catch (error) {
        console.error("Erro ao excluir freteiro:", error);
        Swal.fire({
          icon: "error",
          title: "Erro!",
          text: "Ocorreu um erro ao excluir o freteiro.",
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
    if (!currentCarrier) return;
    try {
      setIsSubmitting(true);

      const trimmedName = currentCarrier.name.trim();

      const carrierExists = carriers.some(
        (supplier) =>
          supplier.name.toLowerCase() === trimmedName.toLowerCase() &&
          (!currentCarrier.id || supplier.id !== currentCarrier.id) &&
          supplier.active !== false
      );

      if (carrierExists) {
        Swal.fire("Erro", "Já existe um freteiro cadastrado com este nome.", "error");
        return;
      }

      if (currentCarrier.id) {
        // Edição
        await api.patch(`/invoice/carriers/${currentCarrier.id}`, currentCarrier);
        // Swal.fire({
        //   icon: "success",
        //   title: "Sucesso!",
        //   text: "Freteiro atualizado com sucesso.",
        //   confirmButtonText: "Ok",
        //   buttonsStyling: false,
        //   customClass: {
        //     confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        //   },
        // });
        setOpenNotification({
        type: 'success',
        title: 'Sucesso!',
        notification: 'Freteiro atualizado com sucesso!'
      });
      } else {
        // Novo
        const response = await api.post("/invoice/carriers", currentCarrier);
        setCarriers((prev) => [...prev, response.data]);
        // Swal.fire({
        //   icon: "success",
        //   title: "Sucesso!",
        //   text: "Freteiro criado com sucesso.",
        //   confirmButtonText: "Ok",
        //   buttonsStyling: false,
        //   customClass: {
        //     confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        //   },
        // });
        setOpenNotification({
        type: 'success',
        title: 'Sucesso!',
        notification: 'Freteiro criado com sucesso!'
      });
      }

      setShowModal(false);
      setCurrentCarrier(null);
      await fetchCarriers();
    } catch (error) {
      console.error("Erro ao salvar freteiro:", error);
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: "Ocorreu um erro ao salvar o freteiro.",
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
          <Truck className="mr-2 inline" size={18} />
          Cadastro de Freteiros
        </h2>
        <button
          onClick={() => {
            setCurrentCarrier({ id: "", name: "", type: "percentage", value: 0 });
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2" size={16} />}
          Novo Freteiro
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
                  Tipo de Frete
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {carriers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    {isLoading ? "Carregando..." : "Nenhum freteiro cadastrado"}
                  </td>
                </tr>
              ) : (
                carriers.map(
                  (carrier) =>
                    carrier.active !== false && (
                      <tr key={carrier.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {carrier.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getShippingTypeText(carrier.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {carrier.type === "percentage" ? carrier.value : formatCurrency(carrier.value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(carrier)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            disabled={isSubmitting}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(carrier.id)}
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

      {/* Modal de Freteiro */}
      {showModal && currentCarrier && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">{currentCarrier.id ? "Editar Freteiro" : "Adicionar Freteiro"}</h3>
            <div className="space-y-4">
              <input type="hidden" value={currentCarrier.id} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={currentCarrier.name}
                  onChange={(e) => setCurrentCarrier({ ...currentCarrier, name: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Frete</label>
                  <select
                    value={currentCarrier.type}
                    onChange={(e) =>
                      setCurrentCarrier({
                        ...currentCarrier,
                        type: e.target.value as "percentage" | "perKg" | "perUnit",
                      })
                    }
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSubmitting}
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="perKg">Por kg ($/kg)</option>
                    <option value="perUnit">Por peça ($/un)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={currentCarrier.value === 0 ? "" : String(currentCarrier.value)}
                    onChange={(e) => {
                      const value = e.target.value.replace(",", ".");
                      if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
                        setCurrentCarrier({
                          ...currentCarrier,
                          value: value === "" ? 0 : parseFloat(value),
                        });
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSubmitting}
                  />
                </div>
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
