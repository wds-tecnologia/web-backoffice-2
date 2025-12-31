import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Users, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";

interface Partner {
  id: string;
  name: string;
  phone: string;
  currency: "BRL" | "USD";
  active?: boolean;
}

interface PartnersResponse {
  all: Partner[];
  brl: Partner[];
  usd: Partner[];
}

export function OtherPartnersTab() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentpartner, setCurrentpartner] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setOpenNotification } = useNotification();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<PartnersResponse>("/invoice/partner");
      setPartners(response.data.all);
    } catch (error) {
      console.error("Erro ao buscar Parceiroes:", error);
      // Swal.fire({
      //   icon: "error",
      //   title: "Erro!",
      //   text: "Não foi possível carregar os Parceiroes.",
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

  const handleEdit = (partner: Partner) => {
    setCurrentpartner(partner);
    setShowModal(true);
  };

  const handleDelete = async (partner: Partner) => {
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
        await api.delete(`/invoice/partner/${partner.id}`);
        await api.delete(`/invoice/box/user/name/${partner.name}`);
        await fetchData();
        // Swal.fire({
        //   icon: "success",
        //   title: "Sucesso!",
        //   text: "Parceiro excluído permanentemente.",
        //   confirmButtonText: "Ok",
        //   buttonsStyling: false,
        //   customClass: {
        //     confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        //   },
        // });
        setOpenNotification({
          type: 'success',
          title: 'Sucesso!',
          notification: 'Parceiro excluído permanentemente!'
        });
      } catch (error) {
        console.error("Erro ao excluir Parceiro:", error);
        Swal.fire({
          icon: "error",
          title: "Erro!",
          text: "Não foi possível excluir o Parceiro.",
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
    if (!currentpartner) return;

    const trimmedName = currentpartner.name.trim();
    const trimmedPhone = currentpartner.phone.trim();

    if (trimmedName === "" || trimmedPhone === "") {
      Swal.fire({
        icon: "error",
        title: "Erro",
        text: "Nome e telefone do Parceiro são obrigatórios.",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    // 🔒 Impede duplicidade de nome ao criar ou renomear
    const nomeDuplicado = partners.some(
      (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase() && p.id !== currentpartner.id // permite editar o próprio nome
    );

    if (nomeDuplicado) {
      Swal.fire({
        icon: "warning",
        title: "Nome já existe",
        text: "Já existe um parceiro com esse nome.",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-yellow-600 text-white hover:bg-yellow-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentpartner.id) {
        await api.patch(`/invoice/partner/${currentpartner.id}`, currentpartner);
        // Swal.fire({
        //   icon: "success",
        //   title: "Sucesso!",
        //   text: "Parceiro atualizado com sucesso.",
        //   confirmButtonText: "Ok",
        //   buttonsStyling: false,
        //   customClass: {
        //     confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        //   },
        // });

        setOpenNotification({
          type: 'success',
          title: 'Sucesso!',
          notification: 'Parceiro atualizado com sucesso!'
        });

      } else {
        console.log("currentpartner", currentpartner);
        const payload = {
          id: currentpartner.id,
          name: currentpartner.name,
          phone: currentpartner.phone,
          currency: currentpartner.currency || "BRL",
        };

        console.log("Payload enviado:", payload);

        const res = await api.post("/invoice/partner", payload);
        console.log("res", res.data);
        if (res.data)
          await api.post(`/invoice/box`, {
            name: res.data.name,
            description: `parceiro - ${res.data.name}`,
            type: "partner",
          });

        // Swal.fire({
        //   icon: "success",
        //   title: "Sucesso!",
        //   text: "Parceiro criado com sucesso.",
        //   confirmButtonText: "Ok",
        //   buttonsStyling: false,
        //   customClass: {
        //     confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        //   },
        // });
        setOpenNotification({
          type: 'success',
          title: 'Sucesso!',
          notification: 'Parceiro criado com sucesso!'
        });
      }

      await fetchData();
      setShowModal(false);
      setCurrentpartner(null);
    } catch (error) {
      console.error("Erro ao salvar Parceiro:", error);
      // Swal.fire({
      //   icon: "error",
      //   title: "Erro!",
      //   text: "Não foi possível salvar o Parceiro.",
      //   buttonsStyling: false,
      //   customClass: {
      //     confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
      //   },
      // });
      setOpenNotification({
        type: 'success',
        title: 'Sucesso!',
        notification: 'Não foi possível salvar o Parceiro!'
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
          Cadastro de Outros Parceiros
        </h2>
        <button
          onClick={() => {
            setCurrentpartner({
              id: "",
              name: "",
              phone: "",
              currency: "BRL",
            });
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
          disabled={isLoading || isSubmitting}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2" size={16} />}
          Novo Parceiro
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Local
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    {isLoading ? "Carregando..." : "Nenhum Parceiro cadastrado"}
                  </td>
                </tr>
              ) : (
                partners.map(
                  (partner) =>
                    partner.active !== false && (
                      <tr key={partner.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {partner.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{partner.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {partner.currency || "brl x $"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(partner)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            disabled={isSubmitting}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(partner)}
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

      {showModal && currentpartner && (
        <div onClick={()=> setShowModal(false)} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div onClick={(e) => e.stopPropagation()} className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">{currentpartner.id ? "Editar Parceiro" : "Novo Parceiro"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={currentpartner.name}
                  onChange={(e) => setCurrentpartner({ ...currentpartner, name: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  value={currentpartner.phone}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "");
                    const formatted = onlyDigits
                      .replace(/^(\d{2})(\d)/, "($1) $2")
                      .replace(/(\d{5})(\d{1,4})$/, "$1-$2")
                      .slice(0, 15); // limita a (99) 99999-9999

                    setCurrentpartner({ ...currentpartner, phone: formatted });
                  }}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                  placeholder="(99) 99999-9999"
                  maxLength={15}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moeda</label>
                <select
                  value={currentpartner.currency || "BRL"}
                  onChange={(e) => setCurrentpartner({ ...currentpartner, currency: e.target.value as "BRL" | "USD" })}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                >
                  <option value="BRL">BRL - Real</option>
                  <option value="USD">USD - Dólar</option>
                </select>
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
